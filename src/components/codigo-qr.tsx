'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Dibuja un código QR (siempre negro sobre blanco, para que cualquier cámara lo lea). */
export function CodigoQR({ texto, tamano = 240, etiqueta }: { texto: string; tamano?: number; etiqueta?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    QRCode.toDataURL(texto, { width: tamano * 2, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
      .then((u) => vivo && setUrl(u))
      .catch(() => vivo && setUrl(null));
    return () => {
      vivo = false;
    };
  }, [texto, tamano]);
  return (
    <div className="inline-block rounded-2xl bg-white p-3 shadow-suave" style={{ width: tamano + 24 }}>
      {url ? <img src={url} width={tamano} height={tamano} alt={etiqueta ?? 'Código QR'} className="block" /> : <div style={{ width: tamano, height: tamano }} className="animate-pulse rounded-lg bg-gray-100" />}
    </div>
  );
}
