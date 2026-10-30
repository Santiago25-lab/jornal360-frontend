import { useId } from 'react';

/** Marca: la J dentro de un ciclo completo (360°), sobre el degradado de la marca. */
export function Logo({ tamano = 32, conTexto = true }: { tamano?: number; conTexto?: boolean }) {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={tamano} height={tamano} viewBox="0 0 64 64" role="img" aria-label="Jornal 360" className="flex-none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="0.55" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="17" fill={`url(#${id})`} />
        <path d="M46.49 18.95A19.5 19.5 0 1 1 18.95 17.51" fill="none" stroke="#fff" strokeWidth="5.2" strokeLinecap="round" />
        <path d="M24.15 12.82L15.1 13.98l6.96 7.73z" fill="#fff" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M35.5 22.5v12a6.6 6.6 0 0 1-12.6 2.8" fill="none" stroke="#fff" strokeWidth="5.4" strokeLinecap="round" />
      </svg>
      {conTexto && (
        <span className="text-[17px] font-bold tracking-tight">
          Jornal <span className="bg-destacado bg-clip-text text-transparent">360</span>
        </span>
      )}
    </span>
  );
}
