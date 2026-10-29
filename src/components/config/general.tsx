'use client';

import { CalendarPlus, KeyRound, Plus, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { borrar, get, patch, post } from '@/lib/api';
import { BANCOS } from '@/lib/catalogos';
import { useDatos } from '@/lib/datos';
import { fecha, fechaLarga, hoy } from '@/lib/formato';
import { useSesion } from '@/lib/sesion';
import { Aviso, Boton, Campo, Entrada, Insignia, Interruptor, Modal, Opciones, Selector, Tabla, useAccion, useAvisos } from '../ui';
import { Ajuste, Cargador, DIAS_SEMANA, EntradaNumero, Seccion, useBorrador, useEmpresa } from './comun';

type Empresa = ReturnType<typeof useEmpresa>;

// ---------- Empresa ----------

const CAMPOS_EMPRESA = ['nit', 'dv', 'razonSocial', 'tipoEmpleador', 'representanteLegal', 'actividadEconomica', 'exonerada', 'direccion', 'ciudad', 'telefono', 'correo', 'bancoPagador', 'cuentaPagadora', 'tipoCuentaPagadora'] as const;

export function SeccionEmpresa({ e }: { e: Empresa }) {
  const original = e.empresa ? Object.fromEntries(CAMPOS_EMPRESA.map((k) => [k, (k === 'dv' ? (e.empresa.dv ?? e.empresa.dvCalculado) : e.empresa[k]) ?? ''])) : null;
  const { b, poner, cambiado } = useBorrador<Record<string, any>>(original);
  const [dv, setDv] = useState<string | null>(null);
  const calcularDv = async (nit: string) => {
    if (/^\d{5,15}$/.test(nit)) {
      const r = await get(`/empresa/nit/${nit}/dv`);
      setDv(r.dv);
      poner('dv', r.dv);
    }
  };
  return (
    <Seccion titulo="Datos de la empresa" descripcion="Aparecen en desprendibles, certificados y archivos." cambiado={cambiado} guardando={e.guardando} onGuardar={() => b && e.guardarEmpresa(b)}>
      <Cargador listo={!!b}>
        {b && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_120px_2fr]">
              <Campo etiqueta="NIT" ayuda="Sin dígito de verificación; el sistema lo calcula.">
                <Entrada value={b.nit} inputMode="numeric" onChange={(x) => poner('nit', x.target.value.replace(/\D/g, ''))} onBlur={(x) => calcularDv(x.target.value)} />
              </Campo>
              <Campo etiqueta="DV">
                <Entrada value={b.dv} maxLength={1} onChange={(x) => poner('dv', x.target.value)} />
              </Campo>
              <Campo etiqueta="Razón social">
                <Entrada value={b.razonSocial} onChange={(x) => poner('razonSocial', x.target.value)} />
              </Campo>
            </div>
            {dv && dv !== b.dv && <Aviso tono="alerta">El dígito de verificación de ese NIT es {dv}.</Aviso>}
            <div className="grid gap-4 md:grid-cols-2">
              <Campo etiqueta="Tipo de empleador">
                <Opciones
                  valor={b.tipoEmpleador || 'juridica'}
                  onCambio={(v) => poner('tipoEmpleador', v)}
                  opciones={[
                    { valor: 'juridica', etiqueta: 'Persona jurídica' },
                    { valor: 'natural', etiqueta: 'Persona natural' },
                  ]}
                />
              </Campo>
              <Campo etiqueta="Representante legal" opcional>
                <Entrada value={b.representanteLegal} onChange={(x) => poner('representanteLegal', x.target.value)} />
              </Campo>
              <Campo etiqueta="Actividad económica (CIIU)" opcional>
                <Entrada value={b.actividadEconomica} onChange={(x) => poner('actividadEconomica', x.target.value)} />
              </Campo>
              <Campo etiqueta="Ciudad" opcional>
                <Entrada value={b.ciudad} onChange={(x) => poner('ciudad', x.target.value)} />
              </Campo>
              <Campo etiqueta="Dirección" opcional>
                <Entrada value={b.direccion} onChange={(x) => poner('direccion', x.target.value)} />
              </Campo>
              <Campo etiqueta="Teléfono" opcional>
                <Entrada value={b.telefono} onChange={(x) => poner('telefono', x.target.value)} />
              </Campo>
              <Campo etiqueta="Correo" opcional>
                <Entrada type="email" value={b.correo} onChange={(x) => poner('correo', x.target.value)} />
              </Campo>
            </div>
            <Interruptor
              activo={!!b.exonerada}
              onCambio={(v) => poner('exonerada', v)}
              etiqueta="Exonerada de aportes en salud, SENA e ICBF"
              descripcion="Estatuto Tributario art. 114-1: aplica a empleados que ganan menos de 10 SMMLV. Si la marca, esos aportes del empleador quedan en cero."
            />
            <div className="grid gap-4 md:grid-cols-3">
              <Campo etiqueta="Banco desde el que paga" opcional>
                <Selector value={b.bancoPagador} onChange={(x) => poner('bancoPagador', x.target.value)} vacio="Elija…" opciones={BANCOS.map((x) => ({ valor: x, etiqueta: x }))} />
              </Campo>
              <Campo etiqueta="Número de cuenta" opcional>
                <Entrada value={b.cuentaPagadora} onChange={(x) => poner('cuentaPagadora', x.target.value)} />
              </Campo>
              <Campo etiqueta="Tipo de cuenta" opcional>
                <Selector
                  value={b.tipoCuentaPagadora}
                  onChange={(x) => poner('tipoCuentaPagadora', x.target.value)}
                  vacio="Elija…"
                  opciones={[
                    { valor: 'ahorros', etiqueta: 'Ahorros' },
                    { valor: 'corriente', etiqueta: 'Corriente' },
                  ]}
                />
              </Campo>
            </div>
          </div>
        )}
      </Cargador>
    </Seccion>
  );
}

// ---------- Calendario ----------

export function SeccionCalendario({ e }: { e: Empresa }) {
  const { b, setB, cambiado } = useBorrador<any>(e.empresa?.configuracion?.calendario);
  const plantillas = useDatos<any[]>('/empresa/plantillas');
  const { ejecutar, cargando } = useAccion();
  const { confirmar } = useAvisos();
  const aplicar = async (p: any) => {
    if (!(await confirmar({ titulo: `Aplicar plantilla ${p.nombre}`, mensaje: `${p.descripcion} Se cambian los días laborales y se agregan sus turnos (los turnos existentes no se tocan).`, confirmar: 'Aplicar' }))) return;
    if (await ejecutar(() => post(`/empresa/plantillas/${p.codigo}`), `Plantilla ${p.nombre} aplicada`)) e.recargar();
  };
  return (
    <div className="space-y-5">
      <Seccion titulo="Días laborales" descripcion="Se usan para contar días hábiles de vacaciones, calcular horas en descanso y proponer turnos. Cada sede, área o grupo de pago puede tener los suyos." cambiado={cambiado} guardando={e.guardando} onGuardar={() => e.guardarConfig({ calendario: b })}>
        <Cargador listo={!!b}>
          {b && (
            <div className="space-y-5">
              <Campo etiqueta="¿Qué días se trabaja?">
                <Opciones multiple valor={b.diasLaborales} onCambio={(v: number[]) => setB({ ...b, diasLaborales: v.sort() })} opciones={DIAS_SEMANA} />
              </Campo>
              <Campo etiqueta="Día de descanso obligatorio" ayuda="CST art. 172. Trabajar este día genera recargo dominical.">
                <Opciones valor={b.diaDescanso} onCambio={(v: number) => setB({ ...b, diaDescanso: v, diasLaborales: b.diasLaborales.filter((d: number) => d !== v) })} opciones={DIAS_SEMANA} />
              </Campo>
              <Interruptor activo={b.sabadoHabilVacaciones} onCambio={(v) => setB({ ...b, sabadoHabilVacaciones: v })} etiqueta="El sábado cuenta como día hábil para vacaciones" descripcion="Desmárquelo si en la empresa no se trabaja el sábado (lo usual en oficinas)." />
              {b.diasLaborales.includes(b.diaDescanso) && <Aviso tono="peligro">El día de descanso no puede ser también día laboral.</Aviso>}
            </div>
          )}
        </Cargador>
      </Seccion>
      <Seccion titulo="Plantillas rápidas" descripcion="Un punto de partida según el tipo de empresa. Después puede ajustar todo.">
        <div className="grid gap-3 md:grid-cols-2">
          {(plantillas.datos ?? []).map((p) => (
            <button key={p.codigo} disabled={cargando} onClick={() => aplicar(p)} className="flex items-start gap-3 rounded-xl border border-borde p-4 text-left transition hover:border-marca-500 hover:bg-marca-50/50">
              <Wand2 className="mt-0.5 h-5 w-5 text-marca-600" />
              <span>
                <span className="font-medium">{p.nombre}</span>
                <span className="block text-sm text-suave">{p.descripcion}</span>
              </span>
            </button>
          ))}
        </div>
      </Seccion>
      <Festivos />
      <DiasEspeciales />
    </div>
  );
}

function Festivos() {
  const [anio, setAnio] = useState(Number(hoy().slice(0, 4)));
  const { datos, recargar } = useDatos<any[]>(`/festivos?anio=${anio}`);
  const [nuevo, setNuevo] = useState<{ fecha: string; nombre: string } | null>(null);
  const [mover, setMover] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  const { confirmar } = useAvisos();
  return (
    <Seccion
      titulo="Festivos"
      descripcion="Se calculan solos con la Ley 51 de 1983 (Ley Emiliani). Puede agregar, mover o quitar los que necesite."
      accion={
        <div className="flex flex-wrap items-center gap-2">
          <Entrada type="number" value={anio} onChange={(x) => setAnio(Number(x.target.value))} className="w-24" />
          <Boton tamano="sm" variante="secundario" cargando={cargando} icono={<CalendarPlus className="h-4 w-4" />} onClick={async () => (await ejecutar(() => post(`/festivos/generar/${anio}`), 'Festivos del año generados')) && recargar()}>
            Generar {anio}
          </Boton>
          <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setNuevo({ fecha: `${anio}-01-01`, nombre: '' })}>
            Agregar
          </Boton>
        </div>
      }
    >
      <Tabla
        filas={datos ?? []}
        clave={(f: any) => f.id}
        vacio={`No hay festivos cargados para ${anio}. Use "Generar".`}
        columnas={[
          { clave: 'fecha', titulo: 'Fecha', celda: (f: any) => <span className="capitalize">{fechaLarga(f.fecha)}</span> },
          { clave: 'nombre', titulo: 'Festivo' },
          {
            clave: 'acc',
            titulo: '',
            celda: (f: any) => (
              <div className="flex justify-end gap-1">
                <Boton tamano="sm" variante="fantasma" onClick={() => setMover({ ...f })}>
                  Mover
                </Boton>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  aria-label="Quitar"
                  icono={<Trash2 className="h-4 w-4" />}
                  onClick={async () => (await confirmar({ titulo: 'Quitar festivo', mensaje: `¿Quitar ${f.nombre} (${fecha(f.fecha)})?`, confirmar: 'Quitar', peligro: true })) && (await ejecutar(() => borrar(`/festivos/${f.id}`), 'Festivo quitado')) && recargar()}
                />
              </div>
            ),
          },
        ]}
      />
      <Modal
        abierto={!!nuevo || !!mover}
        onCerrar={() => (setNuevo(null), setMover(null))}
        titulo={mover ? 'Mover festivo' : 'Agregar festivo'}
        ancho="sm"
        pie={
          <Boton
            cargando={cargando}
            onClick={async () => {
              const x = mover ?? nuevo;
              const r = mover ? await ejecutar(() => patch(`/festivos/${x.id}`, { fecha: x.fecha, nombre: x.nombre }), 'Festivo movido') : await ejecutar(() => post('/festivos', x), 'Festivo agregado');
              if (r) {
                setNuevo(null);
                setMover(null);
                recargar();
              }
            }}
          >
            Guardar
          </Boton>
        }
      >
        {(mover ?? nuevo) && (
          <div className="space-y-4">
            <Campo etiqueta="Fecha">
              <Entrada type="date" value={(mover ?? nuevo).fecha} onChange={(x) => (mover ? setMover({ ...mover, fecha: x.target.value }) : setNuevo({ ...nuevo!, fecha: x.target.value }))} />
            </Campo>
            <Campo etiqueta="Nombre">
              <Entrada value={(mover ?? nuevo).nombre} onChange={(x) => (mover ? setMover({ ...mover, nombre: x.target.value }) : setNuevo({ ...nuevo!, nombre: x.target.value }))} />
            </Campo>
          </div>
        )}
      </Modal>
    </Seccion>
  );
}

const TIPO_DIA: Record<string, { etiqueta: string; descripcion: string }> = {
  remunerado: { etiqueta: 'Día libre pagado', descripcion: 'No se trabaja y se paga normal (por ejemplo, el día de la familia)' },
  compensado: { etiqueta: 'Día compensado', descripcion: 'No se trabaja porque se repuso antes' },
  no_laborado: { etiqueta: 'No laborado', descripcion: 'La empresa cierra; no cuenta como hábil' },
};

function DiasEspeciales() {
  const { datos, recargar } = useDatos<any[]>('/dias-especiales');
  const sedes = useDatos<any[]>('/sedes');
  const [nuevo, setNuevo] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  return (
    <Seccion titulo="Días especiales de la empresa" descripcion="Días que no se trabajan aunque sean laborales: día de la familia (Ley 1857), cierres, puentes compensados." accion={<Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setNuevo({ fecha: hoy(), tipo: 'remunerado', descripcion: '', sedeId: '' })}>Agregar</Boton>}>
      <Tabla
        filas={datos ?? []}
        clave={(d: any) => d.id}
        vacio="No hay días especiales"
        columnas={[
          { clave: 'fecha', titulo: 'Fecha', celda: (d: any) => fecha(d.fecha) },
          { clave: 'descripcion', titulo: 'Descripción' },
          { clave: 'tipo', titulo: 'Tipo', celda: (d: any) => <Insignia>{TIPO_DIA[d.tipo]?.etiqueta}</Insignia> },
          { clave: 'sede', titulo: 'Sede', celda: (d: any) => (sedes.datos ?? []).find((s) => s.id === d.sedeId)?.nombre ?? 'Todas' },
          { clave: 'acc', titulo: '', celda: (d: any) => <Boton tamano="sm" variante="fantasma" aria-label="Quitar" icono={<Trash2 className="h-4 w-4" />} onClick={async () => (await ejecutar(() => borrar(`/dias-especiales/${d.id}`), 'Día quitado')) && recargar()} /> },
        ]}
      />
      <Modal
        abierto={!!nuevo}
        onCerrar={() => setNuevo(null)}
        titulo="Agregar día especial"
        pie={
          <Boton cargando={cargando} onClick={async () => (await ejecutar(() => post('/dias-especiales', { ...nuevo, sedeId: nuevo.sedeId || null }), 'Día agregado')) && (setNuevo(null), recargar())}>
            Guardar
          </Boton>
        }
      >
        {nuevo && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Fecha">
                <Entrada type="date" value={nuevo.fecha} onChange={(x) => setNuevo({ ...nuevo, fecha: x.target.value })} />
              </Campo>
              <Campo etiqueta="Sede">
                <Selector value={nuevo.sedeId} onChange={(x) => setNuevo({ ...nuevo, sedeId: x.target.value })} vacio="Todas las sedes" opciones={(sedes.datos ?? []).map((s) => ({ valor: s.id, etiqueta: s.nombre }))} />
              </Campo>
            </div>
            <Campo etiqueta="Descripción">
              <Entrada value={nuevo.descripcion} placeholder="Día de la familia" onChange={(x) => setNuevo({ ...nuevo, descripcion: x.target.value })} />
            </Campo>
            <Campo etiqueta="Tipo">
              <Opciones valor={nuevo.tipo} onCambio={(v) => setNuevo({ ...nuevo, tipo: v })} opciones={Object.entries(TIPO_DIA).map(([valor, x]) => ({ valor, ...x }))} />
            </Campo>
          </div>
        )}
      </Modal>
    </Seccion>
  );
}

// ---------- Jornada y horas ----------

export function SeccionJornada({ e }: { e: Empresa }) {
  const { b, setB, cambiado } = useBorrador<any>(e.empresa?.configuracion?.horas);
  return (
    <Seccion titulo="Jornada y horas extra" descripcion="Cómo se clasifican las horas que salen de las marcaciones. Los porcentajes de recargo están en Parámetros." cambiado={cambiado} guardando={e.guardando} onGuardar={() => e.guardarConfig({ horas: b })}>
      <Cargador listo={!!b}>
        {b && (
          <div>
            <Ajuste etiqueta="Inicio del trabajo nocturno" descripcion="CST art. 160 (Ley 2466 de 2025): desde las 7:00 p. m.">
              <Entrada type="time" value={b.inicioNocturna} onChange={(x) => setB({ ...b, inicioNocturna: x.target.value })} className="w-36" />
            </Ajuste>
            <Ajuste etiqueta="Fin del trabajo nocturno" descripcion="Hasta las 6:00 a. m.">
              <Entrada type="time" value={b.finNocturna} onChange={(x) => setB({ ...b, finNocturna: x.target.value })} className="w-36" />
            </Ajuste>
            <Ajuste etiqueta="Horas ordinarias por día sin turno" descripcion="Para empleados que no tienen turno asignado; lo que pase de aquí es hora extra.">
              <EntradaNumero valor={b.horasOrdinariasDiaSinTurno} onCambio={(v) => setB({ ...b, horasOrdinariasDiaSinTurno: v })} unidad="horas" min={0} max={24} paso={0.5} />
            </Ajuste>
            <Ajuste etiqueta="Tolerancia de llegada" descripcion="Minutos de gracia antes de marcar una llegada tarde.">
              <EntradaNumero valor={b.toleranciaMinutos} onCambio={(v) => setB({ ...b, toleranciaMinutos: v })} unidad="minutos" min={0} max={120} />
            </Ajuste>
            <Ajuste etiqueta="Mínimo para contar hora extra" descripcion="Si trabaja menos minutos adicionales que esto, no se cuentan como extra.">
              <EntradaNumero valor={b.minimoMinutosExtra} onCambio={(v) => setB({ ...b, minimoMinutosExtra: v })} unidad="minutos" min={0} max={240} />
            </Ajuste>
          </div>
        )}
      </Cargador>
    </Seccion>
  );
}

// ---------- Asistencia ----------

export function SeccionAsistencia({ e }: { e: Empresa }) {
  const { b, setB, cambiado } = useBorrador<any>(e.empresa?.configuracion?.asistencia);
  return (
    <Seccion titulo="Marcación de asistencia" descripcion="Código QR que cambia solo, celular vinculado y kiosco con PIN para casos especiales." cambiado={cambiado} guardando={e.guardando} onGuardar={() => e.guardarConfig({ asistencia: b })}>
      <Cargador listo={!!b}>
        {b && (
          <div>
            <Interruptor activo={b.activa} onCambio={(v) => setB({ ...b, activa: v })} etiqueta="Usar el control de asistencia" descripcion="Si lo apaga, las horas extra se registran a mano o se importan desde Excel." />
            <div className={b.activa ? '' : 'pointer-events-none opacity-50'}>
              <Ajuste etiqueta="El código QR cambia cada" descripcion="Así una foto del código no sirve para marcar desde la casa.">
                <EntradaNumero valor={b.qrSegundos} onCambio={(v) => setB({ ...b, qrSegundos: v })} unidad="segundos" min={10} max={600} />
              </Ajuste>
              <Ajuste etiqueta="Segundos de gracia" descripcion="Acepta el código anterior unos segundos después de cambiar.">
                <EntradaNumero valor={b.qrGracia} onCambio={(v) => setB({ ...b, qrGracia: v })} unidad="segundos" min={0} max={60} />
              </Ajuste>
              <Ajuste etiqueta="Ignorar marcaciones repetidas en" descripcion="Si marca dos veces seguidas, se toma solo la primera.">
                <EntradaNumero valor={b.minutosDuplicado} onCambio={(v) => setB({ ...b, minutosDuplicado: v })} unidad="minutos" min={0} max={120} />
              </Ajuste>
              <Ajuste etiqueta="Intentos de PIN en el kiosco" descripcion="Después se bloquea el PIN del empleado hasta que lo cambie un administrador.">
                <EntradaNumero valor={b.intentosPin} onCambio={(v) => setB({ ...b, intentosPin: v })} unidad="intentos" min={1} max={10} />
              </Ajuste>
              <div className="py-3">
                <Interruptor activo={b.permitirExcepcionKiosco} onCambio={(v) => setB({ ...b, permitirExcepcionKiosco: v })} etiqueta="Permitir marcar en kiosco a quien tiene celular" descripcion="Útil si se le descargó el celular. Queda registrado como excepción." />
              </div>
              <Campo etiqueta="Nivel de control">
                <Opciones
                  valor={b.nivelControl}
                  onCambio={(v) => setB({ ...b, nivelControl: v })}
                  opciones={[
                    { valor: 'basico', etiqueta: 'Básico', descripcion: 'Solo QR y cédula' },
                    { valor: 'medio', etiqueta: 'Medio', descripcion: 'QR y celular vinculado' },
                    { valor: 'alto', etiqueta: 'Alto', descripcion: 'Celular vinculado obligatorio' },
                  ]}
                />
              </Campo>
            </div>
          </div>
        )}
      </Cargador>
    </Seccion>
  );
}

// ---------- Reglas: aprobación, avisos, vacaciones, retiro, seguridad ----------

export function SeccionReglas({ e }: { e: Empresa }) {
  const c = e.empresa?.configuracion;
  const original = c ? { aprobacion: c.aprobacion, avisos: c.avisos, vacaciones: c.vacaciones, retiro: c.retiro, seguridad: c.seguridad } : null;
  const { b, setB, cambiado } = useBorrador<any>(original);
  const set = (grupo: string, k: string, v: unknown) => setB({ ...b, [grupo]: { ...b[grupo], [k]: v } });
  return (
    <Seccion titulo="Aprobaciones, avisos y seguridad" cambiado={cambiado} guardando={e.guardando} onGuardar={() => e.guardarConfig(b)}>
      <Cargador listo={!!b}>
        {b && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-1 font-semibold">Aprobación de la nómina</h3>
              <Interruptor activo={b.aprobacion.separarLiquidaAprueba} onCambio={(v) => set('aprobacion', 'separarLiquidaAprueba', v)} etiqueta="Quien liquida no puede aprobar" descripcion="Control de doble revisión. Requiere al menos dos usuarios." />
              <Ajuste etiqueta="Avisar si un empleado cambia más de" descripcion="Comparado con el periodo anterior, en el comparativo.">
                <EntradaNumero valor={Math.round(b.aprobacion.umbralVariacion * 100)} onCambio={(v) => set('aprobacion', 'umbralVariacion', v / 100)} unidad="%" min={0} max={1000} />
              </Ajuste>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Avisos</h3>
              <Ajuste etiqueta="Contratos por vencer" descripcion="CST art. 46: el preaviso de no renovación es de 30 días.">
                <EntradaNumero valor={b.avisos.diasContratoPorVencer} onCambio={(v) => set('avisos', 'diasContratoPorVencer', v)} unidad="días antes" min={1} max={365} />
              </Ajuste>
              <Ajuste etiqueta="Prima de servicios">
                <EntradaNumero valor={b.avisos.diasPrima} onCambio={(v) => set('avisos', 'diasPrima', v)} unidad="días antes" min={1} max={60} />
              </Ajuste>
              <Ajuste etiqueta="Cesantías e intereses">
                <EntradaNumero valor={b.avisos.diasCesantias} onCambio={(v) => set('avisos', 'diasCesantias', v)} unidad="días antes" min={1} max={60} />
              </Ajuste>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Vacaciones y retiro</h3>
              <Ajuste etiqueta="Aviso de vacaciones al empleado" descripcion="CST art. 187: con 15 días de anticipación.">
                <EntradaNumero valor={b.vacaciones.diasPreaviso} onCambio={(v) => set('vacaciones', 'diasPreaviso', v)} unidad="días" min={0} max={90} />
              </Ajuste>
              <Ajuste etiqueta="Periodos que se pueden acumular" descripcion="CST art. 190: hasta dos años.">
                <EntradaNumero valor={b.vacaciones.maxPeriodosAcumulados} onCambio={(v) => set('vacaciones', 'maxPeriodosAcumulados', v)} unidad="periodos" min={1} max={4} />
              </Ajuste>
              <Ajuste etiqueta="Duración máxima del contrato fijo" descripcion="Ley 2466 de 2025: hasta 4 años sumando prórrogas.">
                <EntradaNumero valor={b.retiro.maxAniosFijo} onCambio={(v) => set('retiro', 'maxAniosFijo', v)} unidad="años" min={1} max={10} />
              </Ajuste>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Seguridad</h3>
              <Ajuste etiqueta="Intentos de ingreso fallidos" descripcion="Después se bloquea el usuario.">
                <EntradaNumero valor={b.seguridad.intentosLogin} onCambio={(v) => set('seguridad', 'intentosLogin', v)} unidad="intentos" min={1} max={20} />
              </Ajuste>
              <Ajuste etiqueta="Tiempo de bloqueo">
                <EntradaNumero valor={b.seguridad.minutosBloqueo} onCambio={(v) => set('seguridad', 'minutosBloqueo', v)} unidad="minutos" min={1} max={1440} />
              </Ajuste>
              <Ajuste etiqueta="Cerrar sesión por inactividad">
                <EntradaNumero valor={b.seguridad.minutosSesion} onCambio={(v) => set('seguridad', 'minutosSesion', v)} unidad="minutos" min={5} max={1440} />
              </Ajuste>
            </div>
          </div>
        )}
      </Cargador>
    </Seccion>
  );
}

// ---------- Campos personalizados del empleado ----------

export function SeccionCampos({ e }: { e: Empresa }) {
  const { b, setB, cambiado } = useBorrador<any[]>(e.empresa?.configuracion?.campos);
  return (
    <Seccion titulo="Campos adicionales del empleado" descripcion="Datos propios de su empresa (talla, licencia de conducción, bono pactado). Los numéricos se pueden usar en fórmulas." cambiado={cambiado} guardando={e.guardando} onGuardar={() => e.guardarConfig({ campos: b })}>
      <Cargador listo={!!b}>
        {b && (
          <div className="space-y-3">
            {b.map((c, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_160px_auto]">
                <Campo etiqueta="Nombre">
                  <Entrada value={c.nombre} onChange={(x) => setB(b.map((y, j) => (j === i ? { ...y, nombre: x.target.value, codigo: y.codigoFijo ? y.codigo : x.target.value.normalize('NFD').replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_').toUpperCase() } : y)))} />
                </Campo>
                <Campo etiqueta="Código para fórmulas">
                  <Entrada value={c.codigo} className="font-mono" onChange={(x) => setB(b.map((y, j) => (j === i ? { ...y, codigo: x.target.value.toUpperCase(), codigoFijo: true } : y)))} />
                </Campo>
                <Campo etiqueta="Tipo">
                  <Selector
                    value={c.tipo}
                    onChange={(x) => setB(b.map((y, j) => (j === i ? { ...y, tipo: x.target.value } : y)))}
                    opciones={[
                      { valor: 'texto', etiqueta: 'Texto' },
                      { valor: 'numero', etiqueta: 'Número' },
                      { valor: 'fecha', etiqueta: 'Fecha' },
                    ]}
                  />
                </Campo>
                <Boton variante="fantasma" aria-label="Quitar" icono={<Trash2 className="h-4 w-4" />} onClick={() => setB(b.filter((_, j) => j !== i))} />
              </div>
            ))}
            <Boton variante="secundario" tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setB([...b, { codigo: '', nombre: '', tipo: 'texto' }])}>
              Agregar campo
            </Boton>
          </div>
        )}
      </Cargador>
    </Seccion>
  );
}

// ---------- Cambiar contraseña ----------

export function CambiarPassword({ forzado }: { forzado?: boolean }) {
  const [d, setD] = useState({ actual: '', nueva: '', repetir: '' });
  const { ejecutar, cargando } = useAccion();
  const sesion = useSesion();
  const valida = d.nueva.length >= 8 && d.nueva === d.repetir;
  return (
    <Seccion titulo="Cambiar mi contraseña" descripcion="Mínimo 8 caracteres. Use letras y números.">
      {forzado && (
        <div className="mb-4">
          <Aviso tono="alerta">Por seguridad, cambie la contraseña inicial antes de continuar.</Aviso>
        </div>
      )}
      <div className="grid max-w-3xl gap-4 md:grid-cols-3">
        <Campo etiqueta="Contraseña actual">
          <Entrada type="password" autoComplete="current-password" value={d.actual} onChange={(x) => setD({ ...d, actual: x.target.value })} />
        </Campo>
        <Campo etiqueta="Nueva contraseña">
          <Entrada type="password" autoComplete="new-password" value={d.nueva} onChange={(x) => setD({ ...d, nueva: x.target.value })} />
        </Campo>
        <Campo etiqueta="Repita la nueva" error={d.repetir && d.repetir !== d.nueva ? 'No coinciden' : undefined}>
          <Entrada type="password" autoComplete="new-password" value={d.repetir} onChange={(x) => setD({ ...d, repetir: x.target.value })} />
        </Campo>
      </div>
      <Boton
        className="mt-4"
        disabled={!valida || !d.actual}
        cargando={cargando}
        icono={<KeyRound className="h-4 w-4" />}
        onClick={async () => {
          if (await ejecutar(() => post('/auth/cambiar-password', { actual: d.actual, nueva: d.nueva }), 'Contraseña cambiada')) {
            setD({ actual: '', nueva: '', repetir: '' });
            await sesion.recargar();
            if (forzado) window.location.href = '/inicio';
          }
        }}
      >
        Cambiar contraseña
      </Boton>
    </Seccion>
  );
}
