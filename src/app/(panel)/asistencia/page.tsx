'use client';

import { ChevronLeft, ChevronRight, CheckCheck, Copy, ExternalLink, FileSpreadsheet, MonitorSmartphone, Plus, RefreshCw, Tablet, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { CodigoQR } from '@/components/codigo-qr';
import { Importador } from '@/components/importador';
import { Aviso, Boton, Campo, Cargando, cx, Encabezado, Entrada, Insignia, Modal, Pestanas, Selector, Tabla, Tarjeta, useAccion, useAvisos, Vacio } from '@/components/ui';
import { borrar, descargarBase64, post } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';
import { useDatos } from '@/lib/datos';
import { fecha, fechaHora, hoy, NOMBRE_TIPO_HORA, numero, sumarDias } from '@/lib/formato';

type P = 'hoy' | 'marcaciones' | 'horas' | 'alertas' | 'qr' | 'kioscos' | 'celulares';

function Contenido() {
  const q = useSearchParams();
  const [p, setP] = useState<P>((q.get('pestana') as P) ?? 'hoy');
  return (
    <>
      <Encabezado titulo="Asistencia" descripcion="Marcación con código QR, kioscos para casos especiales y cálculo automático de horas extra y recargos." />
      <Pestanas<P>
        activa={p}
        onCambio={setP}
        pestanas={[
          { valor: 'hoy', etiqueta: 'Por día' },
          { valor: 'marcaciones', etiqueta: 'Marcaciones' },
          { valor: 'horas', etiqueta: 'Horas por aprobar' },
          { valor: 'alertas', etiqueta: 'Alertas' },
          { valor: 'qr', etiqueta: 'Pantalla del QR' },
          { valor: 'kioscos', etiqueta: 'Kioscos' },
          { valor: 'celulares', etiqueta: 'Celulares' },
        ]}
      />
      {p === 'hoy' && <Hoy />}
      {p === 'marcaciones' && <Marcaciones />}
      {p === 'horas' && <Horas />}
      {p === 'alertas' && <Alertas />}
      {p === 'qr' && <PantallaQr />}
      {p === 'kioscos' && <Kioscos />}
      {p === 'celulares' && <Celulares />}
    </>
  );
}

export default function PaginaAsistencia() {
  return (
    <Suspense>
      <Contenido />
    </Suspense>
  );
}

const ESTADO_DIA: Record<string, { t: string; tono: 'neutro' | 'marca' | 'exito' | 'alerta' | 'peligro' }> = {
  completo: { t: 'Completo', tono: 'exito' },
  trabajando: { t: 'Trabajando', tono: 'marca' },
  sin_salida: { t: 'Sin salida', tono: 'alerta' },
  no_llego: { t: 'No llegó', tono: 'peligro' },
  programado: { t: 'Aún no entra', tono: 'neutro' },
  novedad: { t: 'Novedad', tono: 'marca' },
  descanso: { t: 'Descanso', tono: 'neutro' },
  festivo: { t: 'Festivo', tono: 'neutro' },
  dia_especial: { t: 'Día especial', tono: 'neutro' },
};

const NOVEDAD: Record<string, string> = {
  vacaciones: 'Vacaciones',
  incapacidad_eg: 'Incapacidad',
  incapacidad_laboral: 'Incapacidad laboral',
  licencia_maternidad: 'Licencia de maternidad',
  licencia_paternidad: 'Licencia de paternidad',
  licencia_remunerada: 'Licencia',
  licencia_no_remunerada: 'Licencia no remunerada',
  suspension: 'Suspensión',
  ausencia_injustificada: 'Ausencia',
};

/** 75 → "1 h 15 min". */
const duracion = (m: number) => (m <= 0 ? '—' : `${Math.floor(m / 60) ? `${Math.floor(m / 60)} h ` : ''}${m % 60 ? `${m % 60} min` : ''}`.trim());

function Hoy() {
  const [dia, setDia] = useState(hoy());
  const { datos, cargando, recargar } = useDatos<any>(`/asistencia/diario?fecha=${dia}`);
  const { ejecutar, cargando: exportando } = useAccion();
  const estado = (f: any) => (f.estado === 'novedad' ? { t: NOVEDAD[f.novedad] ?? 'Novedad', tono: 'marca' as const } : ESTADO_DIA[f.estado]);
  const exportar = async () => {
    const filas = (datos?.filas ?? []).map((f: any) => ({
      empleado: f.empleado,
      documento: f.documento,
      entrada: f.entrada ?? '',
      tarde: f.minutosTarde ? `${f.minutosTarde} min` : '',
      salida: f.salida ?? '',
      antes: f.minutosAntes ? `${f.minutosAntes} min` : '',
      horas: duracion(f.minutosTrabajados),
      estado: estado(f)?.t,
    }));
    const r: any = await ejecutar(() =>
      post('/reportes/exportar', {
        titulo: `Asistencia ${dia}`,
        formato: 'excel',
        columnas: [
          { clave: 'empleado', titulo: 'Empleado' },
          { clave: 'documento', titulo: 'Documento' },
          { clave: 'entrada', titulo: 'Entrada' },
          { clave: 'tarde', titulo: 'Llegó tarde' },
          { clave: 'salida', titulo: 'Salida' },
          { clave: 'antes', titulo: 'Salió antes' },
          { clave: 'horas', titulo: 'Horas trabajadas' },
          { clave: 'estado', titulo: 'Estado' },
        ],
        filas,
      }),
    );
    if (r) descargarBase64(r.archivoBase64, r.nombre, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Boton tamano="sm" variante="secundario" aria-label="Día anterior" icono={<ChevronLeft className="h-4 w-4" />} onClick={() => setDia(sumarDias(dia, -1))} />
          <Entrada type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} className="w-40 sm:w-44" />
          <Boton tamano="sm" variante="secundario" aria-label="Día siguiente" icono={<ChevronRight className="h-4 w-4" />} onClick={() => setDia(sumarDias(dia, 1))} />
          {dia !== hoy() && (
            <Boton tamano="sm" variante="fantasma" onClick={() => setDia(hoy())}>
              Hoy
            </Boton>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <Boton tamano="sm" variante="secundario" icono={<RefreshCw className="h-4 w-4" />} onClick={recargar}>
            Actualizar
          </Boton>
          <Boton tamano="sm" variante="secundario" cargando={exportando} disabled={!datos?.filas?.length} icono={<FileSpreadsheet className="h-4 w-4" />} onClick={exportar}>
            Excel
          </Boton>
        </div>
      </div>
      {cargando && !datos ? (
        <Cargando />
      ) : datos ? (
        <>
          {(datos.festivo || datos.diaEspecial) && <Aviso>{datos.festivo ? `Festivo: ${datos.festivo}` : `Día especial: ${datos.diaEspecial}`}. No se espera que nadie trabaje.</Aviso>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
            {[
              { t: 'Llegaron', v: datos.resumen.llegaron, c: 'text-exito' },
              { t: 'Llegaron tarde', v: datos.resumen.tarde, c: 'text-alerta' },
              { t: 'Salieron antes', v: datos.resumen.salieronAntes, c: 'text-alerta' },
              { t: 'No llegaron', v: datos.resumen.noLlegaron, c: 'text-peligro' },
              { t: 'Sin marcar salida', v: datos.resumen.sinSalida, c: '' },
            ].map((x) => (
              <Tarjeta key={x.t}>
                <p className={cx('text-3xl font-semibold tabular', x.c)}>{x.v}</p>
                <p className="text-sm text-suave">{x.t}</p>
              </Tarjeta>
            ))}
          </div>
          <Tarjeta titulo={dia === hoy() ? `Hoy, ${fecha(dia)}` : fecha(dia)} subtitulo="Primera entrada y última salida del día. La llegada tarde y la salida anticipada se miden con el turno de cada persona.">
            <Tabla
              filas={datos.filas}
              clave={(f: any) => f.empleadoId}
              vacio="No hay empleados activos"
              columnas={[
                {
                  clave: 'empleado',
                  titulo: 'Empleado',
                  celda: (f: any) => (
                    <div>
                      <p className="font-medium">{f.empleado}</p>
                      {f.cargo && <p className="text-xs text-suave">{f.cargo}</p>}
                    </div>
                  ),
                },
                { clave: 'entrada', titulo: 'Entrada', celda: (f: any) => <span className="tabular">{f.entrada ?? '—'}</span> },
                { clave: 'tarde', titulo: 'Llegó tarde', celda: (f: any) => (f.minutosTarde ? <Insignia tono="alerta">{duracion(f.minutosTarde)}</Insignia> : '—') },
                { clave: 'salida', titulo: 'Salida', celda: (f: any) => <span className="tabular">{f.salida ?? '—'}</span> },
                { clave: 'antes', titulo: 'Salió antes', celda: (f: any) => (f.minutosAntes ? <Insignia tono="alerta">{duracion(f.minutosAntes)}</Insignia> : '—') },
                { clave: 'horas', titulo: 'Horas trabajadas', derecha: true, celda: (f: any) => <span className="tabular">{duracion(f.minutosTrabajados)}</span> },
                { clave: 'estado', titulo: 'Estado', celda: (f: any) => <Insignia tono={estado(f)?.tono}>{estado(f)?.t}</Insignia> },
              ]}
            />
          </Tarjeta>
        </>
      ) : null}
    </div>
  );
}

function Marcaciones() {
  const [desde, setDesde] = useState(sumarDias(hoy(), -7));
  const [hasta, setHasta] = useState(hoy());
  const [empleadoId, setEmpleadoId] = useState('');
  const { datos: emps } = useDatos<any[]>('/empleados?estado=activo');
  const { datos, recargar, cargando } = useDatos<any[]>(`/asistencia/marcaciones?desde=${desde}&hasta=${hasta}${empleadoId ? `&empleadoId=${empleadoId}` : ''}`);
  const [modal, setModal] = useState<null | { modo: 'asistida' | 'correccion'; marcacion?: any }>(null);
  const [f, setF] = useState<Record<string, any>>({});
  const { ejecutar, cargando: guardando } = useAccion();
  const opcionesEmp = (emps ?? []).map((e) => ({ valor: e.id, etiqueta: `${e.nombres} ${e.apellidos}` }));
  const abrir = (modo: 'asistida' | 'correccion', marcacion?: any) => {
    setF({ empleadoId: marcacion?.empleadoId ?? empleadoId, tipo: marcacion?.tipo ?? 'entrada', hora: marcacion?.horaLocal ?? `${hoy()}T${new Date().toTimeString().slice(0, 5)}`, motivo: '' });
    setModal({ modo, marcacion });
  };
  const guardar = async () => {
    const r =
      modal?.modo === 'asistida'
        ? await ejecutar(() => post('/asistencia/marcaciones', { empleadoId: f.empleadoId, tipo: f.tipo, hora: f.hora, motivo: f.motivo }), 'Marcación registrada')
        : await ejecutar(() => post('/asistencia/correcciones', { empleadoId: f.empleadoId, marcacionId: modal?.marcacion?.id ?? null, tipo: f.tipo, hora: f.hora, motivo: f.motivo }), 'Corrección guardada');
    if (r) {
      setModal(null);
      recargar();
    }
  };
  const ORIGEN: Record<string, string> = { qr: 'Celular', kiosco: 'Kiosco', asistida: 'Asistida', correccion: 'Corrección', importacion: 'Importada' };
  return (
    <Tarjeta
      titulo="Marcaciones"
      accion={
        <div className="flex gap-2">
          <Boton tamano="sm" variante="secundario" onClick={() => abrir('correccion')}>
            Agregar marcación olvidada
          </Boton>
          <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => abrir('asistida')}>
            Marcación asistida
          </Boton>
        </div>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Selector value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} opciones={opcionesEmp} vacio="Todos los empleados" />
        <Entrada type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Entrada type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <Tabla
          filas={[...(datos ?? [])].reverse()}
          vacio="Sin marcaciones en esas fechas"
          columnas={[
            { clave: 'empleado', titulo: 'Empleado', celda: (m: any) => `${m.nombres} ${m.apellidos}` },
            { clave: 'hora', titulo: 'Fecha y hora', celda: (m: any) => `${fecha(m.horaLocal)} ${m.horaLocal.slice(11)}` },
            { clave: 'tipo', titulo: 'Tipo', celda: (m: any) => <Insignia tono={m.tipo === 'entrada' ? 'exito' : 'neutro'}>{m.tipo === 'entrada' ? 'Entrada' : 'Salida'}</Insignia> },
            { clave: 'origen', titulo: 'Cómo', celda: (m: any) => <span>{ORIGEN[m.origen]}{m.excepcion && <Insignia tono="alerta">Excepción</Insignia>}</span> },
            { clave: 'sede', titulo: 'Sede', celda: (m: any) => m.kiosco ?? m.sede ?? '—' },
            { clave: 'motivo', titulo: 'Motivo', celda: (m: any) => (m.motivo ? <span title={`Por ${m.registradoPorNombre ?? ''}`}>{m.motivo}</span> : '—') },
            { clave: 'a', titulo: '', celda: (m: any) => <button className="text-sm text-marca-600 hover:underline" onClick={() => abrir('correccion', m)}>Corregir</button> },
          ]}
        />
      )}
      <Modal
        abierto={!!modal}
        onCerrar={() => setModal(null)}
        titulo={modal?.modo === 'asistida' ? 'Marcación asistida' : modal?.marcacion ? 'Corregir marcación' : 'Agregar marcación olvidada'}
        pie={<Boton onClick={guardar} cargando={guardando} disabled={!f.empleadoId || (f.motivo ?? '').length < 3}>Guardar</Boton>}
      >
        <div className="space-y-4">
          {modal?.modo === 'asistida' && <Aviso>Para quien no tiene celular, se quedó sin batería o no hay kiosco. Queda registrado quién la hizo y por qué.</Aviso>}
          <Campo etiqueta="Empleado">
            <Selector value={f.empleadoId ?? ''} onChange={(e) => setF({ ...f, empleadoId: e.target.value })} opciones={opcionesEmp} vacio="Elija…" disabled={!!modal?.marcacion} />
          </Campo>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo etiqueta="Tipo">
              <Selector value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} opciones={[{ valor: 'entrada', etiqueta: 'Entrada' }, { valor: 'salida', etiqueta: 'Salida' }]} />
            </Campo>
            <Campo etiqueta="Fecha y hora">
              <Entrada type="datetime-local" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} />
            </Campo>
          </div>
          <Campo etiqueta="Motivo">
            <Entrada value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ej. Olvidó marcar la salida" />
          </Campo>
          {modal?.marcacion && <p className="text-sm text-suave">La marcación original se conserva anulada, junto con la corrección.</p>}
        </div>
      </Modal>
    </Tarjeta>
  );
}

function Horas() {
  const [desde, setDesde] = useState(`${hoy().slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy());
  const [estado, setEstado] = useState('pendiente');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [importar, setImportar] = useState(false);
  const ruta = `/asistencia/horas?desde=${desde}&hasta=${hasta}${estado ? `&estado=${estado}` : ''}`;
  const { datos, recargar, cargando } = useDatos<any[]>(ruta);
  const { ejecutar, cargando: trabajando } = useAccion();
  const { avisar } = useAvisos();
  const total = useMemo(() => (datos ?? []).reduce((a, h) => a + Number(h.horas), 0), [datos]);
  const procesar = async () => {
    const r: any = await ejecutar(() => post('/asistencia/procesar', { desde, hasta }));
    if (r) {
      avisar(`Se calcularon las horas de ${r.procesados} empleados`);
      if (r.sinTurno.length) avisar(`Sin turno asignado: ${r.sinTurno.join(', ')}`, 'info');
      if (r.incompletas.length) avisar(`${r.incompletas.length} marcaciones sin pareja: corríjalas en Marcaciones`, 'info');
      recargar();
    }
  };
  const aprobar = async (si: boolean) => {
    const r = await ejecutar(() => post('/asistencia/horas/aprobar', { ids: [...sel], aprobar: si }), si ? 'Horas aprobadas' : 'Horas rechazadas');
    if (r) {
      setSel(new Set());
      recargar();
    }
  };
  const todas = (datos ?? []).length > 0 && sel.size === (datos ?? []).length;
  return (
    <div className="space-y-6">
      <Aviso tono="info" titulo="Solo lo aprobado se paga">
        El sistema compara las marcaciones con el turno y clasifica cada minuto: ordinario, nocturno (desde las 19:00), extra o día de descanso. Las horas extra pasan a la nómina solo cuando usted las aprueba.
      </Aviso>
      <Tarjeta
        titulo="Horas extra y recargos"
        accion={
          <div className="flex flex-wrap gap-2">
            <Boton tamano="sm" variante="secundario" icono={<FileSpreadsheet className="h-4 w-4" />} onClick={() => setImportar(true)}>
              Importar de Excel
            </Boton>
            <Boton tamano="sm" icono={<RefreshCw className="h-4 w-4" />} onClick={procesar} cargando={trabajando}>
              Calcular horas del rango
            </Boton>
          </div>
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Entrada type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Entrada type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <Selector value={estado} onChange={(e) => setEstado(e.target.value)} opciones={[{ valor: 'pendiente', etiqueta: 'Por aprobar' }, { valor: 'aprobada', etiqueta: 'Aprobadas' }, { valor: 'rechazada', etiqueta: 'Rechazadas' }]} vacio="Todas" />
        </div>
        {sel.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-marca-50 p-2.5">
            <span className="px-2 text-sm font-medium">{sel.size} seleccionadas</span>
            <Boton tamano="sm" variante="exito" icono={<CheckCheck className="h-4 w-4" />} onClick={() => aprobar(true)}>
              Aprobar
            </Boton>
            <Boton tamano="sm" variante="secundario" icono={<X className="h-4 w-4" />} onClick={() => aprobar(false)}>
              Rechazar
            </Boton>
          </div>
        )}
        {cargando && !datos ? (
          <Cargando />
        ) : (
          <Tabla
            filas={datos ?? []}
            clave={(h: any) => h.id}
            vacio="No hay horas en ese rango. Use «Calcular horas del rango»."
            columnas={[
              {
                clave: 'sel',
                titulo: '',
                className: 'w-10',
                celda: (h: any) => (
                  <input
                    type="checkbox"
                    aria-label="Seleccionar"
                    checked={sel.has(h.id)}
                    onChange={(e) => {
                      const s = new Set(sel);
                      if (e.target.checked) s.add(h.id);
                      else s.delete(h.id);
                      setSel(s);
                    }}
                  />
                ),
              },
              { clave: 'empleado', titulo: 'Empleado', celda: (h: any) => `${h.nombres} ${h.apellidos}` },
              { clave: 'fecha', titulo: 'Fecha', celda: (h: any) => fecha(h.fecha) },
              { clave: 'tipo', titulo: 'Tipo', celda: (h: any) => NOMBRE_TIPO_HORA[h.tipo] },
              { clave: 'horas', titulo: 'Horas', derecha: true, celda: (h: any) => numero(h.horas, 2) },
              { clave: 'origen', titulo: 'Origen', celda: (h: any) => (h.origen === 'asistencia' ? 'Marcaciones' : 'Excel') },
              { clave: 'estado', titulo: 'Estado', celda: (h: any) => <Insignia tono={h.estado === 'aprobada' ? 'exito' : h.estado === 'rechazada' ? 'peligro' : 'alerta'}>{h.estado === 'pendiente' ? 'Por aprobar' : h.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}</Insignia> },
            ]}
          />
        )}
        <div className="mt-3 flex items-center justify-between text-sm text-suave">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={todas} onChange={(e) => setSel(e.target.checked ? new Set((datos ?? []).map((h) => h.id)) : new Set())} /> Seleccionar todas
          </label>
          <span>Total: {numero(total, 2)} horas</span>
        </div>
      </Tarjeta>
      <Importador abierto={importar} onCerrar={() => setImportar(false)} titulo="Importar horas desde Excel" tipo="horas" descripcion="Para empresas que ya tienen otro control de asistencia. Las horas importadas también se aprueban antes de pagarse." alTerminar={recargar} />
    </div>
  );
}

function Alertas() {
  const { datos, cargando } = useDatos<any[]>(`/asistencia/alertas?desde=${sumarDias(hoy(), -30)}&hasta=${hoy()}`);
  const NOMBRE: Record<string, string> = { llegada_tarde: 'Llegada tarde', salida_anticipada: 'Salida anticipada', exceso_extras_dia: 'Exceso de extras en el día', exceso_extras_semana: 'Exceso de extras en la semana' };
  if (cargando && !datos) return <Cargando />;
  return (
    <Tarjeta titulo="Alertas de los últimos 30 días" subtitulo="Se generan al calcular las horas">
      <Tabla
        filas={datos ?? []}
        vacio="Sin alertas"
        columnas={[
          { clave: 'empleado', titulo: 'Empleado', celda: (a: any) => `${a.nombres} ${a.apellidos}` },
          { clave: 'fecha', titulo: 'Fecha', celda: (a: any) => fecha(a.fecha) },
          { clave: 'tipo', titulo: 'Alerta', celda: (a: any) => <Insignia tono={a.tipo.startsWith('exceso') ? 'peligro' : 'alerta'}>{NOMBRE[a.tipo] ?? a.tipo}</Insignia> },
          { clave: 'mensaje', titulo: 'Detalle' },
        ]}
      />
    </Tarjeta>
  );
}

function PantallaQr() {
  const cat = useCatalogos();
  const [sede, setSede] = useState('');
  const sedeId = sede || cat.sedes[0]?.valor || '';
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Tarjeta titulo="Pantalla del código QR" subtitulo="Ábrala en un computador o tablet de la sede">
        <div className="space-y-4">
          <Campo etiqueta="Sede">
            <Selector value={sedeId} onChange={(e) => setSede(e.target.value)} opciones={cat.sedes} />
          </Campo>
          <p className="text-suave">El código cambia cada 30 segundos (configurable). Una foto del código enviada por chat deja de servir al instante.</p>
          <a href={`/pantalla-qr/${sedeId}`} target="_blank" rel="noreferrer">
            <Boton icono={<ExternalLink className="h-4 w-4" />} disabled={!sedeId}>
              Abrir pantalla del QR
            </Boton>
          </a>
        </div>
      </Tarjeta>
      <Tarjeta titulo="Cómo marca el empleado">
        <ol className="list-inside list-decimal space-y-2 text-[15px]">
          <li>Escanea el código de la pantalla con la cámara de su celular.</li>
          <li>Se abre la página de Jornal 360 y lo saluda por su nombre.</li>
          <li>Toca «Marcar entrada» o «Marcar salida». Listo.</li>
        </ol>
        <p className="mt-3 text-sm text-suave">La primera vez, el celular se vincula desde la ficha del empleado (pestaña Asistencia).</p>
      </Tarjeta>
    </div>
  );
}

function Kioscos() {
  const cat = useCatalogos();
  const { datos, recargar } = useDatos<any[]>('/asistencia/kioscos');
  const [nuevo, setNuevo] = useState<{ nombre: string; sedeId: string } | null>(null);
  const [codigo, setCodigo] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  const { error, avisar } = useAvisos();
  return (
    <div className="space-y-6">
      <Aviso tono="info" titulo="Para casos especiales">
        Una tablet o computador en la entrada, para quienes no tienen celular inteligente (aseo, operarios). Marcan con su cédula y un PIN de 4 números. Márquelos como «caso especial» en su ficha.
      </Aviso>
      <Tarjeta titulo="Kioscos" accion={<Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setNuevo({ nombre: 'Portería', sedeId: cat.sedes[0]?.valor ?? '' })}>Nuevo kiosco</Boton>}>
        {(datos ?? []).length === 0 ? (
          <Vacio icono={<Tablet className="h-8 w-8" />} titulo="Aún no hay kioscos" descripcion="Cree uno y vincule la tablet de la sede." />
        ) : (
          <Tabla
            filas={(datos ?? []).filter((k) => k.activo)}
            columnas={[
              { clave: 'nombre', titulo: 'Kiosco' },
              { clave: 'sede', titulo: 'Sede' },
              { clave: 'vinculado', titulo: 'Estado', celda: (k: any) => (k.vinculado ? <Insignia tono="exito">Vinculado</Insignia> : <Insignia tono="alerta">Sin vincular</Insignia>) },
              { clave: 'uso', titulo: 'Último uso', celda: (k: any) => fechaHora(k.ultimoUso) },
              {
                clave: 'a',
                titulo: '',
                celda: (k: any) => (
                  <div className="flex gap-3">
                    <button
                      className="text-sm text-marca-600 hover:underline"
                      onClick={async () => {
                        try {
                          setCodigo(await post(`/asistencia/kioscos/${k.id}/vincular`));
                        } catch (e) {
                          error(e);
                        }
                      }}
                    >
                      {k.vinculado ? 'Vincular otro equipo' : 'Vincular equipo'}
                    </button>
                    <button className="text-sm text-peligro hover:underline" onClick={() => borrar(`/asistencia/kioscos/${k.id}`).then(recargar).catch(error)}>
                      Desactivar
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Tarjeta>
      <Modal
        abierto={!!nuevo}
        onCerrar={() => setNuevo(null)}
        titulo="Nuevo kiosco"
        pie={
          <Boton
            cargando={cargando}
            onClick={async () => {
              const r = await ejecutar(() => post('/asistencia/kioscos', nuevo), 'Kiosco creado');
              if (r) {
                setNuevo(null);
                recargar();
              }
            }}
          >
            Crear
          </Boton>
        }
      >
        {nuevo && (
          <div className="space-y-4">
            <Campo etiqueta="Nombre">
              <Entrada value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
            </Campo>
            <Campo etiqueta="Sede">
              <Selector value={nuevo.sedeId} onChange={(e) => setNuevo({ ...nuevo, sedeId: e.target.value })} opciones={cat.sedes} />
            </Campo>
          </div>
        )}
      </Modal>
      <Modal abierto={!!codigo} onCerrar={() => { setCodigo(null); recargar(); }} titulo="Vincular la tablet del kiosco" ancho="sm">
        {codigo && (
          <div className="text-center">
            <p className="text-suave">En la tablet, abra esta dirección y escriba el código:</p>
            <div className="my-3 flex items-center justify-center gap-2">
              <code className="rounded-lg bg-fondo px-3 py-1.5 text-sm">{typeof window !== 'undefined' ? `${window.location.origin}/kiosco` : '/kiosco'}</code>
              <button aria-label="Copiar dirección" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/kiosco`).then(() => avisar('Dirección copiada'))}>
                <Copy className="h-4 w-4 text-suave" />
              </button>
            </div>
            <p className="text-4xl font-semibold tracking-[0.3em] tabular">{codigo.codigo}</p>
            <p className="mt-4 text-sm text-suave">O escanee con la tablet:</p>
            <div className="mt-2 flex justify-center">
              <CodigoQR texto={codigo.url} tamano={180} />
            </div>
            <p className="mt-3 text-xs text-suave">Vence en 10 minutos.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Celulares() {
  const { datos, recargar } = useDatos<any[]>('/asistencia/dispositivos');
  const { error, confirmar } = useAvisos();
  return (
    <Tarjeta titulo="Celulares vinculados" subtitulo="Un celular por empleado y un empleado por celular">
      {(datos ?? []).length === 0 ? (
        <Vacio icono={<MonitorSmartphone className="h-8 w-8" />} titulo="Ningún celular vinculado todavía" descripcion="Vincúlelos desde la ficha de cada empleado, pestaña Asistencia." />
      ) : (
        <Tabla
          filas={datos ?? []}
          columnas={[
            { clave: 'empleado', titulo: 'Empleado', celda: (d: any) => `${d.nombres} ${d.apellidos}` },
            { clave: 'descripcion', titulo: 'Equipo', celda: (d: any) => d.descripcion ?? '—' },
            { clave: 'vinculado', titulo: 'Vinculado', celda: (d: any) => fechaHora(d.vinculadoEn) },
            { clave: 'uso', titulo: 'Último uso', celda: (d: any) => fechaHora(d.ultimoUso) },
            {
              clave: 'a',
              titulo: '',
              celda: (d: any) => (
                <button
                  className="text-sm text-peligro hover:underline"
                  onClick={async () => {
                    if (await confirmar({ titulo: 'Desvincular', mensaje: `¿Desvincular el celular de ${d.nombres}?`, peligro: true, confirmar: 'Desvincular' })) borrar(`/asistencia/dispositivos/${d.id}`).then(recargar).catch(error);
                  }}
                >
                  Desvincular
                </button>
              ),
            },
          ]}
        />
      )}
    </Tarjeta>
  );
}

