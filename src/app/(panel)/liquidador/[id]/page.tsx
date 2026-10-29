'use client';

import { ArrowLeft, Calculator, Copy, FileSpreadsheet, Pencil, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CATEGORIAS, mostrarValor } from '@/components/config/parametros';
import { Importador } from '@/components/importador';
import { Indicador } from '@/components/indicador';
import { PasoAPaso } from '@/components/paso-a-paso';
import { Aviso, Boton, Buscador, Campo, Cargando, Encabezado, Entrada, EntradaDinero, Insignia, Interruptor, Modal, Pestanas, Selector, Tabla, Tarjeta, useAccion, useAvisos } from '@/components/ui';
import { borrar, descargarBase64, get, patch, post, put } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fecha, pesos } from '@/lib/formato';
import { ADVERTENCIA_REGLAS, NOMBRE_REGIMEN, NOMBRE_TIPO_LIQUIDACION } from '@/lib/liquidador';

type Pest = 'personas' | 'resultado' | 'valores';
const BASICOS = ['documento', 'nombre', 'cargo', 'salario', 'tipo_contrato', 'fecha_ingreso', 'clase_riesgo', 'auxilio', 'pensionado', 'cesantias_fna'];

export default function DetalleLiquidacion() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { datos: l, recargar, setDatos } = useDatos<any>(`/liquidador/${id}`);
  const [p, setP] = useState<Pest>('personas');
  const [persona, setPersona] = useState<{ indice: number | null; datos: Record<string, any> } | null>(null);
  const [importar, setImportar] = useState(false);
  const [copia, setCopia] = useState<any>(null);
  const [detalle, setDetalle] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  const { confirmar, error } = useAvisos();

  useEffect(() => {
    if (l?.estado === 'liquidada') setP((x) => (x === 'personas' ? 'resultado' : x));
  }, [l?.estado]);

  if (!l) return <Cargando />;
  const filas: Record<string, any>[] = l.empleados.map((e: any) => e.datos);

  const guardarFilas = async (nuevas: Record<string, any>[], aviso?: string) => {
    const r = await ejecutar(() => put(`/liquidador/${id}/empleados`, { empleados: nuevas }), aviso);
    if (r) setDatos(r);
    return r;
  };
  const liquidar = async () => {
    const r = await ejecutar(() => post(`/liquidador/${id}/liquidar`), 'Liquidación lista');
    if (r) {
      setDatos(r);
      setP('resultado');
    }
  };
  const descargarExcel = async () => {
    const r: any = await ejecutar(() => get(`/liquidador/${id}/excel`));
    if (r) descargarBase64(r.archivoBase64, r.nombre, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  return (
    <>
      <Link href="/liquidador" className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
        <ArrowLeft className="h-4 w-4" /> Liquidador Express
      </Link>
      <Encabezado
        titulo={l.nombre}
        descripcion={`${NOMBRE_TIPO_LIQUIDACION[l.tipo]} · ${NOMBRE_REGIMEN[l.regimen]} · ${fecha(l.desde)} a ${fecha(l.hasta)}${l.clienteRazonSocial ? ` · ${l.clienteRazonSocial}` : ''}`}
        acciones={
          <>
            <Boton icono={<Calculator className="h-4 w-4" />} cargando={cargando} disabled={!filas.length} onClick={liquidar}>
              {l.estado === 'liquidada' ? 'Volver a liquidar' : 'Liquidar'}
            </Boton>
            <Boton variante="secundario" icono={<Copy className="h-4 w-4" />} onClick={() => setCopia({ nombre: `${l.nombre} (copia)`, desde: l.desde, hasta: l.hasta })}>
              Copiar
            </Boton>
            <Boton
              variante="fantasma"
              icono={<Trash2 className="h-4 w-4" />}
              onClick={async () => {
                if (!(await confirmar({ titulo: 'Borrar liquidación', mensaje: 'Se borran sus personas y resultados. No afecta nada más.', confirmar: 'Borrar', peligro: true }))) return;
                if (await ejecutar(() => borrar(`/liquidador/${id}`), 'Liquidación borrada')) router.push('/liquidador');
              }}
            >
              Borrar
            </Boton>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {l.estado === 'liquidada' ? <Insignia tono="exito">Liquidada</Insignia> : <Insignia tono="alerta">Borrador: falta liquidar</Insignia>}
        <Insignia>{filas.length} persona(s)</Insignia>
        {Object.keys(l.parametros ?? {}).length > 0 && <Insignia tono="marca">{Object.keys(l.parametros).length} valor(es) cambiados</Insignia>}
      </div>
      <Pestanas<Pest>
        activa={p}
        onCambio={setP}
        pestanas={[
          { valor: 'personas', etiqueta: 'Personas', contador: filas.length },
          { valor: 'resultado', etiqueta: 'Resultado' },
          { valor: 'valores', etiqueta: 'Valores de la liquidación' },
        ]}
      />

      {p === 'personas' && (
        <Tarjeta
          titulo="Personas a liquidar"
          subtitulo="Agregue cada persona con su salario y lo que tuvo en el periodo, o cárguelas todas desde Excel."
          accion={
            <div className="flex flex-wrap gap-2">
              <Boton tamano="sm" variante="secundario" icono={<Upload className="h-4 w-4" />} onClick={() => setImportar(true)}>
                Cargar desde Excel
              </Boton>
              <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setPersona({ indice: null, datos: { tipo_contrato: 'indefinido', auxilio: 'ley' } })}>
                Agregar persona
              </Boton>
            </div>
          }
        >
          <Tabla
            filas={filas.map((f, i) => ({ ...f, _i: i }))}
            clave={(f: any) => `${f._i}-${f.documento}`}
            alClic={(f: any) => setPersona({ indice: f._i, datos: { ...f } })}
            vacio="Aún no hay personas"
            columnas={[
              { clave: 'nombre', titulo: 'Nombre', celda: (f: any) => <span className="font-medium">{f.nombre || '—'}</span> },
              { clave: 'documento', titulo: 'Documento' },
              { clave: 'cargo', titulo: 'Cargo', celda: (f: any) => f.cargo || '—' },
              { clave: 'salario', titulo: 'Salario', derecha: true, celda: (f: any) => pesos(f.salario) },
              {
                clave: 'neto',
                titulo: 'Neto',
                derecha: true,
                celda: (f: any) => {
                  const r = l.empleados[f._i]?.resultado;
                  return r && l.estado === 'liquidada' ? pesos(r.totales.neto) : '—';
                },
              },
              {
                clave: 'acc',
                titulo: '',
                celda: (f: any) => (
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Boton tamano="sm" variante="fantasma" aria-label="Editar" icono={<Pencil className="h-4 w-4" />} onClick={() => setPersona({ indice: f._i, datos: { ...f } })} />
                    <Boton tamano="sm" variante="fantasma" aria-label="Quitar" icono={<Trash2 className="h-4 w-4" />} onClick={() => guardarFilas(filas.filter((_, j) => j !== f._i), 'Persona quitada')} />
                  </div>
                ),
              },
            ]}
          />
        </Tarjeta>
      )}

      {p === 'resultado' && <Resultado l={l} alVer={setDetalle} alExcel={descargarExcel} cargando={cargando} />}
      {p === 'valores' && <Valores l={l} alGuardar={(r: any) => setDatos(r)} />}

      {persona && (
        <FormPersona
          campos={l.campos}
          inicial={persona.datos}
          nueva={persona.indice === null}
          onCerrar={() => setPersona(null)}
          onGuardar={async (d) => {
            const nuevas = persona.indice === null ? [...filas, d] : filas.map((x, j) => (j === persona.indice ? d : x));
            if (await guardarFilas(nuevas, persona.indice === null ? 'Persona agregada' : 'Cambios guardados')) setPersona(null);
          }}
        />
      )}

      <Importador
        abierto={importar}
        onCerrar={() => setImportar(false)}
        titulo="Cargar personas desde Excel"
        tipo="empleados"
        descripcion="Descargue la plantilla de este tipo de liquidación, llene una fila por persona y súbala. La hoja «Qué va en cada columna» explica cada dato. Si un documento ya está, su fila se reemplaza."
        rutaPlantilla={`/liquidador/plantilla/${l.tipo}`}
        rutaImportar={`/liquidador/${id}/importar`}
        alTerminar={recargar}
      />

      <Modal
        abierto={!!copia}
        onCerrar={() => setCopia(null)}
        titulo="Copiar para otro periodo"
        pie={
          <Boton
            cargando={cargando}
            onClick={async () => {
              const r: any = await ejecutar(() => post(`/liquidador/${id}/copiar`, copia), 'Copia creada');
              if (r) {
                setCopia(null);
                router.push(`/liquidador/${r.id}`);
              }
            }}
          >
            Crear copia
          </Boton>
        }
      >
        {copia && (
          <div className="space-y-4">
            <p className="text-suave">Se copian las personas y los valores cambiados. Luego ajuste solo lo que cambió y vuelva a liquidar.</p>
            <Campo etiqueta="Nombre">
              <Entrada value={copia.nombre} onChange={(e) => setCopia({ ...copia, nombre: e.target.value })} />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Desde">
                <Entrada type="date" value={copia.desde} onChange={(e) => setCopia({ ...copia, desde: e.target.value })} />
              </Campo>
              <Campo etiqueta="Hasta">
                <Entrada type="date" value={copia.hasta} onChange={(e) => setCopia({ ...copia, hasta: e.target.value })} />
              </Campo>
            </div>
          </div>
        )}
      </Modal>

      <Modal abierto={!!detalle} onCerrar={() => setDetalle(null)} titulo={detalle?.empleado ?? ''} ancho="lg">
        {detalle && <PasoAPaso det={detalle} urlDesprendible={`/liquidador/${id}/empleados/${detalle.filaId}/pdf`} />}
      </Modal>
    </>
  );
}

/** Formulario de una persona: los campos dependen del tipo de liquidación. */
function FormPersona({ campos, inicial, nueva, onCerrar, onGuardar }: { campos: any[]; inicial: Record<string, any>; nueva: boolean; onCerrar: () => void; onGuardar: (d: Record<string, any>) => void }) {
  const [d, setD] = useState<Record<string, any>>(inicial);
  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));
  const grupos = [
    { titulo: 'Datos de la persona', lista: campos.filter((c) => BASICOS.includes(c.clave)) },
    { titulo: 'Lo que tuvo en el periodo', lista: campos.filter((c) => !BASICOS.includes(c.clave)) },
  ].filter((g) => g.lista.length);
  const control = (c: any) => {
    const v = d[c.clave] ?? '';
    if (c.tipo === 'dinero') return <EntradaDinero valor={v} onCambio={(x) => set(c.clave, x)} />;
    if (c.tipo === 'fecha') return <Entrada type="date" value={v} onChange={(e) => set(c.clave, e.target.value)} />;
    if (c.tipo === 'opcion') return <Selector value={v} onChange={(e) => set(c.clave, e.target.value)} opciones={c.opciones} vacio="Elija…" />;
    if (c.tipo === 'si_no') return <Interruptor activo={d[c.clave] === true || d[c.clave] === 'sí' || d[c.clave] === 'si'} onCambio={(x) => set(c.clave, x)} etiqueta={d[c.clave] === true ? 'Sí' : 'No'} />;
    return <Entrada value={v} inputMode={c.tipo === 'numero' ? 'decimal' : undefined} onChange={(e) => set(c.clave, c.tipo === 'numero' ? e.target.value.replace(/[^\d.,]/g, '') : e.target.value)} />;
  };
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={nueva ? 'Agregar persona' : `Editar: ${inicial.nombre ?? ''}`}
      ancho="xl"
      pie={
        <Boton icono={<Save className="h-4 w-4" />} onClick={() => onGuardar(d)}>
          Guardar
        </Boton>
      }
    >
      <div className="space-y-6">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <h3 className="mb-3 font-semibold">{g.titulo}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.lista.map((c: any) => (
                <Campo key={c.clave} etiqueta={c.titulo} ayuda={c.ayuda} opcional={!c.obligatorio}>
                  {control(c)}
                </Campo>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Resultado({ l, alVer, alExcel, cargando }: { l: any; alVer: (d: any) => void; alExcel: () => void; cargando: boolean }) {
  if (l.estado !== 'liquidada' || !l.totales) return <Aviso>Agregue las personas y dele «Liquidar» para ver el resultado.</Aviso>;
  const filas = l.empleados.filter((e: any) => e.resultado);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Neto a pagar" valor={pesos(l.totales.neto)} destacado />
        <Indicador titulo="Total devengado" valor={pesos(l.totales.devengos)} />
        <Indicador titulo="Aportes del empleador" valor={pesos(l.totales.aportesEmpleador)} />
        <Indicador titulo="Costo total" valor={pesos(l.totales.costoTotal)} detalle={`Provisiones: ${pesos(l.totales.provisiones)}`} />
      </div>
      <Tarjeta
        titulo="Resultado por persona"
        subtitulo="Toque una persona para ver cómo se calculó cada valor y descargar su desprendible."
        accion={
          <Boton tamano="sm" variante="secundario" cargando={cargando} icono={<FileSpreadsheet className="h-4 w-4" />} onClick={alExcel}>
            Descargar Excel
          </Boton>
        }
      >
        <Tabla
          filas={filas}
          clave={(e: any) => e.id}
          alClic={(e: any) => alVer({ ...e.resultado, empleado: e.datos.nombre, documento: e.datos.documento, cargo: e.datos.cargo, filaId: e.id })}
          columnas={[
            { clave: 'nombre', titulo: 'Persona', celda: (e: any) => <span className="font-medium">{e.datos.nombre}</span> },
            { clave: 'dev', titulo: 'Devengos', derecha: true, celda: (e: any) => pesos(e.resultado.totales.devengos) },
            { clave: 'ded', titulo: 'Deducciones', derecha: true, celda: (e: any) => pesos(e.resultado.totales.deducciones) },
            { clave: 'neto', titulo: 'Neto', derecha: true, celda: (e: any) => <span className="font-semibold">{pesos(e.resultado.totales.neto)}</span> },
            { clave: 'alertas', titulo: '', celda: (e: any) => (e.resultado.alertas?.length ? <Insignia tono="alerta">{e.resultado.alertas.length} aviso(s)</Insignia> : null) },
          ]}
        />
      </Tarjeta>
    </div>
  );
}

const NOMBRE_CATEGORIA: Record<string, string> = { ...CATEGORIAS, publico: 'Propios del sector público' };

/** Valores que usa esta liquidación: arrancan con los del régimen y se pueden cambiar solo aquí. */
function Valores({ l, alGuardar }: { l: any; alGuardar: (r: any) => void }) {
  const { datos } = useDatos<any[]>(`/liquidador/${l.id}/parametros`);
  const [cambios, setCambios] = useState<Record<string, string>>(l.parametros ?? {});
  const [buscar, setBuscar] = useState('');
  const { ejecutar, cargando } = useAccion();
  useEffect(() => setCambios(l.parametros ?? {}), [l.parametros]);
  const grupos = useMemo(() => {
    const q = buscar.toLowerCase();
    const m = new Map<string, any[]>();
    for (const x of datos ?? []) if (!q || `${x.nombre} ${x.codigo}`.toLowerCase().includes(q)) m.set(x.categoria, [...(m.get(x.categoria) ?? []), x]);
    return [...m.entries()];
  }, [datos, buscar]);
  const aMostrar = (x: any, v: string) => (x.tipo === 'porcentaje' ? String(Number((Number(v) * 100).toPrecision(12))) : v);
  const aGuardar = (x: any, v: string) => {
    const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
    return x.tipo === 'porcentaje' ? String(Number((n / 100).toPrecision(12))) : String(n);
  };
  const guardar = async () => {
    const r = await ejecutar(() => patch(`/liquidador/${l.id}`, { parametros: cambios }), 'Valores guardados. Vuelva a liquidar para aplicarlos');
    if (r) alGuardar(r);
  };
  const cambiado = JSON.stringify(cambios) !== JSON.stringify(l.parametros ?? {});
  if (!datos) return <Cargando />;
  return (
    <Tarjeta
      titulo="Valores de la liquidación"
      subtitulo="Solo aplican a esta liquidación; la configuración de la empresa no cambia."
      accion={
        <Boton tamano="sm" disabled={!cambiado} cargando={cargando} icono={<Save className="h-4 w-4" />} onClick={guardar}>
          Guardar valores
        </Boton>
      }
    >
      <Aviso tono="alerta">{ADVERTENCIA_REGLAS}</Aviso>
      <Buscador valor={buscar} onCambio={setBuscar} placeholder="Buscar: salario mínimo, UVT, salud…" className="my-4" />
      <div className="space-y-6">
        {grupos.map(([cat, lista]) => (
          <div key={cat}>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-suave">{NOMBRE_CATEGORIA[cat] ?? cat}</h3>
            <div className="divide-y divide-borde/70 rounded-xl border border-borde">
              {lista.map((x: any) => {
                const actual = cambios[x.codigo] ?? x.porDefecto;
                const modificado = x.codigo in cambios;
                return (
                  <div key={x.codigo} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {x.nombre} {modificado && <Insignia tono="alerta">Cambiado</Insignia>}
                      </p>
                      <p className="text-xs text-suave">
                        Por defecto: {mostrarValor(x.tipo, x.porDefecto)}
                        {x.baseLegal ? ` · ${x.baseLegal}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {x.tipo === 'dinero' ? (
                        <EntradaDinero valor={actual} onCambio={(v) => setCambios({ ...cambios, [x.codigo]: v || '0' })} className="w-44" />
                      ) : x.tipo === 'booleano' ? (
                        <Interruptor activo={Number(actual) === 1} onCambio={(v) => setCambios({ ...cambios, [x.codigo]: v ? '1' : '0' })} etiqueta={Number(actual) === 1 ? 'Sí' : 'No'} />
                      ) : (
                        <Entrada
                          className="w-32"
                          inputMode="decimal"
                          value={aMostrar(x, actual)}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^\d.,-]/g, '');
                            setCambios({ ...cambios, [x.codigo]: v === '' ? '0' : aGuardar(x, v) });
                          }}
                        />
                      )}
                      {x.tipo === 'porcentaje' && <span className="text-suave">%</span>}
                      {modificado && (
                        <Boton
                          tamano="sm"
                          variante="fantasma"
                          aria-label="Volver al valor por defecto"
                          icono={<RotateCcw className="h-4 w-4" />}
                          onClick={() => {
                            const { [x.codigo]: _, ...resto } = cambios;
                            setCambios(resto);
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Tarjeta>
  );
}
