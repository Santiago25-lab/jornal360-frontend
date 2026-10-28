'use client';

import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fechaLarga, hoy, NOMBRE_NOVEDAD, NOMBRE_TIPO_HORA, numero } from '@/lib/formato';
import { Aviso, Boton, Campo, Entrada, EntradaDinero, Modal, Opciones, Selector, useAccion } from './ui';

function SelectorEmpleado({ valor, onCambio }: { valor: string; onCambio: (v: string) => void }) {
  const { datos } = useDatos<any[]>('/empleados?estado=activo');
  return (
    <Campo etiqueta="Empleado">
      <Selector value={valor} onChange={(e) => onCambio(e.target.value)} vacio="Elija el empleado…" opciones={(datos ?? []).map((e) => ({ valor: e.id, etiqueta: `${e.nombres} ${e.apellidos} · ${e.numeroDocumento}` }))} />
    </Campo>
  );
}

const TIPOS_DIAS = [
  { valor: 'incapacidad_eg', etiqueta: 'Incapacidad', descripcion: 'Enfermedad general' },
  { valor: 'incapacidad_laboral', etiqueta: 'Incapacidad laboral', descripcion: 'Accidente o enfermedad del trabajo' },
  { valor: 'vacaciones', etiqueta: 'Vacaciones', descripcion: 'En días hábiles' },
  { valor: 'licencia_remunerada', etiqueta: 'Licencia remunerada', descripcion: 'Luto, calamidad, citas…' },
  { valor: 'licencia_maternidad', etiqueta: 'Maternidad', descripcion: '18 semanas' },
  { valor: 'licencia_paternidad', etiqueta: 'Paternidad', descripcion: '2 semanas' },
  { valor: 'licencia_no_remunerada', etiqueta: 'Licencia no remunerada', descripcion: 'No se pagan los días' },
  { valor: 'ausencia_injustificada', etiqueta: 'Ausencia', descripcion: 'Sin justificación' },
  { valor: 'suspension', etiqueta: 'Suspensión', descripcion: 'Disciplinaria' },
];

/** Incapacidades, licencias, vacaciones y ausencias (HU-33 a HU-37). */
export function ModalNovedadDias({ abierto, onCerrar, empleadoId, alGuardar }: { abierto: boolean; onCerrar: () => void; empleadoId?: string; alGuardar?: () => void }) {
  const [d, setD] = useState<Record<string, any>>({ tipo: 'incapacidad_eg', desde: hoy(), hasta: '', diasHabiles: 15, subtipo: 'luto', diagnostico: '', descripcion: '', prorrogaDe: '', empleadoId: empleadoId ?? '' });
  const [vista, setVista] = useState<any>(null);
  const { data: licencias } = { data: useDatos<any[]>('/novedades/licencias').datos };
  const { ejecutar, cargando } = useAccion();
  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));
  const empId = empleadoId ?? d.empleadoId;
  const previas = useDatos<any[]>(empId && d.tipo.startsWith('incapacidad') ? `/novedades?empleadoId=${empId}&clase=dias&tipo=${d.tipo}` : null);

  useEffect(() => {
    if (d.tipo !== 'vacaciones' || !empId || !d.desde || !d.diasHabiles) return setVista(null);
    get(`/novedades/vacaciones/${empId}/calcular?desde=${d.desde}&dias=${d.diasHabiles}`).then(setVista).catch(() => setVista(null));
  }, [d.tipo, d.desde, d.diasHabiles, empId]);
  const saldo = useDatos<any>(d.tipo === 'vacaciones' && empId ? `/novedades/vacaciones/${empId}/saldo` : null);

  const guardar = async () => {
    const cuerpo: Record<string, any> = { empleadoId: empId, tipo: d.tipo, desde: d.desde };
    if (d.tipo === 'vacaciones') cuerpo.diasHabiles = Number(d.diasHabiles);
    else if (d.hasta) cuerpo.hasta = d.hasta;
    if (d.tipo === 'licencia_remunerada') cuerpo.subtipo = d.subtipo;
    if (d.tipo.startsWith('incapacidad')) {
      cuerpo.diagnostico = d.diagnostico || null;
      if (d.prorrogaDe) cuerpo.prorrogaDe = d.prorrogaDe;
    }
    if (d.descripcion) cuerpo.descripcion = d.descripcion;
    const r = await ejecutar((confirmar) => post('/novedades/dias', { ...cuerpo, confirmar }), 'Novedad registrada');
    if (r) {
      alGuardar?.();
      onCerrar();
    }
  };

  const lic = (licencias ?? []).find((l: any) => l.codigo === d.subtipo);
  const necesitaHasta = !['vacaciones', 'licencia_maternidad', 'licencia_paternidad'].includes(d.tipo) && !(d.tipo === 'licencia_remunerada' && lic?.diasHabiles);

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar novedad"
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={cargando} disabled={!empId}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="space-y-5">
        {!empleadoId && <SelectorEmpleado valor={d.empleadoId} onCambio={(v) => set('empleadoId', v)} />}
        <Campo etiqueta="¿Qué pasó?">
          <Opciones opciones={TIPOS_DIAS} valor={d.tipo} onCambio={(v) => set('tipo', v)} />
        </Campo>
        {d.tipo === 'licencia_remunerada' && (
          <Campo etiqueta="Tipo de licencia">
            <Selector value={d.subtipo} onChange={(e) => set('subtipo', e.target.value)} opciones={(licencias ?? []).map((l: any) => ({ valor: l.codigo, etiqueta: `${l.nombre}${l.diasHabiles ? ` (${l.diasHabiles} días hábiles)` : ''}` }))} />
          </Campo>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <Campo etiqueta={d.tipo === 'vacaciones' ? 'Primer día de vacaciones' : 'Desde'}>
            <Entrada type="date" value={d.desde} onChange={(e) => set('desde', e.target.value)} />
          </Campo>
          {d.tipo === 'vacaciones' ? (
            <Campo etiqueta="Días hábiles">
              <Entrada type="number" min={1} max={90} value={d.diasHabiles} onChange={(e) => set('diasHabiles', e.target.value)} />
            </Campo>
          ) : (
            necesitaHasta && (
              <Campo etiqueta="Hasta">
                <Entrada type="date" value={d.hasta} min={d.desde} onChange={(e) => set('hasta', e.target.value)} />
              </Campo>
            )
          )}
          {d.tipo.startsWith('incapacidad') && (
            <Campo etiqueta="Diagnóstico" opcional>
              <Entrada value={d.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} placeholder="Código CIE-10" />
            </Campo>
          )}
        </div>
        {d.tipo.startsWith('incapacidad') && (previas.datos ?? []).length > 0 && (
          <Campo etiqueta="¿Es prórroga de otra incapacidad?" ayuda="Los días se suman para saber quién paga y el porcentaje">
            <Selector value={d.prorrogaDe} onChange={(e) => set('prorrogaDe', e.target.value)} vacio="No, es una incapacidad nueva" opciones={(previas.datos ?? []).map((n: any) => ({ valor: n.id, etiqueta: `Del ${n.desde} al ${n.hasta}` }))} />
          </Campo>
        )}
        <Campo etiqueta="Observación" opcional>
          <Entrada value={d.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </Campo>
        {d.tipo === 'vacaciones' && vista && (
          <Aviso tono="info" titulo={`Regresa el ${fechaLarga(vista.regreso)}`}>
            Vacaciones del {fechaLarga(vista.inicioReal)} al {fechaLarga(vista.fin)}. Se saltan festivos y días de descanso.
            {saldo.datos && ` Días pendientes del empleado: ${numero(saldo.datos.pendientes, 2)}.`}
          </Aviso>
        )}
        {d.tipo === 'licencia_maternidad' && <Aviso>La licencia dura las semanas configuradas (18 por defecto) y la paga la EPS.</Aviso>}
        {d.tipo === 'incapacidad_eg' && <Aviso>Los días 1 y 2 los paga la empresa; desde el día 3, la EPS. Nunca menos del salario mínimo diario. Todo se puede cambiar en Configuración → Tablas.</Aviso>}
      </div>
    </Modal>
  );
}

/** Comisiones, bonificaciones, horas digitadas, descuentos (HU-39). */
export function ModalNovedadValor({ abierto, onCerrar, empleadoId, alGuardar }: { abierto: boolean; onCerrar: () => void; empleadoId?: string; alGuardar?: () => void }) {
  const { datos: conceptos } = useDatos<any[]>('/conceptos');
  const [d, setD] = useState<Record<string, any>>({ empleadoId: empleadoId ?? '', concepto: 'COMISIONES', fecha: hoy(), valor: '', cantidad: '', descripcion: '' });
  const { ejecutar, cargando } = useAccion();
  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));
  const horas = Object.keys(NOMBRE_TIPO_HORA).filter((t) => t !== 'HOD');
  const opciones = [
    ...(conceptos ?? []).filter((c) => c.estado === 'activo' && (c.requiereNovedad || ['DESCUENTO'].includes(c.codigo))).map((c) => ({ valor: c.codigo, etiqueta: `${c.nombre}${c.tipo === 'deduccion' ? ' (descuento)' : ''}` })),
    ...horas.map((h) => ({ valor: h, etiqueta: `Horas: ${NOMBRE_TIPO_HORA[h]}` })),
  ];
  const esCantidad = horas.includes(d.concepto) || d.concepto === 'VACACIONES_COMPENSADAS' || (conceptos ?? []).find((c) => c.codigo === d.concepto)?.formula?.includes('CANTIDAD_NOVEDAD');
  const guardar = async () => {
    const r = await ejecutar(
      (confirmar) =>
        post('/novedades/valor', {
          empleadoId: empleadoId ?? d.empleadoId,
          concepto: d.concepto,
          fecha: d.fecha,
          valor: esCantidad ? null : d.valor || null,
          cantidad: esCantidad ? d.cantidad || null : null,
          descripcion: d.descripcion || null,
          confirmar,
        }),
      'Novedad registrada',
    );
    if (r) {
      alGuardar?.();
      onCerrar();
    }
  };
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar pago o descuento"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={guardar} cargando={cargando}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {!empleadoId && <SelectorEmpleado valor={d.empleadoId} onCambio={(v) => set('empleadoId', v)} />}
        <Campo etiqueta="Concepto" ayuda="Puede crear conceptos propios en Configuración → Conceptos">
          <Selector value={d.concepto} onChange={(e) => set('concepto', e.target.value)} opciones={opciones} />
        </Campo>
        <div className="grid gap-4 md:grid-cols-2">
          <Campo etiqueta="Fecha" ayuda="Se paga en la nómina que incluye esta fecha">
            <Entrada type="date" value={d.fecha} onChange={(e) => set('fecha', e.target.value)} />
          </Campo>
          {esCantidad ? (
            <Campo etiqueta={horas.includes(d.concepto) ? 'Horas' : 'Cantidad (días)'}>
              <Entrada type="number" step="0.5" min={0} value={d.cantidad} onChange={(e) => set('cantidad', e.target.value)} />
            </Campo>
          ) : (
            <Campo etiqueta="Valor">
              <EntradaDinero valor={d.valor} onCambio={(v) => set('valor', v)} />
            </Campo>
          )}
        </div>
        <Campo etiqueta="Descripción" opcional>
          <Entrada value={d.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </Campo>
      </div>
    </Modal>
  );
}

export function ModalPrestamo({ abierto, onCerrar, empleadoId, alGuardar }: { abierto: boolean; onCerrar: () => void; empleadoId?: string; alGuardar?: () => void }) {
  const [d, setD] = useState<Record<string, any>>({ empleadoId: empleadoId ?? '', tipo: 'prestamo', descripcion: '', valorTotal: '', numeroCuotas: 6, fechaInicio: hoy(), autorizacionEscrita: false });
  const { ejecutar, cargando } = useAccion();
  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));
  const cuota = d.valorTotal && d.numeroCuotas ? Math.ceil(Number(d.valorTotal) / Number(d.numeroCuotas)) : 0;
  const guardar = async () => {
    const r = await ejecutar(() => post('/prestamos', { ...d, empleadoId: empleadoId ?? d.empleadoId, numeroCuotas: Number(d.numeroCuotas) }), 'Préstamo registrado');
    if (r) {
      alGuardar?.();
      onCerrar();
    }
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Préstamo o libranza" pie={<><Boton variante="secundario" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} cargando={cargando} disabled={!d.autorizacionEscrita}>Guardar</Boton></>}>
      <div className="space-y-4">
        {!empleadoId && <SelectorEmpleado valor={d.empleadoId} onCambio={(v) => set('empleadoId', v)} />}
        <Opciones opciones={[{ valor: 'prestamo', etiqueta: 'Préstamo de la empresa' }, { valor: 'libranza', etiqueta: 'Libranza' }]} valor={d.tipo} onCambio={(v) => set('tipo', v)} />
        <Campo etiqueta="Descripción">
          <Entrada value={d.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </Campo>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo etiqueta="Valor total">
            <EntradaDinero valor={d.valorTotal} onCambio={(v) => set('valorTotal', v)} />
          </Campo>
          <Campo etiqueta="Número de cuotas">
            <Entrada type="number" min={1} max={360} value={d.numeroCuotas} onChange={(e) => set('numeroCuotas', e.target.value)} />
          </Campo>
          <Campo etiqueta="Desde">
            <Entrada type="date" value={d.fechaInicio} onChange={(e) => set('fechaInicio', e.target.value)} />
          </Campo>
        </div>
        {cuota > 0 && <p className="text-sm text-suave">Cuota por periodo: $ {cuota.toLocaleString('es-CO')}. Los préstamos de la empresa no cobran intereses (CST art. 153).</p>}
        <label className="flex items-start gap-3 rounded-xl border border-borde p-3">
          <input type="checkbox" checked={d.autorizacionEscrita} onChange={(e) => set('autorizacionEscrita', e.target.checked)} className="mt-1 h-4 w-4" />
          <span className="text-sm">El trabajador firmó la autorización para descontarlo de la nómina (CST arts. 149 y 151).</span>
        </label>
      </div>
    </Modal>
  );
}

export function ModalEmbargo({ abierto, onCerrar, empleadoId, alGuardar }: { abierto: boolean; onCerrar: () => void; empleadoId?: string; alGuardar?: () => void }) {
  const [d, setD] = useState<Record<string, any>>({ empleadoId: empleadoId ?? '', tipo: 'ordinario', descripcion: '', juzgado: '', numeroProceso: '', modo: 'porcentaje', porcentaje: '100', valorFijo: '', saldo: '' });
  const { ejecutar, cargando } = useAccion();
  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));
  const guardar = async () => {
    const r = await ejecutar(
      () =>
        post('/embargos', {
          empleadoId: empleadoId ?? d.empleadoId,
          tipo: d.tipo,
          descripcion: d.descripcion,
          juzgado: d.juzgado || null,
          numeroProceso: d.numeroProceso || null,
          porcentaje: d.modo === 'porcentaje' ? String(Number(d.porcentaje) / 100) : null,
          valorFijo: d.modo === 'fijo' ? d.valorFijo : null,
          saldo: d.saldo || null,
        }),
      'Embargo registrado',
    );
    if (r) {
      alGuardar?.();
      onCerrar();
    }
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Embargo judicial" pie={<><Boton variante="secundario" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} cargando={cargando}>Guardar</Boton></>}>
      <div className="space-y-4">
        {!empleadoId && <SelectorEmpleado valor={d.empleadoId} onCambio={(v) => set('empleadoId', v)} />}
        <Opciones
          opciones={[
            { valor: 'ordinario', etiqueta: 'Ordinario', descripcion: 'Hasta 1/5 del excedente del mínimo' },
            { valor: 'alimentos', etiqueta: 'Alimentos', descripcion: 'Hasta el 50% del salario' },
            { valor: 'cooperativa', etiqueta: 'Cooperativa', descripcion: 'Hasta el 50% del salario' },
          ]}
          valor={d.tipo}
          onCambio={(v) => set('tipo', v)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Campo etiqueta="Descripción">
            <Entrada value={d.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
          </Campo>
          <Campo etiqueta="Juzgado" opcional>
            <Entrada value={d.juzgado} onChange={(e) => set('juzgado', e.target.value)} />
          </Campo>
          <Campo etiqueta="Número de proceso" opcional>
            <Entrada value={d.numeroProceso} onChange={(e) => set('numeroProceso', e.target.value)} />
          </Campo>
          <Campo etiqueta="Saldo total a descontar" opcional>
            <EntradaDinero valor={d.saldo} onCambio={(v) => set('saldo', v)} />
          </Campo>
        </div>
        <Opciones opciones={[{ valor: 'porcentaje', etiqueta: 'Porcentaje del máximo legal' }, { valor: 'fijo', etiqueta: 'Valor fijo por periodo' }]} valor={d.modo} onCambio={(v) => set('modo', v)} />
        {d.modo === 'porcentaje' ? (
          <Campo etiqueta="Porcentaje del máximo embargable (%)">
            <Entrada type="number" min={1} max={100} value={d.porcentaje} onChange={(e) => set('porcentaje', e.target.value)} />
          </Campo>
        ) : (
          <Campo etiqueta="Valor por periodo">
            <EntradaDinero valor={d.valorFijo} onCambio={(v) => set('valorFijo', v)} />
          </Campo>
        )}
        <Aviso>El sistema nunca descuenta más del límite legal (CST arts. 154 a 156). Lo que no alcance se informa como pendiente.</Aviso>
      </div>
    </Modal>
  );
}

export const NOMBRES_NOVEDAD = NOMBRE_NOVEDAD;
