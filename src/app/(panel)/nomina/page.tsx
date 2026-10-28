'use client';

import { Plus, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Modal, Selector, Tabla, Tarjeta, useAccion, Vacio } from '@/components/ui';
import { get, post } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';
import { useDatos } from '@/lib/datos';
import { fecha, NOMBRE_ESTADO_PERIODO, pesos, TONO_ESTADO } from '@/lib/formato';


const TIPO: Record<string, string> = { nomina: 'Nómina', prima: 'Prima', cesantias: 'Cesantías', intereses: 'Intereses', vacaciones: 'Vacaciones', retiro: 'Retiro' };

export default function PaginaNomina() {
  const router = useRouter();
  const { datos, cargando } = useDatos<any[]>('/periodos');
  const cat = useCatalogos();
  const [nuevo, setNuevo] = useState<any>(null);
  const { ejecutar, cargando: creando } = useAccion();

  const abrir = async () => {
    const grupo = cat.grupos[0]?.valor;
    if (!grupo) return setNuevo({ grupoPagoId: '', desde: '', hasta: '', nombre: '' });
    setNuevo(await get(`/periodos/sugerir/${grupo}`));
  };
  useEffect(() => {
    if (nuevo?.grupoPagoId && nuevo._cambioGrupo) get(`/periodos/sugerir/${nuevo.grupoPagoId}`).then(setNuevo);
  }, [nuevo?.grupoPagoId, nuevo?._cambioGrupo]);

  return (
    <>
      <Encabezado
        titulo="Nómina"
        descripcion="Abra un periodo, liquídelo con un clic, revise el paso a paso, apruébelo y ciérrelo."
        acciones={
          <Boton icono={<Plus className="h-4 w-4" />} onClick={abrir}>
            Nuevo periodo
          </Boton>
        }
      />
      <Tarjeta>
        {cargando && !datos ? (
          <Cargando />
        ) : (datos ?? []).length === 0 ? (
          <Vacio icono={<Wallet className="h-8 w-8" />} titulo="Aún no hay periodos de nómina" descripcion="Cree el primero: el sistema le propone las fechas según el grupo de pago." accion={<Boton onClick={abrir}>Crear el primer periodo</Boton>} />
        ) : (
          <Tabla
            filas={datos ?? []}
            alClic={(p) => router.push(`/nomina/${p.id}`)}
            clave={(p) => p.id}
            columnas={[
              { clave: 'nombre', titulo: 'Periodo', celda: (p: any) => <span className="font-medium">{p.nombre}</span> },
              { clave: 'tipo', titulo: 'Tipo', celda: (p: any) => TIPO[p.tipo] },
              { clave: 'fechas', titulo: 'Fechas', celda: (p: any) => `${fecha(p.desde)} a ${fecha(p.hasta)}` },
              { clave: 'empleados', titulo: 'Empleados', derecha: true },
              { clave: 'neto', titulo: 'Neto', derecha: true, celda: (p: any) => pesos(p.totalNeto) },
              { clave: 'costo', titulo: 'Costo total', derecha: true, celda: (p: any) => pesos(p.totalCosto) },
              { clave: 'estado', titulo: 'Estado', celda: (p: any) => <Insignia tono={TONO_ESTADO[p.estado]}>{NOMBRE_ESTADO_PERIODO[p.estado]}</Insignia> },
            ]}
          />
        )}
      </Tarjeta>
      <Modal
        abierto={!!nuevo}
        onCerrar={() => setNuevo(null)}
        titulo="Nuevo periodo de nómina"
        pie={
          <Boton
            cargando={creando}
            onClick={async () => {
              const r: any = await ejecutar(() => post('/periodos', { grupoPagoId: nuevo.grupoPagoId, desde: nuevo.desde, hasta: nuevo.hasta, fechaPago: nuevo.fechaPago || null, nombre: nuevo.nombre }), 'Periodo creado');
              if (r) router.push(`/nomina/${r.id}`);
            }}
          >
            Crear periodo
          </Boton>
        }
      >
        {nuevo && (
          <div className="space-y-4">
            <Campo etiqueta="Grupo de pago">
              <Selector value={nuevo.grupoPagoId} onChange={(e) => setNuevo({ ...nuevo, grupoPagoId: e.target.value, _cambioGrupo: Date.now() })} opciones={cat.grupos} vacio="Elija…" />
            </Campo>
            <Campo etiqueta="Nombre">
              <Entrada value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
            </Campo>
            <div className="grid gap-4 md:grid-cols-3">
              <Campo etiqueta="Desde">
                <Entrada type="date" value={nuevo.desde} onChange={(e) => setNuevo({ ...nuevo, desde: e.target.value })} />
              </Campo>
              <Campo etiqueta="Hasta">
                <Entrada type="date" value={nuevo.hasta} onChange={(e) => setNuevo({ ...nuevo, hasta: e.target.value })} />
              </Campo>
              <Campo etiqueta="Fecha de pago">
                <Entrada type="date" value={nuevo.fechaPago ?? ''} onChange={(e) => setNuevo({ ...nuevo, fechaPago: e.target.value })} />
              </Campo>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
