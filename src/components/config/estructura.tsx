'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { borrar, patch, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { Boton, Campo, Entrada, Insignia, Interruptor, Modal, Opciones, Pestanas, Selector, Tabla, useAccion, useAvisos } from '../ui';
import { DIAS_SEMANA, Seccion } from './comun';

interface CampoDef {
  clave: string;
  etiqueta: string;
  tipo?: 'texto' | 'numero' | 'selector' | 'calendario';
  opciones?: { valor: string | number; etiqueta: string }[];
  ayuda?: string;
  opcional?: boolean;
  enTabla?: (f: any) => ReactNode;
}

/** Lista con crear, editar y borrar para catálogos simples. */
function Catalogo({ ruta, titulo, descripcion, campos, vacio, activo = 'activo', inicial }: { ruta: string; titulo: string; descripcion?: string; campos: CampoDef[]; vacio: Record<string, unknown>; activo?: string; inicial?: string }) {
  const { datos, recargar } = useDatos<any[]>(ruta);
  const [ed, setEd] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  const { confirmar, avisar } = useAvisos();
  const guardar = async () => {
    const { id, empresaId, creadoEn, ...resto } = ed;
    const cuerpo = Object.fromEntries(Object.entries(resto).filter(([k]) => campos.some((c) => c.clave === k) || k === activo).map(([k, v]) => [k, v === '' ? null : v]));
    const r = id ? await ejecutar(() => patch(`${ruta}/${id}`, cuerpo), 'Guardado') : await ejecutar(() => post(ruta, cuerpo), 'Creado');
    if (r) {
      setEd(null);
      recargar();
    }
  };
  return (
    <Seccion
      titulo={titulo}
      descripcion={descripcion}
      accion={
        <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setEd({ ...vacio })}>
          Agregar
        </Boton>
      }
    >
      <Tabla
        filas={datos ?? []}
        clave={(f: any) => f.id}
        alClic={(f) => setEd({ ...f })}
        vacio={`Aún no hay ${titulo.toLowerCase()}`}
        columnas={[
          ...campos
            .filter((c) => c.tipo !== 'calendario')
            .slice(0, 4)
            .map((c) => ({ clave: c.clave, titulo: c.etiqueta, celda: c.enTabla ?? ((f: any) => (c.opciones ? c.opciones.find((o) => o.valor === f[c.clave])?.etiqueta : f[c.clave]) ?? '—') })),
          { clave: '_estado', titulo: 'Estado', celda: (f: any) => (f[activo] === false ? <Insignia>Inactivo</Insignia> : <Insignia tono="exito">Activo</Insignia>) },
          {
            clave: '_acc',
            titulo: '',
            celda: (f: any) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <Boton tamano="sm" variante="fantasma" aria-label="Editar" icono={<Pencil className="h-4 w-4" />} onClick={() => setEd({ ...f })} />
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  aria-label="Borrar"
                  icono={<Trash2 className="h-4 w-4" />}
                  onClick={async () => {
                    if (!(await confirmar({ titulo: 'Borrar', mensaje: 'Si tiene datos relacionados, se inactiva en lugar de borrarse.', confirmar: 'Continuar', peligro: true }))) return;
                    const r: any = await ejecutar(() => borrar(`${ruta}/${f.id}`));
                    if (r) {
                      avisar(r.mensaje ?? 'Listo');
                      recargar();
                    }
                  }}
                />
              </div>
            ),
          },
        ]}
      />
      <Modal
        abierto={!!ed}
        onCerrar={() => setEd(null)}
        titulo={ed?.id ? `Editar ${inicial ?? ''}` : `Agregar ${inicial ?? ''}`}
        pie={
          <Boton cargando={cargando} onClick={guardar}>
            Guardar
          </Boton>
        }
      >
        {ed && (
          <div className="space-y-4">
            {campos.map((c) => (
              <div key={c.clave}>
                {c.tipo === 'calendario' ? (
                  <CalendarioPropio valor={ed[c.clave]} onCambio={(v) => setEd({ ...ed, [c.clave]: v })} />
                ) : (
                  <Campo etiqueta={c.etiqueta} ayuda={c.ayuda} opcional={c.opcional}>
                    {c.tipo === 'selector' ? (
                      <Selector value={ed[c.clave] ?? ''} onChange={(e) => setEd({ ...ed, [c.clave]: typeof c.opciones?.[0]?.valor === 'number' ? Number(e.target.value) : e.target.value })} opciones={c.opciones ?? []} />
                    ) : (
                      <Entrada type={c.tipo === 'numero' ? 'number' : 'text'} value={ed[c.clave] ?? ''} onChange={(e) => setEd({ ...ed, [c.clave]: c.tipo === 'numero' ? Number(e.target.value) : e.target.value })} />
                    )}
                  </Campo>
                )}
              </div>
            ))}
            {ed.id && <Interruptor activo={ed[activo] !== false} onCambio={(v) => setEd({ ...ed, [activo]: v })} etiqueta="Activo" />}
          </div>
        )}
      </Modal>
    </Seccion>
  );
}

/** Días laborales propios (sede, área o grupo) que reemplazan los de la empresa. */
function CalendarioPropio({ valor, onCambio }: { valor: any; onCambio: (v: any) => void }) {
  const propio = !!valor;
  return (
    <div className="rounded-xl border border-borde p-3">
      <Interruptor activo={propio} onCambio={(v) => onCambio(v ? { diasLaborales: [1, 2, 3, 4, 5], diaDescanso: 0, sabadoHabilVacaciones: false } : null)} etiqueta="Días laborales propios" descripcion="Si no lo marca, usa los de la empresa." />
      {propio && (
        <div className="mt-3 space-y-3">
          <Campo etiqueta="Días que se trabaja">
            <Opciones multiple valor={valor.diasLaborales ?? []} onCambio={(v: number[]) => onCambio({ ...valor, diasLaborales: v })} opciones={DIAS_SEMANA} />
          </Campo>
          <Campo etiqueta="Descanso obligatorio">
            <Opciones valor={valor.diaDescanso ?? 0} onCambio={(v: number) => onCambio({ ...valor, diaDescanso: v, diasLaborales: (valor.diasLaborales ?? []).filter((d: number) => d !== v) })} opciones={DIAS_SEMANA} />
          </Campo>
          <Interruptor activo={!!valor.sabadoHabilVacaciones} onCambio={(v) => onCambio({ ...valor, sabadoHabilVacaciones: v })} etiqueta="El sábado es hábil para vacaciones" />
        </div>
      )}
    </div>
  );
}

const TIPOS_ENTIDAD = [
  { valor: 'eps', etiqueta: 'EPS' },
  { valor: 'afp', etiqueta: 'Fondo de pensiones' },
  { valor: 'cesantias', etiqueta: 'Fondo de cesantías' },
  { valor: 'arl', etiqueta: 'ARL' },
  { valor: 'ccf', etiqueta: 'Caja de compensación' },
  { valor: 'banco', etiqueta: 'Banco' },
  { valor: 'dian', etiqueta: 'DIAN' },
  { valor: 'otra', etiqueta: 'Otra' },
];

type P = 'sedes' | 'areas' | 'centros' | 'grupos' | 'entidades' | 'turnos';

export function SeccionEstructura() {
  const [p, setP] = useState<P>('sedes');
  return (
    <div className="space-y-4">
      <Pestanas<P>
        activa={p}
        onCambio={setP}
        pestanas={[
          { valor: 'sedes', etiqueta: 'Sedes' },
          { valor: 'areas', etiqueta: 'Áreas' },
          { valor: 'centros', etiqueta: 'Centros de costo' },
          { valor: 'grupos', etiqueta: 'Grupos de pago' },
          { valor: 'entidades', etiqueta: 'Entidades' },
          { valor: 'turnos', etiqueta: 'Turnos' },
        ]}
      />
      {p === 'sedes' && (
        <Catalogo
          ruta="/sedes"
          titulo="Sedes"
          inicial="sede"
          activo="activa"
          descripcion="Lugares de trabajo. Cada una tiene su pantalla de QR y puede tener sus propios días laborales."
          vacio={{ nombre: '', direccion: '', ciudad: '', claseRiesgo: 1, calendario: null }}
          campos={[
            { clave: 'nombre', etiqueta: 'Nombre' },
            { clave: 'ciudad', etiqueta: 'Ciudad', opcional: true },
            { clave: 'direccion', etiqueta: 'Dirección', opcional: true },
            { clave: 'claseRiesgo', etiqueta: 'Clase de riesgo ARL', tipo: 'selector', ayuda: 'Decreto 1295 de 1994. Cada empleado puede tener la suya.', opciones: [1, 2, 3, 4, 5].map((n) => ({ valor: n, etiqueta: `Clase ${n}` })) },
            { clave: 'calendario', etiqueta: 'Calendario', tipo: 'calendario' },
          ]}
        />
      )}
      {p === 'areas' && (
        <Catalogo ruta="/areas" titulo="Áreas" inicial="área" activo="activa" vacio={{ nombre: '', calendario: null }} campos={[{ clave: 'nombre', etiqueta: 'Nombre' }, { clave: 'calendario', etiqueta: 'Calendario', tipo: 'calendario' }]} />
      )}
      {p === 'centros' && (
        <Catalogo
          ruta="/centros-costo"
          titulo="Centros de costo"
          inicial="centro de costo"
          descripcion="Para repartir el costo de la nómina en la contabilidad."
          vacio={{ codigo: '', nombre: '' }}
          campos={[
            { clave: 'codigo', etiqueta: 'Código' },
            { clave: 'nombre', etiqueta: 'Nombre' },
          ]}
        />
      )}
      {p === 'grupos' && (
        <Catalogo
          ruta="/grupos-pago"
          titulo="Grupos de pago"
          inicial="grupo de pago"
          descripcion="Cada grupo se liquida con su propia periodicidad (por ejemplo, administrativos mensual y operarios quincenal)."
          vacio={{ nombre: '', periodicidad: 'mensual', diasPagoDespues: 0, calendario: null }}
          campos={[
            { clave: 'nombre', etiqueta: 'Nombre' },
            {
              clave: 'periodicidad',
              etiqueta: 'Se paga',
              tipo: 'selector',
              opciones: [
                { valor: 'mensual', etiqueta: 'Mensual' },
                { valor: 'quincenal', etiqueta: 'Quincenal' },
                { valor: 'semanal', etiqueta: 'Semanal' },
              ],
            },
            { clave: 'diasPagoDespues', etiqueta: 'Días después del corte en que se paga', tipo: 'numero', ayuda: '0 = el mismo día del corte.' },
            { clave: 'calendario', etiqueta: 'Calendario', tipo: 'calendario' },
          ]}
        />
      )}
      {p === 'entidades' && (
        <Catalogo
          ruta="/entidades"
          titulo="Entidades"
          inicial="entidad"
          activo="activa"
          descripcion="EPS, fondos de pensiones y cesantías, ARL y cajas. Ya vienen las principales por nombre; complete el NIT de las que use (lo piden los archivos del banco y la contabilidad)."
          vacio={{ tipo: 'eps', nombre: '', nit: '', codigo: '' }}
          campos={[
            { clave: 'tipo', etiqueta: 'Tipo', tipo: 'selector', opciones: TIPOS_ENTIDAD },
            { clave: 'nombre', etiqueta: 'Nombre' },
            { clave: 'nit', etiqueta: 'NIT', opcional: true },
            { clave: 'codigo', etiqueta: 'Código (PILA o del banco)', opcional: true },
          ]}
        />
      )}
      {p === 'turnos' && <Turnos />}
    </div>
  );
}

// ---------- Turnos ----------

const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];
const NOMBRE_DIA: Record<number, string> = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const duracion = (f: { inicio: string; fin: string }) => {
  const d = minutos(f.fin) - minutos(f.inicio);
  return d <= 0 ? d + 1440 : d;
};
export const horasSemana = (dias: Record<string, { inicio: string; fin: string }[]>) => Object.values(dias ?? {}).flat().reduce((a, f) => a + duracion(f), 0) / 60;

function Turnos() {
  const { datos, recargar } = useDatos<any[]>('/turnos');
  const [ed, setEd] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  const { confirmar } = useAvisos();
  const guardar = async () => {
    const cuerpo = { nombre: ed.nombre, tipo: ed.tipo, dias: ed.dias, minimoHorasDia: ed.minimoHorasDia ?? null, maximoHorasDia: ed.maximoHorasDia ?? null, ...(ed.id ? { activo: ed.activo } : {}) };
    if (await ejecutar(() => (ed.id ? patch(`/turnos/${ed.id}`, cuerpo) : post('/turnos', cuerpo)), 'Turno guardado')) {
      setEd(null);
      recargar();
    }
  };
  const ponerDia = (d: number, franjas: { inicio: string; fin: string }[]) => {
    const dias = { ...ed.dias };
    if (franjas.length) dias[String(d)] = franjas;
    else delete dias[String(d)];
    setEd({ ...ed, dias });
  };
  return (
    <Seccion
      titulo="Turnos"
      descripcion="Horario esperado por día. Lo que se trabaje por fuera es hora extra; si cruza las 7:00 p. m. lleva recargo nocturno."
      accion={
        <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setEd({ nombre: '', tipo: 'fijo', dias: Object.fromEntries([1, 2, 3, 4, 5].map((d) => [String(d), [{ inicio: '07:00', fin: '15:24' }]])), activo: true })}>
          Nuevo turno
        </Boton>
      }
    >
      <Tabla
        filas={datos ?? []}
        clave={(t: any) => t.id}
        alClic={(t) => setEd(structuredClone(t))}
        vacio="No hay turnos"
        columnas={[
          { clave: 'nombre', titulo: 'Turno', celda: (t: any) => <span className="font-medium">{t.nombre}</span> },
          { clave: 'dias', titulo: 'Días', celda: (t: any) => ORDEN_DIAS.filter((d) => t.dias?.[String(d)]?.length).map((d) => NOMBRE_DIA[d].slice(0, 3)).join(', ') },
          { clave: 'horas', titulo: 'Horas a la semana', derecha: true, celda: (t: any) => horasSemana(t.dias).toLocaleString('es-CO', { maximumFractionDigits: 2 }) },
          { clave: 'estado', titulo: '', celda: (t: any) => (t.activo === false ? <Insignia>Inactivo</Insignia> : null) },
        ]}
      />
      <Modal
        abierto={!!ed}
        onCerrar={() => setEd(null)}
        titulo={ed?.id ? 'Editar turno' : 'Nuevo turno'}
        ancho="lg"
        pie={
          <div className="flex w-full justify-between gap-2">
            {ed?.id ? (
              <Boton variante="fantasma" icono={<Trash2 className="h-4 w-4" />} onClick={async () => (await confirmar({ titulo: 'Borrar turno', mensaje: 'Si hay empleados con este turno, se inactiva.', confirmar: 'Continuar', peligro: true })) && (await ejecutar(() => borrar(`/turnos/${ed.id}`), 'Listo')) && (setEd(null), recargar())}>
                Borrar
              </Boton>
            ) : (
              <span />
            )}
            <Boton cargando={cargando} onClick={guardar}>
              Guardar
            </Boton>
          </div>
        }
      >
        {ed && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre">
                <Entrada value={ed.nombre} onChange={(e) => setEd({ ...ed, nombre: e.target.value })} />
              </Campo>
              <Campo etiqueta="Tipo">
                <Opciones
                  valor={ed.tipo ?? 'fijo'}
                  onCambio={(v) => setEd({ ...ed, tipo: v })}
                  opciones={[
                    { valor: 'fijo', etiqueta: 'Fijo' },
                    { valor: 'rotativo', etiqueta: 'Rotativo' },
                    { valor: 'flexible', etiqueta: 'Flexible' },
                  ]}
                />
              </Campo>
            </div>
            <div className="divide-y divide-borde/70 rounded-xl border border-borde">
              {ORDEN_DIAS.map((d) => {
                const franjas: { inicio: string; fin: string }[] = ed.dias?.[String(d)] ?? [];
                return (
                  <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <label className="flex w-32 items-center gap-2 font-medium">
                      <input type="checkbox" checked={franjas.length > 0} onChange={(e) => ponerDia(d, e.target.checked ? [{ inicio: '07:00', fin: '15:00' }] : [])} className="h-4 w-4 accent-[rgb(var(--marca-500))]" />
                      {NOMBRE_DIA[d]}
                    </label>
                    {franjas.length === 0 && <span className="text-sm text-suave">Descansa</span>}
                    {franjas.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Entrada type="time" value={f.inicio} onChange={(e) => ponerDia(d, franjas.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)))} className="w-[7.5rem]" />
                        <span className="text-suave">a</span>
                        <Entrada type="time" value={f.fin} onChange={(e) => ponerDia(d, franjas.map((x, j) => (j === i ? { ...x, fin: e.target.value } : x)))} className="w-[7.5rem]" />
                        {franjas.length > 1 && <Boton tamano="sm" variante="fantasma" aria-label="Quitar franja" icono={<Trash2 className="h-4 w-4" />} onClick={() => ponerDia(d, franjas.filter((_, j) => j !== i))} />}
                      </div>
                    ))}
                    {franjas.length > 0 && (
                      <Boton tamano="sm" variante="fantasma" icono={<Plus className="h-4 w-4" />} onClick={() => ponerDia(d, [...franjas, { inicio: '14:00', fin: '18:00' }])}>
                        Partido
                      </Boton>
                    )}
                    {d !== 1 && franjas.length === 0 && ed.dias?.['1'] && (
                      <button className="text-sm text-marca-600 hover:underline" onClick={() => ponerDia(d, structuredClone(ed.dias['1']))}>
                        Copiar del lunes
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-sm">
              Total: <span className="font-semibold tabular">{horasSemana(ed.dias).toLocaleString('es-CO', { maximumFractionDigits: 2 })} horas a la semana</span>
              <span className="text-suave"> · La jornada máxima legal está en Parámetros (42 horas desde el 15 de julio de 2026, Ley 2101 de 2021).</span>
            </p>
            {ed.id && <Interruptor activo={ed.activo !== false} onCambio={(v) => setEd({ ...ed, activo: v })} etiqueta="Activo" />}
          </div>
        )}
      </Modal>
    </Seccion>
  );
}
