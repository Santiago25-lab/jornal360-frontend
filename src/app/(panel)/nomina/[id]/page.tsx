'use client';

import { ArrowLeft, Banknote, Calculator, Check, CheckCircle2, FileDown, Lock, RotateCcw, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Indicador } from '@/components/indicador';
import { PasoAPaso } from '@/components/paso-a-paso';
import { Aviso, Boton, Campo, Cargando, cx, Encabezado, Entrada, Insignia, Modal, Pestanas, Selector, Tabla, Tarjeta, useAccion, useAvisos } from '@/components/ui';
import { borrar, descargarBase64, get, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fecha, NOMBRE_ESTADO_PERIODO, pesos, porcentaje, TONO_ESTADO } from '@/lib/formato';

type P = 'empleados' | 'conceptos' | 'comparativo' | 'pagos' | 'contabilidad' | 'retroactivo';
const PASOS = ['abierto', 'liquidado', 'aprobado', 'cerrado'];

export default function DetallePeriodo() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { datos: r, recargar, cargando } = useDatos<any>(`/periodos/${id}`);
  const [p, setP] = useState<P>('empleados');
  const [detalle, setDetalle] = useState<{ empleadoId: string; det: any } | null>(null);
  const [motivo, setMotivo] = useState<null | 'reabrir' | 'rechazar'>(null);
  const [textoMotivo, setTextoMotivo] = useState('');
  const { ejecutar, cargando: trabajando } = useAccion();
  const { avisar, error, confirmar } = useAvisos();

  if (cargando && !r) return <Cargando />;
  if (!r) return null;
  const per = r.periodo;
  const paso = PASOS.indexOf(per.estado);
  const esNomina = per.tipo === 'nomina';

  const accion = async (ruta: string, ok: string, cuerpo: unknown = {}) => {
    const x: any = await ejecutar(() => post(`/periodos/${id}/${ruta}`, cuerpo), ok);
    if (x?.errores?.length) avisar(x.errores.map((e: any) => `${e.empleado}: ${e.mensaje}`).join(' · '), 'info');
    if (x?.advertencia) avisar(x.advertencia, 'info');
    recargar();
    return x;
  };

  const abrirDetalle = async (empleadoId: string) => {
    try {
      setDetalle({ empleadoId, det: await get(`/periodos/${id}/empleados/${empleadoId}`) });
    } catch (e) {
      error(e);
    }
  };

  return (
    <div>
      <Link href={esNomina ? '/nomina' : '/prestaciones'} className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
        <ArrowLeft className="h-4 w-4" /> {esNomina ? 'Nómina' : 'Prestaciones'}
      </Link>
      <Encabezado
        titulo={per.nombre}
        descripcion={`${fecha(per.desde)} a ${fecha(per.hasta)}${per.fechaPago ? ` · Pago el ${fecha(per.fechaPago)}` : ''}`}
        acciones={
          <div className="flex flex-wrap gap-2">
            {esNomina && (per.estado === 'abierto' || per.estado === 'liquidado') && (
              <Boton icono={<Calculator className="h-4 w-4" />} cargando={trabajando} onClick={() => accion('liquidar', 'Nómina liquidada')}>
                {per.estado === 'abierto' ? 'Liquidar nómina' : 'Volver a liquidar'}
              </Boton>
            )}
            {per.estado === 'liquidado' && (
              <>
                <Boton variante="secundario" icono={<Undo2 className="h-4 w-4" />} onClick={() => setMotivo('rechazar')}>
                  Devolver
                </Boton>
                <Boton variante="exito" icono={<Check className="h-4 w-4" />} cargando={trabajando} onClick={() => accion('aprobar', 'Nómina aprobada')}>
                  Aprobar
                </Boton>
              </>
            )}
            {per.estado === 'aprobado' && (
              <Boton
                icono={<Lock className="h-4 w-4" />}
                cargando={trabajando}
                onClick={async () => {
                  if (await confirmar({ titulo: 'Cerrar la nómina', mensaje: 'Al cerrar, el periodo queda bloqueado, se descuentan los saldos de préstamos y se habilita el archivo del banco. Puede reabrirlo después con un motivo.', confirmar: 'Cerrar nómina' }))
                    accion('cerrar', 'Nómina cerrada');
                }}
              >
                Cerrar nómina
              </Boton>
            )}
            {(per.estado === 'aprobado' || per.estado === 'cerrado') && (
              <Boton variante="secundario" icono={<RotateCcw className="h-4 w-4" />} onClick={() => setMotivo('reabrir')}>
                Reabrir
              </Boton>
            )}
            {(per.estado === 'abierto' || per.estado === 'liquidado') && (
              <Boton
                variante="fantasma"
                onClick={async () => {
                  if (!(await confirmar({ titulo: 'Borrar periodo', mensaje: 'Se borra el periodo y su liquidación.', peligro: true, confirmar: 'Borrar' }))) return;
                  await borrar(`/periodos/${id}`).catch(error);
                  router.push('/nomina');
                }}
              >
                Borrar
              </Boton>
            )}
          </div>
        }
      />

      <ol className="mb-6 flex flex-wrap items-center gap-2">
        {PASOS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cx('flex h-7 items-center gap-1.5 rounded-full px-3 text-sm', i < paso ? 'bg-exito/15 text-exito' : i === paso ? 'bg-marca-500 text-white' : 'bg-borde/50 text-suave')}>
              {i < paso && <CheckCircle2 className="h-4 w-4" />}
              {NOMBRE_ESTADO_PERIODO[s]}
            </span>
            {i < PASOS.length - 1 && <span className="h-px w-6 bg-borde" />}
          </li>
        ))}
      </ol>

      {per.estado === 'abierto' && esNomina && (
        <div className="mb-6">
          <Aviso tono="info" titulo="Antes de liquidar">
            Revise que estén aprobadas las horas extra del periodo y registradas las novedades (incapacidades, vacaciones, comisiones). Puede liquidar cuantas veces quiera hasta aprobar.
          </Aviso>
        </div>
      )}

      {r.totales.empleados > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador destacado titulo="Costo total para la empresa" valor={pesos(r.totales.costoTotal)} detalle={`${r.totales.empleados} empleados`} icono={<Banknote className="h-5 w-5" />} />
          <Indicador titulo="Neto a pagar" valor={pesos(r.totales.neto)} icono={<Banknote className="h-5 w-5" />} />
          <Indicador titulo="Aportes del empleador" valor={pesos(r.totales.aportesEmpleador)} icono={<Banknote className="h-5 w-5" />} />
          <Indicador titulo="Provisiones" valor={pesos(r.totales.provisiones)} detalle={r.alertas ? `${r.alertas} alertas por revisar` : 'Sin alertas'} icono={<Banknote className="h-5 w-5" />} />
        </div>
      )}

      <Pestanas<P>
        activa={p}
        onCambio={setP}
        pestanas={[
          { valor: 'empleados', etiqueta: 'Empleados', contador: r.totales.empleados },
          { valor: 'conceptos', etiqueta: 'Por concepto' },
          { valor: 'comparativo', etiqueta: 'Comparativo' },
          { valor: 'pagos', etiqueta: 'Pago al banco' },
          { valor: 'contabilidad', etiqueta: 'Contabilidad' },
          ...(esNomina ? [{ valor: 'retroactivo' as P, etiqueta: 'Retroactivo' }] : []),
        ]}
      />

      {p === 'empleados' && (
        <Tarjeta>
          <Tabla
            filas={r.empleados}
            vacio={per.estado === 'abierto' ? 'Liquide la nómina para ver los resultados' : 'Sin empleados'}
            alClic={(e: any) => abrirDetalle(e.empleadoId)}
            clave={(e: any) => e.empleadoId}
            columnas={[
              { clave: 'empleado', titulo: 'Empleado', celda: (e: any) => <span><span className="block font-medium">{e.empleado}</span><span className="text-xs text-suave">{e.documento}</span></span> },
              { clave: 'devengos', titulo: 'Devengos', derecha: true, celda: (e: any) => pesos(e.devengos) },
              { clave: 'deducciones', titulo: 'Deducciones', derecha: true, celda: (e: any) => pesos(e.deducciones) },
              { clave: 'neto', titulo: 'Neto', derecha: true, celda: (e: any) => <span className="font-semibold">{pesos(e.neto)}</span> },
              {
                clave: 'alertas',
                titulo: '',
                celda: (e: any) => {
                  const n = (e.alertas ?? []).filter((a: any) => a.nivel !== 'info');
                  return n.length ? <Insignia tono={n.some((a: any) => a.nivel === 'error') ? 'peligro' : 'alerta'}>{n.length} alerta(s)</Insignia> : null;
                },
              },
            ]}
          />
        </Tarjeta>
      )}
      {p === 'conceptos' && (
        <Tarjeta>
          <Tabla
            filas={r.conceptos}
            columnas={[
              { clave: 'nombre', titulo: 'Concepto' },
              { clave: 'tipo', titulo: 'Tipo', celda: (c: any) => ({ devengo: 'Devengo', deduccion: 'Deducción', aporte_empleador: 'Aporte empleador', provision: 'Provisión' })[c.tipo as string] },
              { clave: 'empleados', titulo: 'Empleados', derecha: true },
              { clave: 'total', titulo: 'Total', derecha: true, celda: (c: any) => pesos(c.total) },
            ]}
          />
        </Tarjeta>
      )}
      {p === 'comparativo' && <Comparativo id={id} />}
      {p === 'pagos' && <Pagos id={id} estado={per.estado} />}
      {p === 'contabilidad' && <Contabilidad id={id} />}
      {p === 'retroactivo' && <Retroactivo id={id} estado={per.estado} alAplicar={recargar} />}

      <Modal abierto={!!detalle} onCerrar={() => setDetalle(null)} titulo={detalle?.det.empleado ?? ''} ancho="lg">
        {detalle && <PasoAPaso det={detalle.det} periodoId={id} empleadoId={detalle.empleadoId} />}
      </Modal>
      <Modal
        abierto={!!motivo}
        onCerrar={() => setMotivo(null)}
        titulo={motivo === 'reabrir' ? 'Reabrir la nómina' : 'Devolver la nómina'}
        pie={
          <Boton
            disabled={textoMotivo.trim().length < 3}
            onClick={async () => {
              await accion(motivo!, motivo === 'reabrir' ? 'Nómina reabierta' : 'Nómina devuelta', { motivo: textoMotivo });
              setMotivo(null);
              setTextoMotivo('');
            }}
          >
            Confirmar
          </Boton>
        }
      >
        <Campo etiqueta="Motivo" ayuda="Queda en la auditoría">
          <Entrada value={textoMotivo} onChange={(e) => setTextoMotivo(e.target.value)} autoFocus />
        </Campo>
      </Modal>
    </div>
  );
}

function Comparativo({ id }: { id: string }) {
  const { datos, cargando } = useDatos<any>(`/periodos/${id}/comparativo`);
  if (cargando && !datos) return <Cargando />;
  if (!datos) return null;
  if (!datos.anterior) return <Aviso>No hay un periodo anterior del mismo grupo para comparar.</Aviso>;
  const fila = (x: any) => <span className={cx('tabular', x.resaltar && 'font-semibold text-alerta')}>{porcentaje(x.variacion)}</span>;
  return (
    <div className="space-y-6">
      <Aviso tono="info">Comparado con {datos.anterior.nombre}. Se resaltan las variaciones mayores a {porcentaje(datos.umbral, 0)}.</Aviso>
      <Tarjeta titulo="Por concepto">
        <Tabla
          filas={datos.conceptos}
          columnas={[
            { clave: 'nombre', titulo: 'Concepto' },
            { clave: 'anterior', titulo: 'Anterior', derecha: true, celda: (x: any) => pesos(x.anterior) },
            { clave: 'actual', titulo: 'Actual', derecha: true, celda: (x: any) => pesos(x.actual) },
            { clave: 'variacion', titulo: 'Variación', derecha: true, celda: fila },
          ]}
        />
      </Tarjeta>
      <Tarjeta titulo="Por empleado (neto)">
        <Tabla
          filas={datos.empleados}
          columnas={[
            { clave: 'empleado', titulo: 'Empleado', celda: (x: any) => <span>{x.empleado} {x.nuevo && <Insignia tono="marca">Nuevo</Insignia>} {x.salio && <Insignia>Salió</Insignia>}</span> },
            { clave: 'anterior', titulo: 'Anterior', derecha: true, celda: (x: any) => pesos(x.anterior) },
            { clave: 'actual', titulo: 'Actual', derecha: true, celda: (x: any) => pesos(x.actual) },
            { clave: 'variacion', titulo: 'Variación', derecha: true, celda: fila },
          ]}
        />
      </Tarjeta>
    </div>
  );
}

function Pagos({ id, estado }: { id: string; estado: string }) {
  const { datos: formatos } = useDatos<any[]>('/formatos?clase=banco');
  const { datos: pagos, recargar } = useDatos<any[]>(`/pagos/periodos/${id}`);
  const [formato, setFormato] = useState('BANCOLOMBIA');
  const [invalidos, setInvalidos] = useState<any[] | null>(null);
  const { avisar, error } = useAvisos();
  const generar = async (excluir: boolean) => {
    try {
      const r = await post(`/pagos/periodos/${id}/archivo`, { formato, excluirInvalidos: excluir });
      descargarBase64(r.contenidoBase64, r.nombre, 'text/plain');
      avisar(`Archivo generado: ${r.registros} pagos por ${pesos(r.total)}`);
      if (r.nota) avisar(r.nota, 'info');
      setInvalidos(null);
      recargar();
    } catch (e: any) {
      if (e?.datos?.invalidos) setInvalidos(e.datos.invalidos);
      else error(e);
    }
  };
  if (estado !== 'aprobado' && estado !== 'cerrado') return <Aviso>El archivo del banco se genera cuando la nómina está aprobada.</Aviso>;
  return (
    <div className="space-y-6">
      <Tarjeta titulo="Archivo de pago masivo" subtitulo="Súbalo al portal empresarial de su banco y pague a todos de una vez">
        <div className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Banco o formato" className="w-72">
            <Selector value={formato} onChange={(e) => setFormato(e.target.value)} opciones={(formatos ?? []).filter((f) => f.activo).map((f) => ({ valor: f.codigo, etiqueta: f.nombre }))} />
          </Campo>
          <Boton icono={<FileDown className="h-4 w-4" />} onClick={() => generar(false)}>
            Generar archivo
          </Boton>
        </div>
        {invalidos && (
          <div className="mt-4 space-y-3">
            <Aviso tono="alerta" titulo="Hay empleados con datos bancarios incompletos">
              {invalidos.map((i) => `${i.empleado}: ${i.motivo}`).join(' · ')}
            </Aviso>
            <Boton variante="secundario" onClick={() => generar(true)}>
              Generar sin ellos (págueles aparte)
            </Boton>
          </div>
        )}
      </Tarjeta>
      {(pagos ?? []).length > 0 && (
        <Tarjeta titulo="Estado de los pagos" accion={<Boton tamano="sm" variante="secundario" onClick={() => import('@/lib/api').then((m) => m.patch('/pagos', { ids: (pagos ?? []).map((x) => x.id), estado: 'pagado' })).then(recargar).catch(error)}>Marcar todos como pagados</Boton>}>
          <Tabla
            filas={pagos ?? []}
            columnas={[
              { clave: 'empleado', titulo: 'Empleado', celda: (x: any) => `${x.nombres} ${x.apellidos}` },
              { clave: 'cuenta', titulo: 'Cuenta', celda: (x: any) => (x.numeroCuenta ? `${x.banco ?? ''} ${x.tipoCuenta ?? ''} ${x.numeroCuenta}` : <Insignia tono="alerta">Sin cuenta</Insignia>) },
              { clave: 'valor', titulo: 'Valor', derecha: true, celda: (x: any) => pesos(x.valor) },
              { clave: 'estado', titulo: 'Estado', celda: (x: any) => <Insignia tono={x.estado === 'pagado' ? 'exito' : x.estado === 'rechazado' ? 'peligro' : 'alerta'}>{x.estado}</Insignia> },
            ]}
          />
        </Tarjeta>
      )}
    </div>
  );
}

function Contabilidad({ id }: { id: string }) {
  const { datos, cargando } = useDatos<any>(`/contabilidad/periodos/${id}`);
  const { datos: formatos } = useDatos<any[]>('/formatos?clase=contable');
  const [formato, setFormato] = useState('CONTABLE_GENERICO');
  const { avisar, error } = useAvisos();
  if (cargando && !datos) return <Cargando />;
  if (!datos) return null;
  return (
    <div className="space-y-6">
      {datos.sinCuenta.length > 0 && <Aviso tono="alerta" titulo="Conceptos sin cuenta contable">Asígneles cuenta en Configuración → Conceptos: {datos.sinCuenta.join(', ')}</Aviso>}
      <Tarjeta
        titulo="Comprobante contable"
        subtitulo={`Débitos ${pesos(datos.debitos)} · Créditos ${pesos(datos.creditos)}`}
        accion={
          <div className="flex items-end gap-2">
            <Selector value={formato} onChange={(e) => setFormato(e.target.value)} opciones={(formatos ?? []).map((f) => ({ valor: f.codigo, etiqueta: f.nombre }))} />
            <Boton
              icono={<FileDown className="h-4 w-4" />}
              disabled={datos.sinCuenta.length > 0}
              onClick={async () => {
                try {
                  const r = await post(`/contabilidad/periodos/${id}/exportar`, { formato });
                  descargarBase64(r.contenidoBase64, r.nombre, 'text/csv');
                  if (r.nota) avisar(r.nota, 'info');
                } catch (e) {
                  error(e);
                }
              }}
            >
              Exportar
            </Boton>
          </div>
        }
      >
        {datos.cuadrado ? <div className="mb-3"><Insignia tono="exito">Cuadrado: débitos = créditos</Insignia></div> : <div className="mb-3"><Insignia tono="peligro">Descuadrado</Insignia></div>}
        <Tabla
          filas={datos.movimientos}
          columnas={[
            { clave: 'cuenta', titulo: 'Cuenta' },
            { clave: 'descripcion', titulo: 'Descripción' },
            { clave: 'tercero', titulo: 'Tercero', celda: (m: any) => `${m.tercero.nombre} (${m.tercero.nit})` },
            { clave: 'centroCosto', titulo: 'C. costo' },
            { clave: 'debito', titulo: 'Débito', derecha: true, celda: (m: any) => (Number(m.debito) ? pesos(m.debito, 2) : '') },
            { clave: 'credito', titulo: 'Crédito', derecha: true, celda: (m: any) => (Number(m.credito) ? pesos(m.credito, 2) : '') },
          ]}
        />
      </Tarjeta>
    </div>
  );
}

function Retroactivo({ id, estado, alAplicar }: { id: string; estado: string; alAplicar: () => void }) {
  const { datos: periodos } = useDatos<any[]>('/periodos?tipo=nomina&estado=cerrado');
  const [origen, setOrigen] = useState<string[]>([]);
  const [motivo, setMotivo] = useState('Aumento salarial retroactivo');
  const [vista, setVista] = useState<any[] | null>(null);
  const { ejecutar, cargando } = useAccion();
  if (estado === 'aprobado' || estado === 'cerrado') return <Aviso>El retroactivo se registra en un periodo abierto. Reabra este periodo o use el siguiente.</Aviso>;
  return (
    <Tarjeta titulo="Retroactivo" subtitulo="Recalcula nóminas cerradas con la configuración actual y paga la diferencia en este periodo. Las cerradas no cambian.">
      <div className="space-y-4">
        <Campo etiqueta="Nóminas a recalcular">
          <div className="flex flex-wrap gap-2">
            {(periodos ?? []).map((x) => (
              <label key={x.id} className={cx('cursor-pointer rounded-xl border px-3 py-2 text-sm', origen.includes(x.id) ? 'border-marca-500 bg-marca-50' : 'border-borde')}>
                <input type="checkbox" className="mr-2" checked={origen.includes(x.id)} onChange={(e) => setOrigen(e.target.checked ? [...origen, x.id] : origen.filter((o) => o !== x.id))} />
                {x.nombre}
              </label>
            ))}
            {(periodos ?? []).length === 0 && <p className="text-sm text-suave">No hay nóminas cerradas.</p>}
          </div>
        </Campo>
        <Campo etiqueta="Motivo">
          <Entrada value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Campo>
        <div className="flex gap-2">
          <Boton variante="secundario" disabled={!origen.length} cargando={cargando} onClick={async () => setVista(((await ejecutar(() => post(`/periodos/${id}/retroactivo`, { periodosOrigen: origen, motivo }))) as any)?.diferencias ?? null)}>
            Calcular diferencias
          </Boton>
          {vista && vista.length > 0 && (
            <Boton
              cargando={cargando}
              onClick={async () => {
                if (await ejecutar(() => post(`/periodos/${id}/retroactivo`, { periodosOrigen: origen, motivo, aplicar: true }), 'Retroactivo registrado. Vuelva a liquidar el periodo')) {
                  setVista(null);
                  alAplicar();
                }
              }}
            >
              Registrar en este periodo
            </Boton>
          )}
        </div>
        {vista && (vista.length === 0 ? <Aviso>No hay diferencias.</Aviso> : <Tabla filas={vista} columnas={[{ clave: 'empleado', titulo: 'Empleado' }, { clave: 'detalle', titulo: 'Detalle', celda: (x: any) => x.detalle.join(' · ') }, { clave: 'valor', titulo: 'Diferencia', derecha: true, celda: (x: any) => pesos(x.valor) }]} />)}
      </div>
    </Tarjeta>
  );
}
