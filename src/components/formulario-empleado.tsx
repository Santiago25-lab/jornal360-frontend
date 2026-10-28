'use client';

import { useSesion } from '@/lib/sesion';
import { BANCOS, TIPOS_DOCUMENTO, useCatalogos } from '@/lib/catalogos';
import { Campo, Casilla, Entrada, EntradaDinero, Interruptor, Selector, Tarjeta } from './ui';

export type DatosEmpleado = Record<string, any>;

export const EMPLEADO_VACIO: DatosEmpleado = {
  tipoDocumento: 'CC',
  numeroDocumento: '',
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  fechaNacimiento: '',
  banco: '',
  tipoCuenta: 'Ahorros',
  numeroCuenta: '',
  codigoBanco: '',
  epsId: '',
  afpId: '',
  cesantiasId: '',
  ccfId: '',
  sedeId: '',
  areaId: '',
  centroCostoId: '',
  grupoPagoId: '',
  turnoId: '',
  cargo: '',
  esPensionado: false,
  marcaEnKiosco: false,
  kioscoId: '',
  procedimientoRetencion: 1,
  tieneDependiente: false,
  dependientesAdicionales: 0,
  interesesVivienda: '0',
  medicinaPrepagada: '0',
  aportesVoluntarios: '0',
  soportesRetencionHasta: '',
  camposAdicionales: {},
  aceptaTratamientoDatos: true,
};

/** Quita los textos vacíos para que la API los guarde como "sin dato". */
export function limpiarEmpleado(d: DatosEmpleado) {
  const out: DatosEmpleado = {};
  for (const [k, v] of Object.entries(d)) {
    if (['id', 'contratos', 'historialSalarial', 'afiliaciones', 'tienePin', 'estado', 'creadoEn', 'actualizadoEn', 'empresaId', 'autorizacionDatosEn', 'pinIntentos', 'pinBloqueado', 'porcentajeProc2'].includes(k)) continue;
    out[k] = v === '' ? null : v;
  }
  if (!out.numeroDocumento) delete out.numeroDocumento;
  return out;
}

export function FormularioEmpleado({ d, set, nuevo }: { d: DatosEmpleado; set: (k: string, v: any) => void; nuevo?: boolean }) {
  const cat = useCatalogos();
  const { usuario } = useSesion();
  const campos: { codigo: string; nombre: string; tipo: string }[] = usuario?.configuracion?.campos ?? [];
  return (
    <div className="space-y-6">
      <Tarjeta titulo="Datos personales">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Tipo de documento">
            <Selector value={d.tipoDocumento} onChange={(e) => set('tipoDocumento', e.target.value)} opciones={TIPOS_DOCUMENTO} />
          </Campo>
          <Campo etiqueta="Número de documento">
            <Entrada value={d.numeroDocumento} onChange={(e) => set('numeroDocumento', e.target.value.trim())} inputMode="numeric" required />
          </Campo>
          <Campo etiqueta="Fecha de nacimiento" opcional>
            <Entrada type="date" value={d.fechaNacimiento ?? ''} onChange={(e) => set('fechaNacimiento', e.target.value)} />
          </Campo>
          <Campo etiqueta="Nombres">
            <Entrada value={d.nombres} onChange={(e) => set('nombres', e.target.value)} required />
          </Campo>
          <Campo etiqueta="Apellidos">
            <Entrada value={d.apellidos} onChange={(e) => set('apellidos', e.target.value)} required />
          </Campo>
          <Campo etiqueta="Correo" opcional ayuda="Ahí le llegan los desprendibles y certificados">
            <Entrada type="email" value={d.correo ?? ''} onChange={(e) => set('correo', e.target.value)} />
          </Campo>
          <Campo etiqueta="Celular" opcional>
            <Entrada value={d.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} inputMode="tel" />
          </Campo>
          <Campo etiqueta="Dirección" opcional>
            <Entrada value={d.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} />
          </Campo>
          <Campo etiqueta="Ciudad" opcional>
            <Entrada value={d.ciudad ?? ''} onChange={(e) => set('ciudad', e.target.value)} />
          </Campo>
        </div>
        {nuevo && (
          <div className="mt-4">
            <Casilla
              marcada={!!d.aceptaTratamientoDatos}
              onCambio={(v) => set('aceptaTratamientoDatos', v)}
              etiqueta="El empleado autorizó el tratamiento de sus datos personales"
              descripcion="Ley 1581 de 2012. Queda registrada la fecha de la autorización."
            />
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Trabajo y pago">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Cargo" opcional>
            <Entrada value={d.cargo ?? ''} onChange={(e) => set('cargo', e.target.value)} />
          </Campo>
          <Campo etiqueta="Grupo de pago" ayuda="Define si se le paga mensual, quincenal o semanal">
            <Selector value={d.grupoPagoId ?? ''} onChange={(e) => set('grupoPagoId', e.target.value)} opciones={cat.grupos} vacio="Elija…" />
          </Campo>
          <Campo etiqueta="Turno" ayuda="Su horario. Con él se calculan las horas extra y recargos">
            <Selector value={d.turnoId ?? ''} onChange={(e) => set('turnoId', e.target.value)} opciones={cat.turnos} vacio="Sin turno" />
          </Campo>
          <Campo etiqueta="Sede">
            <Selector value={d.sedeId ?? ''} onChange={(e) => set('sedeId', e.target.value)} opciones={cat.sedes} vacio="Elija…" />
          </Campo>
          <Campo etiqueta="Centro de costo" opcional>
            <Selector value={d.centroCostoId ?? ''} onChange={(e) => set('centroCostoId', e.target.value)} opciones={cat.centros} vacio="Sin centro" />
          </Campo>
          {cat.areas.length > 0 && (
            <Campo etiqueta="Área" opcional>
              <Selector value={d.areaId ?? ''} onChange={(e) => set('areaId', e.target.value)} opciones={cat.areas} vacio="Sin área" />
            </Campo>
          )}
          <Campo etiqueta="Banco" opcional>
            <Selector value={d.banco ?? ''} onChange={(e) => set('banco', e.target.value)} opciones={BANCOS.map((b) => ({ valor: b, etiqueta: b }))} vacio="Elija…" />
          </Campo>
          <Campo etiqueta="Tipo de cuenta" opcional>
            <Selector value={d.tipoCuenta ?? ''} onChange={(e) => set('tipoCuenta', e.target.value)} opciones={[{ valor: 'Ahorros', etiqueta: 'Ahorros' }, { valor: 'Corriente', etiqueta: 'Corriente' }]} />
          </Campo>
          <Campo etiqueta="Número de cuenta" opcional>
            <Entrada value={d.numeroCuenta ?? ''} onChange={(e) => set('numeroCuenta', e.target.value.replace(/[^\d-]/g, ''))} inputMode="numeric" />
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Seguridad social" subtitulo="Si no aparece la entidad, créela en Configuración → Estructura → Entidades">
        <div className="grid gap-4 md:grid-cols-2">
          <Campo etiqueta="EPS">
            <Selector value={d.epsId ?? ''} onChange={(e) => set('epsId', e.target.value)} opciones={cat.eps} vacio="Elija…" />
          </Campo>
          <Campo etiqueta="Fondo de pensiones">
            <Selector value={d.afpId ?? ''} onChange={(e) => set('afpId', e.target.value)} opciones={cat.afp} vacio="Elija…" />
          </Campo>
          <Campo etiqueta="Fondo de cesantías">
            <Selector value={d.cesantiasId ?? ''} onChange={(e) => set('cesantiasId', e.target.value)} opciones={cat.cesantias} vacio="Elija…" />
          </Campo>
          <Campo etiqueta="Caja de compensación">
            <Selector value={d.ccfId ?? ''} onChange={(e) => set('ccfId', e.target.value)} opciones={cat.ccf} vacio="Elija…" />
          </Campo>
        </div>
        <div className="mt-3">
          <Interruptor activo={!!d.esPensionado} onCambio={(v) => set('esPensionado', v)} etiqueta="Es pensionado" descripcion="No se le calcula aporte a pensión" />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Asistencia">
        <Interruptor
          activo={!!d.marcaEnKiosco}
          onCambio={(v) => set('marcaEnKiosco', v)}
          etiqueta="Caso especial: marca en kiosco"
          descripcion="Para quien no tiene celular inteligente. Marca en la tablet de la sede con su cédula y un PIN de 4 números."
        />
        {d.marcaEnKiosco && cat.kioscos.length > 0 && (
          <div className="mt-3 max-w-sm">
            <Campo etiqueta="Kiosco asignado" opcional>
              <Selector value={d.kioscoId ?? ''} onChange={(e) => set('kioscoId', e.target.value)} opciones={cat.kioscos} vacio="Cualquier kiosco" />
            </Campo>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Retención en la fuente" subtitulo="Solo si el empleado presentó soportes de deducciones">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Procedimiento">
            <Selector value={d.procedimientoRetencion} onChange={(e) => set('procedimientoRetencion', Number(e.target.value))} opciones={[{ valor: 1, etiqueta: 'Procedimiento 1 (mes a mes)' }, { valor: 2, etiqueta: 'Procedimiento 2 (porcentaje fijo)' }]} />
          </Campo>
          <Campo etiqueta="Intereses de vivienda (mensual)" ayuda="Tope configurable, 100 UVT por mes">
            <EntradaDinero valor={d.interesesVivienda} onCambio={(v) => set('interesesVivienda', v || '0')} />
          </Campo>
          <Campo etiqueta="Medicina prepagada (mensual)" ayuda="Tope configurable, 16 UVT por mes">
            <EntradaDinero valor={d.medicinaPrepagada} onCambio={(v) => set('medicinaPrepagada', v || '0')} />
          </Campo>
          <Campo etiqueta="Aporte voluntario a pensión o AFC (mensual)">
            <EntradaDinero valor={d.aportesVoluntarios} onCambio={(v) => set('aportesVoluntarios', v || '0')} />
          </Campo>
          <Campo etiqueta="Soportes vigentes hasta" opcional ayuda="Después de esta fecha las deducciones dejan de aplicarse">
            <Entrada type="date" value={d.soportesRetencionHasta ?? ''} onChange={(e) => set('soportesRetencionHasta', e.target.value)} />
          </Campo>
          <Campo etiqueta="Dependientes adicionales" ayuda="Ley 2277 de 2022, hasta 4">
            <Selector value={d.dependientesAdicionales} onChange={(e) => set('dependientesAdicionales', Number(e.target.value))} opciones={[0, 1, 2, 3, 4].map((n) => ({ valor: n, etiqueta: String(n) }))} />
          </Campo>
        </div>
        <div className="mt-3">
          <Interruptor activo={!!d.tieneDependiente} onCambio={(v) => set('tieneDependiente', v)} etiqueta="Tiene dependiente económico" descripcion="Deducción del 10% del ingreso, hasta 32 UVT al mes" />
        </div>
      </Tarjeta>

      {campos.length > 0 && (
        <Tarjeta titulo="Campos de la empresa">
          <div className="grid gap-4 md:grid-cols-3">
            {campos.map((c) => (
              <Campo key={c.codigo} etiqueta={c.nombre}>
                <Entrada
                  type={c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text'}
                  value={d.camposAdicionales?.[c.codigo] ?? ''}
                  onChange={(e) => set('camposAdicionales', { ...(d.camposAdicionales ?? {}), [c.codigo]: e.target.value })}
                />
              </Campo>
            ))}
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
