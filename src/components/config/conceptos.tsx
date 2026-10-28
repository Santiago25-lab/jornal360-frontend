'use client';

import { CheckCircle2, FlaskConical, History, Landmark, Plus, RotateCcw, Save, Trash2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { borrar, patch, post } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';
import { useDatos } from '@/lib/datos';
import { fecha, fechaHora, hoy, pesos, valorVariable } from '@/lib/formato';
import { Aviso, Boton, Buscador, Campo, Cargando, Casilla, cx, Entrada, Insignia, Modal, Opciones, Pestanas, Selector, Tabla, useAccion, useAvisos } from '../ui';
import { Seccion } from './comun';

const TIPO: Record<string, string> = { devengo: 'Devengos (lo que se paga)', deduccion: 'Deducciones (lo que se descuenta)', aporte_empleador: 'Aportes del empleador', provision: 'Provisiones' };
const TIPO_CORTO: Record<string, string> = { devengo: 'Devengo', deduccion: 'Deducción', aporte_empleador: 'Aporte empleador', provision: 'Provisión' };

const BANDERAS: { clave: string; etiqueta: string; descripcion: string; solo?: string[] }[] = [
  { clave: 'salarial', etiqueta: 'Es salario', descripcion: 'Retribuye el servicio (CST art. 127). Si no lo marca, es un pago no salarial (art. 128).', solo: ['devengo'] },
  { clave: 'baseIbc', etiqueta: 'Suma para salud y pensión (IBC)', descripcion: 'Base de los aportes a seguridad social.', solo: ['devengo'] },
  { clave: 'baseArl', etiqueta: 'Suma para riesgos laborales', descripcion: 'Base del aporte a la ARL.', solo: ['devengo'] },
  { clave: 'baseParafiscales', etiqueta: 'Suma para caja, ICBF y SENA', descripcion: 'Base de los parafiscales.', solo: ['devengo'] },
  { clave: 'basePrestaciones', etiqueta: 'Suma para prima y cesantías', descripcion: 'Entra en el promedio del art. 253.', solo: ['devengo'] },
  { clave: 'baseVacaciones', etiqueta: 'Suma para vacaciones', descripcion: 'Entra en el promedio para liquidar vacaciones.', solo: ['devengo'] },
  { clave: 'baseRetencion', etiqueta: 'Gravado para retención en la fuente', descripcion: 'Suma en la depuración de la retención.', solo: ['devengo'] },
  { clave: 'cuenta40', etiqueta: 'Cuenta en el límite del 40 %', descripcion: 'Ley 1393 de 2010: lo no salarial que pase del 40 % del total suma al IBC.', solo: ['devengo'] },
  { clave: 'porHoras', etiqueta: 'Se paga por horas', descripcion: 'La cantidad es en horas (extras, recargos).' },
  { clave: 'requiereNovedad', etiqueta: 'Solo si se registra una novedad', descripcion: 'No aparece si no se registra un valor en Novedades.' },
];

const REDONDEO = [
  { valor: 'ninguno', etiqueta: 'Sin redondear' },
  { valor: 'peso', etiqueta: 'Al peso' },
  { valor: 'peso_arriba', etiqueta: 'Al peso hacia arriba' },
  { valor: 'centena', etiqueta: 'A la centena' },
  { valor: 'centena_arriba', etiqueta: 'A la centena hacia arriba' },
  { valor: 'mil', etiqueta: 'Al mil' },
];

const TERCEROS = ['empleado', 'eps', 'afp', 'arl', 'ccf', 'icbf', 'sena', 'dian', 'cesantias', 'otra'];

const NUEVO = {
  codigo: '',
  nombre: '',
  descripcion: '',
  tipo: 'devengo',
  categoria: null,
  formula: '',
  salarial: false,
  baseIbc: false,
  baseArl: false,
  baseParafiscales: false,
  basePrestaciones: false,
  baseVacaciones: false,
  baseRetencion: true,
  cuenta40: true,
  porHoras: false,
  requiereNovedad: false,
  orden: 500,
  redondeo: 'peso',
  cuentaDebito: '',
  cuentaCredito: '',
  terceroCredito: 'empleado',
  aplicaA: 'todos',
  estado: 'borrador',
};

export function SeccionConceptos() {
  const { datos, cargando, recargar } = useDatos<any[]>('/conceptos');
  const [buscar, setBuscar] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const lista = useMemo(() => {
    const q = buscar.toLowerCase();
    return (datos ?? []).filter((c) => !q || `${c.nombre} ${c.codigo}`.toLowerCase().includes(q));
  }, [datos, buscar]);
  return (
    <Seccion
      titulo="Conceptos de nómina"
      descripcion="Cada valor del desprendible sale de un concepto con su fórmula. Los legales vienen listos; puede ajustarlos o crear los suyos (bonos, auxilios, descuentos)."
      accion={
        <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setNuevo(true)}>
          Nuevo concepto
        </Boton>
      }
    >
      <SectorPublico alAplicar={recargar} />
      <Buscador valor={buscar} onCambio={setBuscar} placeholder="Buscar concepto…" className="mb-4" />
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <div className="space-y-6">
          {Object.keys(TIPO).map((t) => {
            const cs = lista.filter((c) => c.tipo === t);
            if (!cs.length) return null;
            return (
              <div key={t}>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-suave">{TIPO[t]}</h3>
                <div className="divide-y divide-borde/70 rounded-xl border border-borde">
                  {cs.map((c) => (
                    <button key={c.codigo} onClick={() => setAbierto(c.codigo)} className={cx('flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-marca-50/40', c.estado === 'inactivo' && 'opacity-60')}>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-medium">
                          {c.nombre}
                          {c.esLegal && <Insignia tono="marca">Legal</Insignia>}
                          {c.distintoDeLegal && <Insignia tono="alerta">Modificado</Insignia>}
                          {c.estado === 'borrador' && <Insignia tono="alerta">Borrador</Insignia>}
                          {c.estado === 'inactivo' && <Insignia>Inactivo</Insignia>}
                          {c.aplicaA === 'asignados' && <Insignia>Solo asignados</Insignia>}
                        </span>
                        <code className="block truncate font-mono text-xs text-suave">{c.formula}</code>
                      </span>
                      <span className="hidden flex-none font-mono text-xs text-suave sm:block">{c.codigo}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {(abierto || nuevo) && (
        <EditorConcepto
          codigo={abierto}
          onCerrar={() => {
            setAbierto(null);
            setNuevo(false);
          }}
          onGuardado={(codigo) => {
            recargar();
            setNuevo(false);
            setAbierto(codigo);
          }}
        />
      )}
    </Seccion>
  );
}

/** Alcaldías y gobernaciones: primas y bonificaciones públicas en un clic. */
function SectorPublico({ alAplicar }: { alAplicar: () => void }) {
  const { ejecutar, cargando } = useAccion();
  const { confirmar } = useAvisos();
  const [hecho, setHecho] = useState<string[] | null>(null);
  const aplicar = async () => {
    const ok = await confirmar({
      titulo: 'Ajustes del sector público territorial',
      mensaje:
        'Cambia la prima de servicios a 15 días por año, deja de provisionar intereses de cesantías a los afiliados al Fondo Nacional del Ahorro y agrega prima de navidad, prima de vacaciones, bonificación por servicios prestados, bonificación de recreación y subsidio de alimentación (en borrador). Los topes vienen con valores de ejemplo: confírmelos con el decreto salarial del año en Parámetros.',
      confirmar: 'Aplicar',
    });
    if (!ok) return;
    const r: any = await ejecutar(() => post('/empresa/sector-publico'), 'Ajustes del sector público aplicados');
    if (r) {
      setHecho(r.hecho);
      alAplicar();
    }
  };
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borde p-4">
      <div className="flex items-start gap-3">
        <Landmark className="mt-0.5 h-5 w-5 text-marca-600" />
        <div>
          <p className="font-medium">¿Es una entidad pública territorial?</p>
          <p className="text-sm text-suave">Alcaldías y gobernaciones: primas y bonificaciones de los Decretos 1042 y 1045 de 1978.</p>
          {hecho && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {hecho.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Boton tamano="sm" variante="secundario" cargando={cargando} onClick={aplicar}>
        Aplicar ajustes del sector público
      </Boton>
    </div>
  );
}

type Pest = 'definicion' | 'base' | 'contabilidad' | 'aplica' | 'probar' | 'versiones';

function EditorConcepto({ codigo, onCerrar, onGuardado }: { codigo: string | null; onCerrar: () => void; onGuardado: (codigo: string) => void }) {
  const ver = useDatos<any>(codigo ? `/conceptos/${codigo}` : null);
  const variables = useDatos<any>('/conceptos/variables');
  const [c, setC] = useState<any>(codigo ? null : { ...NUEVO });
  const [p, setP] = useState<Pest>('definicion');
  const { ejecutar, cargando } = useAccion();
  const { confirmar, avisar } = useAvisos();

  useEffect(() => {
    if (ver.datos) setC({ ...ver.datos, cuentaDebito: ver.datos.cuentaDebito ?? '', cuentaCredito: ver.datos.cuentaCredito ?? '', descripcion: ver.datos.descripcion ?? '' });
  }, [ver.datos]);

  const guardar = async () => {
    const { codigo: cod, id, version, esLegal, definicionLegal, distintoDeLegal, versiones, asignaciones, baseLegal, ...resto } = c;
    const cuerpo = { ...resto, cuentaDebito: resto.cuentaDebito || null, cuentaCredito: resto.cuentaCredito || null, categoria: resto.categoria || null };
    const r: any = codigo ? await ejecutar(() => patch(`/conceptos/${codigo}`, cuerpo), 'Concepto guardado') : await ejecutar(() => post('/conceptos', { ...cuerpo, codigo: cod }), 'Concepto creado');
    if (r) {
      if (codigo) ver.recargar();
      onGuardado(r.codigo);
    }
  };

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={codigo ? (c?.nombre ?? 'Concepto') : 'Nuevo concepto'}
      ancho="xl"
      pie={
        c && (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {codigo && c.esLegal && c.distintoDeLegal && (
                <Boton variante="secundario" icono={<RotateCcw className="h-4 w-4" />} onClick={async () => (await ejecutar(() => post(`/conceptos/${codigo}/restaurar`), 'Definición legal restaurada')) && (ver.recargar(), onGuardado(codigo))}>
                  Restaurar legal
                </Boton>
              )}
              {codigo && (
                <Boton
                  variante="fantasma"
                  icono={<Trash2 className="h-4 w-4" />}
                  onClick={async () => {
                    if (!(await confirmar({ titulo: 'Borrar concepto', mensaje: 'Si es legal o ya se usó en nóminas, se inactiva en lugar de borrarse.', confirmar: 'Continuar', peligro: true }))) return;
                    const r: any = await ejecutar(() => borrar(`/conceptos/${codigo}`));
                    if (r) {
                      avisar(r.mensaje ?? 'Concepto borrado');
                      onGuardado(codigo);
                      if (r.borrado) onCerrar();
                    }
                  }}
                >
                  Borrar
                </Boton>
              )}
            </div>
            <Boton cargando={cargando} icono={<Save className="h-4 w-4" />} onClick={guardar}>
              Guardar
            </Boton>
          </div>
        )
      }
    >
      {!c ? (
        <Cargando />
      ) : (
        <div className="space-y-4">
          <Pestanas<Pest>
            activa={p}
            onCambio={setP}
            pestanas={[
              { valor: 'definicion', etiqueta: 'Fórmula' },
              { valor: 'base', etiqueta: 'En qué influye' },
              { valor: 'contabilidad', etiqueta: 'Contabilidad' },
              { valor: 'aplica', etiqueta: 'A quién aplica' },
              ...(codigo ? [{ valor: 'probar' as Pest, etiqueta: 'Probar' }, { valor: 'versiones' as Pest, etiqueta: 'Historial' }] : []),
            ]}
          />
          {p === 'definicion' && <Definicion c={c} setC={setC} nuevo={!codigo} variables={variables.datos} />}
          {p === 'base' && (
            <div className="space-y-3">
              {c.tipo !== 'devengo' && <Aviso>Las bases solo aplican a devengos. Para este tipo de concepto no hay que marcar nada.</Aviso>}
              {BANDERAS.filter((b) => !b.solo || b.solo.includes(c.tipo)).map((b) => (
                <Casilla key={b.clave} marcada={!!c[b.clave]} onCambio={(v) => setC({ ...c, [b.clave]: v })} etiqueta={b.etiqueta} descripcion={b.descripcion} />
              ))}
              {c.esLegal && c.definicionLegal && <p className="text-xs text-suave">Base legal: {c.baseLegal ?? '—'}</p>}
            </div>
          )}
          {p === 'contabilidad' && (
            <div className="grid gap-4 md:grid-cols-3">
              <Campo etiqueta="Cuenta débito (PUC)">
                <Entrada value={c.cuentaDebito} inputMode="numeric" onChange={(e) => setC({ ...c, cuentaDebito: e.target.value })} placeholder="510506" />
              </Campo>
              <Campo etiqueta="Cuenta crédito (PUC)">
                <Entrada value={c.cuentaCredito} inputMode="numeric" onChange={(e) => setC({ ...c, cuentaCredito: e.target.value })} placeholder="250505" />
              </Campo>
              <Campo etiqueta="Tercero del crédito" ayuda="A quién se le debe: al empleado, a la EPS, al fondo de pensiones…">
                <Selector value={c.terceroCredito ?? ''} onChange={(e) => setC({ ...c, terceroCredito: e.target.value || null })} vacio="Ninguno" opciones={TERCEROS.map((t) => ({ valor: t, etiqueta: t.toUpperCase() === t ? t : t.charAt(0).toUpperCase() + t.slice(1) }))} />
              </Campo>
            </div>
          )}
          {p === 'aplica' && <Aplica c={c} setC={setC} codigo={codigo} asignaciones={ver.datos?.asignaciones ?? []} recargar={ver.recargar} />}
          {p === 'probar' && codigo && <Probar codigo={codigo} />}
          {p === 'versiones' && (
            <div className="space-y-2">
              {(c.versiones ?? []).map((v: any) => (
                <details key={v.id} className="rounded-xl border border-borde p-3">
                  <summary className="cursor-pointer">
                    <span className="font-medium">Versión {v.version}</span> · {fechaHora(v.creadoEn)} · {v.creadoPorNombre ?? 'Sistema'}
                  </summary>
                  <code className="mt-2 block whitespace-pre-wrap rounded bg-fondo p-2 font-mono text-xs">{v.datos?.formula}</code>
                  <Boton
                    className="mt-2"
                    tamano="sm"
                    variante="secundario"
                    icono={<History className="h-4 w-4" />}
                    onClick={() => {
                      setC({ ...c, formula: v.datos.formula });
                      setP('definicion');
                      avisar('Fórmula de esa versión cargada. Guarde para aplicarla.', 'info');
                    }}
                  >
                    Usar esta fórmula
                  </Boton>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Definicion({ c, setC, nuevo, variables }: { c: any; setC: (c: any) => void; nuevo: boolean; variables: any }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [validacion, setValidacion] = useState<{ valida: boolean; errores: string[] } | null>(null);
  const [grupoVar, setGrupoVar] = useState<'sistema' | 'parametros' | 'conceptos' | 'funciones' | 'campos'>('sistema');
  const [filtroVar, setFiltroVar] = useState('');

  useEffect(() => {
    if (!c.formula.trim()) return setValidacion(null);
    const t = setTimeout(async () => {
      try {
        setValidacion(await post('/conceptos/validar', { codigo: c.codigo || 'NUEVO', formula: c.formula }));
      } catch {
        /* sin conexión: se valida al guardar */
      }
    }, 450);
    return () => clearTimeout(t);
  }, [c.formula, c.codigo]);

  const insertar = (texto: string) => {
    const el = ref.current;
    if (!el) return setC({ ...c, formula: c.formula + texto });
    const ini = el.selectionStart ?? c.formula.length;
    const fin = el.selectionEnd ?? ini;
    const f = c.formula.slice(0, ini) + texto + c.formula.slice(fin);
    setC({ ...c, formula: f });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(ini + texto.length, ini + texto.length);
    });
  };

  const opcionesVar = useMemo(() => {
    if (!variables) return [];
    const q = filtroVar.toLowerCase();
    const l: { codigo: string; descripcion?: string; insertar: string }[] =
      grupoVar === 'funciones'
        ? [
            { codigo: 'SI', descripcion: 'SI(condición; si es verdad; si no)', insertar: 'SI( ; ; )' },
            { codigo: 'Y', descripcion: 'Todas las condiciones', insertar: 'Y( ; )' },
            { codigo: 'O', descripcion: 'Alguna condición', insertar: 'O( ; )' },
            { codigo: 'NO', descripcion: 'Lo contrario', insertar: 'NO( )' },
            { codigo: 'MIN', descripcion: 'El menor', insertar: 'MIN( ; )' },
            { codigo: 'MAX', descripcion: 'El mayor', insertar: 'MAX( ; )' },
            { codigo: 'ABS', descripcion: 'Valor absoluto', insertar: 'ABS( )' },
            { codigo: 'REDONDEAR', descripcion: 'REDONDEAR(valor; decimales)', insertar: 'REDONDEAR( ; 0)' },
            { codigo: 'REDONDEAR_ARRIBA', descripcion: 'Redondear hacia arriba', insertar: 'REDONDEAR_ARRIBA( ; 0)' },
            { codigo: 'TRUNCAR', descripcion: 'Quitar decimales', insertar: 'TRUNCAR( ; 0)' },
            ...(variables.tablas ?? []).map((t: string) => ({ codigo: `TABLA ${t}`, descripcion: `Busca en la tabla ${t}`, insertar: `TABLA('${t}'; )` })),
          ]
        : (variables[grupoVar] ?? []).map((v: any) => ({ ...v, insertar: v.codigo }));
    return l.filter((v) => !q || `${v.codigo} ${v.descripcion ?? ''}`.toLowerCase().includes(q));
  }, [variables, grupoVar, filtroVar]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Nombre (como sale en el desprendible)">
          <Entrada value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value, codigo: nuevo && !c.codigoFijo ? e.target.value.normalize('NFD').replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_').toUpperCase() : c.codigo })} />
        </Campo>
        <Campo etiqueta="Código" ayuda="Con este nombre otras fórmulas pueden usar su valor.">
          <Entrada value={c.codigo} disabled={!nuevo} className="font-mono" onChange={(e) => setC({ ...c, codigo: e.target.value.toUpperCase(), codigoFijo: true })} />
        </Campo>
      </div>
      <Campo etiqueta="Tipo">
        <Opciones
          valor={c.tipo}
          onCambio={(v) => setC({ ...c, tipo: v })}
          opciones={Object.entries(TIPO_CORTO).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
        />
      </Campo>
      {nuevo && variables?.plantillas && (
        <Campo etiqueta="¿No quiere escribir la fórmula? Elija una plantilla">
          <div className="flex flex-wrap gap-2">
            {variables.plantillas.map((pl: any) => (
              <button key={pl.codigo} type="button" onClick={() => setC({ ...c, formula: pl.formula, requiereNovedad: !!pl.requiereNovedad })} className="rounded-xl border border-borde px-3 py-2 text-left text-sm hover:border-marca-500 hover:bg-marca-50/50" title={pl.ayuda}>
                {pl.nombre}
              </button>
            ))}
          </div>
        </Campo>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div>
          <Campo etiqueta="Fórmula" ayuda="Como en Excel: decimales con coma (0,5) y separe con punto y coma (;). Ejemplo: SI(SALARIO <= 2 * SMMLV; AUX_TRANSPORTE / 30 * DIAS_SALARIO; 0)">
            <textarea
              ref={ref}
              value={c.formula}
              onChange={(e) => setC({ ...c, formula: e.target.value })}
              rows={5}
              spellCheck={false}
              className="w-full rounded-xl border border-borde bg-tarjeta px-3 py-2.5 font-mono text-[14px] focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30"
            />
          </Campo>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['+', '-', '*', '/', '(', ')', ';', '>=', '<=', '='].map((s) => (
              <button key={s} type="button" onClick={() => insertar(` ${s} `)} className="h-8 min-w-8 rounded-lg border border-borde px-2 font-mono text-sm hover:bg-marca-50">
                {s}
              </button>
            ))}
          </div>
          {validacion && (
            <div className="mt-3">
              {validacion.valida ? (
                <p className="flex items-center gap-1.5 text-sm text-exito">
                  <CheckCircle2 className="h-4 w-4" /> La fórmula es válida
                </p>
              ) : (
                <div className="space-y-1">
                  {validacion.errores.map((er, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-sm text-peligro">
                      <XCircle className="mt-0.5 h-4 w-4 flex-none" /> {er}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Redondeo">
              <Selector value={c.redondeo} onChange={(e) => setC({ ...c, redondeo: e.target.value })} opciones={REDONDEO} />
            </Campo>
            <Campo etiqueta="Orden de cálculo" ayuda="Si usa otros conceptos, el sistema los calcula primero automáticamente.">
              <Entrada type="number" value={c.orden} onChange={(e) => setC({ ...c, orden: Number(e.target.value) })} />
            </Campo>
            <Campo etiqueta="Estado">
              <Selector
                value={c.estado}
                onChange={(e) => setC({ ...c, estado: e.target.value })}
                opciones={[
                  { valor: 'activo', etiqueta: 'Activo' },
                  { valor: 'borrador', etiqueta: 'Borrador (solo para probar)' },
                  { valor: 'inactivo', etiqueta: 'Inactivo' },
                ]}
              />
            </Campo>
          </div>
          <Campo etiqueta="Descripción" opcional className="mt-4">
            <Entrada value={c.descripcion ?? ''} onChange={(e) => setC({ ...c, descripcion: e.target.value })} />
          </Campo>
        </div>
        <div className="rounded-xl border border-borde p-3">
          <p className="mb-2 text-sm font-medium">Insertar en la fórmula</p>
          <Selector
            value={grupoVar}
            onChange={(e) => setGrupoVar(e.target.value as any)}
            opciones={[
              { valor: 'sistema', etiqueta: 'Datos del empleado y periodo' },
              { valor: 'parametros', etiqueta: 'Parámetros' },
              { valor: 'conceptos', etiqueta: 'Otros conceptos' },
              { valor: 'campos', etiqueta: 'Campos adicionales' },
              { valor: 'funciones', etiqueta: 'Funciones y tablas' },
            ]}
          />
          <Buscador valor={filtroVar} onCambio={setFiltroVar} className="mt-2" />
          <div className="mt-2 max-h-72 space-y-0.5 overflow-y-auto">
            {opcionesVar.map((v) => (
              <button key={v.codigo} type="button" onClick={() => insertar(v.insertar)} className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-marca-50">
                <span className="block font-mono text-[12px] font-medium">{v.codigo}</span>
                {v.descripcion && <span className="block text-xs text-suave">{v.descripcion}</span>}
              </button>
            ))}
            {!opcionesVar.length && <p className="px-2 py-3 text-sm text-suave">Nada por aquí.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const OBJETIVOS = [
  { valor: 'empleado', etiqueta: 'Un empleado' },
  { valor: 'cargo', etiqueta: 'Un cargo' },
  { valor: 'area', etiqueta: 'Un área' },
  { valor: 'centro_costo', etiqueta: 'Un centro de costo' },
  { valor: 'sede', etiqueta: 'Una sede' },
  { valor: 'grupo', etiqueta: 'Un grupo de pago' },
];

function Aplica({ c, setC, codigo, asignaciones, recargar }: { c: any; setC: (c: any) => void; codigo: string | null; asignaciones: any[]; recargar: () => void }) {
  const cat = useCatalogos();
  const emps = useDatos<any[]>('/empleados?estado=activo');
  const [n, setN] = useState({ tipoObjetivo: 'empleado', objetivo: '', desde: hoy(), hasta: '', valor: '' });
  const { ejecutar, cargando } = useAccion();
  const opciones: Record<string, { valor: string; etiqueta: string }[]> = {
    empleado: (emps.datos ?? []).map((e) => ({ valor: e.id, etiqueta: `${e.apellidos} ${e.nombres}` })),
    area: cat.areas,
    centro_costo: cat.centros,
    sede: cat.sedes,
    grupo: cat.grupos,
  };
  const nombre = (a: any) => opciones[a.tipoObjetivo]?.find((o) => o.valor === a.objetivo)?.etiqueta ?? a.objetivo;
  return (
    <div className="space-y-4">
      <Opciones
        valor={c.aplicaA}
        onCambio={(v) => setC({ ...c, aplicaA: v })}
        opciones={[
          { valor: 'todos', etiqueta: 'A todos los empleados', descripcion: 'La fórmula decide cuándo da cero' },
          { valor: 'asignados', etiqueta: 'Solo a los asignados', descripcion: 'Empleados, cargos, áreas o sedes que elija' },
        ]}
      />
      {c.aplicaA === 'asignados' && !codigo && <Aviso>Guarde el concepto primero para poder asignarlo.</Aviso>}
      {c.aplicaA === 'asignados' && codigo && (
        <>
          <Tabla
            filas={asignaciones}
            clave={(a: any) => a.id}
            vacio="Aún no hay asignaciones"
            columnas={[
              { clave: 'a', titulo: 'Aplica a', celda: (a: any) => `${OBJETIVOS.find((o) => o.valor === a.tipoObjetivo)?.etiqueta}: ${nombre(a)}` },
              { clave: 'fechas', titulo: 'Vigencia', celda: (a: any) => `${fecha(a.desde)} ${a.hasta ? `a ${fecha(a.hasta)}` : 'en adelante'}` },
              { clave: 'valor', titulo: 'Valor (VALOR_ASIGNADO)', derecha: true, celda: (a: any) => (a.valor ? pesos(a.valor) : '—') },
              { clave: 'acc', titulo: '', celda: (a: any) => <Boton tamano="sm" variante="fantasma" aria-label="Quitar" icono={<Trash2 className="h-4 w-4" />} onClick={async () => (await ejecutar(() => borrar(`/conceptos/asignaciones/${a.id}`), 'Asignación quitada')) && recargar()} /> },
            ]}
          />
          <div className="grid items-end gap-3 rounded-xl border border-borde p-3 md:grid-cols-3">
            <Campo etiqueta="Asignar a">
              <Selector value={n.tipoObjetivo} onChange={(e) => setN({ ...n, tipoObjetivo: e.target.value, objetivo: '' })} opciones={OBJETIVOS} />
            </Campo>
            <Campo etiqueta="¿Cuál?">
              {n.tipoObjetivo === 'cargo' ? (
                <Entrada value={n.objetivo} placeholder="Nombre del cargo" onChange={(e) => setN({ ...n, objetivo: e.target.value })} />
              ) : (
                <Selector value={n.objetivo} onChange={(e) => setN({ ...n, objetivo: e.target.value })} vacio="Elija…" opciones={opciones[n.tipoObjetivo] ?? []} />
              )}
            </Campo>
            <Campo etiqueta="Valor" opcional ayuda="Disponible en la fórmula como VALOR_ASIGNADO.">
              <Entrada inputMode="decimal" value={n.valor} onChange={(e) => setN({ ...n, valor: e.target.value.replace(/[^\d]/g, '') })} />
            </Campo>
            <Campo etiqueta="Desde">
              <Entrada type="date" value={n.desde} onChange={(e) => setN({ ...n, desde: e.target.value })} />
            </Campo>
            <Campo etiqueta="Hasta" opcional>
              <Entrada type="date" value={n.hasta} onChange={(e) => setN({ ...n, hasta: e.target.value })} />
            </Campo>
            <Boton
              disabled={!n.objetivo}
              cargando={cargando}
              icono={<Plus className="h-4 w-4" />}
              onClick={async () => {
                if (await ejecutar(() => post(`/conceptos/${codigo}/asignaciones`, { ...n, hasta: n.hasta || null, valor: n.valor || null }), 'Asignado')) {
                  setN({ ...n, objetivo: '', valor: '' });
                  recargar();
                }
              }}
            >
              Asignar
            </Boton>
          </div>
        </>
      )}
    </div>
  );
}

function Probar({ codigo }: { codigo: string }) {
  const emps = useDatos<any[]>('/empleados?estado=activo');
  const [d, setD] = useState({ empleadoId: '', desde: `${hoy().slice(0, 7)}-01`, hasta: hoy() });
  const [r, setR] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  return (
    <div className="space-y-4">
      <p className="text-sm text-suave">Calcula el concepto con un empleado real sin guardar nada. Funciona aunque el concepto esté en borrador. Guarde antes de probar los cambios.</p>
      <div className="grid items-end gap-3 md:grid-cols-[1fr_160px_160px_auto]">
        <Campo etiqueta="Empleado">
          <Selector value={d.empleadoId} onChange={(e) => setD({ ...d, empleadoId: e.target.value })} vacio="Elija…" opciones={(emps.datos ?? []).map((e) => ({ valor: e.id, etiqueta: `${e.apellidos} ${e.nombres}` }))} />
        </Campo>
        <Campo etiqueta="Desde">
          <Entrada type="date" value={d.desde} onChange={(e) => setD({ ...d, desde: e.target.value })} />
        </Campo>
        <Campo etiqueta="Hasta">
          <Entrada type="date" value={d.hasta} onChange={(e) => setD({ ...d, hasta: e.target.value })} />
        </Campo>
        <Boton disabled={!d.empleadoId} cargando={cargando} icono={<FlaskConical className="h-4 w-4" />} onClick={async () => setR(await ejecutar(() => post(`/conceptos/${codigo}/probar`, d)))}>
          Probar
        </Boton>
      </div>
      {r && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-destacado p-4 text-white">
            <p className="text-sm opacity-90">Resultado</p>
            <p className="text-2xl font-semibold tabular">{pesos(r.valor)}</p>
          </div>
          {r.linea?.detalle?.variables && (
            <div className="grid gap-x-6 gap-y-1 rounded-xl bg-fondo p-3 text-sm sm:grid-cols-2">
              {Object.entries(r.linea.detalle.variables).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-borde/60 py-0.5">
                  <span className="font-mono text-[12px] text-suave">{k}</span>
                  <span className="tabular">{valorVariable(v)}</span>
                </div>
              ))}
            </div>
          )}
          {!r.linea && <Aviso>El concepto dio cero o no aplica a este empleado en esas fechas.</Aviso>}
          {r.alertas?.map((a: any, i: number) => (
            <Aviso key={i} tono={a.nivel === 'error' ? 'peligro' : 'alerta'}>
              {a.mensaje}
            </Aviso>
          ))}
        </div>
      )}
    </div>
  );
}

