'use client';

import { Maximize } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CodigoQR } from '@/components/codigo-qr';
import { Logo } from '@/components/logo';
import { get, obtenerToken } from '@/lib/api';

/** Pantalla de la sede con el QR rotativo (HU-23). Se deja abierta en un computador o tablet. */
export default function PantallaQr() {
  const { sedeId } = useParams<{ sedeId: string }>();
  const [qr, setQr] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloj, setReloj] = useState('');
  const [restante, setRestante] = useState(0);

  useEffect(() => {
    if (!obtenerToken()) {
      window.location.href = '/login';
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    const cargar = async () => {
      try {
        const r = await get(`/asistencia/sedes/${sedeId}/qr`);
        setQr({ ...r, recibido: Date.now() });
        setError(null);
        t = setTimeout(cargar, Math.max(1000, r.venceEn - 500));
      } catch (e) {
        setError((e as Error).message);
        t = setTimeout(cargar, 5000);
      }
    };
    cargar();
    return () => clearTimeout(t);
  }, [sedeId]);

  useEffect(() => {
    const i = setInterval(() => {
      setReloj(new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (qr) setRestante(Math.max(0, Math.ceil((qr.venceEn - (Date.now() - qr.recibido)) / 1000)));
    }, 250);
    return () => clearInterval(i);
  }, [qr]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-fondo p-6 text-center">
      <Logo tamano={44} />
      {error && <p className="max-w-md rounded-xl bg-peligro/10 px-4 py-2 text-peligro">{error}</p>}
      {qr && (
        <>
          <div>
            <p className="text-3xl font-semibold">{qr.sede}</p>
            <p className="mt-1 text-lg text-suave">Escanee con la cámara de su celular para marcar</p>
          </div>
          <CodigoQR texto={qr.url} tamano={Math.min(420, typeof window !== 'undefined' ? Math.min(window.innerWidth, window.innerHeight) - 260 : 360)} />
          <div className="w-72">
            <div className="h-1.5 overflow-hidden rounded-full bg-borde">
              <div className="h-full bg-marca-500 transition-all duration-300" style={{ width: `${(restante / (qr.segundos || 30)) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-suave">El código cambia en {restante} s</p>
          </div>
          <p className="text-5xl font-semibold tabular">{reloj}</p>
        </>
      )}
      <button onClick={() => document.documentElement.requestFullscreen?.()} className="fixed bottom-4 right-4 flex items-center gap-2 rounded-xl border border-borde bg-tarjeta px-3 py-2 text-sm text-suave">
        <Maximize className="h-4 w-4" /> Pantalla completa
      </button>
    </div>
  );
}
