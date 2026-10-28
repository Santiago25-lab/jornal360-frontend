'use client';

import { FileSpreadsheet, Smartphone, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Importador } from '@/components/importador';
import { Boton, Buscador, Cargando, Encabezado, Insignia, Selector, Tabla, Tarjeta } from '@/components/ui';
import { useCatalogos } from '@/lib/catalogos';
import { useDatos } from '@/lib/datos';
import { fecha, NOMBRE_CONTRATO, pesos } from '@/lib/formato';

function Lista() {
  const router = useRouter();
  const q = useSearchParams();
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('activo');
  const [sede, setSede] = useState('');
  const [centro, setCentro] = useState('');
  const [importar, setImportar] = useState(q.get('importar') === '1');
  const [ruta, setRuta] = useState('/empleados?estado=activo');
  const cat = useCatalogos();
  const porVencer = q.get('filtro') === 'por-vencer';
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (buscar) p.set('buscar', buscar);
      if (estado) p.set('estado', estado);
      if (sede) p.set('sedeId', sede);
      if (centro) p.set('centroCostoId', centro);
      setRuta(`/empleados?${p}`);
    }, 250);
    return () => clearTimeout(t);
  }, [buscar, estado, sede, centro]);
  const { datos, cargando, recargar } = useDatos<any[]>(porVencer ? null : ruta);
  const vencer = useDatos<any[]>(porVencer ? '/empleados/contratos-por-vencer' : null);

  return (
    <>
      <Encabezado
        titulo="Empleados"
        descripcion="Datos personales, contratos, salarios y afiliaciones."
        acciones={
          <>
            <Boton variante="secundario" icono={<FileSpreadsheet className="h-4 w-4" />} onClick={() => setImportar(true)}>
              Cargar desde Excel
            </Boton>
            <Link href="/empleados/nuevo">
              <Boton icono={<UserPlus className="h-4 w-4" />}>Crear empleado</Boton>
            </Link>
          </>
        }
      />
      {porVencer ? (
        <Tarjeta titulo="Contratos por vencer" accion={<Link href="/empleados" className="text-sm text-marca-600 hover:underline">Ver todos los empleados</Link>}>
          {vencer.cargando ? (
            <Cargando />
          ) : (
            <Tabla
              filas={vencer.datos ?? []}
              alClic={(f) => router.push(`/empleados/${f.empleadoId}`)}
              columnas={[
                { clave: 'empleado', titulo: 'Empleado' },
                { clave: 'tipo', titulo: 'Contrato', celda: (f) => NOMBRE_CONTRATO[f.tipo] },
                { clave: 'fechaFin', titulo: 'Vence', celda: (f) => fecha(f.fechaFin) },
                { clave: 'dias', titulo: 'Faltan', celda: (f) => <Insignia tono={f.diasRestantes <= 30 ? 'peligro' : 'alerta'}>{f.diasRestantes} días</Insignia> },
                { clave: 'limite', titulo: '', celda: (f) => (f.superaLimiteConProrroga ? <Insignia tono="peligro">Superaría 4 años con la prórroga</Insignia> : null) },
              ]}
            />
          )}
        </Tarjeta>
      ) : (
        <Tarjeta>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Buscador valor={buscar} onCambio={setBuscar} placeholder="Nombre, cédula o cargo" className="md:col-span-2" />
            <Selector value={estado} onChange={(e) => setEstado(e.target.value)} opciones={[{ valor: 'activo', etiqueta: 'Activos' }, { valor: 'retirado', etiqueta: 'Retirados' }]} vacio="Todos" />
            <Selector value={sede} onChange={(e) => setSede(e.target.value)} opciones={cat.sedes} vacio="Todas las sedes" />
            {cat.centros.length > 1 && <Selector value={centro} onChange={(e) => setCentro(e.target.value)} opciones={cat.centros} vacio="Todos los centros de costo" />}
          </div>
          {cargando && !datos ? (
            <Cargando />
          ) : (
            <Tabla
              filas={datos ?? []}
              vacio="No hay empleados con esos filtros"
              alClic={(f) => router.push(`/empleados/${f.id}`)}
              clave={(f) => f.id}
              columnas={[
                {
                  clave: 'nombre',
                  titulo: 'Empleado',
                  celda: (f) => (
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-marca-50 text-sm font-semibold text-marca-700">
                        {f.nombres[0]}
                        {f.apellidos[0]}
                      </span>
                      <span>
                        <span className="block font-medium">
                          {f.nombres} {f.apellidos}
                        </span>
                        <span className="block text-xs text-suave">
                          {f.tipoDocumento} {f.numeroDocumento}
                        </span>
                      </span>
                    </div>
                  ),
                },
                { clave: 'cargo', titulo: 'Cargo', celda: (f) => f.cargo ?? '—' },
                { clave: 'contrato', titulo: 'Contrato', celda: (f) => (f.tipoContrato ? NOMBRE_CONTRATO[f.tipoContrato] : <Insignia tono="alerta">Sin contrato</Insignia>) },
                { clave: 'salario', titulo: 'Salario', derecha: true, celda: (f) => pesos(f.salario) },
                { clave: 'sede', titulo: 'Sede', celda: (f) => f.sede ?? '—' },
                {
                  clave: 'asistencia',
                  titulo: 'Marca con',
                  celda: (f) => (f.marcaEnKiosco ? <Insignia tono="marca">Kiosco</Insignia> : f.celularVinculado ? <Insignia tono="exito"><Smartphone className="h-3 w-3" /> Celular</Insignia> : <Insignia>Sin vincular</Insignia>),
                },
                { clave: 'estado', titulo: 'Estado', celda: (f) => (f.estado === 'activo' ? <Insignia tono="exito">Activo</Insignia> : <Insignia>Retirado</Insignia>) },
              ]}
            />
          )}
          <p className="mt-3 text-sm text-suave">{datos?.length ?? 0} empleados</p>
        </Tarjeta>
      )}
      <Importador
        abierto={importar}
        onCerrar={() => setImportar(false)}
        titulo="Cargar empleados desde Excel"
        tipo="empleados"
        descripcion="Descargue la plantilla, llénela con sus empleados (uno por fila) y súbala. El sistema revisa cada fila antes de guardar."
        alTerminar={recargar}
      />
    </>
  );
}

export default function PaginaEmpleados() {
  return (
    <Suspense>
      <Lista />
    </Suspense>
  );
}
