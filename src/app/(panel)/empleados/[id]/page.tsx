'use client';

import { ArrowLeft, FileDown, KeyRound, Plus, Smartphone, UserMinus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CodigoQR } from '@/components/codigo-qr';
import { CONTRATO_VACIO, FormularioContrato, limpiarContrato } from '@/components/formulario-contrato';
import { FormularioEmpleado, limpiarEmpleado } from '@/components/formulario-empleado';
import { ModalEmbargo, ModalNovedadDias, ModalNovedadValor, ModalPrestamo } from '@/components/formularios-novedad';
import { Aviso, Boton, Campo, Cargando, Encabezado, Entrada, EntradaDinero, Insignia, Modal, Pestanas, Tabla, Tarjeta, useAccion, useAvisos } from '@/components/ui';
import { borrar, descargar, get, patch, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fecha, fechaHora, hoy, NOMBRE_CONTRATO, NOMBRE_NOVEDAD, numero, pesos, sumarDias } from '@/lib/formato';

type Pestana = 'resumen' | 'datos' | 'contrato' | 'asistencia' | 'novedades' | 'descuentos';

export default function FichaEmpleado() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const { datos: e, recargar, cargando } = useDatos<any>(`/empleados/${id}`);
  const [form, setForm] = useState<Record<string, any> | null>(null);
  const { ejecutar, cargando: guardando } = useAccion();
  const { avisar, error, confirmar } = useAvisos();
  useEffect(() => {
    if (e) setForm({ ...e, camposAdicionales: e.camposAdicionales ?? {} });
  }, [e]);

  if (cargando && !e) return <Cargando />;
  if (!e || !form) return null;
  const contrato = e.contratos.find((c: any) => c.estado === 'activo') ?? e.contratos[0];
  const salario = contrato ? e.historialSalarial.find((h: any) => h.contratoId === contrato.id && h.desde <= hoy())?.salario ?? e.historialSalarial.find((h: any) => h.contratoId === contrato.id)?.salario : null;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/empleados" className="mb-3 inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
        <ArrowLeft className="h-4 w-4" /> Empleados
      </Link>
      <Encabezado
        titulo={`${e.nombres} ${e.apellidos}`}
        descripcion={`${e.tipoDocumento} ${e.numeroDocumento}${e.cargo ? ` · ${e.cargo}` : ''}`}
        acciones={
          <>
            {e.estado === 'activo' ? <Insignia tono="exito">Activo</Insignia> : <Insignia>Retirado</Insignia>}
            {e.estado === 'activo' && contrato && (
              <Link href={`/retiros?empleadoId=${id}`}>
                <Boton variante="secundario" icono={<UserMinus className="h-4 w-4" />}>
                  Registrar retiro
                </Boton>
              </Link>
            )}
          </>
        }
      />
      <Pestanas<Pestana>
        activa={pestana}
        onCambio={setPestana}
        pestanas={[
          { valor: 'resumen', etiqueta: 'Resumen' },
          { valor: 'datos', etiqueta: 'Datos' },
          { valor: 'contrato', etiqueta: 'Contrato y salario' },
          { valor: 'asistencia', etiqueta: 'Asistencia' },
          { valor: 'novedades', etiqueta: 'Novedades' },
          { valor: 'descuentos', etiqueta: 'Préstamos y embargos' },
        ]}
      />

      {pestana === 'resumen' && <Resumen e={e} contrato={contrato} salario={salario} />}

      {pestana === 'datos' && (
        <form
          onSubmit={async (ev) => {
            ev.preventDefault();
            const r = await ejecutar(() => patch(`/empleados/${id}`, limpiarEmpleado(form)), 'Cambios guardados');
            if (r) recargar();
          }}
        >
          <FormularioEmpleado d={form} set={(k, v) => setForm((x) => ({ ...x!, [k]: v }))} />
          <div className="sticky bottom-0 mt-6 flex justify-between gap-2 border-t border-borde bg-fondo/90 py-4 backdrop-blur">
            <Boton
              type="button"
              variante="fantasma"
              className="text-peligro"
              onClick={async () => {
                if (!(await confirmar({ titulo: 'Borrar empleado', mensaje: 'Solo se puede borrar si nunca se le liquidó nómina. Si ya trabajó, registre un retiro.', confirmar: 'Borrar', peligro: true }))) return;
                try {
                  await borrar(`/empleados/${id}`);
                  avisar('Empleado borrado');
                  router.push('/empleados');
                } catch (err) {
                  error(err);
                }
              }}
            >
              Borrar empleado
            </Boton>
            <Boton type="submit" cargando={guardando}>
              Guardar cambios
            </Boton>
          </div>
        </form>
      )}

      {pestana === 'contrato' && <Contratos e={e} recargar={recargar} />}
      {pestana === 'asistencia' && <Asistencia e={e} recargar={recargar} />}
      {pestana === 'novedades' && <Novedades id={id} />}
      {pestana === 'descuentos' && <Descuentos id={id} />}
    </div>
  );
}

function Resumen({ e, contrato, salario }: { e: any; contrato: any; salario: string | null }) {
  const { datos: vac } = useDatos<any>(`/novedades/vacaciones/${e.id}/saldo`);
  const { error } = useAvisos();
  const anio = Number(hoy().slice(0, 4)) - 1;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Tarjeta titulo="Contrato" className="lg:col-span-2">
        {contrato ? (
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              ['Tipo', NOMBRE_CONTRATO[contrato.tipo]],
              ['Inicio', fecha(contrato.fechaInicio)],
              ['Terminación', contrato.fechaFin ? fecha(contrato.fechaFin) : 'Indefinida'],
              ['Salario', pesos(salario)],
              ['Clase de riesgo', ['I', 'II', 'III', 'IV', 'V'][contrato.claseRiesgo - 1]],
              ['Auxilio de transporte', contrato.auxilioTransporte === 'ley' ? 'Según la ley' : contrato.auxilioTransporte === 'siempre' ? 'Siempre' : 'No'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-suave">{k}</dt>
                <dd className="font-medium tabular">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <Aviso tono="alerta">El empleado no tiene contrato. Agréguelo en la pestaña Contrato y salario.</Aviso>
        )}
      </Tarjeta>
      <Tarjeta titulo="Vacaciones">
        {vac ? (
          <div>
            <p className="text-3xl font-semibold tabular">{numero(vac.pendientes, 2)}</p>
            <p className="text-sm text-suave">días hábiles pendientes</p>
            <ul className="mt-3 space-y-1 text-sm">
              <li className="flex justify-between"><span className="text-suave">Causados</span><span className="tabular">{numero(vac.causados, 2)}</span></li>
              <li className="flex justify-between"><span className="text-suave">Disfrutados</span><span className="tabular">{numero(vac.disfrutados, 2)}</span></li>
              <li className="flex justify-between"><span className="text-suave">Pagados en dinero</span><span className="tabular">{numero(vac.compensados, 2)}</span></li>
            </ul>
            {vac.alertaAcumulacion && <div className="mt-3"><Aviso tono="alerta">Tiene más periodos acumulados de los permitidos (CST art. 190).</Aviso></div>}
          </div>
        ) : (
          <Cargando />
        )}
      </Tarjeta>
      <Tarjeta titulo="Documentos" className="lg:col-span-3">
        <div className="flex flex-wrap gap-2">
          <Boton variante="secundario" icono={<FileDown className="h-4 w-4" />} onClick={() => descargar(`/empleados/${e.id}/certificado-laboral`, 'certificado-laboral.pdf').catch(error)}>
            Certificado laboral con salario
          </Boton>
          <Boton variante="secundario" icono={<FileDown className="h-4 w-4" />} onClick={() => descargar(`/empleados/${e.id}/certificado-laboral?salario=no`, 'certificado-laboral.pdf').catch(error)}>
            Certificado laboral sin salario
          </Boton>
          <Boton
            variante="secundario"
            icono={<FileDown className="h-4 w-4" />}
            onClick={() =>
              get(`/reportes/certificado-ingresos/${e.id}/pdf?anio=${anio}`)
                .then((r) => import('@/lib/api').then((m) => m.descargarBase64(r.archivoBase64, r.nombre, 'application/pdf')))
                .catch(error)
            }
          >
            Certificado de ingresos y retenciones {anio}
          </Boton>
        </div>
      </Tarjeta>
    </div>
  );
}

function Contratos({ e, recargar }: { e: any; recargar: () => void }) {
  const [nuevo, setNuevo] = useState(false);
  const [c, setC] = useState<Record<string, any>>({ ...CONTRATO_VACIO, fechaInicio: hoy() });
  const [aumento, setAumento] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  const { avisar } = useAvisos();
  const activo = e.contratos.find((x: any) => x.estado === 'activo');
  return (
    <div className="space-y-6">
      {activo && (
        <Tarjeta
          titulo="Historial de salario"
          accion={
            <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setAumento({ contratoId: activo.id, desde: hoy(), salario: '', cargo: '', motivo: 'Aumento' })}>
              Cambiar salario
            </Boton>
          }
        >
          <Tabla
            filas={e.historialSalarial.filter((h: any) => h.contratoId === activo.id)}
            columnas={[
              { clave: 'desde', titulo: 'Desde', celda: (h: any) => fecha(h.desde) },
              { clave: 'salario', titulo: 'Salario', derecha: true, celda: (h: any) => pesos(h.salario) },
              { clave: 'cargo', titulo: 'Cargo', celda: (h: any) => h.cargo ?? '—' },
              { clave: 'motivo', titulo: 'Motivo', celda: (h: any) => h.motivo ?? '—' },
            ]}
          />
        </Tarjeta>
      )}
      <Tarjeta titulo="Contratos" accion={!activo && <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setNuevo(true)}>Nuevo contrato</Boton>}>
        <Tabla
          filas={e.contratos}
          columnas={[
            { clave: 'tipo', titulo: 'Tipo', celda: (x: any) => NOMBRE_CONTRATO[x.tipo] },
            { clave: 'fechaInicio', titulo: 'Inicio', celda: (x: any) => fecha(x.fechaInicio) },
            { clave: 'fechaFin', titulo: 'Fin', celda: (x: any) => (x.fechaFin ? fecha(x.fechaFin) : 'Indefinido') },
            { clave: 'cargo', titulo: 'Cargo', celda: (x: any) => x.cargo ?? '—' },
            { clave: 'estado', titulo: 'Estado', celda: (x: any) => (x.estado === 'activo' ? <Insignia tono="exito">Activo</Insignia> : <Insignia>Terminado</Insignia>) },
          ]}
        />
      </Tarjeta>
      <Modal
        abierto={nuevo}
        onCerrar={() => setNuevo(false)}
        titulo="Nuevo contrato"
        ancho="lg"
        pie={
          <Boton
            cargando={cargando}
            onClick={async () => {
              const r = await ejecutar((confirmar) => post(`/empleados/${e.id}/contratos`, { ...limpiarContrato(c), confirmar }), 'Contrato creado');
              if (r) {
                setNuevo(false);
                recargar();
              }
            }}
          >
            Guardar contrato
          </Boton>
        }
      >
        <FormularioContrato c={c} set={(k, v) => setC((x) => ({ ...x, [k]: v }))} />
      </Modal>
      <Modal
        abierto={!!aumento}
        onCerrar={() => setAumento(null)}
        titulo="Cambiar salario"
        pie={
          <Boton
            cargando={cargando}
            onClick={async () => {
              const r: any = await ejecutar((confirmar) => post(`/empleados/contratos/${aumento.contratoId}/salarios`, { desde: aumento.desde, salario: aumento.salario, cargo: aumento.cargo || null, motivo: aumento.motivo || null, confirmar }), 'Salario actualizado');
              if (r) {
                if (r.retroactivo) avisar(`${r.retroactivo.mensaje}. Hágalo desde la nómina abierta → Retroactivo`, 'info');
                setAumento(null);
                recargar();
              }
            }}
          >
            Guardar
          </Boton>
        }
      >
        {aumento && (
          <div className="grid gap-4 md:grid-cols-2">
            <Campo etiqueta="Desde" ayuda="Si es una fecha pasada, el sistema le ofrece calcular el retroactivo">
              <Entrada type="date" value={aumento.desde} onChange={(ev) => setAumento({ ...aumento, desde: ev.target.value })} />
            </Campo>
            <Campo etiqueta="Nuevo salario">
              <EntradaDinero valor={aumento.salario} onCambio={(v) => setAumento({ ...aumento, salario: v })} />
            </Campo>
            <Campo etiqueta="Nuevo cargo" opcional>
              <Entrada value={aumento.cargo} onChange={(ev) => setAumento({ ...aumento, cargo: ev.target.value })} />
            </Campo>
            <Campo etiqueta="Motivo" opcional>
              <Entrada value={aumento.motivo} onChange={(ev) => setAumento({ ...aumento, motivo: ev.target.value })} />
            </Campo>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Asistencia({ e, recargar }: { e: any; recargar: () => void }) {
  const [vinc, setVinc] = useState<any>(null);
  const [pin, setPin] = useState<string | null>(null);
  const { avisar, error, confirmar } = useAvisos();
  const { datos: dispositivos, recargar: recargarDisp } = useDatos<any[]>('/asistencia/dispositivos');
  const { datos: marcas } = useDatos<any[]>(`/asistencia/marcaciones?empleadoId=${e.id}&desde=${sumarDias(hoy(), -14)}&hasta=${hoy()}`);
  const mio = (dispositivos ?? []).find((d) => d.empleadoId === e.id);
  useEffect(() => {
    if (!vinc) return;
    const t = setInterval(async () => {
      const l = await get<any[]>('/asistencia/dispositivos').catch(() => []);
      if (l.some((d) => d.empleadoId === e.id && d.vinculadoEn > vinc.inicio)) {
        setVinc(null);
        avisar('Celular vinculado');
        recargarDisp();
      }
    }, 3000);
    return () => clearInterval(t);
  }, [vinc, e.id, avisar, recargarDisp]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Tarjeta titulo={e.marcaEnKiosco ? 'Marca en kiosco (caso especial)' : 'Celular vinculado'}>
        {e.marcaEnKiosco ? (
          <div className="space-y-3">
            <p className="text-suave">Marca en la tablet de la sede con su cédula y un PIN de 4 números.</p>
            <p>{e.tienePin ? <Insignia tono="exito">Tiene PIN asignado</Insignia> : <Insignia tono="alerta">Sin PIN</Insignia>}</p>
            <Boton
              icono={<KeyRound className="h-4 w-4" />}
              onClick={async () => {
                try {
                  setPin((await post(`/empleados/${e.id}/pin`)).pin);
                  recargar();
                } catch (err) {
                  error(err);
                }
              }}
            >
              {e.tienePin ? 'Generar PIN nuevo' : 'Generar PIN'}
            </Boton>
          </div>
        ) : mio ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-exito" /> <span className="font-medium">{mio.descripcion || 'Celular'}</span>
            </p>
            <p className="text-sm text-suave">Vinculado el {fechaHora(mio.vinculadoEn)} · último uso {fechaHora(mio.ultimoUso)}</p>
            <Boton
              variante="secundario"
              onClick={async () => {
                if (!(await confirmar({ titulo: 'Desvincular celular', mensaje: 'El empleado no podrá marcar desde ese celular hasta que lo vincule de nuevo.', confirmar: 'Desvincular', peligro: true }))) return;
                await borrar(`/asistencia/dispositivos/${mio.id}`).catch(error);
                recargarDisp();
              }}
            >
              Desvincular (perdió o cambió el celular)
            </Boton>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-suave">El empleado aún no ha vinculado su celular. Hágalo con él al lado: escanea el código, escribe su cédula y listo.</p>
            <Boton
              icono={<Smartphone className="h-4 w-4" />}
              onClick={async () => {
                try {
                  setVinc({ ...(await post(`/asistencia/empleados/${e.id}/vincular`)), inicio: new Date().toISOString() });
                } catch (err) {
                  error(err);
                }
              }}
            >
              Vincular celular
            </Boton>
          </div>
        )}
      </Tarjeta>
      <Tarjeta titulo="Últimas marcaciones" subtitulo="Últimos 14 días">
        <Tabla
          filas={[...(marcas ?? [])].reverse().slice(0, 12)}
          vacio="Sin marcaciones recientes"
          columnas={[
            { clave: 'hora', titulo: 'Hora', celda: (m: any) => `${fecha(m.horaLocal)} ${m.horaLocal.slice(11)}` },
            { clave: 'tipo', titulo: 'Tipo', celda: (m: any) => (m.tipo === 'entrada' ? 'Entrada' : 'Salida') },
            { clave: 'origen', titulo: 'Cómo', celda: (m: any) => ({ qr: 'Celular (QR)', kiosco: 'Kiosco', asistida: 'Asistida', correccion: 'Corrección', importacion: 'Importada' })[m.origen as string] },
          ]}
        />
      </Tarjeta>
      <Modal abierto={!!vinc} onCerrar={() => setVinc(null)} titulo="Vincular celular" ancho="sm">
        {vinc && (
          <div className="flex flex-col items-center text-center">
            <p className="mb-4 text-suave">Pídale a {vinc.empleado} que escanee este código con la cámara de su celular.</p>
            <CodigoQR texto={vinc.url} tamano={220} />
            <p className="mt-4 text-sm text-suave">O que abra la página de vinculación y escriba este código:</p>
            <p className="mt-1 text-3xl font-semibold tracking-[0.3em] tabular">{vinc.codigo}</p>
            <p className="mt-3 text-xs text-suave">Sirve una sola vez y vence en 10 minutos. Esta ventana se cierra sola cuando el celular quede vinculado.</p>
          </div>
        )}
      </Modal>
      <Modal abierto={!!pin} onCerrar={() => setPin(null)} titulo="PIN del kiosco" ancho="sm">
        <div className="text-center">
          <p className="text-suave">Entréguele este PIN al empleado. No se vuelve a mostrar.</p>
          <p className="my-4 text-5xl font-semibold tracking-[0.4em] tabular">{pin}</p>
          <p className="text-xs text-suave">Puede cambiarlo él mismo en el kiosco.</p>
        </div>
      </Modal>
    </div>
  );
}

function Novedades({ id }: { id: string }) {
  const { datos, recargar } = useDatos<any[]>(`/novedades?empleadoId=${id}`);
  const [dias, setDias] = useState(false);
  const [valor, setValor] = useState(false);
  const { error } = useAvisos();
  return (
    <Tarjeta
      titulo="Novedades"
      accion={
        <div className="flex gap-2">
          <Boton tamano="sm" variante="secundario" onClick={() => setValor(true)}>
            Pago o descuento
          </Boton>
          <Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setDias(true)}>
            Incapacidad, licencia o vacaciones
          </Boton>
        </div>
      }
    >
      <Tabla
        filas={datos ?? []}
        vacio="Sin novedades"
        columnas={[
          { clave: 'tipo', titulo: 'Novedad', celda: (n: any) => (n.clase === 'dias' ? NOMBRE_NOVEDAD[n.tipo] ?? n.tipo : n.tipo.replace(/_/g, ' ').toLowerCase().replace(/^./, (x: string) => x.toUpperCase())) },
          { clave: 'fechas', titulo: 'Fechas', celda: (n: any) => (n.clase === 'dias' ? `${fecha(n.desde)} a ${fecha(n.hasta)}` : fecha(n.fecha)) },
          { clave: 'valor', titulo: 'Valor o cantidad', derecha: true, celda: (n: any) => (n.valor ? pesos(n.valor) : n.cantidad ? numero(n.cantidad, 1) : n.diasHabiles ? `${n.diasHabiles} días hábiles` : '—') },
          { clave: 'descripcion', titulo: 'Detalle', celda: (n: any) => n.descripcion ?? n.diagnostico ?? '—' },
          {
            clave: 'acciones',
            titulo: '',
            celda: (n: any) => (
              <button className="text-sm text-peligro hover:underline" onClick={() => borrar(`/novedades/${n.id}`).then(recargar).catch(error)}>
                Borrar
              </button>
            ),
          },
        ]}
      />
      {dias && <ModalNovedadDias abierto onCerrar={() => setDias(false)} empleadoId={id} alGuardar={recargar} />}
      {valor && <ModalNovedadValor abierto onCerrar={() => setValor(false)} empleadoId={id} alGuardar={recargar} />}
    </Tarjeta>
  );
}

function Descuentos({ id }: { id: string }) {
  const pr = useDatos<any[]>(`/prestamos?empleadoId=${id}`);
  const em = useDatos<any[]>(`/embargos?empleadoId=${id}`);
  const [p, setP] = useState(false);
  const [m, setM] = useState(false);
  const { error } = useAvisos();
  return (
    <div className="space-y-6">
      <Tarjeta titulo="Préstamos y libranzas" accion={<Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setP(true)}>Nuevo préstamo</Boton>}>
        <Tabla
          filas={pr.datos ?? []}
          vacio="Sin préstamos"
          columnas={[
            { clave: 'descripcion', titulo: 'Descripción' },
            { clave: 'valorTotal', titulo: 'Valor', derecha: true, celda: (x: any) => pesos(x.valorTotal) },
            { clave: 'cuota', titulo: 'Cuota', derecha: true, celda: (x: any) => pesos(x.cuota) },
            { clave: 'saldo', titulo: 'Saldo', derecha: true, celda: (x: any) => pesos(x.saldo) },
            { clave: 'activo', titulo: 'Estado', celda: (x: any) => (x.activo ? <Insignia tono="marca">Vigente</Insignia> : <Insignia>Pagado</Insignia>) },
            { clave: 'a', titulo: '', celda: (x: any) => x.activo && <button className="text-sm text-suave hover:underline" onClick={() => patch(`/prestamos/${x.id}`, { activo: false }).then(pr.recargar).catch(error)}>Suspender</button> },
          ]}
        />
      </Tarjeta>
      <Tarjeta titulo="Embargos" accion={<Boton tamano="sm" icono={<Plus className="h-4 w-4" />} onClick={() => setM(true)}>Nuevo embargo</Boton>}>
        <Tabla
          filas={em.datos ?? []}
          vacio="Sin embargos"
          columnas={[
            { clave: 'descripcion', titulo: 'Descripción' },
            { clave: 'tipo', titulo: 'Tipo', celda: (x: any) => ({ ordinario: 'Ordinario', alimentos: 'Alimentos', cooperativa: 'Cooperativa' })[x.tipo as string] },
            { clave: 'forma', titulo: 'Descuento', celda: (x: any) => (x.valorFijo ? pesos(x.valorFijo) : `${Number(x.porcentaje) * 100}% del máximo`) },
            { clave: 'saldo', titulo: 'Saldo', derecha: true, celda: (x: any) => (x.saldo ? pesos(x.saldo) : 'Sin límite') },
            { clave: 'activo', titulo: 'Estado', celda: (x: any) => (x.activo ? <Insignia tono="marca">Vigente</Insignia> : <Insignia>Terminado</Insignia>) },
            { clave: 'a', titulo: '', celda: (x: any) => x.activo && <button className="text-sm text-suave hover:underline" onClick={() => patch(`/embargos/${x.id}`, { activo: false }).then(em.recargar).catch(error)}>Levantar</button> },
          ]}
        />
      </Tarjeta>
      {p && <ModalPrestamo abierto onCerrar={() => setP(false)} empleadoId={id} alGuardar={pr.recargar} />}
      {m && <ModalEmbargo abierto onCerrar={() => setM(false)} empleadoId={id} alGuardar={em.recargar} />}
    </div>
  );
}
