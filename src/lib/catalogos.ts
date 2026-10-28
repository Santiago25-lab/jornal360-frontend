'use client';

import { useDatos } from './datos';

/** Listas para los selectores (entidades, sedes, centros de costo, grupos, turnos, áreas). */
export function useCatalogos() {
  const entidades = useDatos<any[]>('/entidades');
  const sedes = useDatos<any[]>('/sedes');
  const centros = useDatos<any[]>('/centros-costo');
  const grupos = useDatos<any[]>('/grupos-pago');
  const turnos = useDatos<any[]>('/turnos');
  const areas = useDatos<any[]>('/areas');
  const kioscos = useDatos<any[]>('/asistencia/kioscos');
  const opcion = (l: any[] | null, etiqueta = (x: any) => x.nombre) => (l ?? []).filter((x) => x.activo !== false && x.activa !== false).map((x) => ({ valor: x.id, etiqueta: etiqueta(x) }));
  const deTipo = (t: string) => opcion((entidades.datos ?? []).filter((e) => e.tipo === t));
  return {
    eps: deTipo('eps'),
    afp: deTipo('afp'),
    cesantias: deTipo('cesantias'),
    ccf: deTipo('ccf'),
    sedes: opcion(sedes.datos),
    centros: opcion(centros.datos, (c) => `${c.codigo} · ${c.nombre}`),
    grupos: opcion(grupos.datos, (g) => `${g.nombre} (${g.periodicidad})`),
    turnos: opcion(turnos.datos),
    areas: opcion(areas.datos),
    kioscos: opcion(kioscos.datos),
    recargar: () => Promise.all([entidades.recargar(), sedes.recargar(), centros.recargar(), grupos.recargar(), turnos.recargar(), areas.recargar(), kioscos.recargar()]),
  };
}

export const TIPOS_DOCUMENTO = [
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'TI', etiqueta: 'Tarjeta de identidad' },
  { valor: 'PA', etiqueta: 'Pasaporte' },
  { valor: 'PPT', etiqueta: 'Permiso por protección temporal' },
  { valor: 'PEP', etiqueta: 'Permiso especial de permanencia' },
];

export const TIPOS_CONTRATO = [
  { valor: 'indefinido', etiqueta: 'Término indefinido', descripcion: 'Sin fecha de terminación' },
  { valor: 'fijo', etiqueta: 'Término fijo', descripcion: 'Hasta 4 años, por escrito' },
  { valor: 'obra_labor', etiqueta: 'Obra o labor', descripcion: 'Mientras dure la obra' },
  { valor: 'integral', etiqueta: 'Salario integral', descripcion: '10 SMMLV + 30% prestacional' },
  { valor: 'aprendizaje', etiqueta: 'Aprendizaje', descripcion: 'Aprendices SENA o universitarios' },
  { valor: 'tiempo_parcial', etiqueta: 'Tiempo parcial', descripcion: 'Menos horas a la semana' },
  { valor: 'ocasional', etiqueta: 'Ocasional', descripcion: 'Menos de un mes' },
];

export const BANCOS = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'BBVA', 'Banco de Occidente', 'Banco Popular', 'Banco AV Villas', 'Scotiabank Colpatria', 'Banco Caja Social', 'Banco Agrario', 'Nequi', 'Daviplata', 'Otro'];
