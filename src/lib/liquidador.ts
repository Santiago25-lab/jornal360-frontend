/** Textos compartidos del Liquidador Express. */

export const TIPOS_LIQUIDACION = [
  { valor: 'nomina', etiqueta: 'Nómina', descripcion: 'Mensual o quincenal' },
  { valor: 'prima', etiqueta: 'Prima', descripcion: 'De servicios o de navidad' },
  { valor: 'cesantias', etiqueta: 'Cesantías', descripcion: 'Con sus intereses' },
  { valor: 'vacaciones', etiqueta: 'Vacaciones', descripcion: 'Días hábiles a pagar' },
  { valor: 'retiro', etiqueta: 'Liquidación de contrato', descripcion: 'Retiro de un trabajador' },
];

export const NOMBRE_TIPO_LIQUIDACION: Record<string, string> = Object.fromEntries(TIPOS_LIQUIDACION.map((t) => [t.valor, t.etiqueta]));

export const NOMBRE_REGIMEN: Record<string, string> = { privado: 'Sector privado', publico: 'Sector público' };

export const ADVERTENCIA_REGLAS =
  'Las reglas y valores que vienen por defecto son un punto de partida: no garantizamos que sean correctos para su caso. Revíselos en «Valores de la liquidación» y ajústelos si tiene los valores exactos (decreto salarial, convención, acuerdos de la empresa).';
