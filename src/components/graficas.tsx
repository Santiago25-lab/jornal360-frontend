'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compacto, mesCorto, pesos } from '@/lib/formato';

const color = (v: string) => `rgb(var(${v}))`;

function Globo({ active, payload, label, formatoEtiqueta }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-texto px-3 py-2 text-sm text-fondo shadow-lg">
      <p className="font-semibold tabular">{pesos(payload[0].value)}</p>
      <p className="text-xs opacity-75">{formatoEtiqueta ? formatoEtiqueta(label) : label}</p>
    </div>
  );
}

/** Costo de nómina mes a mes (una serie: el título la nombra, sin leyenda). */
export function GraficaCosto({ datos }: { datos: { mes: string; costo: string }[] }) {
  const filas = datos.map((d) => ({ mes: d.mes, costo: Number(d.costo) }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Costo total de nómina por mes">
      <ResponsiveContainer>
        <AreaChart data={filas} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="relleno-costo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color('--marca-500')} stopOpacity={0.18} />
              <stop offset="1" stopColor={color('--marca-500')} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={color('--borde')} strokeDasharray="0" />
          <XAxis dataKey="mes" tickFormatter={mesCorto} tick={{ fill: color('--suave'), fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => compacto(v)} tick={{ fill: color('--suave'), fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
          <Tooltip content={<Globo formatoEtiqueta={mesCorto} />} cursor={{ stroke: color('--marca-500'), strokeWidth: 1 }} />
          <Area type="monotone" dataKey="costo" stroke={color('--marca-500')} strokeWidth={2} fill="url(#relleno-costo)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: color('--tarjeta') }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** En qué se va la plata del último periodo: barras horizontales ordenadas, un solo color. */
export function GraficaDistribucion({ datos }: { datos: { grupo: string; total: string }[] }) {
  const filas = [...datos].map((d) => ({ grupo: d.grupo, total: Number(d.total) })).sort((a, b) => b.total - a.total);
  const total = filas.reduce((a, f) => a + f.total, 0) || 1;
  return (
    <div style={{ height: Math.max(160, filas.length * 44) }} className="w-full" role="img" aria-label="Distribución del costo de la nómina">
      <ResponsiveContainer>
        <BarChart data={filas} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="grupo" width={190} tick={{ fill: color('--texto'), fontSize: 13 }} axisLine={false} tickLine={false} />
          <Tooltip content={<Globo />} cursor={{ fill: color('--marca-50') }} />
          <Bar
            dataKey="total"
            radius={[0, 4, 4, 0]}
            label={{ position: 'right', formatter: (v: number) => `${Math.round((v / total) * 100)} %`, fill: color('--suave'), fontSize: 12 }}
          >
            {filas.map((f, i) => (
              <Cell key={f.grupo} fill={color('--marca-500')} fillOpacity={i === 0 ? 1 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
