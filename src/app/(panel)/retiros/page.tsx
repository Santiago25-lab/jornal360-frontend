'use client';

import { Calculator, CheckCircle2, Download, UserMinus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Aviso, Boton, Campo, Cargando, cx, Encabezado, Entrada, Insignia, Interruptor, Modal, Selector, Tabla, Tarjeta, useAccion, useAvisos } from '@/components/ui';
import { descargar, get, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fecha, hoy, numero, pesos, valorVariable } from '@/lib/formato';

const CAUSAS = [
  'Renuncia voluntaria',
  'Despido sin justa causa',
  'Despido con justa causa',
  'Terminación del plazo pactado',
  'Terminación de la obra o labor',
  'Mutuo acuerdo',
  'Periodo de prueba',
  'Pensión',
  'Fallecimiento',
];

export default function PaginaRetiros() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

function Contenido() {
  const q = useSearchParams();
  const { datos: lista, cargando, recargar } = useDatos<any[]>('/retiros');
  const { datos: empleados } = useDatos<any[]>('/empleados?estado=activo');
  const [form, setForm] = useState({ empleadoId: q.get('empleadoId') ?? '', fechaRetiro: hoy(), causa: CAUSAS[0], sinJustaCausa: false, fechaPago: '' });
  const [calculo, setCalculo] = useState<any>(null);
  const [visto, setVisto] = useState<any>(null);
  const { ejecutar, cargando: trabajando } = useAccion();
  const { confirmar, error } = useAvisos();

  useEffect(() => setCalculo(null), [form.empleadoId, form.fechaRetiro, form.sinJustaCausa, form.causa, form.fechaPago]);

  const cuerpo = () => ({ ...form, fechaPago: form.fechaPago || null });
  const calcular = async () => setCalculo(await ejecutar(() => post('/retiros/calcular', cuerpo())));
  const guardar = async () => {
    const r = await ejecutar(() => post('/retiros', cuerpo()), 'Liquidación guardada como borrador');
    if (r) {
      setCalculo(null);
      recargar();
    }
  };
  const aprobar = async (r: any) => {
    const ok = await confirmar({ titulo: 'Aprobar el retiro', mensaje: `Se terminará el contrato de ${r.nombres} ${r.apellidos} el ${fecha(r.fechaRetiro)}, el empleado quedará retirado y se desvinculará su celular. ¿Continuar?`, confirmar: 'Sí, aprobar' });
    if (ok && (await ejecutar(() => post(`/retiros/${r.id}/aprobar`), 'Retiro aprobado'))) recargar();
  };

  return (
    <>
      <Encabezado titulo="Retiros" descripcion="Liquidación del contrato: cesantías, intereses, prima, vacaciones pendientes, indemnización y descuentos autorizados." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Tarjeta titulo="Calcular una liquidación">
          <div className="space-y-4">
            <Campo etiqueta="Empleado">
              <Selector
                value={form.empleadoId}
                onChange={(e) => setForm({ ...form, empleadoId: e.target.value })}
                vacio="Elija el empleado…"
                opciones={(empleados ?? []).map((e) => ({ valor: e.id, etiqueta: `${e.apellidos} ${e.nombres} · ${e.numeroDocumento}` }))}
              />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Último día trabajado">
                <Entrada type="date" value={form.fechaRetiro} onChange={(e) => setForm({ ...form, fechaRetiro: e.target.value })} />
              </Campo>
              <Campo etiqueta="Fecha de pago" opcional ayuda="Si se paga después del retiro, el sistema calcula la indemnización moratoria (CST art. 65).">
                <Entrada type="date" value={form.fechaPago} onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="Causa">
              <Selector value={form.causa} onChange={(e) => setForm({ ...form, causa: e.target.value, sinJustaCausa: e.target.value === 'Despido sin justa causa' ? true : form.sinJustaCausa })} opciones={CAUSAS.map((c) => ({ valor: c, etiqueta: c }))} />
            </Campo>
            <Interruptor activo={form.sinJustaCausa} onCambio={(v) => setForm({ ...form, sinJustaCausa: v })} etiqueta="Pagar indemnización por despido sin justa causa" descripcion="CST art. 64. Se calcula según el tipo de contrato y el tiempo trabajado." />
            <Boton disabled={!form.empleadoId} cargando={trabajando} icono={<Calculator className="h-4 w-4" />} onClick={calcular} className="w-full">
              Calcular
            </Boton>
          </div>
        </Tarjeta>
        <div>
          {calculo ? (
            <Resultado r={calculo} acciones={<Boton cargando={trabajando} onClick={guardar}>Guardar como borrador</Boton>} />
          ) : (
            <Tarjeta>
              <div className="flex flex-col items-center gap-2 py-12 text-center text-suave">
                <UserMinus className="h-8 w-8" />
                <p>Elija el empleado y la fecha; el resultado aparece aquí con el detalle de cada valor.</p>
              </div>
            </Tarjeta>
          )}
        </div>
      </div>
      <Tarjeta titulo="Liquidaciones de contrato" className="mt-5">
        {cargando && !lista ? (
          <Cargando />
        ) : (
          <Tabla
            filas={lista ?? []}
            clave={(r) => r.id}
            vacio="No hay retiros registrados"
            alClic={async (r) => setVisto(await get(`/retiros/${r.id}`).catch((e) => (error(e), null)))}
            columnas={[
              { clave: 'empleado', titulo: 'Empleado', celda: (r: any) => <span className="font-medium">{r.apellidos} {r.nombres}</span> },
              { clave: 'fecha', titulo: 'Retiro', celda: (r: any) => fecha(r.fechaRetiro) },
              { clave: 'causa', titulo: 'Causa' },
              { clave: 'total', titulo: 'Total', derecha: true, celda: (r: any) => pesos(r.total) },
              { clave: 'estado', titulo: 'Estado', celda: (r: any) => <Insignia tono={r.estado === 'aprobado' ? 'exito' : 'alerta'}>{r.estado === 'aprobado' ? 'Aprobado' : 'Borrador'}</Insignia> },
              {
                clave: 'acciones',
                titulo: '',
                celda: (r: any) => (
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Boton tamano="sm" variante="secundario" icono={<Download className="h-4 w-4" />} onClick={() => descargar(`/retiros/${r.id}/pdf`, `liquidacion-${r.apellidos}.pdf`).catch(error)}>
                      PDF
                    </Boton>
                    {r.estado === 'borrador' && (
                      <Boton tamano="sm" icono={<CheckCircle2 className="h-4 w-4" />} onClick={() => aprobar(r)}>
                        Aprobar
                      </Boton>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Tarjeta>
      <Modal abierto={!!visto} onCerrar={() => setVisto(null)} titulo="Liquidación del contrato" ancho="lg">
        {visto && <Resultado r={visto.resultado} />}
      </Modal>
    </>
  );
}

function Resultado({ r, acciones }: { r: any; acciones?: React.ReactNode }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  return (
    <Tarjeta>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{r.empleado}</h3>
            <p className="text-sm text-suave">
              Ingreso {fecha(r.fechaIngreso)} · Retiro {fecha(r.fechaRetiro)} · Salario {pesos(r.salario)}
            </p>
            <p className="text-sm text-suave">
              {r.causa}
              {r.sinJustaCausa ? ' (sin justa causa)' : ''}
            </p>
          </div>
          {acciones}
        </div>
        <div className="rounded-2xl bg-destacado p-5 text-white">
          <p className="text-sm opacity-90">Total a pagar</p>
          <p className="text-3xl font-semibold tabular">{pesos(r.totales.neto)}</p>
          {r.moratoria && <p className="mt-1 text-sm opacity-90">Más indemnización moratoria por {r.moratoria.dias} días: {pesos(r.moratoria.total)}</p>}
        </div>
        {(r.notas ?? []).map((n: string, i: number) => (
          <Aviso key={i} tono="alerta">
            {n}
          </Aviso>
        ))}
        <div>
          {r.lineas.map((l: any, i: number) => (
            <div key={i} className="border-b border-borde/70 last:border-0">
              <button className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-marca-50/40" onClick={() => setAbierta(abierta === i ? null : i)}>
                <span>
                  {l.nombre} {l.cantidad && <span className="text-xs text-suave">({numero(l.cantidad, 2)} días)</span>}
                </span>
                <span className={cx('font-medium tabular', l.tipo === 'deduccion' && 'text-peligro')}>
                  {l.tipo === 'deduccion' ? '− ' : ''}
                  {pesos(l.valor)}
                </span>
              </button>
              {abierta === i && (
                <div className="mb-3 space-y-1 rounded-xl bg-fondo p-3 text-sm">
                  {l.detalle?.formula && (
                    <p>
                      <span className="text-suave">Fórmula: </span>
                      <code className="font-mono text-[13px]">{l.detalle.formula}</code>
                    </p>
                  )}
                  {Object.entries(l.detalle?.variables ?? {}).map(([k, v]) => (
                    <p key={k} className="flex justify-between">
                      <span className="font-mono text-[12px] text-suave">{k}</span>
                      <span className="tabular">{valorVariable(v)}</span>
                    </p>
                  ))}
                  {l.detalle?.nota && <p>{typeof l.detalle.nota === 'string' ? l.detalle.nota : JSON.stringify(l.detalle.nota)}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
        {r.vacaciones && (
          <p className="text-sm text-suave">
            Vacaciones: {numero(r.vacaciones.causados, 2)} días causados, {numero(r.vacaciones.disfrutados, 2)} disfrutados, {numero(r.vacaciones.pendientes, 2)} pendientes.
          </p>
        )}
        <Aviso>{r.recordatorio}</Aviso>
      </div>
    </Tarjeta>
  );
}
