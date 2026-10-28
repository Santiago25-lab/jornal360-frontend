'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { CONTRATO_VACIO, FormularioContrato, limpiarContrato } from '@/components/formulario-contrato';
import { EMPLEADO_VACIO, FormularioEmpleado, limpiarEmpleado } from '@/components/formulario-empleado';
import { Boton, Encabezado, Tarjeta, useAccion, useAvisos } from '@/components/ui';
import { post } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';

export default function NuevoEmpleado() {
  const router = useRouter();
  const [d, setD] = useState<Record<string, any>>({ ...EMPLEADO_VACIO });
  const [c, setC] = useState<Record<string, any>>({ ...CONTRATO_VACIO });
  const { ejecutar, cargando } = useAccion();
  const { avisar, error } = useAvisos();
  const cat = useCatalogos();

  // Si la empresa tiene una sola opción, se preselecciona para no dejar al empleado por fuera de la nómina.
  const clave = [cat.grupos, cat.sedes, cat.turnos, cat.centros].map((l) => l.map((o) => o.valor).join(',')).join('|');
  useEffect(() => {
    if (!clave.replace(/\|/g, '')) return;
    setD((x) => ({
      ...x,
      grupoPagoId: x.grupoPagoId || cat.grupos[0]?.valor || '',
      sedeId: x.sedeId || (cat.sedes.length === 1 ? cat.sedes[0].valor : ''),
      turnoId: x.turnoId || (cat.turnos.length === 1 ? cat.turnos[0].valor : ''),
      centroCostoId: x.centroCostoId || (cat.centros.length === 1 ? cat.centros[0].valor : ''),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!c.fechaInicio) return error(new Error('Escriba la fecha de inicio del contrato'));
    let empleado: any;
    try {
      empleado = await post('/empleados', limpiarEmpleado({ ...d, cargo: d.cargo || c.cargo }));
    } catch (err) {
      return error(err);
    }
    const r = await ejecutar((confirmar) => post(`/empleados/${empleado.id}/contratos`, { ...limpiarContrato(c), cargo: c.cargo || d.cargo || null, confirmar }));
    if (r) avisar('Empleado y contrato creados');
    else avisar('El empleado se creó, pero falta el contrato. Agréguelo en su ficha', 'info');
    router.push(`/empleados/${empleado.id}`);
  };

  return (
    <form onSubmit={guardar} className="mx-auto max-w-5xl">
      <Link href="/empleados" className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
        <ArrowLeft className="h-4 w-4" /> Empleados
      </Link>
      <Encabezado titulo="Crear empleado" descripcion="Solo son obligatorios el documento, los nombres, los apellidos y la fecha de inicio del contrato." />
      <div className="space-y-6">
        <FormularioEmpleado d={d} set={(k, v) => setD((x) => ({ ...x, [k]: v }))} nuevo />
        <Tarjeta titulo="Contrato">
          <FormularioContrato c={c} set={(k, v) => setC((x) => ({ ...x, [k]: v }))} />
        </Tarjeta>
      </div>
      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-borde bg-fondo/90 py-4 backdrop-blur">
        <Link href="/empleados">
          <Boton type="button" variante="secundario">
            Cancelar
          </Boton>
        </Link>
        <Boton type="submit" cargando={cargando} tamano="lg">
          Guardar empleado
        </Boton>
      </div>
    </form>
  );
}

