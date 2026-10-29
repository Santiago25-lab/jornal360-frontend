'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { Boton, Campo, Entrada } from '@/components/ui';
import { obtenerEspacio } from '@/lib/api';

/** Sin espacio en la dirección: lleva al último espacio usado o pide escribirlo. */
function Elegir() {
  const router = useRouter();
  const q = useSearchParams();
  const [espacio, setEspacio] = useState('');

  useEffect(() => {
    const e = obtenerEspacio();
    if (e) router.replace(`/${e}${q.toString() ? `?${q.toString()}` : ''}`);
  }, [router, q]);

  const ir = (e: FormEvent) => {
    e.preventDefault();
    const limpio = espacio.trim().toLowerCase().replace(/^.*\//, '');
    if (limpio) router.push(`/${encodeURIComponent(limpio)}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo tamano={40} />
        </div>
        <form onSubmit={ir} className="rounded-2xl border border-borde bg-tarjeta p-6 shadow-suave">
          <h1 className="text-xl font-semibold">¿Cuál es su espacio?</h1>
          <p className="mb-5 mt-1 text-sm text-suave">Es la última parte del enlace que le dieron, por ejemplo jornal360…/<b>mi-empresa</b>.</p>
          <Campo etiqueta="Nombre del espacio">
            <Entrada value={espacio} onChange={(e) => setEspacio(e.target.value)} placeholder="mi-empresa" required autoFocus />
          </Campo>
          <Boton type="submit" tamano="lg" className="mt-4 w-full">
            Continuar
          </Boton>
        </form>
      </div>
    </div>
  );
}

export default function PaginaLogin() {
  return (
    <Suspense>
      <Elegir />
    </Suspense>
  );
}
