'use client';

import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, ChevronDown, HelpCircle, Info, Loader2, Search, X, XCircle } from 'lucide-react';
import { createContext, ReactNode, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { ErrorApi } from '@/lib/api';

export const cx = clsx;

// ---------- Botones ----------

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'exito';

export function Boton({
  variante = 'primario',
  tamano = 'md',
  cargando,
  icono,
  children,
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamano?: 'sm' | 'md' | 'lg'; cargando?: boolean; icono?: ReactNode }) {
  return (
    <button
      {...p}
      disabled={p.disabled || cargando}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-marca-500 focus-visible:ring-offset-2 focus-visible:ring-offset-fondo disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        tamano === 'sm' && 'h-8 px-3 text-sm',
        tamano === 'md' && 'h-10 px-4 text-[15px]',
        tamano === 'lg' && 'h-12 px-6 text-base',
        variante === 'primario' && 'bg-marca-500 text-white hover:bg-marca-600 shadow-sm',
        variante === 'secundario' && 'bg-tarjeta border border-borde text-texto hover:bg-marca-50',
        variante === 'fantasma' && 'text-suave hover:text-texto hover:bg-marca-50',
        variante === 'peligro' && 'bg-peligro text-white hover:opacity-90',
        variante === 'exito' && 'bg-exito text-white hover:opacity-90',
        className,
      )}
    >
      {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : icono}
      {children}
    </button>
  );
}

// ---------- Campos ----------

export function Ayuda({ texto }: { texto: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Ayuda"
        onMouseEnter={() => setAbierto(true)}
        onMouseLeave={() => setAbierto(false)}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onClick={() => setAbierto((a) => !a)}
        className="text-suave hover:text-marca-500"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {abierto && (
        <span role="tooltip" className="absolute left-1/2 top-6 z-50 w-64 -translate-x-1/2 rounded-xl bg-texto px-3 py-2 text-[13px] leading-snug text-fondo shadow-lg">
          {texto}
        </span>
      )}
    </span>
  );
}

export function Campo({ etiqueta, ayuda, error, children, opcional, className }: { etiqueta?: string; ayuda?: string; error?: string; children: ReactNode; opcional?: boolean; className?: string }) {
  return (
    <label className={cx('block', className)}>
      {etiqueta && (
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-texto">
          {etiqueta}
          {opcional && <span className="font-normal text-suave">(opcional)</span>}
          {ayuda && <Ayuda texto={ayuda} />}
        </span>
      )}
      {children}
      {error && <span className="mt-1 block text-sm text-peligro">{error}</span>}
    </label>
  );
}

const claseEntrada =
  'w-full h-10 rounded-xl border border-borde bg-tarjeta px-3 text-texto placeholder:text-suave/70 focus:outline-none focus:ring-2 focus:ring-marca-500/40 focus:border-marca-500 disabled:opacity-60';

export function Entrada({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(claseEntrada, className)} />;
}

export function AreaTexto({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(claseEntrada, 'h-auto min-h-[84px] py-2', className)} />;
}

export function Selector({ opciones, className, vacio, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { opciones: { valor: string | number; etiqueta: string }[]; vacio?: string }) {
  return (
    <div className="relative">
      <select {...p} className={cx(claseEntrada, 'appearance-none pr-9', className)}>
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={String(o.valor)} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-suave" />
    </div>
  );
}

/** Dinero con separador de miles mientras se escribe. Guarda el valor sin puntos. */
export function EntradaDinero({ valor, onCambio, ...p }: { valor: string | number | null | undefined; onCambio: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const mostrar = valor === null || valor === undefined || valor === '' ? '' : Number(String(valor).split('.')[0]).toLocaleString('es-CO');
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-2.5 text-suave">$</span>
      <input
        {...p}
        inputMode="numeric"
        value={mostrar}
        onChange={(e) => onCambio(e.target.value.replace(/\D/g, ''))}
        className={cx(claseEntrada, 'pl-7 tabular', p.className)}
      />
    </div>
  );
}

/** Interruptor de encendido/apagado (HU-63). */
export function Interruptor({ activo, onCambio, etiqueta, descripcion, ayuda, disabled }: { activo: boolean; onCambio: (v: boolean) => void; etiqueta?: string; descripcion?: string; ayuda?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      {(etiqueta || descripcion) && (
        <div className="min-w-0">
          <label htmlFor={id} className="flex items-center gap-1.5 font-medium">
            {etiqueta}
            {ayuda && <Ayuda texto={ayuda} />}
          </label>
          {descripcion && <p className="mt-0.5 text-sm text-suave">{descripcion}</p>}
        </div>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={activo}
        disabled={disabled}
        onClick={() => onCambio(!activo)}
        className={cx('relative mt-0.5 h-6 w-11 flex-none rounded-full transition disabled:opacity-50', activo ? 'bg-marca-500' : 'bg-borde')}
      >
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', activo ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

export function Casilla({ marcada, onCambio, etiqueta, descripcion, disabled }: { marcada: boolean; onCambio: (v: boolean) => void; etiqueta: ReactNode; descripcion?: string; disabled?: boolean }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-60')}>
      <input type="checkbox" checked={marcada} disabled={disabled} onChange={(e) => onCambio(e.target.checked)} className="mt-1 h-4 w-4 rounded accent-[rgb(var(--marca-500))]" />
      <span>
        <span className="font-medium">{etiqueta}</span>
        {descripcion && <span className="block text-sm text-suave">{descripcion}</span>}
      </span>
    </label>
  );
}

/** Opciones en forma de botones grandes para marcar (días, tipos, etc.). */
export function Opciones<T extends string | number>({ opciones, valor, onCambio, multiple }: { opciones: { valor: T; etiqueta: string; descripcion?: string }[]; valor: T | T[]; onCambio: (v: any) => void; multiple?: boolean }) {
  const activo = (v: T) => (multiple ? (valor as T[]).includes(v) : valor === v);
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          aria-pressed={activo(o.valor)}
          onClick={() => {
            if (!multiple) return onCambio(o.valor);
            const l = valor as T[];
            onCambio(l.includes(o.valor) ? l.filter((x) => x !== o.valor) : [...l, o.valor]);
          }}
          className={cx(
            'rounded-xl border px-3.5 py-2 text-left text-sm transition',
            activo(o.valor) ? 'border-marca-500 bg-marca-50 text-marca-700 ring-1 ring-marca-500' : 'border-borde bg-tarjeta hover:border-marca-500/50',
          )}
        >
          <span className="font-medium">{o.etiqueta}</span>
          {o.descripcion && <span className="block text-xs text-suave">{o.descripcion}</span>}
        </button>
      ))}
    </div>
  );
}

export function Buscador({ valor, onCambio, placeholder = 'Buscar…', className }: { valor: string; onCambio: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-suave" />
      <input value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} className={cx(claseEntrada, 'pl-9')} />
    </div>
  );
}

// ---------- Contenedores ----------

export function Tarjeta({ children, className, titulo, accion, subtitulo }: { children: ReactNode; className?: string; titulo?: ReactNode; accion?: ReactNode; subtitulo?: string }) {
  return (
    <section className={cx('rounded-2xl border border-borde bg-tarjeta p-5 shadow-suave animate-entrar', className)}>
      {(titulo || accion) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {titulo && <h2 className="text-[17px] font-semibold">{titulo}</h2>}
            {subtitulo && <p className="mt-0.5 text-sm text-suave">{subtitulo}</p>}
          </div>
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Encabezado({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-suave">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

export function Pestanas<T extends string>({ pestanas, activa, onCambio }: { pestanas: { valor: T; etiqueta: string; contador?: number }[]; activa: T; onCambio: (v: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-borde bg-tarjeta p-1" role="tablist">
      {pestanas.map((p) => (
        <button
          key={p.valor}
          role="tab"
          aria-selected={p.valor === activa}
          onClick={() => onCambio(p.valor)}
          className={cx('whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition', p.valor === activa ? 'bg-marca-500 text-white shadow-sm' : 'text-suave hover:text-texto hover:bg-marca-50')}
        >
          {p.etiqueta}
          {p.contador ? <span className={cx('ml-1.5 rounded-full px-1.5 text-xs', p.valor === activa ? 'bg-white/25' : 'bg-marca-100 text-marca-700')}>{p.contador}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Filtro de periodo en píldoras (como la referencia). */
export function Pildoras<T extends string>({ opciones, valor, onCambio }: { opciones: { valor: T; etiqueta: string }[]; valor: T; onCambio: (v: T) => void }) {
  return (
    <div className="inline-flex gap-1 rounded-full border border-borde bg-tarjeta p-1">
      {opciones.map((o) => (
        <button key={o.valor} onClick={() => onCambio(o.valor)} className={cx('rounded-full px-3 py-1 text-sm transition', o.valor === valor ? 'bg-marca-500 text-white' : 'text-suave hover:text-texto')}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function Insignia({ children, tono = 'neutro' }: { children: ReactNode; tono?: 'neutro' | 'marca' | 'exito' | 'alerta' | 'peligro' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tono === 'neutro' && 'bg-borde/60 text-suave',
        tono === 'marca' && 'bg-marca-100 text-marca-700',
        tono === 'exito' && 'bg-exito/15 text-exito',
        tono === 'alerta' && 'bg-alerta/15 text-alerta',
        tono === 'peligro' && 'bg-peligro/15 text-peligro',
      )}
    >
      {children}
    </span>
  );
}

export function Vacio({ titulo, descripcion, accion, icono }: { titulo: string; descripcion?: string; accion?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-borde px-6 py-12 text-center">
      {icono && <div className="mb-3 text-marca-500">{icono}</div>}
      <p className="font-medium">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-md text-sm text-suave">{descripcion}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={texto}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-borde/50" />
      ))}
    </div>
  );
}

export function Aviso({ tono = 'info', titulo, children }: { tono?: 'info' | 'exito' | 'alerta' | 'peligro'; titulo?: string; children?: ReactNode }) {
  const Icono = tono === 'exito' ? CheckCircle2 : tono === 'peligro' ? XCircle : tono === 'alerta' ? AlertTriangle : Info;
  return (
    <div
      className={cx(
        'flex gap-3 rounded-xl border p-3.5 text-sm',
        tono === 'info' && 'border-marca-100 bg-marca-50',
        tono === 'exito' && 'border-exito/30 bg-exito/10',
        tono === 'alerta' && 'border-alerta/30 bg-alerta/10',
        tono === 'peligro' && 'border-peligro/30 bg-peligro/10',
      )}
    >
      <Icono className={cx('mt-0.5 h-4 w-4 flex-none', tono === 'info' && 'text-marca-500', tono === 'exito' && 'text-exito', tono === 'alerta' && 'text-alerta', tono === 'peligro' && 'text-peligro')} />
      <div>
        {titulo && <p className="font-medium">{titulo}</p>}
        {children && <div className={cx(titulo && 'mt-0.5', 'text-texto/90')}>{children}</div>}
      </div>
    </div>
  );
}

// ---------- Tabla ----------

export interface Columna<T> {
  clave: string;
  titulo: string;
  celda?: (fila: T) => ReactNode;
  derecha?: boolean;
  className?: string;
}

export function Tabla<T>({ columnas, filas, alClic, vacio = 'No hay registros', clave }: { columnas: Columna<T>[]; filas: T[]; alClic?: (f: T) => void; vacio?: string; clave?: (f: T, i: number) => string }) {
  if (!filas.length) return <Vacio titulo={vacio} />;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-suave">
            {columnas.map((c) => (
              <th key={c.clave} className={cx('px-5 py-2.5 font-medium', c.derecha && 'text-right', c.className)}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr
              key={clave ? clave(f, i) : i}
              onClick={alClic ? () => alClic(f) : undefined}
              className={cx('border-b border-borde/70 last:border-0', alClic && 'cursor-pointer hover:bg-marca-50/60')}
            >
              {columnas.map((c) => (
                <td key={c.clave} className={cx('px-5 py-3', c.derecha && 'text-right tabular', c.className)}>
                  {c.celda ? c.celda(f) : String((f as any)[c.clave] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Ventana modal ----------

export function Modal({ abierto, onCerrar, titulo, children, pie, ancho = 'md' }: { abierto: boolean; onCerrar: () => void; titulo: string; children: ReactNode; pie?: ReactNode; ancho?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', esc);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cx(
          'flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-tarjeta shadow-xl animate-entrar sm:rounded-2xl',
          ancho === 'sm' && 'sm:max-w-md',
          ancho === 'md' && 'sm:max-w-xl',
          ancho === 'lg' && 'sm:max-w-3xl',
          ancho === 'xl' && 'sm:max-w-5xl',
        )}
      >
        <div className="flex items-center justify-between border-b border-borde px-5 py-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-suave hover:bg-marca-50 hover:text-texto">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-borde px-5 py-3">{pie}</div>}
      </div>
    </div>
  );
}

// ---------- Avisos (toasts) y confirmaciones ----------

interface Toast {
  id: number;
  tono: 'exito' | 'peligro' | 'info';
  texto: string;
}

interface Confirmacion {
  titulo: string;
  mensaje: ReactNode;
  confirmar?: string;
  peligro?: boolean;
  resolver: (v: boolean) => void;
}

const CtxAvisos = createContext<{
  avisar: (texto: string, tono?: Toast['tono']) => void;
  error: (e: unknown) => void;
  confirmar: (o: Omit<Confirmacion, 'resolver'>) => Promise<boolean>;
}>({ avisar: () => {}, error: () => {}, confirmar: async () => false });

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [conf, setConf] = useState<Confirmacion | null>(null);
  const avisar = useCallback((texto: string, tono: Toast['tono'] = 'exito') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tono, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tono === 'peligro' ? 7000 : 4000);
  }, []);
  const error = useCallback(
    (e: unknown) => {
      if (e instanceof ErrorApi) {
        const extra = e.errores.length ? `: ${e.errores.join('; ')}` : '';
        avisar(e.message + extra, 'peligro');
      } else avisar((e as Error)?.message ?? 'Ocurrió un error', 'peligro');
    },
    [avisar],
  );
  const confirmar = useCallback((o: Omit<Confirmacion, 'resolver'>) => new Promise<boolean>((resolver) => setConf({ ...o, resolver })), []);
  return (
    <CtxAvisos.Provider value={{ avisar, error, confirmar }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex items-start gap-2 rounded-xl px-4 py-3 text-sm text-white shadow-lg animate-entrar', t.tono === 'exito' ? 'bg-exito' : t.tono === 'peligro' ? 'bg-peligro' : 'bg-marca-600')}>
            {t.tono === 'exito' ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> : t.tono === 'peligro' ? <XCircle className="mt-0.5 h-4 w-4 flex-none" /> : <Info className="mt-0.5 h-4 w-4 flex-none" />}
            <span>{t.texto}</span>
          </div>
        ))}
      </div>
      <Modal
        abierto={!!conf}
        onCerrar={() => {
          conf?.resolver(false);
          setConf(null);
        }}
        titulo={conf?.titulo ?? ''}
        ancho="sm"
        pie={
          <>
            <Boton
              variante="secundario"
              onClick={() => {
                conf?.resolver(false);
                setConf(null);
              }}
            >
              Cancelar
            </Boton>
            <Boton
              variante={conf?.peligro ? 'peligro' : 'primario'}
              onClick={() => {
                conf?.resolver(true);
                setConf(null);
              }}
            >
              {conf?.confirmar ?? 'Confirmar'}
            </Boton>
          </>
        }
      >
        <div className="text-[15px] leading-relaxed">{conf?.mensaje}</div>
      </Modal>
    </CtxAvisos.Provider>
  );
}

export const useAvisos = () => useContext(CtxAvisos);

/**
 * Ejecuta una acción de la API. Si el servidor pide confirmación (valor menor al legal,
 * advertencias), pregunta al usuario y la repite con confirmar = true.
 */
export function useAccion() {
  const { avisar, error, confirmar } = useAvisos();
  const [cargando, setCargando] = useState(false);
  const ejecutar = useCallback(
    async <T,>(fn: (confirmado: boolean) => Promise<T>, exito?: string): Promise<T | null> => {
      setCargando(true);
      try {
        const r = await fn(false);
        if (exito) avisar(exito);
        return r;
      } catch (e) {
        if (e instanceof ErrorApi && e.requiereConfirmacion) {
          const ok = await confirmar({ titulo: 'Confirme para continuar', mensaje: e.message, confirmar: 'Sí, continuar' });
          if (!ok) return null;
          try {
            const r = await fn(true);
            if (exito) avisar(exito);
            return r;
          } catch (e2) {
            error(e2);
            return null;
          }
        }
        error(e);
        return null;
      } finally {
        setCargando(false);
      }
    },
    [avisar, error, confirmar],
  );
  return { ejecutar, cargando };
}
