'use client';

import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { get, guardarToken, obtenerToken } from './api';

export interface Usuario {
  id: string;
  usuario: string;
  nombre: string;
  rol: string;
  razonSocial: string;
  nit: string;
  debeCambiarPassword: boolean;
  asistenteCompletado: boolean;
  configuracion: any;
}

const Ctx = createContext<{ usuario: Usuario | null; recargar: () => Promise<void>; salir: () => void }>({
  usuario: null,
  recargar: async () => {},
  salir: () => {},
});

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const router = useRouter();

  const recargar = useCallback(async () => {
    if (!obtenerToken()) {
      router.replace('/login');
      return;
    }
    try {
      setUsuario(await get<Usuario>('/auth/yo'));
    } catch {
      /* el cliente de la API redirige al login si la sesión venció */
    }
  }, [router]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Cierre de sesión por inactividad (configurable en Seguridad).
  useEffect(() => {
    if (!usuario) return;
    const minutos = Number(usuario.configuracion?.seguridad?.minutosSesion ?? 30);
    let t: ReturnType<typeof setTimeout>;
    const reiniciar = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        guardarToken(null);
        window.location.href = '/login?inactividad=1';
      }, minutos * 60000);
    };
    const eventos = ['mousemove', 'keydown', 'click', 'touchstart'];
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    reiniciar();
    return () => {
      clearTimeout(t);
      eventos.forEach((e) => window.removeEventListener(e, reiniciar));
    };
  }, [usuario]);

  const salir = useCallback(() => {
    guardarToken(null);
    router.replace('/login');
  }, [router]);

  return <Ctx.Provider value={{ usuario, recargar, salir }}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);
