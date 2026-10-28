/** Formato colombiano: $ 1.750.905, 28/10/2026. */

export function pesos(v: string | number | null | undefined, decimales = 0): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!isFinite(n)) return '—';
  return '$ ' + n.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function numero(v: string | number | null | undefined, decimales = 0): string {
  if (v === null || v === undefined || v === '') return '—';
  return Number(v).toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

/** Valor de una variable de fórmula: dinero sin decimales sobrantes, números y banderas tal cual. */
export function valorVariable(v: unknown): string {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !isFinite(n)) return String(v ?? '—');
  if (Math.abs(n) >= 1000) return '$ ' + n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  return n.toLocaleString('es-CO', { maximumFractionDigits: 6 });
}

export function compacto(v: string | number): string {
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `$ ${(n / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil M`;
  if (Math.abs(n) >= 1e6) return `$ ${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(n) >= 1e3) return `$ ${(n / 1e3).toLocaleString('es-CO', { maximumFractionDigits: 0 })} mil`;
  return pesos(n);
}

export function porcentaje(v: string | number | null | undefined, decimales = 1): string {
  if (v === null || v === undefined || v === '') return '—';
  return `${(Number(v) * 100).toLocaleString('es-CO', { maximumFractionDigits: decimales })} %`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function fecha(f: string | null | undefined): string {
  if (!f) return '—';
  const s = String(f).slice(0, 10);
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
}

export function fechaLarga(f: string | null | undefined): string {
  if (!f) return '—';
  const s = String(f).slice(0, 10);
  const d = new Date(`${s}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${Number(s.slice(8, 10))} de ${MESES_LARGOS[Number(s.slice(5, 7)) - 1]} de ${s.slice(0, 4)}`;
}

export function mesCorto(m: string): string {
  return `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
}

export function fechaHora(f: string | null | undefined): string {
  if (!f) return '—';
  const d = new Date(f);
  return d.toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Fecha de hoy en Colombia 'AAAA-MM-DD'. */
export function hoy(): string {
  return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
}

export function sumarDias(f: string, n: number): string {
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const NOMBRE_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const NOMBRE_TIPO_HORA: Record<string, string> = {
  HOD: 'Ordinaria diurna',
  HON: 'Recargo nocturno',
  HED: 'Extra diurna',
  HEN: 'Extra nocturna',
  HDD: 'Descanso/festivo diurna',
  HDN: 'Descanso/festivo nocturna',
  HEDD: 'Extra diurna en descanso',
  HEND: 'Extra nocturna en descanso',
};

export const NOMBRE_NOVEDAD: Record<string, string> = {
  incapacidad_eg: 'Incapacidad por enfermedad general',
  incapacidad_laboral: 'Incapacidad laboral',
  licencia_maternidad: 'Licencia de maternidad',
  licencia_paternidad: 'Licencia de paternidad',
  licencia_remunerada: 'Licencia remunerada',
  licencia_no_remunerada: 'Licencia no remunerada',
  suspension: 'Suspensión',
  ausencia_injustificada: 'Ausencia injustificada',
  vacaciones: 'Vacaciones',
};

export const NOMBRE_CONTRATO: Record<string, string> = {
  indefinido: 'Término indefinido',
  fijo: 'Término fijo',
  obra_labor: 'Obra o labor',
  ocasional: 'Ocasional',
  aprendizaje: 'Aprendizaje',
  integral: 'Salario integral',
  tiempo_parcial: 'Tiempo parcial',
};

export const NOMBRE_ESTADO_PERIODO: Record<string, string> = {
  abierto: 'Abierto',
  liquidado: 'Liquidado',
  aprobado: 'Aprobado',
  cerrado: 'Cerrado',
};

export const TONO_ESTADO: Record<string, 'neutro' | 'alerta' | 'marca' | 'exito'> = { abierto: 'neutro', liquidado: 'alerta', aprobado: 'marca', cerrado: 'exito' };
