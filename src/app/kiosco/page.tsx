'use client';

import { CheckCircle2, Delete, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { Boton, Entrada } from '@/components/ui';
import { api } from '@/lib/api';
import { guardarLlaveKiosco, llaveKiosco } from '@/lib/llaves';

type Fase = 'documento' | 'pin' | 'confirmar' | 'hecho' | 'error';

/** Kiosco de la sede: cédula + PIN, botones grandes, máximo 3 pasos (HU-28, RNF-15). */
function Kiosco() {
  const q = useSearchParams();
  const [llave, setLlave] = useState<string | null>(null);
  const [info, setInfo] = useState<{ kiosco: string; sede: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [errorVinc, setErrorVinc] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>('documento');
  const [documento, setDocumento] = useState('');
  const [pin, setPin] = useState('');
  const [persona, setPersona] = useState<{ empleado: string; siguiente: string } | null>(null);
  const [resultado, setResultado] = useState<{ tipo: string; hora: string } | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [reloj, setReloj] = useState('');

  useEffect(() => {
    const l = llaveKiosco();
    setLlave(l);
    if (l)
      api('/publico/kiosco/info', { metodo: 'POST', publico: true, cuerpo: { llave: l } })
        .then(setInfo)
        .catch(() => {
          guardarLlaveKiosco(null);
          setLlave(null);
        });
  }, []);
  useEffect(() => {
    const t = q.get('c');
    if (t && !llaveKiosco()) vincular({ token: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => {
    const i = setInterval(() => setReloj(new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })), 1000);
    return () => clearInterval(i);
  }, []);

  const reiniciar = useCallback(() => {
    setFase('documento');
    setDocumento('');
    setPin('');
    setPersona(null);
    setResultado(null);
  }, []);
  // Vuelve al inicio solo, para el siguiente compañero.
  useEffect(() => {
    if (fase === 'hecho' || fase === 'error') {
      const t = setTimeout(reiniciar, 6000);
      return () => clearTimeout(t);
    }
    if (fase !== 'documento') {
      const t = setTimeout(reiniciar, 45000);
      return () => clearTimeout(t);
    }
  }, [fase, reiniciar]);

  async function vincular(c: { codigo?: string; token?: string }) {
    setErrorVinc(null);
    try {
      const r = await api('/publico/kiosco/vincular', { metodo: 'POST', publico: true, cuerpo: c });
      guardarLlaveKiosco(r.llave);
      setLlave(r.llave);
      setInfo(await api('/publico/kiosco/info', { metodo: 'POST', publico: true, cuerpo: { llave: r.llave } }));
    } catch (e) {
      setErrorVinc((e as Error).message);
    }
  }

  const identificar = async (p: string) => {
    try {
      setPersona(await api('/publico/kiosco/identificar', { metodo: 'POST', publico: true, cuerpo: { llave, documento, pin: p } }));
      setFase('confirmar');
    } catch (e) {
      setMensaje((e as Error).message);
      setFase('error');
    }
  };

  const marcar = async () => {
    try {
      const r = await api('/publico/kiosco/marcar', { metodo: 'POST', publico: true, cuerpo: { llave, documento, pin } });
      setResultado({ tipo: r.tipo, hora: r.hora.slice(11, 16) });
      setFase('hecho');
    } catch (e) {
      setMensaje((e as Error).message);
      setFase('error');
    }
  };

  const teclado = (valor: string, cambiar: (v: string) => void, max: number, alCompletar?: (v: string) => void) => (
    <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-3">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) =>
        k === '' ? (
          <span key="v" />
        ) : (
          <button
            key={k}
            onClick={() => {
              if (k === '⌫') return cambiar(valor.slice(0, -1));
              if (valor.length >= max) return;
              const n = valor + k;
              cambiar(n);
              if (alCompletar && n.length === max) alCompletar(n);
            }}
            className="flex h-20 items-center justify-center rounded-2xl border border-borde bg-tarjeta text-3xl font-semibold shadow-suave active:scale-95 active:bg-marca-50"
            aria-label={k === '⌫' ? 'Borrar' : k}
          >
            {k === '⌫' ? <Delete className="h-7 w-7" /> : k}
          </button>
        ),
      )}
    </div>
  );

  if (!llave)
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-fondo p-6 text-center">
        <Logo tamano={44} />
        <h1 className="text-2xl font-semibold">Vincular este equipo como kiosco</h1>
        <p className="max-w-md text-suave">Escriba el código de 6 números que aparece en Asistencia → Kioscos → Vincular equipo.</p>
        <Entrada inputMode="numeric" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} className="h-16 max-w-xs text-center text-3xl tracking-[0.3em]" />
        {errorVinc && <p className="text-peligro">{errorVinc}</p>}
        <Boton tamano="lg" onClick={() => vincular({ codigo })} disabled={codigo.length !== 6}>
          Vincular
        </Boton>
      </div>
    );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-fondo p-6">
      <div className="flex items-center justify-between">
        <Logo tamano={36} />
        <div className="text-right">
          <p className="text-3xl font-semibold tabular">{reloj}</p>
          <p className="text-sm text-suave">{info ? `${info.kiosco} · ${info.sede}` : ''}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {fase === 'documento' && (
          <>
            <p className="text-3xl font-semibold">Escriba su cédula</p>
            <div className="h-16 min-w-72 rounded-2xl border-2 border-marca-500 bg-tarjeta px-6 text-4xl font-semibold leading-[60px] tracking-widest tabular">{documento || <span className="text-suave/40">—</span>}</div>
            {teclado(documento, setDocumento, 15)}
            <Boton tamano="lg" className="h-16 w-full max-w-sm text-xl" disabled={documento.length < 4} onClick={() => setFase('pin')}>
              Continuar
            </Boton>
          </>
        )}
        {fase === 'pin' && (
          <>
            <p className="text-3xl font-semibold">Escriba su PIN</p>
            <div className="flex gap-4">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-6 w-6 rounded-full ${i < pin.length ? 'bg-marca-500' : 'border-2 border-borde'}`} />
              ))}
            </div>
            {teclado(pin, setPin, 4, identificar)}
            <button className="text-lg text-suave underline" onClick={reiniciar}>
              Volver
            </button>
          </>
        )}
        {fase === 'confirmar' && persona && (
          <div className="animate-entrar">
            <p className="text-5xl font-semibold">{persona.empleado}</p>
            <p className="mt-3 text-2xl text-suave">¿Marcar {persona.siguiente === 'entrada' ? 'ENTRADA' : 'SALIDA'}?</p>
            <div className="mt-10 flex gap-4">
              <Boton variante="secundario" tamano="lg" className="h-20 w-48 text-xl" onClick={reiniciar}>
                No soy yo
              </Boton>
              <Boton variante={persona.siguiente === 'entrada' ? 'exito' : 'primario'} tamano="lg" className="h-20 w-64 text-2xl" onClick={marcar}>
                Sí, marcar
              </Boton>
            </div>
          </div>
        )}
        {fase === 'hecho' && resultado && (
          <div className="animate-entrar">
            <CheckCircle2 className="mx-auto h-28 w-28 text-exito" />
            <p className="mt-4 text-4xl font-semibold">{resultado.tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada'}</p>
            <p className="mt-2 text-7xl font-semibold tabular">{resultado.hora}</p>
          </div>
        )}
        {fase === 'error' && (
          <div className="animate-entrar">
            <XCircle className="mx-auto h-24 w-24 text-peligro" />
            <p className="mt-4 text-2xl font-semibold">{mensaje}</p>
            <Boton tamano="lg" className="mt-8" onClick={reiniciar}>
              Intentar de nuevo
            </Boton>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaginaKiosco() {
  return (
    <Suspense>
      <Kiosco />
    </Suspense>
  );
}
