'use client';

import { Bell, BookOpen, Calculator, CalendarClock, ClipboardList, FileBarChart, Gift, HelpCircle, Home, LogOut, Menu, Moon, Search, Settings, Sun, UserMinus, Users, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { get, post } from '@/lib/api';
import { fechaHora } from '@/lib/formato';
import { useSesion } from '@/lib/sesion';
import { Logo } from './logo';
import { cx, Modal } from './ui';

const NAV = [
  { href: '/inicio', etiqueta: 'Inicio', icono: Home },
  { href: '/empleados', etiqueta: 'Empleados', icono: Users },
  { href: '/asistencia', etiqueta: 'Asistencia', icono: CalendarClock },
  { href: '/novedades', etiqueta: 'Novedades', icono: ClipboardList },
  { href: '/nomina', etiqueta: 'Nómina', icono: Wallet },
  { href: '/prestaciones', etiqueta: 'Prestaciones', icono: Gift },
  { href: '/retiros', etiqueta: 'Retiros', icono: UserMinus },
  { href: '/reportes', etiqueta: 'Reportes', icono: FileBarChart },
];

/** Herramientas aparte: no usan ni modifican los datos de la empresa. */
const HERRAMIENTAS = [{ href: '/liquidador', etiqueta: 'Liquidador Express', icono: Calculator }];

const ABAJO = [
  { href: '/configuracion', etiqueta: 'Configuración', icono: Settings },
  { href: '/ayuda', etiqueta: 'Ayuda', icono: HelpCircle },
];

export function useTema(): [boolean, () => void] {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => setOscuro(document.documentElement.classList.contains('dark')), []);
  const cambiar = () => {
    const v = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', v);
    try {
      localStorage.setItem('jornal360.tema', v ? 'oscuro' : 'claro');
    } catch {
      /* sin almacenamiento */
    }
    setOscuro(v);
  };
  return [oscuro, cambiar];
}

function ElementoNav({ href, etiqueta, icono: Icono, onClick }: { href: string; etiqueta: string; icono: any; onClick?: () => void }) {
  const ruta = usePathname();
  const activo = href === '/' ? ruta === '/' : ruta.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={activo ? 'page' : undefined}
      className={cx(
        'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition',
        activo ? 'bg-marca-50 font-medium text-marca-700' : 'text-suave hover:bg-marca-50/60 hover:text-texto',
      )}
    >
      {activo && <span className="absolute -right-3 top-2 bottom-2 w-1 rounded-l-full bg-marca-500" />}
      <Icono className="h-[18px] w-[18px]" />
      {etiqueta}
    </Link>
  );
}

function Barra({ onNavegar }: { onNavegar?: () => void }) {
  const { salir } = useSesion();
  return (
    <div className="flex h-full flex-col px-3 py-5">
      <Link href="/inicio" className="mb-8 px-3" onClick={onNavegar}>
        <Logo />
      </Link>
      <nav className="flex flex-col gap-1" aria-label="Principal">
        {NAV.map((n) => (
          <ElementoNav key={n.href} {...n} onClick={onNavegar} />
        ))}
      </nav>
      <nav className="mt-6 flex flex-col gap-1 border-t border-borde pt-4" aria-label="Herramientas">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-suave">Herramientas</p>
        {HERRAMIENTAS.map((n) => (
          <ElementoNav key={n.href} {...n} onClick={onNavegar} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 pt-6">
        {ABAJO.map((n) => (
          <ElementoNav key={n.href} {...n} onClick={onNavegar} />
        ))}
        <button onClick={salir} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-suave hover:bg-marca-50/60 hover:text-texto">
          <LogOut className="h-[18px] w-[18px]" />
          Salir
        </button>
      </div>
    </div>
  );
}

function Notificaciones() {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<any[]>([]);
  const cargar = () => get<any[]>('/notificaciones').then(setLista).catch(() => {});
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 5 * 60000);
    return () => clearInterval(t);
  }, []);
  const sinLeer = lista.filter((n) => !n.leida).length;
  return (
    <div className="relative">
      <button onClick={() => setAbierto((a) => !a)} className="relative rounded-xl p-2 text-suave hover:bg-marca-50 hover:text-texto" aria-label={`Avisos${sinLeer ? `: ${sinLeer} sin leer` : ''}`}>
        <Bell className="h-5 w-5" />
        {sinLeer > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-peligro px-1 text-[10px] font-semibold text-white">{sinLeer}</span>}
      </button>
      {abierto && (
        <div className="absolute right-0 top-11 z-40 w-[min(92vw,380px)] rounded-2xl border border-borde bg-tarjeta p-2 shadow-xl animate-entrar">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="font-semibold">Avisos</p>
            {sinLeer > 0 && (
              <button className="text-sm text-marca-600 hover:underline" onClick={() => post('/notificaciones/leer', {}).then(cargar)}>
                Marcar todo como leído
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {lista.length === 0 && <p className="px-2 py-6 text-center text-sm text-suave">No hay avisos</p>}
            {lista.map((n) => (
              <Link
                key={n.id}
                href={n.enlace ?? '/inicio'}
                onClick={() => {
                  setAbierto(false);
                  if (!n.leida) post('/notificaciones/leer', { ids: [n.id] }).then(cargar);
                }}
                className={cx('block rounded-xl px-3 py-2.5 hover:bg-marca-50', !n.leida && 'bg-marca-50/50')}
              >
                <p className={cx('text-sm', !n.leida && 'font-medium')}>{n.titulo}</p>
                <p className="text-xs text-suave">{n.mensaje}</p>
                <p className="mt-0.5 text-[11px] text-suave">{fechaHora(n.creadoEn)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Buscador rápido Ctrl + K: empleados y páginas. */
function BuscadorRapido({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [q, setQ] = useState('');
  const [empleados, setEmpleados] = useState<any[]>([]);
  const router = useRouter();
  useEffect(() => {
    if (!abierto) return;
    setQ('');
  }, [abierto]);
  useEffect(() => {
    if (!abierto || q.trim().length < 2) return setEmpleados([]);
    const t = setTimeout(() => get<any[]>(`/empleados?buscar=${encodeURIComponent(q.trim())}`).then((l) => setEmpleados(l.slice(0, 6))).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q, abierto]);
  const paginas = useMemo(
    () =>
      [
        ...NAV,
        ...HERRAMIENTAS,
        ...ABAJO,
        { href: '/configuracion?seccion=calendario', etiqueta: 'Días laborales y calendario' },
        { href: '/configuracion?seccion=parametros', etiqueta: 'Salario mínimo, recargos y parámetros' },
        { href: '/configuracion?seccion=conceptos', etiqueta: 'Conceptos y fórmulas' },
        { href: '/configuracion?seccion=calendario', etiqueta: 'Festivos' },
        { href: '/asistencia?pestana=horas', etiqueta: 'Horas extra por aprobar' },
        { href: '/asistencia?pestana=qr', etiqueta: 'Pantalla del código QR' },
        { href: '/empleados/nuevo', etiqueta: 'Crear empleado' },
      ].filter((p) => !q || p.etiqueta.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))),
    [q],
  );
  const ir = (href: string) => {
    onCerrar();
    router.push(href);
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Buscar">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (empleados[0]) ir(`/empleados/${empleados[0].id}`);
            else if (paginas[0]) ir(paginas[0].href);
          }
        }}
        placeholder="Nombre o cédula de un empleado, o una sección…"
        className="h-11 w-full rounded-xl border border-borde bg-fondo px-3 focus:outline-none focus:ring-2 focus:ring-marca-500/40"
      />
      <div className="mt-3 space-y-1">
        {empleados.map((e) => (
          <button key={e.id} onClick={() => ir(`/empleados/${e.id}`)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-marca-50">
            <span>
              {e.nombres} {e.apellidos}
            </span>
            <span className="text-sm text-suave">{e.numeroDocumento}</span>
          </button>
        ))}
        {paginas.slice(0, 8).map((p) => (
          <button key={p.href} onClick={() => ir(p.href)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-suave hover:bg-marca-50 hover:text-texto">
            <BookOpen className="h-4 w-4" /> {p.etiqueta}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { usuario, salir } = useSesion();
  const [menu, setMenu] = useState(false);
  const [buscar, setBuscar] = useState(false);
  const [oscuro, cambiarTema] = useTema();
  const ruta = usePathname();
  useEffect(() => setMenu(false), [ruta]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscar(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen bg-tarjeta">
        <aside className="sticky top-0 hidden h-screen w-60 flex-none overflow-y-auto border-r border-borde lg:block">
          <Barra />
        </aside>
        {menu && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenu(false)}>
            <aside className="h-full w-72 bg-tarjeta animate-entrar" onClick={(e) => e.stopPropagation()}>
              <button className="absolute right-3 top-4 p-2" onClick={() => setMenu(false)} aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </button>
              <Barra onNavegar={() => setMenu(false)} />
            </aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col bg-fondo/60">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-borde bg-tarjeta/90 px-4 backdrop-blur sm:px-6">
            <button className="rounded-xl p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-texto text-sm font-bold text-tarjeta">{(usuario?.razonSocial ?? 'J').slice(0, 1)}</span>
              <span className="truncate text-sm font-semibold">{usuario?.razonSocial ?? '…'}</span>
            </div>
            <button onClick={() => setBuscar(true)} className="ml-auto hidden h-9 w-72 flex-none items-center gap-2 whitespace-nowrap rounded-xl border border-borde bg-fondo px-3 text-sm text-suave hover:border-marca-500/50 md:flex">
              <Search className="h-4 w-4" /> Buscar empleado o sección
              <kbd className="ml-auto whitespace-nowrap rounded border border-borde px-1.5 text-[11px]">Ctrl K</kbd>
            </button>
            <button onClick={() => setBuscar(true)} className="ml-auto rounded-xl p-2 text-suave md:hidden" aria-label="Buscar">
              <Search className="h-5 w-5" />
            </button>
            <button onClick={cambiarTema} className="rounded-xl p-2 text-suave hover:bg-marca-50 hover:text-texto" aria-label={oscuro ? 'Usar tema claro' : 'Usar tema oscuro'}>
              {oscuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Notificaciones />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destacado text-sm font-semibold text-white">{(usuario?.nombre ?? 'S').slice(0, 1)}</span>
              <span className="text-sm font-medium">{usuario?.nombre}</span>
            </div>
          </header>
          {usuario?.soporte && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-alerta/40 bg-alerta/10 px-4 py-2 text-sm sm:px-6">
              <span>
                Modo soporte de la plataforma en el espacio <b>{usuario.espacio}</b>. Lo que haga queda en la auditoría a su nombre.
              </span>
              <button onClick={salir} className="font-medium text-marca-600 hover:underline">
                Volver al panel de la plataforma
              </button>
            </div>
          )}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      <BuscadorRapido abierto={buscar} onCerrar={() => setBuscar(false)} />
    </div>
  );
}
