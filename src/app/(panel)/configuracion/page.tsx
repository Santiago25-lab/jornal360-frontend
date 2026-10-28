'use client';

import { Building2, CalendarDays, Calculator, Clock, Database, FileCog, KeyRound, Layers, ListTree, QrCode, ShieldCheck, Table2, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useEmpresa } from '@/components/config/comun';
import { SeccionConceptos } from '@/components/config/conceptos';
import { SeccionEstructura } from '@/components/config/estructura';
import { CambiarPassword, SeccionAsistencia, SeccionCalendario, SeccionCampos, SeccionEmpresa, SeccionJornada, SeccionReglas } from '@/components/config/general';
import { SeccionRespaldo, SeccionFormatos, SeccionUsuarios } from '@/components/config/otros';
import { SeccionParametros, SeccionTablas } from '@/components/config/parametros';
import { Cargando, cx, Encabezado } from '@/components/ui';

const SECCIONES = [
  { valor: 'empresa', etiqueta: 'Empresa', icono: Building2, ayuda: 'NIT, exoneración, banco' },
  { valor: 'calendario', etiqueta: 'Días laborales y festivos', icono: CalendarDays, ayuda: 'Qué días se trabaja' },
  { valor: 'jornada', etiqueta: 'Jornada y horas extra', icono: Clock, ayuda: 'Nocturna, tolerancias' },
  { valor: 'estructura', etiqueta: 'Sedes, áreas y turnos', icono: Layers, ayuda: 'Grupos de pago, entidades' },
  { valor: 'asistencia', etiqueta: 'Marcación', icono: QrCode, ayuda: 'QR, celular, kiosco' },
  { valor: 'parametros', etiqueta: 'Parámetros de ley', icono: Calculator, ayuda: 'SMMLV, UVT, porcentajes' },
  { valor: 'tablas', etiqueta: 'Tablas por rangos', icono: Table2, ayuda: 'FSP, ARL, retención' },
  { valor: 'conceptos', etiqueta: 'Conceptos y fórmulas', icono: ListTree, ayuda: 'Qué se paga y descuenta' },
  { valor: 'formatos', etiqueta: 'Archivos de banco y contables', icono: FileCog, ayuda: 'Estructura de archivos' },
  { valor: 'seguridad', etiqueta: 'Aprobaciones y seguridad', icono: ShieldCheck, ayuda: 'Avisos, bloqueos, campos' },
  { valor: 'usuarios', etiqueta: 'Usuarios', icono: Users, ayuda: 'Quién entra y qué hace' },
  { valor: 'respaldo', etiqueta: 'Copia de la configuración', icono: Database, ayuda: 'Descargar y cargar' },
  { valor: 'clave', etiqueta: 'Mi contraseña', icono: KeyRound, ayuda: 'Cambiarla' },
] as const;

type S = (typeof SECCIONES)[number]['valor'];

export default function PaginaConfiguracion() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

function Contenido() {
  const q = useSearchParams();
  const router = useRouter();
  const forzarClave = q.get('cambiar') === '1';
  const pedida = q.get('seccion') as S | null;
  const s: S = forzarClave ? 'clave' : pedida && SECCIONES.some((x) => x.valor === pedida) ? pedida : 'empresa';
  const e = useEmpresa();
  const ir = (v: S) => router.replace(`/configuracion?seccion=${v}`, { scroll: false });

  return (
    <>
      <Encabezado titulo="Configuración" descripcion="Todo el sistema se ajusta aquí, como una calculadora: los valores de ley vienen precargados y usted decide qué cambiar." />
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Secciones de configuración" className="lg:sticky lg:top-20 lg:self-start">
          <select value={s} onChange={(x) => ir(x.target.value as S)} className="mb-2 w-full rounded-xl border border-borde bg-tarjeta px-3 py-2.5 lg:hidden" aria-label="Sección">
            {SECCIONES.map((x) => (
              <option key={x.valor} value={x.valor}>
                {x.etiqueta}
              </option>
            ))}
          </select>
          <ul className="hidden space-y-0.5 lg:block">
            {SECCIONES.map((x) => {
              const I = x.icono;
              return (
                <li key={x.valor}>
                  <button
                    onClick={() => ir(x.valor)}
                    aria-current={s === x.valor ? 'page' : undefined}
                    className={cx('flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition', s === x.valor ? 'bg-marca-50 text-marca-700' : 'hover:bg-marca-50/50')}
                  >
                    <I className={cx('mt-0.5 h-[18px] w-[18px] flex-none', s === x.valor ? 'text-marca-600' : 'text-suave')} />
                    <span>
                      <span className="block text-[15px] font-medium leading-tight">{x.etiqueta}</span>
                      <span className="block text-xs text-suave">{x.ayuda}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 space-y-5">
          {s === 'empresa' && <SeccionEmpresa e={e} />}
          {s === 'calendario' && <SeccionCalendario e={e} />}
          {s === 'jornada' && <SeccionJornada e={e} />}
          {s === 'estructura' && <SeccionEstructura />}
          {s === 'asistencia' && <SeccionAsistencia e={e} />}
          {s === 'parametros' && <SeccionParametros />}
          {s === 'tablas' && <SeccionTablas />}
          {s === 'conceptos' && <SeccionConceptos />}
          {s === 'formatos' && <SeccionFormatos />}
          {s === 'seguridad' && (
            <>
              <SeccionReglas e={e} />
              <SeccionCampos e={e} />
            </>
          )}
          {s === 'usuarios' && <SeccionUsuarios />}
          {s === 'respaldo' && <SeccionRespaldo />}
          {s === 'clave' && <CambiarPassword forzado={forzarClave} />}
        </div>
      </div>
    </>
  );
}
