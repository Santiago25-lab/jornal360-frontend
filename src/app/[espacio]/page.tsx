'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { AvisosSesion, FormularioIngreso } from '@/components/ingreso';
import { Aviso, Cargando } from '@/components/ui';
import { guardarEspacio, guardarToken, obtenerEspacio, obtenerToken, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';

/** Ingreso al espacio de una empresa: jornal360…/<espacio>. */
function Ingreso() {
  const { espacio } = useParams<{ espacio: string }>();
  const nombre = decodeURIComponent(espacio ?? '').toLowerCase();
  const router = useRouter();
  const q = useSearchParams();
  const info = useDatos<{ espacio: string; nombre: string | null }>(`/auth/espacio/${encodeURIComponent(nombre)}`);

  useEffect(() => {
    // Ya hay sesión en este mismo espacio: directo al inicio.
    if (obtenerToken() && obtenerEspacio() === nombre && !q.get('vencida') && !q.get('inactividad')) router.replace('/inicio');
  }, [router, q, nombre]);

  if (info.cargando && !info.datos) return <Cargando />;
  if (info.error)
    return (
      <div className="mx-auto mt-24 max-w-md p-4">
        <Aviso tono="peligro" titulo="Espacio no encontrado">
          No existe un espacio llamado «{nombre}». Revise el enlace que le dieron.
        </Aviso>
      </div>
    );

  return (
    <FormularioIngreso
      titulo={info.datos?.nombre ?? 'Iniciar sesión'}
      subtitulo={
        <>
          Espacio <b>{info.datos?.espacio}</b>
        </>
      }
      avisos={<AvisosSesion vencida={!!q.get('vencida')} inactividad={!!q.get('inactividad')} />}
      alEntrar={async (usuario, password) => {
        const r = await post<{ token: string; usuario: any }>('/auth/login', { usuario, password, espacio: nombre });
        guardarToken(r.token);
        guardarEspacio(r.usuario.espacio ?? nombre);
        router.replace(r.usuario.debeCambiarPassword ? '/configuracion?seccion=clave&cambiar=1' : '/inicio');
      }}
    />
  );
}

export default function PaginaEspacio() {
  return (
    <Suspense>
      <Ingreso />
    </Suspense>
  );
}
