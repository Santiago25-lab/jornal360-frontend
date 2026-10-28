export function Logo({ tamano = 32, conTexto = true }: { tamano?: number; conTexto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={tamano} height={tamano} viewBox="0 0 40 40" role="img" aria-label="Jornal 360">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2dd4e8" />
            <stop offset="0.55" stopColor="#8b7cff" />
            <stop offset="1" stopColor="#e15bd8" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="17" fill="none" stroke="url(#logo-g)" strokeWidth="5" strokeDasharray="88 19" strokeLinecap="round" transform="rotate(-60 20 20)" />
        <path d="M21 12v11.5a4.5 4.5 0 0 1-8.6 1.9" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
      {conTexto && (
        <span className="text-[17px] font-semibold tracking-tight">
          Jornal <span className="text-marca-500">360</span>
        </span>
      )}
    </span>
  );
}
