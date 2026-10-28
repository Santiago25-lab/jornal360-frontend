'use client';

import { Save } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { patch } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { Boton, Cargando, Entrada, Tarjeta, useAccion } from '../ui';

/** Carga la empresa con su configuración y guarda una sección a la vez. */
export function useEmpresa() {
  const { datos, cargando, recargar, setDatos } = useDatos<any>('/empresa');
  const { ejecutar, cargando: guardando } = useAccion();
  const guardarConfig = async (cambios: Record<string, unknown>) => {
    const r = await ejecutar(() => patch('/empresa/configuracion', cambios), 'Cambios guardados');
    if (r && datos) setDatos({ ...datos, configuracion: r });
    return r;
  };
  const guardarEmpresa = async (cambios: Record<string, unknown>) => {
    const r = await ejecutar(() => patch('/empresa', cambios), 'Datos de la empresa guardados');
    if (r) setDatos(r);
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

export function Seccion({ titulo, descripcion, children, cambiado, guardando, onGuardar, accion }: { titulo: string; descripcion?: string; children: ReactNode; cambiado?: boolean; guardando?: boolean; onGuardar?: () => void; accion?: ReactNode }) {
  return (
    <Tarjeta
      titulo={titulo}
      subtitulo={descripcion}
      accion={
        accion ??
        (onGuardar && (
          <Boton tamano="sm" disabled={!cambiado} cargando={guardando} icono={<Save className="h-4 w-4" />} onClick={onGuardar}>
            Guardar
          </Boton>
        ))
      }
    >
      {children}
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
