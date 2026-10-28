'use client';

import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { Aviso, Boton, Campo, Entrada } from '@/components/ui';
import { api } from '@/lib/api';
import { descripcionEquipo, guardarLlaveCelular, llaveCelular } from '@/lib/llaves';

/** Vinculación del celular del empleado (HU-24). */
function Vincular() {
  const q = useSearchParams();
  const token = q.get('c');
  const [info, setInfo] = useState<{ empleado: string; documentoOculto: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [documento, setDocumento] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!token) return;
    api(`/publico/vincular/${token}`, { publico: true })
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, [token]);

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await api('/publico/vincular', {
        metodo: 'POST',
        publico: true,
        cuerpo: { token: token ?? undefined, codigo: token ? undefined : codigo, documento, aceptaDatos: acepta, descripcion: descripcionEquipo(), llaveActual: llaveCelular() ?? undefined },
      });
      guardarLlaveCelular(r.llave);
      setListo(r.empleado);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-fondo px-5 py-8">
      <Logo tamano={34} />
      <div className="mt-10 w-full max-w-sm">
        {listo ? (
          <div className="text-center animate-entrar">
            <CheckCircle2 className="mx-auto h-20 w-20 text-exito" />
            <h1 className="mt-4 text-2xl font-semibold">Celular vinculado</h1>
            <p className="mt-2 text-suave">Listo, {listo.split(' ')[0]}. Desde ahora marque escaneando el código QR de la sede.</p>
            <div className="mt-6 text-left">
              <Aviso tono="info" titulo="Consejo">
                Agregue esta página a la pantalla de inicio: en el menú del navegador, toque «Agregar a la pantalla de inicio». No borre los datos del navegador, o tendrá que vincular de nuevo.
              </Aviso>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar} className="rounded-2xl border border-borde bg-tarjeta p-6 shadow-suave animate-entrar">
            <h1 className="text-xl font-semibold">Vincular mi celular</h1>
            {info ? (
              <p className="mt-1 text-suave">
                Vas a vincular este celular a <b className="text-texto">{info.empleado}</b> ({info.documentoOculto}).
              </p>
            ) : (
              <p className="mt-1 text-suave">Escriba el código de 6 números que le dio el administrador.</p>
            )}
            {error && <div className="mt-4"><Aviso tono="peligro">{error}</Aviso></div>}
            <div className="mt-5 space-y-4">
              {!token && (
                <Campo etiqueta="Código de vinculación">
                  <Entrada inputMode="numeric" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} className="h-12 text-center text-2xl tracking-[0.3em]" required />
                </Campo>
              )}
              <Campo etiqueta="Su número de cédula">
                <Entrada inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value.trim())} className="h-12 text-lg" required />
              </Campo>
              <label className="flex items-start gap-3 rounded-xl border border-borde p-3 text-sm">
                <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-1 h-4 w-4" />
                <span>
                  <ShieldCheck className="mr-1 inline h-4 w-4 text-marca-500" />
                  Autorizo el tratamiento de mis datos personales para el control de asistencia (Ley 1581 de 2012). Solo se registra la hora en que marco.
                </span>
              </label>
              <Boton type="submit" tamano="lg" className="w-full" cargando={cargando} disabled={!acepta || !documento || (!token && codigo.length !== 6)}>
                Vincular celular
              </Boton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PaginaVincular() {
  return (
    <Suspense>
      <Vincular />
    </Suspense>
  );
}
