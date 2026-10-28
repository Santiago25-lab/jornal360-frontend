'use client';

import { TIPOS_CONTRATO } from '@/lib/catalogos';
import { Aviso, Campo, Entrada, EntradaDinero, Opciones, Selector } from './ui';

export const CONTRATO_VACIO = {
  tipo: 'indefinido',
  fechaInicio: '',
  fechaFin: '',
  salario: '',
  cargo: '',
  tipoSalario: 'fijo',
  faseAprendiz: 'lectiva',
  auxilioTransporte: 'ley',
  claseRiesgo: 1,
  descripcionObra: '',
  horasSemanales: '',
};

export function limpiarContrato(c: Record<string, any>) {
  const out: Record<string, any> = {
    tipo: c.tipo,
    fechaInicio: c.fechaInicio,
    fechaFin: c.fechaFin || null,
    cargo: c.cargo || null,
    auxilioTransporte: c.auxilioTransporte,
    claseRiesgo: Number(c.claseRiesgo),
    tipoSalario: c.tipo === 'integral' ? 'integral' : c.tipoSalario,
  };
  if (c.salario !== '') out.salario = c.salario;
  if (c.tipo === 'aprendizaje') out.faseAprendiz = c.faseAprendiz;
  if (c.tipo === 'obra_labor') out.descripcionObra = c.descripcionObra;
  if (c.tipo === 'tiempo_parcial' && c.horasSemanales) out.horasSemanales = c.horasSemanales;
  return out;
}

export function FormularioContrato({ c, set }: { c: Record<string, any>; set: (k: string, v: any) => void }) {
  const conFin = c.tipo === 'fijo' || c.tipo === 'aprendizaje' || c.tipo === 'obra_labor' || c.tipo === 'ocasional';
  return (
    <div className="space-y-5">
      <Campo etiqueta="Tipo de contrato">
        <Opciones opciones={TIPOS_CONTRATO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta, descripcion: t.descripcion }))} valor={c.tipo} onCambio={(v) => set('tipo', v)} />
      </Campo>
      <div className="grid gap-4 md:grid-cols-3">
        <Campo etiqueta="Fecha de inicio">
          <Entrada type="date" value={c.fechaInicio} onChange={(e) => set('fechaInicio', e.target.value)} required />
        </Campo>
        {conFin && (
          <Campo etiqueta={c.tipo === 'obra_labor' ? 'Fecha estimada de fin' : 'Fecha de terminación'} opcional={c.tipo === 'obra_labor' || c.tipo === 'ocasional'}>
            <Entrada type="date" value={c.fechaFin} onChange={(e) => set('fechaFin', e.target.value)} />
          </Campo>
        )}
        <Campo etiqueta={c.tipo === 'aprendizaje' ? 'Apoyo de sostenimiento' : 'Salario mensual'} opcional={c.tipo === 'aprendizaje'} ayuda={c.tipo === 'aprendizaje' ? 'Si lo deja vacío se usa el porcentaje del salario mínimo de la fase' : undefined}>
          <EntradaDinero valor={c.salario} onCambio={(v) => set('salario', v)} />
        </Campo>
        <Campo etiqueta="Cargo" opcional>
          <Entrada value={c.cargo} onChange={(e) => set('cargo', e.target.value)} />
        </Campo>
        {c.tipo !== 'integral' && c.tipo !== 'aprendizaje' && (
          <Campo etiqueta="Tipo de salario" ayuda="Variable: comisiones o destajo. Las vacaciones y prestaciones se calculan con el promedio">
            <Selector value={c.tipoSalario} onChange={(e) => set('tipoSalario', e.target.value)} opciones={[{ valor: 'fijo', etiqueta: 'Fijo' }, { valor: 'variable', etiqueta: 'Variable' }]} />
          </Campo>
        )}
        <Campo etiqueta="Clase de riesgo ARL">
          <Selector value={c.claseRiesgo} onChange={(e) => set('claseRiesgo', Number(e.target.value))} opciones={[1, 2, 3, 4, 5].map((n) => ({ valor: n, etiqueta: `Clase ${['I', 'II', 'III', 'IV', 'V'][n - 1]}` }))} />
        </Campo>
        <Campo etiqueta="Auxilio de transporte" ayuda="Por ley: lo recibe quien gana hasta 2 salarios mínimos">
          <Selector value={c.auxilioTransporte} onChange={(e) => set('auxilioTransporte', e.target.value)} opciones={[{ valor: 'ley', etiqueta: 'Según la ley' }, { valor: 'siempre', etiqueta: 'Siempre' }, { valor: 'nunca', etiqueta: 'Nunca (ej. trabajo en casa)' }]} />
        </Campo>
        {c.tipo === 'aprendizaje' && (
          <Campo etiqueta="Fase del aprendiz">
            <Selector
              value={c.faseAprendiz}
              onChange={(e) => set('faseAprendiz', e.target.value)}
              opciones={[
                { valor: 'lectiva', etiqueta: 'Lectiva (75% del mínimo)' },
                { valor: 'practica', etiqueta: 'Práctica (100% del mínimo)' },
                { valor: 'dual_1', etiqueta: 'Dual, primer año (75%)' },
                { valor: 'dual_2', etiqueta: 'Dual, segundo año (100%)' },
                { valor: 'universitario', etiqueta: 'Universitario (mínimo 100%)' },
              ]}
            />
          </Campo>
        )}
        {c.tipo === 'tiempo_parcial' && (
          <Campo etiqueta="Horas a la semana">
            <Entrada type="number" min={1} max={41} value={c.horasSemanales} onChange={(e) => set('horasSemanales', e.target.value)} />
          </Campo>
        )}
      </div>
      {c.tipo === 'obra_labor' && (
        <Campo etiqueta="Obra o labor contratada" ayuda="CST art. 46: debe describirse de forma precisa">
          <Entrada value={c.descripcionObra} onChange={(e) => set('descripcionObra', e.target.value)} />
        </Campo>
      )}
      {c.tipo === 'fijo' && <Aviso>El término fijo va por escrito y no puede superar 4 años. Si nadie avisa 30 días antes, se prorroga solo (CST art. 46).</Aviso>}
      {c.tipo === 'integral' && <Aviso>El salario integral debe ser al menos 10 salarios mínimos más el 30% de factor prestacional (CST art. 132).</Aviso>}
    </div>
  );
}
