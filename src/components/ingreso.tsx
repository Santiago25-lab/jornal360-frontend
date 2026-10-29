'use client';

import { Eye, EyeOff } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { Logo } from './logo';
import { Aviso, Boton, Campo, Entrada } from './ui';

/** Formulario de usuario y contraseña, igual para el espacio de una empresa y para la plataforma. */
export function FormularioIngreso({
  titulo,
  subtitulo,
  avisos,
  alEntrar,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  avisos?: ReactNode;
  alEntrar: (usuario: string, password: string) => Promise<void>;
}) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await alEntrar(usuario, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo tamano={40} />
        </div>
        <form onSubmit={entrar} className="rounded-2xl border border-borde bg-tarjeta p-6 shadow-suave animate-entrar">
          <h1 className="text-xl font-semibold">{titulo}</h1>
          {subtitulo && <p className="mb-5 mt-1 text-sm text-suave">{subtitulo}</p>}
          {avisos}
          {error && (
            <div className="mb-4">
              <Aviso tono="peligro">{error}</Aviso>
            </div>
          )}
          <div className="space-y-4">
            <Campo etiqueta="Usuario">
              <Entrada autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoFocus />
            </Campo>
            <Campo etiqueta="Contraseña">
              <div className="relative">
                <Entrada type={ver ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                <button type="button" onClick={() => setVer((v) => !v)} className="absolute right-3 top-2.5 text-suave" aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {ver ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </Campo>
            <Boton type="submit" tamano="lg" className="w-full" cargando={cargando}>
              Entrar
            </Boton>
          </div>
        </form>
        <p className="mt-6 text-center text-xs text-suave">Jornal 360 · Nómina y asistencia para Colombia</p>
      </div>
    </div>
  );
}

/** Avisos de sesión vencida o cerrada por inactividad. */
export function AvisosSesion({ vencida, inactividad }: { vencida?: boolean; inactividad?: boolean }) {
  return (
    <>
      {vencida && (
        <div className="mb-4">
          <Aviso tono="alerta">Su sesión venció. Inicie sesión de nuevo.</Aviso>
        </div>
      )}
      {inactividad && (
        <div className="mb-4">
          <Aviso tono="info">Cerramos la sesión por inactividad.</Aviso>
        </div>
      )}
    </>
  );
}
