'use client';

import { AlertTriangle, ArrowRight, CalendarDays, Clock, PiggyBank, Rocket, Stethoscope, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { GraficaCosto, GraficaDistribucion } from '@/components/graficas';
import { Indicador } from '@/components/indicador';
import { Boton, Cargando, cx, Insignia, Pildoras, Tarjeta, Vacio } from '@/components/ui';
import { useDatos } from '@/lib/datos';
import { compacto, fecha, numero, pesos } from '@/lib/formato';
import { useSesion } from '@/lib/sesion';

export default function Inicio() {
  const { usuario } = useSesion();
  const [meses, setMeses] = useState<'6' | '12' | '24'>('12');
  const { datos: p, cargando } = useDatos<any>(`/reportes/panel?meses=${meses}`);
  const { datos: hoy } = useDatos<any>('/asistencia/hoy');

  const saludo = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {saludo}, {usuario?.nombre ?? ''}
          </h1>
          <p className="mt-1 text-suave">Así va la nómina y la asistencia de su empresa.</p>
        </div>
        <Pildoras
          opciones={[
            { valor: '6', etiqueta: '6 meses' },
            { valor: '12', etiqueta: '12 meses' },
            { valor: '24', etiqueta: '24 meses' },
          ]}
          valor={meses}
          onCambio={setMeses}
        />
      </div>

      {usuario && !usuario.asistenteCompletado && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-marca-100 bg-marca-50 p-5 animate-entrar">
          <div className="flex items-start gap-3">
            <Rocket className="mt-0.5 h-5 w-5 text-marca-500" />
            <div>
              <p className="font-semibold">Deje su empresa lista en unos minutos</p>
              <p className="text-sm text-suave">El asistente le pregunta lo básico; todo viene con el valor legal ya marcado.</p>
            </div>
          </div>
          <Link href="/asistente">
            <Boton icono={<ArrowRight className="h-4 w-4" />}>Abrir el asistente</Boton>
          </Link>
        </div>
      )}

      {cargando && !p ? (
        <Cargando />
      ) : (
        p && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Indicador
                destacado
                titulo="Costo total de la última nómina"
                valor={p.ultimoPeriodo ? compacto(p.ultimoPeriodo.costo) : '—'}
                detalle={p.ultimoPeriodo?.nombre ?? 'Aún no hay nóminas liquidadas'}
                variacion={p.ultimoPeriodo?.variacionCosto}
                variacionPositivaEsBuena={false}
                icono={<Wallet className="h-5 w-5" />}
                href={p.ultimoPeriodo ? `/nomina/${p.ultimoPeriodo.id}` : '/nomina'}
              />
              <Indicador titulo="Neto pagado a empleados" valor={p.ultimoPeriodo ? compacto(p.ultimoPeriodo.neto) : '—'} variacion={p.ultimoPeriodo?.variacionNeto} icono={<PiggyBank className="h-5 w-5" />} href="/nomina" />
              <Indicador titulo="Empleados activos" valor={numero(p.empleadosActivos)} detalle={hoy ? `${hoy.presentes} trabajando ahora` : undefined} icono={<Users className="h-5 w-5" />} href="/empleados" />
              <Indicador titulo="Horas extra aprobadas este mes" valor={numero(p.horasExtraMes, 1)} detalle={`${p.ausentismoMes?.dias ?? 0} días de ausencia o incapacidad`} icono={<Clock className="h-5 w-5" />} href="/asistencia?pestana=horas" />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Tarjeta className="xl:col-span-2" titulo="Costo de la nómina por mes" subtitulo="Salarios, aportes del empleador y provisiones">
                {p.serie.length ? <GraficaCosto datos={p.serie} /> : <Vacio titulo="Todavía no hay nóminas liquidadas" descripcion="Cuando liquide la primera nómina verá aquí su evolución." accion={<Link href="/nomina"><Boton variante="secundario">Ir a nómina</Boton></Link>} />}
              </Tarjeta>
              <Tarjeta titulo="Pendientes" subtitulo="Lo que necesita su atención">
                {p.pendientes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-suave">Todo al día. No hay pendientes.</p>
                ) : (
                  <ul className="space-y-2">
                    {p.pendientes.slice(0, 7).map((x: any, i: number) => (
                      <li key={i}>
                        <Link href={x.enlace} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-marca-50">
                          <span className={cx('mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg', x.nivel === 'urgente' ? 'bg-peligro/15 text-peligro' : x.nivel === 'advertencia' ? 'bg-alerta/15 text-alerta' : 'bg-marca-50 text-marca-600')}>
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{x.titulo}</span>
                            <span className="block truncate text-xs text-suave">{x.detalle}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Tarjeta>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Tarjeta className="xl:col-span-2" titulo="En qué se va la plata" subtitulo={p.ultimoPeriodo ? `${p.ultimoPeriodo.nombre} · porcentaje del costo total` : undefined}>
                {p.distribucion.length ? <GraficaDistribucion datos={p.distribucion} /> : <Vacio titulo="Sin datos todavía" />}
              </Tarjeta>
              <Tarjeta titulo="Asistencia de hoy" accion={<Link href="/asistencia" className="text-sm text-marca-600 hover:underline">Ver detalle</Link>}>
                {hoy ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { t: 'Trabajando', v: hoy.presentes, tono: 'text-exito' },
                      { t: 'Ya salieron', v: hoy.salieron, tono: 'text-texto' },
                      { t: 'Llegaron tarde', v: hoy.tarde, tono: 'text-alerta' },
                      { t: 'Sin marcar', v: hoy.sinMarcar, tono: 'text-peligro' },
                    ].map((x) => (
                      <div key={x.t} className="rounded-xl bg-fondo p-3">
                        <p className={cx('text-2xl font-semibold tabular', x.tono)}>{x.v}</p>
                        <p className="text-sm text-suave">{x.t}</p>
                      </div>
                    ))}
                    <p className="col-span-2 text-xs text-suave">
                      {hoy.programados} con turno hoy · {hoy.porKiosco} marcaron en kiosco · {hoy.asistidas} marcaciones asistidas
                    </p>
                  </div>
                ) : (
                  <Cargando />
                )}
              </Tarjeta>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Tarjeta className="xl:col-span-2" titulo="Calendario de obligaciones" subtitulo="Fechas legales del año">
                <ul className="divide-y divide-borde">
                  {p.calendario.map((o: any, i: number) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="flex items-center gap-3">
                        <CalendarDays className="h-4 w-4 text-marca-500" />
                        <span>
                          <span className="block text-sm font-medium">{o.nombre}</span>
                          <span className="block text-xs text-suave">{o.baseLegal}</span>
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm tabular">{fecha(o.fecha)}</span>
                        {o.diasRestantes < 0 ? <Insignia>Pasó</Insignia> : o.diasRestantes <= o.avisarDias ? <Insignia tono="alerta">Faltan {o.diasRestantes} días</Insignia> : <span className="text-xs text-suave">en {o.diasRestantes} días</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
              <Tarjeta titulo="Prestaciones acumuladas en el año" subtitulo="Lo que la empresa ya provisionó">
                <ul className="space-y-3">
                  {[
                    { t: 'Cesantías e intereses', v: p.provisionesAnio.cesantias },
                    { t: 'Prima de servicios', v: p.provisionesAnio.prima },
                    { t: 'Vacaciones', v: p.provisionesAnio.vacaciones },
                  ].map((x) => (
                    <li key={x.t} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm">
                        <Stethoscope className="h-4 w-4 text-suave" />
                        {x.t}
                      </span>
                      <span className="font-semibold tabular">{pesos(x.v)}</span>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            </div>
          </>
        )
      )}
    </div>
  );
}
