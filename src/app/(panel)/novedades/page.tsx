'use client';

import { FileSpreadsheet, Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ModalEmbargo, ModalNovedadDias, ModalNovedadValor, ModalPrestamo } from '@/components/formularios-novedad';
import { Importador } from '@/components/importador';
import { Boton, Cargando, Encabezado, Entrada, Insignia, Pestanas, Selector, Tabla, Tarjeta, useAccion, useAvisos } from '@/components/ui';
import { borrar, patch, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fecha, hoy, NOMBRE_NOVEDAD, numero, pesos } from '@/lib/formato';

type P = 'novedades' | 'prestamos' | 'embargos' | 'dotacion' | 'saldos';

export default function PaginaNovedades() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

function Contenido() {
  const q = useSearchParams();
  const [p, setP] = useState<P>((q.get('pestana') as P) ?? 'novedades');
  return (
    <>
      <Encabezado titulo="Novedades" descripcion="Todo lo que cambia la nómina de un periodo: incapacidades, licencias, vacaciones, comisiones, préstamos y embargos." />
      <Pestanas<P>
        activa={p}
        onCambio={setP}
        pestanas={[
          { valor: 'novedades', etiqueta: 'Novedades' },
          { valor: 'prestamos', etiqueta: 'Préstamos' },
          { valor: 'embargos', etiqueta: 'Embargos' },
          { valor: 'dotacion', etiqueta: 'Dotación' },
          { valor: 'saldos', etiqueta: 'Saldos iniciales' },
        ]}
      />
      {p === 'novedades' && <Lista />}
      {p === 'prestamos' && <Prestamos />}
      {p === 'embargos' && <Embargos />}
      {p === 'dotacion' && <Dotacion />}
      {p === 'saldos' && <Saldos />}
    </>
  );
}

function Lista() {
  const [desde, setDesde] = useState(`${hoy().slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy().slice(0, 8) + '31');
  const [clase, setClase] = useState('');
  const { datos, recargar, cargando } = useDatos<any[]>(`/novedades?desde=${desde}&hasta=${hasta}${clase ? `&clase=${clase}` : ''}`);
  const [dias, setDias] = useState(false);
  const [valor, setValor] = useState(false);
  const [importar, setImportar] = useState(false);
  const { error, confirmar } = useAvisos();
  return (
    <Tarjeta
      accion={
        <div className="flex flex-wrap gap-2">
          <Boton tamano="sm" variante="secundario" icono={<FileSpreadsheet className="h-4 w-4" />} onClick={() => setImportar(true)}>
            Cargar desde Excel
          </Boton>
          <Boton tamano="sm" variante="secundario" onClick={() => setValor(true)}>
            Pago o descuento
          </Boton>
          <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setDias(true)}>
            Incapacidad, licencia o vacaciones
          </Boton>
        </div>
      }
      titulo="Novedades del periodo"
    >
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Entrada type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Entrada type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <Selector value={clase} onChange={(e) => setClase(e.target.value)} opciones={[{ valor: 'dias', etiqueta: 'Incapacidades, licencias y vacaciones' }, { valor: 'valor', etiqueta: 'Pagos y descuentos' }]} vacio="Todas" />
      </div>
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <Tabla
          filas={datos ?? []}
          vacio="Sin novedades en esas fechas"
          columnas={[
            { clave: 'empleado', titulo: 'Empleado', celda: (n: any) => `${n.nombres} ${n.apellidos}` },
            { clave: 'tipo', titulo: 'Novedad', celda: (n: any) => (n.clase === 'dias' ? NOMBRE_NOVEDAD[n.tipo] : n.tipo.replace(/_/g, ' ').toLowerCase().replace(/^./, (x: string) => x.toUpperCase())) },
            { clave: 'fechas', titulo: 'Fechas', celda: (n: any) => (n.clase === 'dias' ? `${fecha(n.desde)} a ${fecha(n.hasta)}` : fecha(n.fecha)) },
            { clave: 'valor', titulo: 'Valor', derecha: true, celda: (n: any) => (n.valor ? pesos(n.valor) : n.cantidad ? numero(n.cantidad, 1) : n.diasHabiles ? `${n.diasHabiles} días hábiles` : '—') },
            { clave: 'estado', titulo: 'Estado', celda: (n: any) => <Insignia tono={n.estado === 'aprobada' ? 'exito' : n.estado === 'rechazada' ? 'peligro' : 'alerta'}>{n.estado}</Insignia> },
            {
              clave: 'a',
              titulo: '',
              celda: (n: any) => (
                <button
                  className="text-sm text-peligro hover:underline"
                  onClick={async () => {
                    if (await confirmar({ titulo: 'Borrar novedad', mensaje: '¿Seguro? Se quita de la nómina abierta.', peligro: true, confirmar: 'Borrar' })) borrar(`/novedades/${n.id}`).then(recargar).catch(error);
                  }}
                >
                  Borrar
                </button>
              ),
            },
          ]}
        />
      )}
      {dias && <ModalNovedadDias abierto onCerrar={() => setDias(false)} alGuardar={recargar} />}
      {valor && <ModalNovedadValor abierto onCerrar={() => setValor(false)} alGuardar={recargar} />}
      <Importador abierto={importar} onCerrar={() => setImportar(false)} titulo="Cargar novedades desde Excel" tipo="novedades" descripcion="Comisiones, bonificaciones, descuentos u horas digitadas, una por fila." alTerminar={recargar} />
    </Tarjeta>
  );
}

function Prestamos() {
  const { datos, recargar } = useDatos<any[]>('/prestamos');
  const [nuevo, setNuevo] = useState(false);
  const { error } = useAvisos();
  return (
    <Tarjeta titulo="Préstamos y libranzas" subtitulo="La cuota se descuenta en cada nómina hasta terminar el saldo" accion={<Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setNuevo(true)}>Nuevo préstamo</Boton>}>
      <Tabla
        filas={datos ?? []}
        vacio="Sin préstamos"
        columnas={[
          { clave: 'empleado', titulo: 'Empleado', celda: (x: any) => `${x.nombres} ${x.apellidos}` },
          { clave: 'descripcion', titulo: 'Descripción' },
          { clave: 'tipo', titulo: 'Tipo', celda: (x: any) => (x.tipo === 'libranza' ? 'Libranza' : 'Préstamo') },
          { clave: 'cuota', titulo: 'Cuota', derecha: true, celda: (x: any) => pesos(x.cuota) },
          { clave: 'saldo', titulo: 'Saldo', derecha: true, celda: (x: any) => pesos(x.saldo) },
          { clave: 'activo', titulo: 'Estado', celda: (x: any) => (x.activo ? <Insignia tono="marca">Vigente</Insignia> : <Insignia>Terminado</Insignia>) },
          { clave: 'a', titulo: '', celda: (x: any) => x.activo && <button className="text-sm text-suave hover:underline" onClick={() => patch(`/prestamos/${x.id}`, { activo: false }).then(recargar).catch(error)}>Suspender</button> },
        ]}
      />
      {nuevo && <ModalPrestamo abierto onCerrar={() => setNuevo(false)} alGuardar={recargar} />}
    </Tarjeta>
  );
}

function Embargos() {
  const { datos, recargar } = useDatos<any[]>('/embargos');
  const [nuevo, setNuevo] = useState(false);
  const { error } = useAvisos();
  return (
    <Tarjeta titulo="Embargos judiciales" subtitulo="Siempre dentro de los límites del CST arts. 154 a 156" accion={<Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setNuevo(true)}>Nuevo embargo</Boton>}>
      <Tabla
        filas={datos ?? []}
        vacio="Sin embargos"
        columnas={[
          { clave: 'empleado', titulo: 'Empleado', celda: (x: any) => `${x.nombres} ${x.apellidos}` },
          { clave: 'descripcion', titulo: 'Descripción' },
          { clave: 'tipo', titulo: 'Tipo', celda: (x: any) => ({ ordinario: 'Ordinario', alimentos: 'Alimentos', cooperativa: 'Cooperativa' })[x.tipo as string] },
          { clave: 'saldo', titulo: 'Saldo', derecha: true, celda: (x: any) => (x.saldo ? pesos(x.saldo) : 'Sin límite') },
          { clave: 'activo', titulo: 'Estado', celda: (x: any) => (x.activo ? <Insignia tono="marca">Vigente</Insignia> : <Insignia>Terminado</Insignia>) },
          { clave: 'a', titulo: '', celda: (x: any) => x.activo && <button className="text-sm text-suave hover:underline" onClick={() => patch(`/embargos/${x.id}`, { activo: false }).then(recargar).catch(error)}>Levantar</button> },
        ]}
      />
      {nuevo && <ModalEmbargo abierto onCerrar={() => setNuevo(false)} alGuardar={recargar} />}
    </Tarjeta>
  );
}

function Dotacion() {
  const anio = hoy().slice(0, 4);
  const fechas = [`${anio}-04-30`, `${anio}-08-31`, `${anio}-12-20`];
  const proxima = fechas.find((f) => f >= hoy()) ?? fechas[2];
  const [f, setF] = useState(proxima);
  const { datos, recargar, cargando } = useDatos<any[]>(`/novedades/dotacion?fecha=${f}`);
  const { ejecutar } = useAccion();
  return (
    <Tarjeta titulo="Entrega de dotación" subtitulo="Para quien gana hasta 2 salarios mínimos y lleva más de 3 meses (CST art. 230)">
      <div className="mb-4 max-w-xs">
        <Selector value={f} onChange={(e) => setF(e.target.value)} opciones={fechas.map((x) => ({ valor: x, etiqueta: `Entrega del ${fecha(x)}` }))} />
      </div>
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <Tabla
          filas={datos ?? []}
          vacio="Nadie tiene derecho a dotación en esa fecha"
          columnas={[
            { clave: 'empleado', titulo: 'Empleado' },
            { clave: 'salario', titulo: 'Salario', derecha: true, celda: (x: any) => pesos(x.salario) },
            { clave: 'entregado', titulo: 'Entrega', celda: (x: any) => (x.entregadoEn ? <Insignia tono="exito">Entregada el {fecha(x.entregadoEn)}</Insignia> : <Insignia tono="alerta">Pendiente</Insignia>) },
            {
              clave: 'a',
              titulo: '',
              celda: (x: any) =>
                !x.entregadoEn && (
                  <button
                    className="text-sm text-marca-600 hover:underline"
                    onClick={async () => {
                      if (await ejecutar(() => post('/novedades/dotacion', { empleadoId: x.empleadoId, fechaProgramada: f, entregadoEn: hoy(), elementos: 'Un par de zapatos y un vestido de labor', confirmado: true }), 'Entrega registrada')) recargar();
                    }}
                  >
                    Registrar entrega
                  </button>
                ),
            },
          ]}
        />
      )}
    </Tarjeta>
  );
}

function Saldos() {
  const [abierto, setAbierto] = useState(false);
  return (
    <Tarjeta titulo="Saldos iniciales" subtitulo="Para empresas que empiezan a usar Jornal 360 a mitad de año">
      <p className="max-w-2xl text-[15px] text-suave">
        Cargue los días de vacaciones pendientes, los ingresos y retenciones del año y los pagos variables de los últimos meses. Así la retención, los promedios y el certificado anual salen completos desde el primer mes.
      </p>
      <Boton className="mt-4" icono={<FileSpreadsheet className="h-4 w-4" />} onClick={() => setAbierto(true)}>
        Cargar saldos desde Excel
      </Boton>
      <Importador abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Cargar saldos iniciales" tipo="saldos" descripcion="La plantilla trae una hoja que explica cada tipo de saldo." />
    </Tarjeta>
  );
}
