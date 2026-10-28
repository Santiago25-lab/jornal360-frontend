'use client';

import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import { Aviso, Boton, Campo, Cargando, Encabezado, Entrada, Pestanas, Selector, Tabla, Tarjeta, useAccion } from '@/components/ui';
import { descargarBase64, get, post } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';
import { useDatos } from '@/lib/datos';
import { fecha, fechaHora, hoy, NOMBRE_NOVEDAD, NOMBRE_TIPO_HORA, numero, pesos, sumarDias } from '@/lib/formato';

type P = 'resumen' | 'vacaciones' | 'asistencia' | 'certificados' | 'auditoria';
type Col = { clave: string; titulo: string };

/** Botones para llevar cualquier tabla a Excel o PDF. */
function Exportar({ titulo, columnas, filas }: { titulo: string; columnas: Col[]; filas: Record<string, unknown>[] }) {
  const { ejecutar, cargando } = useAccion();
  const ir = async (formato: 'excel' | 'pdf') => {
    const r: any = await ejecutar(() => post('/reportes/exportar', { titulo, formato, columnas, filas }));
    if (r) descargarBase64(r.archivoBase64, r.nombre, formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };
  return (
    <div className="flex gap-2">
      <Boton tamano="sm" variante="secundario" disabled={!filas.length} cargando={cargando} icono={<FileSpreadsheet className="h-4 w-4" />} onClick={() => ir('excel')}>
        Excel
      </Boton>
      <Boton tamano="sm" variante="secundario" disabled={!filas.length} cargando={cargando} icono={<FileText className="h-4 w-4" />} onClick={() => ir('pdf')}>
        PDF
      </Boton>
    </div>
  );
}

function Rango({ desde, hasta, onDesde, onHasta, children }: { desde: string; hasta: string; onDesde: (v: string) => void; onHasta: (v: string) => void; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <Campo etiqueta="Desde">
        <Entrada type="date" value={desde} onChange={(e) => onDesde(e.target.value)} />
      </Campo>
      <Campo etiqueta="Hasta">
        <Entrada type="date" value={hasta} onChange={(e) => onHasta(e.target.value)} />
      </Campo>
      {children}
    </div>
  );
}

export default function PaginaReportes() {
  const [p, setP] = useState<P>('resumen');
  return (
    <>
      <Encabezado titulo="Reportes" descripcion="Todo exportable a Excel o PDF. Los valores salen de nóminas liquidadas, aprobadas o cerradas." />
      <Pestanas<P>
        activa={p}
        onCambio={setP}
        pestanas={[
          { valor: 'resumen', etiqueta: 'Resumen de nómina' },
          { valor: 'vacaciones', etiqueta: 'Vacaciones' },
          { valor: 'asistencia', etiqueta: 'Asistencia' },
          { valor: 'certificados', etiqueta: 'Certificado de ingresos' },
          { valor: 'auditoria', etiqueta: 'Auditoría' },
        ]}
      />
      {p === 'resumen' && <Resumen />}
      {p === 'vacaciones' && <Vacaciones />}
      {p === 'asistencia' && <Asistencia />}
      {p === 'certificados' && <Certificados />}
      {p === 'auditoria' && <Auditoria />}
    </>
  );
}

const TIPO_LINEA: Record<string, string> = { devengo: 'Devengo', deduccion: 'Deducción', aporte_empleador: 'Aporte empleador', provision: 'Provisión' };

function Resumen() {
  const cat = useCatalogos();
  const [desde, setDesde] = useState(`${hoy().slice(0, 4)}-01-01`);
  const [hasta, setHasta] = useState(hoy());
  const [centro, setCentro] = useState('');
  const [sede, setSede] = useState('');
  const { datos, cargando } = useDatos<any>(`/reportes/resumen?desde=${desde}&hasta=${hasta}${centro ? `&centroCostoId=${centro}` : ''}${sede ? `&sedeId=${sede}` : ''}`);
  const colsConcepto: Col[] = [
    { clave: 'concepto', titulo: 'Código' },
    { clave: 'nombre', titulo: 'Concepto' },
    { clave: 'tipoNombre', titulo: 'Tipo' },
    { clave: 'total', titulo: 'Total' },
  ];
  const colsCentro: Col[] = [
    { clave: 'centroCosto', titulo: 'Centro de costo' },
    { clave: 'devengos', titulo: 'Devengos' },
    { clave: 'aportes', titulo: 'Aportes' },
    { clave: 'provisiones', titulo: 'Provisiones' },
    { clave: 'costo', titulo: 'Costo total' },
  ];
  const colsDetalle: Col[] = [
    { clave: 'periodo', titulo: 'Periodo' },
    { clave: 'numeroDocumento', titulo: 'Documento' },
    { clave: 'empleado', titulo: 'Empleado' },
    { clave: 'centroCosto', titulo: 'Centro de costo' },
    { clave: 'nombre', titulo: 'Concepto' },
    { clave: 'tipoNombre', titulo: 'Tipo' },
    { clave: 'valor', titulo: 'Valor' },
  ];
  const conceptos = (datos?.porConcepto ?? []).map((c: any) => ({ ...c, tipoNombre: TIPO_LINEA[c.tipo] }));
  const detalle = (datos?.detalle ?? []).map((d: any) => ({ ...d, empleado: `${d.apellidos} ${d.nombres}`, tipoNombre: TIPO_LINEA[d.tipo] }));
  return (
    <>
      <Tarjeta>
        <Rango desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta}>
          <Campo etiqueta="Centro de costo">
            <Selector value={centro} onChange={(e) => setCentro(e.target.value)} opciones={cat.centros} vacio="Todos" />
          </Campo>
          <Campo etiqueta="Sede">
            <Selector value={sede} onChange={(e) => setSede(e.target.value)} opciones={cat.sedes} vacio="Todas" />
          </Campo>
        </Rango>
        {cargando && !datos && <Cargando />}
      </Tarjeta>
      {datos && (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Tarjeta titulo="Por concepto" accion={<Exportar titulo="Resumen por concepto" columnas={colsConcepto} filas={conceptos} />}>
            <Tabla
              filas={conceptos}
              clave={(c: any) => c.concepto}
              vacio="No hay nóminas en ese rango"
              columnas={[
                { clave: 'nombre', titulo: 'Concepto' },
                { clave: 'tipoNombre', titulo: 'Tipo' },
                { clave: 'total', titulo: 'Total', derecha: true, celda: (c: any) => pesos(c.total) },
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Por centro de costo" accion={<Exportar titulo="Costo por centro de costo" columnas={colsCentro} filas={datos.porCentroCosto} />}>
            <Tabla
              filas={datos.porCentroCosto}
              clave={(c: any) => c.centroCosto}
              vacio="Sin datos"
              columnas={[
                { clave: 'centroCosto', titulo: 'Centro' },
                { clave: 'devengos', titulo: 'Devengos', derecha: true, celda: (c: any) => pesos(c.devengos) },
                { clave: 'aportes', titulo: 'Aportes', derecha: true, celda: (c: any) => pesos(c.aportes) },
                { clave: 'costo', titulo: 'Costo total', derecha: true, celda: (c: any) => pesos(c.costo) },
              ]}
            />
          </Tarjeta>
          <Tarjeta titulo="Detalle por empleado" className="xl:col-span-2" accion={<Exportar titulo="Detalle de nómina" columnas={colsDetalle} filas={detalle} />}>
            <p className="text-sm text-suave">{numero(detalle.length)} líneas. Descárguelo en Excel para filtrarlo y cruzarlo.</p>
          </Tarjeta>
        </div>
      )}
    </>
  );
}

function Vacaciones() {
  const { datos, cargando } = useDatos<any[]>('/reportes/vacaciones');
  const cols: Col[] = [
    { clave: 'documento', titulo: 'Documento' },
    { clave: 'empleado', titulo: 'Empleado' },
    { clave: 'diasServicio', titulo: 'Días de servicio' },
    { clave: 'causados', titulo: 'Causados' },
    { clave: 'disfrutados', titulo: 'Disfrutados' },
    { clave: 'compensados', titulo: 'Compensados' },
    { clave: 'pendientes', titulo: 'Pendientes' },
  ];
  const acumulados = (datos ?? []).filter((v) => Number(v.periodosAcumulados) >= 2).length;
  return (
    <Tarjeta titulo="Saldos de vacaciones" subtitulo="15 días hábiles por año de servicio (CST art. 186), proporcional." accion={<Exportar titulo="Saldos de vacaciones" columnas={cols} filas={datos ?? []} />}>
      {acumulados > 0 && (
        <div className="mb-4">
          <Aviso tono="alerta">{acumulados} empleado(s) tienen dos o más periodos acumulados. La ley permite acumular hasta dos (CST art. 190).</Aviso>
        </div>
      )}
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <Tabla
          filas={datos ?? []}
          clave={(v: any) => v.empleadoId}
          columnas={[
            { clave: 'empleado', titulo: 'Empleado', celda: (v: any) => <span className="font-medium">{v.empleado}</span> },
            { clave: 'causados', titulo: 'Causados', derecha: true, celda: (v: any) => numero(v.causados, 2) },
            { clave: 'disfrutados', titulo: 'Disfrutados', derecha: true, celda: (v: any) => numero(v.disfrutados, 2) },
            { clave: 'compensados', titulo: 'Compensados', derecha: true, celda: (v: any) => numero(v.compensados, 2) },
            { clave: 'pendientes', titulo: 'Pendientes', derecha: true, celda: (v: any) => <span className="font-semibold">{numero(v.pendientes, 2)}</span> },
          ]}
        />
      )}
    </Tarjeta>
  );
}

const TIPOS_HORA = ['HOD', 'HON', 'HED', 'HEN', 'HDD', 'HDN', 'HEDD', 'HEND'];

function Asistencia() {
  const [desde, setDesde] = useState(sumarDias(hoy(), -30));
  const [hasta, setHasta] = useState(hoy());
  const { datos, cargando } = useDatos<any[]>(`/reportes/asistencia?desde=${desde}&hasta=${hasta}`);
  const filas = (datos ?? []).map((x) => ({
    empleado: x.empleado,
    area: x.area ?? '',
    ...Object.fromEntries(TIPOS_HORA.map((t) => [t, x.horas[t] ?? '0'])),
    tardanzas: String(x.alertas?.llegada_tarde ?? 0),
    ausencias: String(Object.values(x.ausencias ?? {}).reduce((a: number, b: any) => a + Number(b), 0)),
    detalleAusencias: Object.entries(x.ausencias ?? {})
      .map(([k, v]) => `${NOMBRE_NOVEDAD[k] ?? k}: ${v}`)
      .join(', '),
  }));
  const cols: Col[] = [{ clave: 'empleado', titulo: 'Empleado' }, { clave: 'area', titulo: 'Área' }, ...TIPOS_HORA.map((t) => ({ clave: t, titulo: NOMBRE_TIPO_HORA[t] })), { clave: 'tardanzas', titulo: 'Llegadas tarde' }, { clave: 'detalleAusencias', titulo: 'Ausencias' }];
  return (
    <Tarjeta titulo="Horas y ausencias por empleado" subtitulo="Solo horas aprobadas." accion={<Exportar titulo="Reporte de asistencia" columnas={cols} filas={filas} />}>
      <Rango desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <Tabla
          filas={filas}
          clave={(f: any, i) => `${f.empleado}-${i}`}
          vacio="Sin registros en ese rango"
          columnas={[
            { clave: 'empleado', titulo: 'Empleado', celda: (f: any) => <span className="font-medium">{f.empleado}</span> },
            { clave: 'HOD', titulo: 'Ordinarias', derecha: true, celda: (f: any) => numero(f.HOD, 1) },
            { clave: 'extras', titulo: 'Extra y recargos', derecha: true, celda: (f: any) => numero(TIPOS_HORA.slice(1).reduce((a, t) => a + Number(f[t]), 0), 1) },
            { clave: 'tardanzas', titulo: 'Tardanzas', derecha: true },
            { clave: 'ausencias', titulo: 'Días de ausencia', derecha: true },
          ]}
        />
      )}
    </Tarjeta>
  );
}

function Certificados() {
  const { datos: empleados } = useDatos<any[]>('/empleados');
  const [empleadoId, setEmpleadoId] = useState('');
  const [anio, setAnio] = useState(Number(hoy().slice(0, 4)) - 1);
  const [cert, setCert] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  const ver = async () => setCert(await ejecutar(() => get(`/reportes/certificado-ingresos/${empleadoId}?anio=${anio}`)));
  const pdf = async () => {
    const r: any = await ejecutar(() => get(`/reportes/certificado-ingresos/${empleadoId}/pdf?anio=${anio}`));
    if (r) descargarBase64(r.archivoBase64, r.nombre, 'application/pdf');
  };
  const filas: [string, string][] = cert
    ? [
        ['Pagos por salarios', cert.pagosSalariales],
        ['Prestaciones sociales', cert.prestacionesSociales],
        ['Cesantías consignadas', cert.cesantiasConsignadas],
        ['Otros pagos', cert.otrosPagos],
        ['Total de ingresos brutos', cert.totalIngresos],
        ['Aportes obligatorios a salud', cert.aportesSalud],
        ['Aportes obligatorios a pensión y FSP', cert.aportesPension],
        ['Aportes voluntarios', cert.aportesVoluntarios],
        ['Retención en la fuente', cert.retencionPracticada],
      ]
    : [];
  return (
    <Tarjeta titulo="Certificado de ingresos y retenciones" subtitulo="Resumen del año para el formulario 220 de la DIAN.">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Campo etiqueta="Empleado" className="min-w-[260px] flex-1">
          <Selector value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} vacio="Elija…" opciones={(empleados ?? []).map((e) => ({ valor: e.id, etiqueta: `${e.apellidos} ${e.nombres} · ${e.numeroDocumento}` }))} />
        </Campo>
        <Campo etiqueta="Año gravable">
          <Entrada type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="w-28" />
        </Campo>
        <Boton disabled={!empleadoId} cargando={cargando} onClick={ver}>
          Ver
        </Boton>
        <Boton variante="secundario" disabled={!empleadoId} icono={<Download className="h-4 w-4" />} onClick={pdf}>
          PDF
        </Boton>
      </div>
      {cert && (
        <>
          <p className="mb-2 font-medium">
            {cert.empleado} · {cert.documento}
          </p>
          <table className="w-full max-w-xl text-sm">
            <tbody>
              {filas.map(([k, v]) => (
                <tr key={k} className="border-b border-borde/60">
                  <td className="py-1.5">{k}</td>
                  <td className="py-1.5 text-right tabular">{pesos(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-suave">{cert.nota}</p>
        </>
      )}
    </Tarjeta>
  );
}

const ACCION: Record<string, string> = { crear: 'Creó', actualizar: 'Modificó', eliminar: 'Eliminó', aprobar: 'Aprobó', login: 'Ingresó', cerrar: 'Cerró', reabrir: 'Reabrió', liquidar: 'Liquidó' };

function Auditoria() {
  const [desde, setDesde] = useState(sumarDias(hoy(), -7));
  const [hasta, setHasta] = useState(hoy());
  const [entidad, setEntidad] = useState('');
  const [visto, setVisto] = useState<any>(null);
  const { datos, cargando } = useDatos<any[]>(`/reportes/auditoria?desde=${desde}&hasta=${hasta}${entidad ? `&entidad=${encodeURIComponent(entidad)}` : ''}`);
  const filas = (datos ?? []).map((a) => ({ ...a, cuando: fechaHora(a.creadoEn) }));
  const cols: Col[] = [
    { clave: 'cuando', titulo: 'Fecha' },
    { clave: 'usuarioNombre', titulo: 'Usuario' },
    { clave: 'accion', titulo: 'Acción' },
    { clave: 'entidad', titulo: 'Qué' },
    { clave: 'motivo', titulo: 'Motivo' },
    { clave: 'ip', titulo: 'IP' },
  ];
  return (
    <Tarjeta titulo="Registro de auditoría" subtitulo="Quién cambió qué y cuándo. Este registro no se puede modificar ni borrar." accion={<Exportar titulo="Auditoría" columnas={cols} filas={filas} />}>
      <Rango desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta}>
        <Campo etiqueta="Qué" opcional>
          <Entrada placeholder="empleado, parametro, periodo…" value={entidad} onChange={(e) => setEntidad(e.target.value)} />
        </Campo>
      </Rango>
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <Tabla
          filas={filas}
          clave={(a: any) => a.id}
          alClic={setVisto}
          vacio="Sin movimientos en ese rango"
          columnas={[
            { clave: 'cuando', titulo: 'Fecha' },
            { clave: 'usuarioNombre', titulo: 'Usuario' },
            { clave: 'accion', titulo: 'Acción', celda: (a: any) => ACCION[a.accion] ?? a.accion.replace(/_/g, ' ') },
            { clave: 'entidad', titulo: 'Qué', celda: (a: any) => a.entidad.replace(/_/g, ' ') },
            { clave: 'motivo', titulo: 'Motivo', celda: (a: any) => a.motivo ?? '' },
          ]}
        />
      )}
      {visto && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium">Antes</p>
            <pre className="max-h-72 overflow-auto rounded-xl bg-fondo p-3 text-xs">{JSON.stringify(visto.antes, null, 2) ?? '—'}</pre>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Después ({fecha(visto.creadoEn)})</p>
            <pre className="max-h-72 overflow-auto rounded-xl bg-fondo p-3 text-xs">{JSON.stringify(visto.despues, null, 2) ?? '—'}</pre>
          </div>
        </div>
      )}
    </Tarjeta>
  );
}

