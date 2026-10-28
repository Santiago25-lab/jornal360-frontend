'use client';

/** Cliente de la API de Jornal 360. */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

const CLAVE_TOKEN = 'jornal360.token';

export function obtenerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(t: string | null) {
  try {
    if (t) localStorage.setItem(CLAVE_TOKEN, t);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* almacenamiento no disponible */
  }
}

export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly estado: number,
    public readonly datos: any,
  ) {
    super(message);
  }
  get requiereConfirmacion(): boolean {
    return !!this.datos?.requiereConfirmacion;
  }
  get errores(): string[] {
    const e = this.datos?.errores;
    if (!Array.isArray(e)) return [];
    return e.map((x: any) => (typeof x === 'string' ? x : `${x.campo ? x.campo + ': ' : ''}${x.mensaje}`));
  }
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export async function api<T = any>(ruta: string, opciones: { metodo?: Metodo; cuerpo?: unknown; publico?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = obtenerToken();
  if (token && !opciones.publico) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method: opciones.metodo ?? (opciones.cuerpo !== undefined ? 'POST' : 'GET'),
      headers,
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ErrorApi('No hay conexión con el servidor. Revise su internet e intente de nuevo', 0, null);
  }
  const tipo = res.headers.get('content-type') ?? '';
  const datos = tipo.includes('application/json') ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    if (res.status === 401 && !opciones.publico && ruta !== '/auth/login') {
      guardarToken(null);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) window.location.href = '/login?vencida=1';
    }
    throw new ErrorApi(datos?.mensaje ?? `Error ${res.status}`, res.status, datos);
  }
  return datos as T;
}

export const get = <T = any>(ruta: string) => api<T>(ruta);
export const post = <T = any>(ruta: string, cuerpo: unknown = {}) => api<T>(ruta, { metodo: 'POST', cuerpo });
export const patch = <T = any>(ruta: string, cuerpo: unknown) => api<T>(ruta, { metodo: 'PATCH', cuerpo });
export const put = <T = any>(ruta: string, cuerpo: unknown) => api<T>(ruta, { metodo: 'PUT', cuerpo });
export const borrar = <T = any>(ruta: string) => api<T>(ruta, { metodo: 'DELETE' });

/** Descarga un archivo binario (PDF) de una ruta protegida. */
export async function descargar(ruta: string, nombre: string) {
  const res = await fetch(`${API_URL}${ruta}`, { headers: { Authorization: `Bearer ${obtenerToken() ?? ''}` } });
  if (!res.ok) {
    const d = await res.json().catch(() => null);
    throw new ErrorApi(d?.mensaje ?? 'No se pudo descargar', res.status, d);
  }
  guardarBlob(await res.blob(), nombre);
}

/** Descarga un archivo que la API devuelve en base64. */
export function descargarBase64(base64: string, nombre: string, tipo = 'application/octet-stream') {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  guardarBlob(new Blob([bytes], { type: tipo }), nombre);
}

function guardarBlob(b: Blob, nombre: string) {
  const url = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Lee un archivo del usuario como base64 (para importar Excel). */
export function archivoABase64(f: File): Promise<string> {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] ?? '');
    r.onerror = () => mal(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(f);
  });
}
