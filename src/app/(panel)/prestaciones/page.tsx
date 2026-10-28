'use client';

import { Gift, Landmark, PiggyBank } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso, Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Modal, Opciones, Tabla, Tarjeta, useAccion } from '@/components/ui';
import { get, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fecha, hoy, NOMBRE_ESTADO_PERIODO, pesos, TONO_ESTADO } from '@/lib/formato';

export default function PaginaPrestaciones() {
  const router = useRouter();
  const anioActual = Number(hoy().slice(0, 4));
  const mes = Number(hoy().slice(5, 7));
  const { datos: periodos, cargando, recargar } = useDatos<any[]>('/periodos');
  const [anioPrima, setAnioPrima] = useState(anioActual);
  const [semestre, setSemestre] = useState<1 | 2>(mes <= 6 ? 1 : 2);
  const [anioCes, setAnioCes] = useState(mes === 1 ? anioActual - 1 : anioActual);
  const [fondos, setFondos] = useState<any[] | null>(null);
  const { ejecutar, cargando: trabajando } = useAccion();

  const lista = (periodos ?? []).filter((p) => p.tipo === 'prima' || p.tipo === 'cesantias');

  const liquidarPrima = async () => {
    const r: any = await ejecutar(() => post('/prestaciones/prima', { anio: anioPrima, semestre }), 'Prima liquidada');
    if (r) router.push(`/nomina/${r.periodo?.id ?? r.id}`);
  };
  const liquidarCesantias = async () => {
    const r: any = await ejecutar(() => post('/prestaciones/cesantias', { anio: anioCes }), 'Cesantías e intereses liquidados');
    if (r) {
      recargar();
      router.push(`/nomina/${r.periodo?.id ?? r.id}`);
    }
  };

  return (
    <>
      <Encabezado titulo="Prestaciones sociales" descripcion="Prima de servicios, cesantías e intereses. El sistema toma el salario, lo variable de los meses y el auxilio de transporte (CST art. 253)." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Tarjeta titulo={<span className="flex items-center gap-2"><Gift className="h-5 w-5 text-marca-600" /> Prima de servicios</span>} subtitulo="Medio salario por semestre trabajado. Se paga a más tardar el 30 de junio y el 20 de diciembre.">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Año">
                <Entrada type="number" value={anioPrima} onChange={(e) => setAnioPrima(Number(e.target.value))} />
              </Campo>
              <Campo etiqueta="Semestre">
                <Opciones<number>
                  valor={semestre}
                  onCambio={(v) => setSemestre(v)}
                  opciones={[
                    { valor: 1, etiqueta: 'Primero', descripcion: 'Enero a junio' },
                    { valor: 2, etiqueta: 'Segundo', descripcion: 'Julio a diciembre' },
                  ]}
                />
              </Campo>
            </div>
            <p className="text-sm text-suave">Si ya pagó parte de la prima dentro de una nómina, se descuenta automáticamente. No aplica a salario integral ni a aprendices en etapa lectiva.</p>
            <Boton cargando={trabajando} onClick={liquidarPrima}>
              Liquidar prima
            </Boton>
          </div>
        </Tarjeta>
        <Tarjeta titulo={<span className="flex items-center gap-2"><PiggyBank className="h-5 w-5 text-marca-600" /> Cesantías e intereses</span>} subtitulo="Cesantías al fondo antes del 14 de febrero; intereses (12 % anual) al empleado antes del 31 de enero.">
          <div className="space-y-4">
            <Campo etiqueta="Año que se liquida">
              <Entrada type="number" value={anioCes} onChange={(e) => setAnioCes(Number(e.target.value))} />
            </Campo>
            <p className="text-sm text-suave">Incluye a quienes siguen trabajando el 31 de diciembre. A los retirados se les pagan en la liquidación del contrato.</p>
            <Boton cargando={trabajando} onClick={liquidarCesantias}>
              Liquidar cesantías e intereses
            </Boton>
          </div>
        </Tarjeta>
      </div>
      <Tarjeta titulo="Liquidaciones de prestaciones" className="mt-5">
        {cargando && !periodos ? (
          <Cargando />
        ) : (
          <Tabla
            filas={lista}
            clave={(p) => p.id}
            vacio="Aún no ha liquidado prestaciones"
            columnas={[
              { clave: 'nombre', titulo: 'Liquidación', celda: (p: any) => <Link href={`/nomina/${p.id}`} className="font-medium text-marca-600 hover:underline">{p.nombre}</Link> },
              { clave: 'fechas', titulo: 'Periodo', celda: (p: any) => `${fecha(p.desde)} a ${fecha(p.hasta)}` },
              { clave: 'pago', titulo: 'Fecha de pago', celda: (p: any) => fecha(p.fechaPago) },
              { clave: 'empleados', titulo: 'Empleados', derecha: true },
              { clave: 'neto', titulo: 'A pagar al empleado', derecha: true, celda: (p: any) => pesos(p.totalNeto) },
              { clave: 'estado', titulo: 'Estado', celda: (p: any) => <Insignia tono={TONO_ESTADO[p.estado]}>{NOMBRE_ESTADO_PERIODO[p.estado]}</Insignia> },
              {
                clave: 'fondos',
                titulo: '',
                celda: (p: any) =>
                  p.tipo === 'cesantias' ? (
                    <Boton tamano="sm" variante="secundario" icono={<Landmark className="h-4 w-4" />} onClick={async () => setFondos(await get(`/prestaciones/cesantias/${p.id}/fondos`))}>
                      Por fondo
                    </Boton>
                  ) : null,
              },
            ]}
          />
        )}
      </Tarjeta>
      <Modal abierto={!!fondos} onCerrar={() => setFondos(null)} titulo="Consignación de cesantías por fondo" ancho="lg">
        {fondos && fondos.length === 0 && <Aviso>No hay cesantías para consignar en esta liquidación.</Aviso>}
        <div className="space-y-5">
          {fondos?.map((f) => (
            <div key={f.fondo}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">
                  {f.fondo} {f.nit && <span className="text-sm font-normal text-suave">NIT {f.nit}</span>}
                </h3>
                <span className="font-semibold tabular">{pesos(f.total)}</span>
              </div>
              <Tabla
                filas={f.empleados}
                clave={(e: any) => e.documento}
                columnas={[
                  { clave: 'documento', titulo: 'Documento' },
                  { clave: 'empleado', titulo: 'Empleado' },
                  { clave: 'valor', titulo: 'Valor', derecha: true, celda: (e: any) => pesos(e.valor) },
                ]}
              />
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
