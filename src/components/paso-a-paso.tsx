'use client';

import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useState } from 'react';
import { descargar } from '@/lib/api';
import { fecha, numero, pesos, valorVariable } from '@/lib/formato';
import { Aviso, Boton, cx, Insignia, useAvisos } from './ui';

/** Explica un valor de nómina como una calculadora: fórmula, variables y resultado. */
function Calculo({ l }: { l: any }) {
  const d = l.detalle ?? {};
  const variables = Object.entries(d.variables ?? {});
  return (
    <div className="space-y-2 rounded-xl bg-fondo p-3 text-sm">
      {d.formula && (
        <p>
          <span className="text-suave">Fórmula: </span>
          <code className="rounded bg-tarjeta px-1.5 py-0.5 font-mono text-[13px]">{d.formula}</code>
        </p>
      )}
      {variables.length > 0 && (
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {variables.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-borde/60 py-0.5">
              <span className="font-mono text-[12px] text-suave">{k}</span>
              <span className="tabular">{valorVariable(v)}</span>
            </div>
          ))}
        </div>
      )}
      {d.tramos?.length > 1 && (
        <div>
          <p className="text-suave">Por tramos (cambió un parámetro o el salario dentro del periodo):</p>
          {d.tramos.map((t: any, i: number) => (
            <p key={i} className="tabular">
              {fecha(t.desde)} a {fecha(t.hasta)}: {pesos(t.valor, 2)}
            </p>
          ))}
        </div>
      )}
      {d.sinRedondear && Number(d.sinRedondear) % 1 !== 0 && <p className="text-suave">Resultado sin redondear: {pesos(d.sinRedondear, 2)}</p>}
      {d.nota && <p>{d.nota}</p>}
    </div>
  );
}

function Linea({ l }: { l: any }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className="border-b border-borde/70 last:border-0">
      <button onClick={() => setAbierta((a) => !a)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-marca-50/40">
        <span className="flex items-center gap-2">
          {abierta ? <ChevronDown className="h-4 w-4 text-suave" /> : <ChevronRight className="h-4 w-4 text-suave" />}
          <span>{l.nombre}</span>
          {l.cantidad && <span className="text-xs text-suave">({numero(l.cantidad, 2)})</span>}
        </span>
        <span className="font-medium tabular">{pesos(l.valor)}</span>
      </button>
      {abierta && <div className="pb-3"><Calculo l={l} /></div>}
    </div>
  );
}

export function PasoAPaso({ det, periodoId, empleadoId }: { det: any; periodoId: string; empleadoId: string }) {
  const { error } = useAvisos();
  const grupo = (tipo: string) => det.lineas.filter((l: any) => l.tipo === tipo);
  const bloques = [
    { tipo: 'devengo', titulo: 'Devengos', total: det.totales.devengos },
    { tipo: 'deduccion', titulo: 'Deducciones', total: det.totales.deducciones },
    { tipo: 'aporte_empleador', titulo: 'Aportes del empleador', total: det.totales.aportesEmpleador },
    { tipo: 'provision', titulo: 'Provisiones', total: det.totales.provisiones },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-suave">
          {det.documento} {det.cargo ? `· ${det.cargo}` : ''} · {det.dias?.salario ?? '—'} días pagados
        </div>
        <Boton tamano="sm" variante="secundario" icono={<Download className="h-4 w-4" />} onClick={() => descargar(`/periodos/${periodoId}/empleados/${empleadoId}/desprendible`, `desprendible-${det.empleado}.pdf`).catch(error)}>
          Desprendible PDF
        </Boton>
      </div>
      <div className="rounded-2xl bg-destacado p-5 text-white">
        <p className="text-sm opacity-90">Neto a pagar</p>
        <p className="text-3xl font-semibold tabular">{pesos(det.totales.neto)}</p>
        <p className="mt-1 text-sm opacity-85">Costo total para la empresa: {pesos(det.totales.costoTotal)}</p>
      </div>
      {det.alertas?.length > 0 && (
        <div className="space-y-2">
          {det.alertas.map((a: any, i: number) => (
            <Aviso key={i} tono={a.nivel === 'error' ? 'peligro' : a.nivel === 'advertencia' ? 'alerta' : 'info'}>
              {a.mensaje}
            </Aviso>
          ))}
        </div>
      )}
      {det.pendientes?.length > 0 && (
        <Aviso tono="alerta" titulo="Descuentos que no se aplicaron completos">
          {det.pendientes.map((p: any) => `${p.descripcion}: faltó ${pesos(p.noAplicado)}`).join(' · ')}
        </Aviso>
      )}
      <p className="text-sm text-suave">Toque cualquier valor para ver cómo se calculó.</p>
      {bloques.map((b) => {
        const ls = grupo(b.tipo);
        if (!ls.length) return null;
        return (
          <div key={b.tipo}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">{b.titulo}</h3>
              <span className={cx('font-semibold tabular', b.tipo === 'deduccion' && 'text-peligro')}>{pesos(b.total)}</span>
            </div>
            <div>
              {ls.map((l: any, i: number) => (
                <Linea key={i} l={l} />
              ))}
            </div>
          </div>
        );
      })}
      {det.bases && Object.keys(det.bases).length > 0 && (
        <details className="rounded-xl border border-borde p-3">
          <summary className="cursor-pointer font-medium">Bases de cálculo (IBC, regla del 40%, prestaciones)</summary>
          <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {Object.entries(det.bases).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-borde/60 py-0.5">
                <span className="text-suave">{NOMBRES_BASE[k] ?? k}</span>
                <span className="tabular">{pesos(v as string)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
      {det.retencion && (
        <details className="rounded-xl border border-borde p-3">
          <summary className="cursor-pointer font-medium">Depuración de la retención en la fuente</summary>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {det.retencion.pasos.map((p: any, i: number) => (
                <tr key={i} className="border-b border-borde/60">
                  <td className="py-1">{p.concepto}</td>
                  <td className="py-1 text-right tabular">{pesos(p.valor)}</td>
                  <td className="py-1 pl-3 text-right text-suave tabular">{numero(p.uvt, 2)} UVT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      {det.dias && (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(det.dias).map(([k, v]) => (
            <Insignia key={k}>
              {NOMBRES_DIAS[k] ?? k}: {String(v)}
            </Insignia>
          ))}
        </div>
      )}
    </div>
  );
}

const NOMBRES_BASE: Record<string, string> = {
  totalDevengado: 'Total devengado',
  salarial: 'Pagos salariales',
  noSalarial: 'Pagos no salariales',
  limiteNoSalarial: 'Límite del 40%',
  excesoNoSalarial: 'Exceso que suma al IBC',
  ibcSalud: 'IBC salud',
  ibcPension: 'IBC pensión',
  ibcArl: 'IBC riesgos laborales',
  ibcParafiscales: 'Base caja, ICBF y SENA',
  basePrestaciones: 'Base de cesantías y prima',
  baseVacaciones: 'Base de vacaciones',
  baseRetencionPeriodo: 'Ingresos gravables del periodo',
  noConstitutivosPeriodo: 'Aportes obligatorios del periodo',
};

const NOMBRES_DIAS: Record<string, string> = {
  periodo: 'Días del periodo',
  salario: 'Días pagados',
  incapacidad: 'Incapacidad',
  vacaciones: 'Vacaciones',
  licenciaEps: 'Licencia EPS',
  noRemunerados: 'No remunerados',
  cotizados: 'Cotizados',
};
