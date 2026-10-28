'use client';

import { ArrowLeft, ArrowRight, Check, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useEmpresa } from '@/components/config/comun';
import { SeccionEstructura } from '@/components/config/estructura';
import { SeccionAsistencia, SeccionCalendario, SeccionEmpresa } from '@/components/config/general';
import { mostrarValor } from '@/components/config/parametros';
import { Boton, Cargando, cx, Encabezado, Tarjeta } from '@/components/ui';
import { patch } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { useSesion } from '@/lib/sesion';

const PASOS = ['Empresa', 'Días laborales', 'Sedes y pagos', 'Valores de ley', 'Marcación', 'Empleados'];
const CLAVE = ['SMMLV', 'AUX_TRANSPORTE', 'UVT', 'HORAS_SEMANALES', 'PCT_SALUD_EMPLEADO', 'PCT_PENSION_EMPLEADO'];

export default function Asistente() {
  const e = useEmpresa();
  const sesion = useSesion();
  const router = useRouter();
  const [paso, setPaso] = useState<number | null>(null);
  const params = useDatos<any[]>(paso === 3 ? '/parametros' : null);

  useEffect(() => {
    if (e.empresa && paso === null) setPaso(Math.min(e.empresa.asistentePaso ?? 0, PASOS.length - 1));
  }, [e.empresa, paso]);

  const ir = (n: number) => {
    setPaso(n);
    patch('/empresa', { asistentePaso: n }).catch(() => undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const terminar = async () => {
    await e.guardarEmpresa({ asistenteCompletado: true, asistentePaso: PASOS.length - 1 });
    await sesion.recargar();
    router.push('/');
  };

  if (paso === null) return <Cargando />;
  return (
    <>
      <Encabezado titulo="Primeros pasos" descripcion="Seis pasos para dejar la empresa lista. Puede salir cuando quiera y continuar después; todo se puede cambiar luego en Configuración." />
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <li key={p}>
            <button onClick={() => ir(i)} aria-current={i === paso ? 'step' : undefined} className={cx('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition', i === paso ? 'border-marca-500 bg-marca-50 font-medium text-marca-700' : i < paso ? 'border-exito/40 text-exito' : 'border-borde text-suave')}>
              <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-xs', i < paso ? 'bg-exito text-white' : i === paso ? 'bg-marca-500 text-white' : 'bg-borde')}>{i < paso ? <Check className="h-3 w-3" /> : i + 1}</span>
              {p}
            </button>
          </li>
        ))}
      </ol>

      <div className="space-y-5">
        {paso === 0 && <SeccionEmpresa e={e} />}
        {paso === 1 && <SeccionCalendario e={e} />}
        {paso === 2 && <SeccionEstructura />}
        {paso === 3 && (
          <Tarjeta titulo="Valores de ley ya cargados" subtitulo="Vienen con los valores de 2026 y su fecha de vigencia. Revíselos; si su empresa paga más que el mínimo legal, cámbielos en Parámetros.">
            {!params.datos ? (
              <Cargando />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CLAVE.map((c) => {
                  const p = params.datos!.find((x) => x.codigo === c);
                  return (
                    p && (
                      <div key={c} className="rounded-xl border border-borde p-4">
                        <p className="text-sm text-suave">{p.nombre}</p>
                        <p className="text-xl font-semibold tabular">{mostrarValor(p.tipo, p.valorActual)}</p>
                        {p.baseLegal && <p className="text-xs text-suave">{p.baseLegal}</p>}
                      </div>
                    )
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-sm">
              Hay {params.datos?.length ?? '…'} parámetros en total.{' '}
              <Link href="/configuracion?seccion=parametros" className="font-medium text-marca-600 hover:underline">
                Ver todos los parámetros
              </Link>
            </p>
          </Tarjeta>
        )}
        {paso === 4 && <SeccionAsistencia e={e} />}
        {paso === 5 && (
          <Tarjeta titulo="Agregue a sus empleados" subtitulo="Uno por uno o todos de una vez con la plantilla de Excel.">
            <div className="grid gap-3 md:grid-cols-2">
              <Link href="/empleados/nuevo" className="rounded-xl border border-borde p-5 transition hover:border-marca-500 hover:bg-marca-50/50">
                <p className="font-medium">Crear un empleado</p>
                <p className="text-sm text-suave">Datos personales, contrato, salario y afiliaciones en un solo formulario.</p>
              </Link>
              <Link href="/empleados?importar=1" className="rounded-xl border border-borde p-5 transition hover:border-marca-500 hover:bg-marca-50/50">
                <p className="font-medium">Importar desde Excel</p>
                <p className="text-sm text-suave">Descargue la plantilla, llénela y súbala. El sistema revisa cada fila antes de guardar.</p>
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-destacado p-5 text-white">
              <PartyPopper className="h-7 w-7 flex-none" />
              <p>Cuando tenga empleados, vaya a Nómina y cree el primer periodo. El sistema le muestra paso a paso cómo calculó cada valor.</p>
            </div>
          </Tarjeta>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <Boton variante="secundario" disabled={paso === 0} icono={<ArrowLeft className="h-4 w-4" />} onClick={() => ir(paso - 1)}>
          Anterior
        </Boton>
        {paso < PASOS.length - 1 ? (
          <Boton onClick={() => ir(paso + 1)}>
            Siguiente <ArrowRight className="h-4 w-4" />
          </Boton>
        ) : (
          <Boton variante="exito" cargando={e.guardando} icono={<Check className="h-4 w-4" />} onClick={terminar}>
            Terminar
          </Boton>
        )}
      </div>
    </>
  );
}
