'use client';

import { Save } from 'lucide-react';
import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { patch } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { useSesion } from '@/lib/sesion';
import { Boton, Cargando, Entrada, Tarjeta, useAccion } from '../ui';

/** Carga la empresa con su configuración y guarda una sección a la vez. */
export function useEmpresa() {
  const { datos, cargando, recargar, setDatos } = useDatos<any>('/empresa');
  const { ejecutar, cargando: guardando } = useAccion();
  const sesion = useSesion();
  const guardarConfig = async (cambios: Record<string, unknown>) => {
    const r = await ejecutar(() => patch('/empresa/configuracion', cambios), 'Cambios guardados');
    if (r && datos) setDatos({ ...datos, configuracion: r });
    return r;
  };
  const guardarEmpresa = async (cambios: Record<string, unknown>) => {
    const r = await ejecutar(() => patch('/empresa', cambios), 'Datos de la empresa guardados');
    if (r) {
      setDatos(r);
      // El encabezado muestra la razón social de la sesión: se refresca para ver el cambio de una vez.
      sesion.recargar();
    }
    return r;
  };
  return { empresa: datos, cargando, recargar, guardarConfig, guardarEmpresa, guardando };
}

/** Borrador local de una sección: se edita libremente y se guarda con un botón. */
export function useBorrador<T>(original: T | undefined | null) {
  const clave = original ? JSON.stringify(original) : '';
  const [b, setB] = useState<T | null>(original ? JSON.parse(clave) : null);
  useEffect(() => {
    if (clave) setB(JSON.parse(clave));
  }, [clave]);
  const cambiado = !!b && !!clave && JSON.stringify(b) !== clave;
  const poner = <K extends keyof T>(k: K, v: T[K]) => setB((x) => (x ? { ...x, [k]: v } : x));
  return { b, setB, poner, cambiado };
}

// ---------- Cambios sin guardar ----------
// Cada sección con cambios pendientes se anota aquí para que el asistente (y quien quiera)
// pueda guardarlos todos antes de cambiar de pantalla.
const pendientes = new Map<string, () => unknown>();

/** Guarda todas las secciones con cambios. Devuelve false si alguna no se pudo guardar. */
export async function guardarPendientes(): Promise<boolean> {
  for (const [id, guardar] of [...pendientes]) {
    const r = await guardar();
    if (r === null || r === false) return false;
    pendientes.delete(id);
  }
  return true;
}

export const hayPendientes = () => pendientes.size > 0;

function useCambiosPendientes(cambiado: boolean | undefined, onGuardar: (() => unknown) | undefined) {
  const id = useId();
  const ultimo = useRef(onGuardar);
  ultimo.current = onGuardar;
  useEffect(() => {
    if (!cambiado || !ultimo.current) {
      pendientes.delete(id);
      return;
    }
    pendientes.set(id, () => ultimo.current?.());
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => {
      pendientes.delete(id);
      window.removeEventListener('beforeunload', avisar);
    };
  }, [cambiado, id]);
}

export function Seccion({ titulo, descripcion, children, cambiado, guardando, onGuardar, accion }: { titulo: string; descripcion?: string; children: ReactNode; cambiado?: boolean; guardando?: boolean; onGuardar?: () => unknown; accion?: ReactNode }) {
  useCambiosPendientes(cambiado, onGuardar);
  return (
    <Tarjeta
      titulo={titulo}
      subtitulo={descripcion}
      accion={
        accion ??
        (onGuardar && (
          <Boton tamano="sm" disabled={!cambiado} cargando={guardando} icono={<Save className="h-4 w-4" />} onClick={() => onGuardar()}>
            Guardar
          </Boton>
        ))
      }
    >
      {children}
      {onGuardar && cambiado && (
        <div className="sticky bottom-3 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-alerta/40 bg-alerta/10 px-4 py-3 backdrop-blur">
          <span className="text-sm font-medium">Tiene cambios sin guardar</span>
          <Boton tamano="sm" cargando={guardando} icono={<Save className="h-4 w-4" />} onClick={() => onGuardar()}>
            Guardar cambios
          </Boton>
        </div>
      )}
    </Tarjeta>
  );
}

export function Cargador({ listo, children }: { listo: boolean; children: ReactNode }) {
  return listo ? <>{children}</> : <Cargando />;
}

/** Número con unidad a la derecha (minutos, días, horas). */
export function EntradaNumero({ valor, onCambio, unidad, min, max, paso = 1 }: { valor: number; onCambio: (v: number) => void; unidad?: string; min?: number; max?: number; paso?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Entrada type="number" value={Number.isFinite(valor) ? valor : ''} min={min} max={max} step={paso} onChange={(e) => onCambio(e.target.value === '' ? NaN : Number(e.target.value))} className="w-28" />
      {unidad && <span className="text-sm text-suave">{unidad}</span>}
    </div>
  );
}

/** Fila de ajuste: texto a la izquierda y control a la derecha. */
export function Ajuste({ etiqueta, descripcion, children }: { etiqueta: string; descripcion?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-borde/70 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{etiqueta}</p>
        {descripcion && <p className="text-sm text-suave">{descripcion}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export const DIAS_SEMANA = [
  { valor: 1, etiqueta: 'Lunes' },
  { valor: 2, etiqueta: 'Martes' },
  { valor: 3, etiqueta: 'Miércoles' },
  { valor: 4, etiqueta: 'Jueves' },
  { valor: 5, etiqueta: 'Viernes' },
  { valor: 6, etiqueta: 'Sábado' },
  { valor: 0, etiqueta: 'Domingo' },
];
