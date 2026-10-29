'use client';

import { Calculator, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso, Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Interruptor, Modal, Opciones, Tabla, Tarjeta, useAccion, useAvisos, Vacio } from '@/components/ui';
import { post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fecha, hoy, pesos } from '@/lib/formato';
import { ADVERTENCIA_REGLAS, NOMBRE_REGIMEN, NOMBRE_TIPO_LIQUIDACION, TIPOS_LIQUIDACION } from '@/lib/liquidador';

const TIPOS = TIPOS_LIQUIDACION;
const NOMBRE_TIPO = NOMBRE_TIPO_LIQUIDACION;
const REGIMEN = NOMBRE_REGIMEN;

/** Fechas que se proponen según el tipo de liquidación. */
function fechasDe(tipo: string): { desde: string; hasta: string } {
  const h = hoy();
  const anio = h.slice(0, 4);
  const mes = h.slice(0, 7);
  const finMes = new Date(Date.UTC(Number(anio), Number(h.slice(5, 7)), 0)).toISOString().slice(0, 10);
  if (tipo === 'prima') return Number(h.slice(5, 7)) <= 6 ? { desde: `${anio}-01-01`, hasta: `${anio}-06-30` } : { desde: `${anio}-07-01`, hasta: `${anio}-12-31` };
  if (tipo === 'cesantias') return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
  return { desde: `${mes}-01`, hasta: finMes };
}

export default function PaginaLiquidador() {
  const router = useRouter();
  const { datos, cargando } = useDatos<any[]>('/liquidador');
  const [nuevo, setNuevo] = useState<any>(null);
  const { ejecutar, cargando: creando } = useAccion();
  const { confirmar } = useAvisos();

  const abrir = () => setNuevo({ nombre: '', clienteRazonSocial: '', clienteNit: '', tipo: 'nomina', regimen: '', exonerada: true, clasePrima: 'servicios', ...fechasDe('nomina') });
  const elegirRegimen = async (regimen: string) => {
    await confirmar({ titulo: REGIMEN[regimen], mensaje: ADVERTENCIA_REGLAS, confirmar: 'Entendido' });
    setNuevo((n: any) => ({ ...n, regimen }));
  };
  const crear = async () => {
    const r: any = await ejecutar(
      () =>
        post('/liquidador', {
          nombre: nuevo.nombre,
          clienteRazonSocial: nuevo.clienteRazonSocial || null,
          clienteNit: nuevo.clienteNit || null,
          tipo: nuevo.tipo,
          regimen: nuevo.regimen,
          desde: nuevo.desde,
          hasta: nuevo.hasta,
          exonerada: nuevo.exonerada,
          opciones: nuevo.tipo === 'prima' && nuevo.regimen === 'publico' ? { clasePrima: nuevo.clasePrima } : {},
        }),
      'Liquidación creada',
    );
    if (r) router.push(`/liquidador/${r.id}`);
  };

  return (
    <>
      <Encabezado
        titulo="Liquidador Express"
        descripcion="Liquide nóminas, primas, cesantías, vacaciones o retiros con los datos que digite o cargue de Excel. Es aparte: no usa ni cambia los empleados, la nómina ni la configuración de la empresa."
        acciones={
          <Boton icono={<Plus className="h-4 w-4" />} onClick={abrir}>
            Nueva liquidación
          </Boton>
        }
      />
      <Tarjeta>
        {cargando && !datos ? (
          <Cargando />
        ) : (datos ?? []).length === 0 ? (
          <Vacio icono={<Calculator className="h-8 w-8" />} titulo="Aún no hay liquidaciones" descripcion="Ideal para contadores: liquide la nómina de un cliente sin configurar empleados ni asistencia." accion={<Boton onClick={abrir}>Crear la primera</Boton>} />
        ) : (
          <Tabla
            filas={datos ?? []}
            clave={(l: any) => l.id}
            alClic={(l) => router.push(`/liquidador/${l.id}`)}
            columnas={[
              {
                clave: 'nombre',
                titulo: 'Liquidación',
                celda: (l: any) => (
                  <div>
                    <p className="font-medium">{l.nombre}</p>
                    {l.clienteRazonSocial && <p className="text-sm text-suave">{l.clienteRazonSocial}</p>}
                  </div>
                ),
              },
              { clave: 'tipo', titulo: 'Tipo', celda: (l: any) => NOMBRE_TIPO[l.tipo] },
              { clave: 'regimen', titulo: 'Reglas', celda: (l: any) => REGIMEN[l.regimen] },
              { clave: 'fechas', titulo: 'Periodo', celda: (l: any) => `${fecha(l.desde)} a ${fecha(l.hasta)}` },
              { clave: 'empleados', titulo: 'Personas', derecha: true },
              { clave: 'neto', titulo: 'Neto', derecha: true, celda: (l: any) => (l.totales ? pesos(l.totales.neto) : '—') },
              { clave: 'estado', titulo: 'Estado', celda: (l: any) => (l.estado === 'liquidada' ? <Insignia tono="exito">Liquidada</Insignia> : <Insignia>Borrador</Insignia>) },
            ]}
          />
        )}
      </Tarjeta>

      <Modal
        abierto={!!nuevo}
        onCerrar={() => setNuevo(null)}
        titulo="Nueva liquidación"
        ancho="lg"
        pie={
          <Boton cargando={creando} disabled={!nuevo?.regimen || !nuevo?.nombre} onClick={crear}>
            Crear y agregar personas
          </Boton>
        }
      >
        {nuevo && (
          <div className="space-y-5">
            <Campo etiqueta="Nombre de la liquidación" ayuda="Para encontrarla después. Ejemplo: Nómina octubre · Ferretería El Sol">
              <Entrada value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} autoFocus />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Empresa o cliente" opcional ayuda="Sale como encabezado en los desprendibles. Vacío: el nombre de su empresa">
                <Entrada value={nuevo.clienteRazonSocial} onChange={(e) => setNuevo({ ...nuevo, clienteRazonSocial: e.target.value })} />
              </Campo>
              <Campo etiqueta="NIT del cliente" opcional>
                <Entrada value={nuevo.clienteNit} inputMode="numeric" onChange={(e) => setNuevo({ ...nuevo, clienteNit: e.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="¿Qué va a liquidar?">
              <Opciones opciones={TIPOS} valor={nuevo.tipo} onCambio={(tipo: string) => setNuevo({ ...nuevo, tipo, ...fechasDe(tipo) })} />
            </Campo>
            <Campo etiqueta="¿Con qué reglas?">
              <Opciones
                opciones={[
                  { valor: 'privado', etiqueta: 'Sector privado', descripcion: 'Código Sustantivo del Trabajo' },
                  { valor: 'publico', etiqueta: 'Sector público', descripcion: 'Alcaldías, gobernaciones (Decretos 1042 y 1045)' },
                ]}
                valor={nuevo.regimen}
                onCambio={elegirRegimen}
              />
            </Campo>
            {nuevo.regimen && <Aviso tono="alerta">{ADVERTENCIA_REGLAS}</Aviso>}
            {nuevo.tipo === 'prima' && nuevo.regimen === 'publico' && (
              <Campo etiqueta="¿Qué prima?">
                <Opciones
                  opciones={[
                    { valor: 'servicios', etiqueta: 'Prima de servicios', descripcion: '15 días por año' },
                    { valor: 'navidad', etiqueta: 'Prima de navidad', descripcion: '30 días por año' },
                  ]}
                  valor={nuevo.clasePrima}
                  onCambio={(clasePrima: string) => setNuevo({ ...nuevo, clasePrima })}
                />
              </Campo>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Desde">
                <Entrada type="date" value={nuevo.desde} onChange={(e) => setNuevo({ ...nuevo, desde: e.target.value })} />
              </Campo>
              <Campo etiqueta="Hasta">
                <Entrada type="date" value={nuevo.hasta} onChange={(e) => setNuevo({ ...nuevo, hasta: e.target.value })} />
              </Campo>
            </div>
            {nuevo.regimen === 'privado' && nuevo.tipo === 'nomina' && (
              <Interruptor
                activo={nuevo.exonerada}
                onCambio={(exonerada) => setNuevo({ ...nuevo, exonerada })}
                etiqueta="Exonerada de salud, SENA e ICBF"
                descripcion="Personas jurídicas que declaran renta, por empleados que ganan menos de 10 salarios mínimos (Estatuto Tributario art. 114-1)"
              />
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
