'use client';

/**
 * Llaves secretas del celular y del kiosco vinculados. Se guardan en el navegador; si el usuario
 * borra los datos del navegador o usa modo incógnito, hay que vincular de nuevo (es una protección).
 */
const CELULAR = 'jornal360.llave';
const KIOSCO = 'jornal360.kiosco';

const leer = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const escribir = (k: string, v: string | null) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* sin almacenamiento */
  }
};

export const llaveCelular = () => leer(CELULAR);
export const guardarLlaveCelular = (v: string | null) => escribir(CELULAR, v);
export const llaveKiosco = () => leer(KIOSCO);
export const guardarLlaveKiosco = (v: string | null) => escribir(KIOSCO, v);

export function descripcionEquipo(): string {
  const ua = navigator.userAgent;
  const so = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : 'Equipo';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Navegador';
  return `${so} · ${nav}`;
}
