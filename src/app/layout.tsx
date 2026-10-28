import type { Metadata, Viewport } from 'next';
import { ProveedorAvisos } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Jornal 360', template: '%s · Jornal 360' },
  description: 'Nómina y asistencia para empresas colombianas',
  applicationName: 'Jornal 360',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icono.svg', apple: '/icono.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5fb' },
    { media: '(prefers-color-scheme: dark)', color: '#10101a' },
  ],
};

// Aplica el tema guardado antes de pintar, para que no parpadee.
const scriptTema = `try{var t=localStorage.getItem('jornal360.tema');if(t==='oscuro'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`:root{--fuente:'Inter'}`}</style>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>
        <ProveedorAvisos>{children}</ProveedorAvisos>
      </body>
    </html>
  );
}
