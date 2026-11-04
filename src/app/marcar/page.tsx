'use client';

import { CheckCircle2, Clock, LogIn, LogOut, Smartphone, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { Boton } from '@/components/ui';
import { api } from '@/lib/api';
import { llaveCelular } from '@/lib/llaves';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'listo'; nombre: string; empleado: string; siguiente: 'entrada' | 'salida'; momento?: Momento; fueraDeHorario?: string | null; sede: string; ultima: any }
  | { fase: 'hecho'; tipo: string; momento?: Momento; saludo?: string; hora: string; nombre: string; duplicada: boolean }
  | { fase: 'error'; mensaje: string; noVinculado?: boolean; fueraDeHorario?: boolean };

type Momento = 'entrada' | 'regreso' | 'almuerzo' | 'salida';
const BOTON: Record<Momento, string> = { entrada: 'Marcar entrada', regreso: 'Marcar regreso', almuerzo: 'Marcar salida', salida: 'Marcar salida' };
const HECHO: Record<Momento, string> = { entrada: 'Entrada registrada', regreso: 'Regreso registrado', almuerzo: 'Salida registrada', salida: 'Salida registrada' };

/** Página que abre el empleado al escanear el QR (HU-25). */
function Marcar() {
  const q = useSearchParams();
  const qr = q.get('t') ?? '';
  const [e, setE] = useState<Estado>({ fase: 'cargando' });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const llave = llaveCelular();
    if (!llave) return setE({ fase: 'error', mensaje: 'Este celular no está vinculado. Pida al administrador un código para vincularlo.', noVinculado: true });
    if (!qr) return setE({ fase: 'error', mensaje: 'Escanee el código QR que aparece en la pantalla de la sede.' });
    api('/publico/marcar/estado', { metodo: 'POST', cuerpo: { qr, llave }, publico: true })
      .then((r) => setE({ fase: 'listo', ...r }))
      .catch((err) => setE({ fase: 'error', mensaje: err.message, noVinculado: err.datos?.motivo === 'no_vinculado', fueraDeHorario: err.datos?.motivo === 'fuera_de_horario' }));
  }, [qr]);

  const marcar = async () => {
    setEnviando(true);
    try {
      const r = await api('/publico/marcar', { metodo: 'POST', cuerpo: { qr, llave: llaveCelular() }, publico: true });
      setE({ fase: 'hecho', tipo: r.tipo, momento: r.momento, saludo: r.saludo, hora: r.hora.slice(11, 16), nombre: e.fase === 'listo' ? e.nombre : '', duplicada: r.duplicada });
      if (navigator.vibrate) navigator.vibrate(120);
    } catch (err) {
      setE({ fase: 'error', mensaje: (err as Error).message, fueraDeHorario: (err as any).datos?.motivo === 'fuera_de_horario' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between bg-fondo px-5 py-8 text-center">
      <Logo tamano={34} />
      <div className="w-full max-w-sm">
        {e.fase === 'cargando' && <div className="mx-auto h-40 w-full animate-pulse rounded-2xl bg-borde/60" />}
        {e.fase === 'listo' && (
          <div className="animate-entrar">
            <p className="text-lg text-suave">Hola,</p>
            <p className="text-4xl font-semibold">{e.nombre}</p>
            <p className="mt-2 text-suave">{e.sede}</p>
            {e.ultima && <p className="mt-1 text-sm text-suave">Última marcación: {e.ultima.tipo} a las {e.ultima.hora.slice(11, 16)}</p>}
            <button
              onClick={marcar}
              disabled={enviando}
              className={`mt-10 flex h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl text-2xl font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60 ${e.siguiente === 'entrada' ? 'bg-exito' : 'bg-marca-500'}`}
            >
              {e.siguiente === 'entrada' ? <LogIn className="h-10 w-10" /> : <LogOut className="h-10 w-10" />}
              {enviando ? 'Marcando…' : BOTON[e.momento ?? (e.siguiente === 'entrada' ? 'entrada' : 'salida')]}
            </button>
            {e.fueraDeHorario && <p className="mt-4 rounded-xl bg-alerta/10 p-3 text-sm text-texto">Está fuera de su horario. La marcación se registra, pero el administrador la revisará.</p>}
          </div>
        )}
        {e.fase === 'hecho' && (
          <div className="animate-entrar">
            <CheckCircle2 className="mx-auto h-24 w-24 text-exito" />
            <p className="mt-4 text-3xl font-semibold">{HECHO[e.momento ?? (e.tipo === 'entrada' ? 'entrada' : 'salida')]}</p>
            <p className="mt-2 text-6xl font-semibold tabular">{e.hora}</p>
            <p className="mt-4 text-suave">{e.duplicada ? 'Ya había marcado hace un momento; no se duplicó.' : (e.saludo ?? (e.tipo === 'entrada' ? `¡Buen turno, ${e.nombre}!` : `¡Hasta pronto, ${e.nombre}!`))}</p>
          </div>
        )}
        {e.fase === 'error' && (
          <div className="animate-entrar">
            {e.noVinculado ? <Smartphone className="mx-auto h-20 w-20 text-marca-500" /> : e.fueraDeHorario ? <Clock className="mx-auto h-20 w-20 text-alerta" /> : <XCircle className="mx-auto h-20 w-20 text-peligro" />}
            <p className="mt-4 text-xl font-semibold">{e.noVinculado ? 'Celular no vinculado' : e.fueraDeHorario ? 'Fuera del horario de marcación' : 'No se pudo marcar'}</p>
            <p className="mt-2 text-suave">{e.mensaje}</p>
            {e.noVinculado && (
              <a href="/vincular" className="mt-6 inline-block">
                <Boton tamano="lg">Tengo un código de vinculación</Boton>
              </a>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-suave">La hora la registra el servidor, no el celular.</p>
    </div>
  );
}

export default function PaginaMarcar() {
  return (
    <Suspense>
      <Marcar />
    </Suspense>
  );
}
