import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';
import { cx } from './ui';

/** Tarjeta de indicador. La destacada lleva el degradado (solo una por panel). */
export function Indicador({
  titulo,
  valor,
  detalle,
  variacion,
  icono,
  destacado,
  href,
  variacionPositivaEsBuena = true,
}: {
  titulo: string;
  valor: ReactNode;
  detalle?: string;
  variacion?: string | null;
  icono?: ReactNode;
  destacado?: boolean;
  href?: string;
  variacionPositivaEsBuena?: boolean;
}) {
  const v = variacion !== null && variacion !== undefined ? Number(variacion) : null;
  const sube = v !== null && v >= 0;
  const bueno = v === null ? null : sube === variacionPositivaEsBuena;
  const cuerpo = (
    <div
      className={cx(
        'group h-full rounded-2xl border p-5 transition animate-entrar',
        destacado ? 'border-transparent bg-destacado text-white shadow-lg' : 'border-borde bg-tarjeta shadow-suave hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl', destacado ? 'bg-white/20' : 'bg-marca-50 text-marca-600')}>{icono}</span>
        {v !== null && (
          <span className={cx('inline-flex items-center gap-0.5 text-sm font-medium tabular', destacado ? 'text-white' : bueno ? 'text-exito' : 'text-peligro')}>
            {sube ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(v * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %
          </span>
        )}
      </div>
      <p className="mt-4 text-[26px] font-semibold leading-tight tracking-tight tabular">{valor}</p>
      <p className={cx('mt-1 text-sm', destacado ? 'text-white/85' : 'text-suave')}>{titulo}</p>
      {detalle && <p className={cx('mt-0.5 text-xs', destacado ? 'text-white/75' : 'text-suave')}>{detalle}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-marca-500">
      {cuerpo}
    </Link>
  ) : (
    cuerpo
  );
}
