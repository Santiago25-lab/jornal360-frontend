'use client';

import { CheckCircle2, MailX, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Logo } from '@/components/logo';
import { Boton } from '@/components/ui';
import { api } from '@/lib/api';

/** Enlace del pie de los correos: el empleado deja de recibir felicitaciones y mensajes automáticos. */
function Baja() {
  const q = useSearchParams();
  const [estado, setEstado] = useState<{ fase: 'pregunta' | 'listo' | 'error'; texto?: string }>({ fase: 'pregunta' });
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true);
    try {
      const r = await api('/publico/correos/baja', { metodo: 'POST', publico: true, cuerpo: { e: q.get('e') ?? '', f: q.get('f') ?? '' } });
      setEstado({ fase: 'listo', texto: r.nombre });
    } catch (e) {
      setEstado({ fase: 'error', texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-fondo px-5 text-center">
      <Logo tamano={36} />
      <div className="w-full max-w-md rounded-2xl border border-borde bg-tarjeta p-8 shadow-suave">
        {estado.fase === 'pregunta' && (
          <>
            <MailX className="mx-auto h-14 w-14 text-marca-500" />
            <h1 className="mt-4 text-xl font-semibold">¿Dejar de recibir estos correos?</h1>
            <p className="mt-2 text-suave">No le volveremos a enviar felicitaciones ni mensajes automáticos. Su empresa puede volver a activarlos si usted se lo pide.</p>
            <Boton className="mt-6 w-full" tamano="lg" cargando={enviando} onClick={confirmar}>
              Sí, no quiero recibirlos
            </Boton>
          </>
        )}
        {estado.fase === 'listo' && (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-exito" />
            <h1 className="mt-4 text-xl font-semibold">Listo{estado.texto ? `, ${estado.texto}` : ''}</h1>
            <p className="mt-2 text-suave">Ya no recibirá estos correos.</p>
          </>
        )}
        {estado.fase === 'error' && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-peligro" />
            <h1 className="mt-4 text-xl font-semibold">No se pudo completar</h1>
            <p className="mt-2 text-suave">{estado.texto}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaginaBaja() {
  return (
    <Suspense>
      <Baja />
    </Suspense>
  );
}
