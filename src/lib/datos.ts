'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from './api';

/** Carga datos de la API y permite recargarlos. ruta = null no carga nada. */
export function useDatos<T = any>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(!!ruta);
  const actual = useRef(ruta);
  actual.current = ruta;

  const recargar = useCallback(async () => {
    if (!actual.current) return;
    const r = actual.current;
    setCargando(true);
    try {
      const d = await get<T>(r);
      if (actual.current === r) {
        setDatos(d);
        setError(null);
      }
    } catch (e) {
      if (actual.current === r) setError((e as Error).message);
    } finally {
      if (actual.current === r) setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (ruta) recargar();
    else {
      setDatos(null);
      setCargando(false);
    }
  }, [ruta, recargar]);

  return { datos, error, cargando, recargar, setDatos };
}

/** Guarda una preferencia del navegador (pestaña, filtro) sin romper si no hay almacenamiento. */
export function usePreferencia<T>(clave: string, inicial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(inicial);
  useEffect(() => {
    try {
      const s = localStorage.getItem(`jornal360.${clave}`);
      if (s !== null) setV(JSON.parse(s));
    } catch {
      /* sin almacenamiento */
    }
  }, [clave]);
  const guardar = useCallback(
    (x: T) => {
      setV(x);
      try {
        localStorage.setItem(`jornal360.${clave}`, JSON.stringify(x));
      } catch {
        /* sin almacenamiento */
      }
    },
    [clave],
  );
  return [v, guardar];
}
