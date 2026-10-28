'use client';

import { History, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { borrar, post, put } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fecha, hoy, pesos } from '@/lib/formato';
import { Aviso, Boton, Buscador, Campo, Cargando, Entrada, EntradaDinero, Insignia, Interruptor, Modal, Selector, Tabla, useAccion, useAvisos } from '../ui';
import { Seccion } from './comun';

export const CATEGORIAS: Record<string, string> = {
  salario: 'Salario y auxilio',
  jornada: 'Jornada',
  recargos: 'Recargos y horas extra',
  seguridad_social: 'Seguridad social y parafiscales',
  prestaciones: 'Prestaciones sociales',
  incapacidades: 'Incapacidades y licencias',
  retencion: 'Retención en la fuente',
  descuentos: 'Descuentos y embargos',
  aprendices: 'Aprendices',
  retiro: 'Retiro e indemnizaciones',
  redondeo: 'Redondeo',
  otra: 'Otros',
};

const TIPOS = [
  { valor: 'dinero', etiqueta: 'Dinero ($)' },
  { valor: 'porcentaje', etiqueta: 'Porcentaje (%)' },
  { valor: 'numero', etiqueta: 'Número' },
  { valor: 'dias', etiqueta: 'Días' },
  { valor: 'horas', etiqueta: 'Horas' },
  { valor: 'booleano', etiqueta: 'Sí / No' },
];

/** Muestra el valor según su tipo: $ 1.750.905, 4 %, 46 horas. */
export function mostrarValor(tipo: string, v: string | null) {
  if (v === null || v === undefined) return '—';
  const n = (x: number) => x.toLocaleString('es-CO', { maximumFractionDigits: 6 });
  if (tipo === 'dinero') return pesos(v, Number(v) % 1 ? 2 : 0);
  if (tipo === 'porcentaje') return `${n(Number((Number(v) * 100).toPrecision(12)))} %`;
  if (tipo === 'booleano') return Number(v) ? 'Sí' : 'No';
  if (tipo === 'dias') return `${n(Number(v))} días`;
  if (tipo === 'horas') return `${n(Number(v))} horas`;
  return n(Number(v));
}

/** El usuario escribe porcentajes como 4 o 0,5; se guardan como 0,04 o 0,005. */
const aGuardar = (tipo: string, v: string) => {
  const n = Number(String(v).replace(',', '.'));
  return tipo === 'porcentaje' ? String(Number((n / 100).toPrecision(12))) : String(n);
};
const aMostrar = (tipo: string, v: string) => (tipo === 'porcentaje' ? String(Number((Number(v) * 100).toPrecision(12))) : v);

function EntradaValor({ tipo, valor, onCambio }: { tipo: string; valor: string; onCambio: (v: string) => void }) {
  if (tipo === 'booleano') return <Interruptor activo={valor === '1'} onCambio={(v) => onCambio(v ? '1' : '0')} etiqueta={valor === '1' ? 'Sí' : 'No'} />;
  if (tipo === 'dinero') return <EntradaDinero valor={valor} onCambio={onCambio} />;
  return (
    <div className="flex items-center gap-2">
      <Entrada inputMode="decimal" value={valor} onChange={(e) => onCambio(e.target.value.replace(/[^\d.,-]/g, ''))} />
      {tipo === 'porcentaje' && <span className="text-suave">%</span>}
    </div>
  );
}

export function SeccionParametros() {
  const { datos, cargando, recargar } = useDatos<any[]>('/parametros');
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [abierto, setAbierto] = useState<any>(null);
  const [nuevo, setNuevo] = useState<any>(null);
  const { ejecutar, cargando: guardando } = useAccion();

  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (datos ?? []).filter((p) => (!categoria || p.categoria === categoria) && (!q || `${p.nombre} ${p.codigo} ${p.descripcion ?? ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)));
  }, [datos, buscar, categoria]);
  const grupos = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const p of filtrados) m.set(p.categoria, [...(m.get(p.categoria) ?? []), p]);
    return [...m.entries()];
  }, [filtrados]);
  const distintos = (datos ?? []).filter((p) => p.distintoDeLegal).length;
  const actual = abierto && (datos ?? []).find((p) => p.codigo === abierto.codigo);

  return (
    <Seccion
      titulo="Parámetros"
      descripcion="Valores de ley con fecha de vigencia: el sistema usa el valor que estaba vigente en cada fecha. Si la ley cambia, agregue el nuevo valor desde su fecha."
      accion={
        <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setNuevo({ codigo: '', nombre: '', descripcion: '', categoria: 'otra', tipo: 'dinero', desde: `${hoy().slice(0, 4)}-01-01`, valor: '' })}>
          Nuevo parámetro
        </Boton>
      }
    >
      {distintos > 0 && (
        <div className="mb-4">
          <Aviso tono="alerta">{distintos} parámetro(s) tienen un valor distinto al legal precargado. Están marcados con «Modificado».</Aviso>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-3">
        <Buscador valor={buscar} onCambio={setBuscar} placeholder="Buscar: salario mínimo, UVT, salud…" className="min-w-[240px] flex-1" />
        <Selector value={categoria} onChange={(e) => setCategoria(e.target.value)} vacio="Todas las categorías" opciones={Object.entries(CATEGORIAS).map(([valor, etiqueta]) => ({ valor, etiqueta }))} className="w-auto" />
      </div>
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <div className="space-y-6">
          {grupos.map(([cat, ps]) => (
            <div key={cat}>
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-suave">{CATEGORIAS[cat] ?? cat}</h3>
              <div className="divide-y divide-borde/70 rounded-xl border border-borde">
                {ps.map((p) => (
                  <button key={p.codigo} onClick={() => setAbierto(p)} className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-marca-50/40">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {p.nombre}
                        {p.distintoDeLegal && <Insignia tono="alerta">Modificado</Insignia>}
                        {p.vigencias.some((v: any) => v.desde > hoy()) && <Insignia tono="marca">Cambio programado</Insignia>}
                      </span>
                      <span className="block font-mono text-xs text-suave">{p.codigo}</span>
                    </span>
                    <span className="font-semibold tabular">{mostrarValor(p.tipo, p.valorActual)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!grupos.length && <p className="py-6 text-center text-suave">No hay parámetros con ese filtro.</p>}
        </div>
      )}
      {actual && <ModalParametro p={actual} onCerrar={() => setAbierto(null)} recargar={recargar} />}
      <Modal
        abierto={!!nuevo}
        onCerrar={() => setNuevo(null)}
        titulo="Nuevo parámetro"
        pie={
          <Boton cargando={guardando} onClick={async () => (await ejecutar(() => post('/parametros', { ...nuevo, valor: aGuardar(nuevo.tipo, nuevo.valor || '0') }), 'Parámetro creado')) && (setNuevo(null), recargar())}>
            Crear
          </Boton>
        }
      >
        {nuevo && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre">
                <Entrada value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value, codigo: nuevo.codigoFijo ? nuevo.codigo : e.target.value.normalize('NFD').replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_').toUpperCase() })} />
              </Campo>
              <Campo etiqueta="Código para fórmulas">
                <Entrada className="font-mono" value={nuevo.codigo} onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value.toUpperCase(), codigoFijo: true })} />
              </Campo>
              <Campo etiqueta="Categoría">
                <Selector value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })} opciones={Object.entries(CATEGORIAS).map(([valor, etiqueta]) => ({ valor, etiqueta }))} />
              </Campo>
              <Campo etiqueta="Tipo de valor">
                <Selector value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })} opciones={TIPOS} />
              </Campo>
              <Campo etiqueta="Vigente desde">
                <Entrada type="date" value={nuevo.desde} onChange={(e) => setNuevo({ ...nuevo, desde: e.target.value })} />
              </Campo>
              <Campo etiqueta="Valor">
                <EntradaValor tipo={nuevo.tipo} valor={nuevo.valor} onCambio={(v) => setNuevo({ ...nuevo, valor: v })} />
              </Campo>
            </div>
            <Campo etiqueta="Descripción" opcional>
              <Entrada value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />
            </Campo>
          </div>
        )}
      </Modal>
    </Seccion>
  );
}

function ModalParametro({ p, onCerrar, recargar }: { p: any; onCerrar: () => void; recargar: () => void }) {
  const [desde, setDesde] = useState(hoy());
  const [valor, setValor] = useState(aMostrar(p.tipo, p.valorActual ?? ''));
  const [afectados, setAfectados] = useState<any[] | null>(null);
  const { ejecutar, cargando } = useAccion();
  const { confirmar } = useAvisos();
  // Solo un valor rige hoy: el de fecha más reciente que ya empezó.
  const vigente = [...p.vigencias].filter((v: any) => v.desde <= hoy()).sort((a: any, b: any) => b.desde.localeCompare(a.desde))[0];
  const guardar = async () => {
    const r: any = await ejecutar((confirmado) => post(`/parametros/${p.codigo}/vigencias`, { desde, valor: aGuardar(p.tipo, valor), confirmar: confirmado }), 'Valor guardado');
    if (r) {
      setAfectados(r.periodosAfectados);
      recargar();
    }
  };
  return (
    <Modal abierto onCerrar={onCerrar} titulo={p.nombre} ancho="lg">
      <div className="space-y-5">
        {p.descripcion && <p className="text-suave">{p.descripcion}</p>}
        <div className="flex flex-wrap gap-2 text-sm">
          <Insignia>
            <span className="font-mono">{p.codigo}</span>
          </Insignia>
          {p.baseLegal && <Insignia tono="marca">{p.baseLegal}</Insignia>}
          {p.valorLegal !== null && p.valorLegal !== undefined && <Insignia>Valor legal: {mostrarValor(p.tipo, p.valorLegal)}</Insignia>}
        </div>
        <div className="rounded-xl border border-borde p-4">
          <p className="mb-3 font-medium">Agregar o cambiar un valor</p>
          <div className="grid items-end gap-3 sm:grid-cols-[170px_1fr_auto]">
            <Campo etiqueta="Vigente desde">
              <Entrada type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </Campo>
            <Campo etiqueta="Valor">
              <EntradaValor tipo={p.tipo} valor={valor} onCambio={setValor} />
            </Campo>
            <Boton cargando={cargando} icono={<Save className="h-4 w-4" />} onClick={guardar}>
              Guardar
            </Boton>
          </div>
          <p className="mt-2 text-xs text-suave">Si ya existe un valor en esa misma fecha, se reemplaza. Los anteriores se conservan para recalcular periodos pasados.</p>
        </div>
        {afectados && afectados.length > 0 && (
          <Aviso tono="alerta" titulo="Hay nóminas cerradas desde esa fecha">
            {afectados.map((x) => x.nombre).join(', ')}. No se recalculan solas; si corresponde, use «Retroactivo» en el periodo actual.
          </Aviso>
        )}
        <div>
          <p className="mb-2 flex items-center gap-2 font-medium">
            <History className="h-4 w-4" /> Historial de valores
          </p>
          <Tabla
            filas={[...p.vigencias].reverse()}
            clave={(v: any) => v.id}
            columnas={[
              { clave: 'desde', titulo: 'Desde', celda: (v: any) => fecha(v.desde) },
              { clave: 'valor', titulo: 'Valor', derecha: true, celda: (v: any) => <span className="tabular">{mostrarValor(p.tipo, v.valor)}</span> },
              { clave: 'estado', titulo: '', celda: (v: any) => (v.desde > hoy() ? <Insignia tono="marca">Programado</Insignia> : v.id === vigente?.id && <Insignia tono="exito">Vigente</Insignia>) },
              {
                clave: 'acc',
                titulo: '',
                celda: (v: any) =>
                  p.vigencias.length > 1 && (
                    <Boton
                      tamano="sm"
                      variante="fantasma"
                      aria-label="Borrar"
                      icono={<Trash2 className="h-4 w-4" />}
                      onClick={async () => (await confirmar({ titulo: 'Borrar valor', mensaje: `¿Borrar el valor vigente desde ${fecha(v.desde)}?`, confirmar: 'Borrar', peligro: true })) && (await ejecutar(() => borrar(`/parametros/${p.codigo}/vigencias/${v.id}`), 'Valor borrado')) && recargar()}
                    />
                  ),
              },
            ]}
          />
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          {p.valorLegal !== null && p.valorLegal !== undefined && (
            <Boton variante="secundario" icono={<RotateCcw className="h-4 w-4" />} onClick={async () => (await ejecutar(() => post(`/parametros/${p.codigo}/restaurar`, { desde }), 'Valor legal restaurado')) && recargar()}>
              Restaurar el valor legal desde {fecha(desde)}
            </Boton>
          )}
          {(p.valorLegal === null || p.valorLegal === undefined) && (
            <Boton variante="peligro" icono={<Trash2 className="h-4 w-4" />} onClick={async () => (await confirmar({ titulo: 'Borrar parámetro', mensaje: 'Las fórmulas que lo usen dejarán de funcionar.', confirmar: 'Borrar', peligro: true })) && (await ejecutar(() => borrar(`/parametros/${p.codigo}`), 'Parámetro borrado')) && (onCerrar(), recargar())}>
              Borrar parámetro
            </Boton>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------- Tablas (FSP, ARL, retención, incapacidades) ----------

export function SeccionTablas() {
  const { datos, cargando, recargar } = useDatos<any[]>('/tablas');
  const [editando, setEditando] = useState<any>(null);
  const { ejecutar, cargando: guardando } = useAccion();
  const guardar = async () => {
    const filas = editando.filas.map((f: any) => ({ desde: String(f.desde), hasta: f.hasta === '' || f.hasta === null ? null : String(f.hasta), valores: Object.fromEntries(Object.entries(f.valores).map(([k, v]) => [k, String(v)])) }));
    if (await ejecutar(() => put(`/tablas/${editando.codigo}`, { filas }), 'Tabla guardada')) {
      setEditando(null);
      recargar();
    }
  };
  return (
    <Seccion titulo="Tablas por rangos" descripcion="Valores que dependen de un rango: Fondo de Solidaridad por SMMLV, ARL por clase de riesgo, retención por UVT, incapacidades por días.">
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(datos ?? []).map((t) => (
            <button key={t.codigo} onClick={() => setEditando(structuredClone(t))} className="rounded-xl border border-borde p-4 text-left transition hover:border-marca-500 hover:bg-marca-50/40">
              <span className="font-medium">{t.nombre}</span>
              <span className="block font-mono text-xs text-suave">TABLA('{t.codigo}'; valor)</span>
              {t.descripcion && <span className="mt-1 block text-sm text-suave">{t.descripcion}</span>}
              <span className="mt-2 block text-sm">{t.filas.length} rangos</span>
            </button>
          ))}
        </div>
      )}
      <Modal
        abierto={!!editando}
        onCerrar={() => setEditando(null)}
        titulo={editando?.nombre ?? ''}
        ancho="xl"
        pie={
          <div className="flex w-full flex-wrap justify-between gap-2">
            {editando?.filasLegales ? (
              <Boton variante="secundario" icono={<RotateCcw className="h-4 w-4" />} onClick={async () => (await ejecutar(() => post(`/tablas/${editando.codigo}/restaurar`), 'Valores legales restaurados')) && (setEditando(null), recargar())}>
                Restaurar valores legales
              </Boton>
            ) : (
              <span />
            )}
            <Boton cargando={guardando} onClick={guardar}>
              Guardar tabla
            </Boton>
          </div>
        }
      >
        {editando && (
          <div className="space-y-3">
            <p className="text-sm text-suave">«Desde» incluido y «Hasta» sin incluir. Deje «Hasta» vacío en el último rango (en adelante).</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-suave">
                    <th className="px-1 py-2 font-medium">Desde</th>
                    <th className="px-1 py-2 font-medium">Hasta</th>
                    {editando.columnas.map((c: string) => (
                      <th key={c} className="px-1 py-2 font-medium">
                        {c}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {editando.filas.map((f: any, i: number) => {
                    const cambiar = (k: string, v: string, enValores = false) =>
                      setEditando({ ...editando, filas: editando.filas.map((x: any, j: number) => (j !== i ? x : enValores ? { ...x, valores: { ...x.valores, [k]: v } } : { ...x, [k]: v })) });
                    return (
                      <tr key={i}>
                        <td className="p-1">
                          <Entrada inputMode="decimal" value={f.desde ?? ''} onChange={(e) => cambiar('desde', e.target.value)} className="min-w-[90px]" />
                        </td>
                        <td className="p-1">
                          <Entrada inputMode="decimal" value={f.hasta ?? ''} placeholder="en adelante" onChange={(e) => cambiar('hasta', e.target.value)} className="min-w-[90px]" />
                        </td>
                        {editando.columnas.map((c: string) => (
                          <td key={c} className="p-1">
                            <Entrada inputMode="decimal" value={f.valores[c] ?? ''} onChange={(e) => cambiar(c, e.target.value, true)} className="min-w-[90px]" />
                          </td>
                        ))}
                        <td className="p-1">
                          <Boton variante="fantasma" tamano="sm" aria-label="Quitar fila" icono={<Trash2 className="h-4 w-4" />} onClick={() => setEditando({ ...editando, filas: editando.filas.filter((_: any, j: number) => j !== i) })} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Boton
              tamano="sm"
              variante="secundario"
              icono={<Plus className="h-4 w-4" />}
              onClick={() => {
                const ultima = editando.filas[editando.filas.length - 1];
                setEditando({ ...editando, filas: [...editando.filas, { desde: ultima?.hasta ?? '0', hasta: null, valores: Object.fromEntries(editando.columnas.map((c: string) => [c, '0'])) }] });
              }}
            >
              Agregar rango
            </Boton>
          </div>
        )}
      </Modal>
    </Seccion>
  );
}
