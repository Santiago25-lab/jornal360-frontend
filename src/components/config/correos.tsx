'use client';

import { MailCheck, RefreshCw, Send } from 'lucide-react';
import { useState } from 'react';
import { get, patch, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fechaHora } from '@/lib/formato';
import { AreaTexto, Aviso, Boton, Campo, Entrada, Insignia, Interruptor, Tabla, useAccion, useAvisos } from '../ui';
import { Cargador, Seccion, useBorrador, useEmpresa } from './comun';

type Empresa = ReturnType<typeof useEmpresa>;

const ESTADO: Record<string, { texto: string; tono: 'exito' | 'alerta' | 'peligro' | 'neutro' }> = {
  enviado: { texto: 'Enviado', tono: 'exito' },
  fallido: { texto: 'Falló', tono: 'peligro' },
  sin_correo: { texto: 'Sin correo', tono: 'alerta' },
  pendiente: { texto: 'Enviando', tono: 'neutro' },
};
const TIPO: Record<string, string> = { cumpleanos: 'Cumpleaños', aviso_cumpleanos: 'Aviso al administrador', aviso_ausencia: 'Aviso de ausencias', prueba: 'Prueba' };

export function SeccionCorreos({ e }: { e: Empresa }) {
  const { b, setB, cambiado } = useBorrador<any>(e.empresa?.configuracion?.correos);
  const estado = useDatos<any>('/correos/estado');
  const historial = useDatos<any[]>('/correos/historial?limite=50');
  const [vista, setVista] = useState<string | null>(null);
  const { ejecutar, cargando } = useAccion();
  const { avisar } = useAvisos();
  const set = (k: string, v: unknown) => setB({ ...b, [k]: v });
  const setC = (k: string, v: unknown) => setB({ ...b, cumpleanos: { ...b.cumpleanos, [k]: v } });

  const verVista = async () => setVista((await get<any>('/correos/vista-previa')).html);
  const probar = async () => {
    const r: any = await ejecutar(() => post('/correos/prueba', {}));
    if (r) {
      avisar(`Correo de prueba enviado a ${r.enviadoA}`);
      historial.recargar();
    }
  };
  const revisar = async () => {
    const r: any = await ejecutar(() => post('/correos/revisar', {}));
    if (r) {
      avisar(r.cumpleanosEnviados || r.avisos || r.correosAdministrador ? `Listo: ${r.cumpleanosEnviados} felicitaciones, ${r.avisos} avisos nuevos, ${r.correosAdministrador} correos al administrador` : 'Revisado: no había nada nuevo por enviar');
      historial.recargar();
    }
  };

  return (
    <div className="space-y-5">
      <Seccion
        titulo="Correos y avisos automáticos"
        descripcion="Felicitaciones de cumpleaños a los empleados y avisos al administrador. El sistema revisa cada 5 minutos y nunca envía el mismo correo dos veces."
        cambiado={cambiado}
        guardando={e.guardando}
        onGuardar={() => e.guardarConfig({ correos: b })}
      >
        <Cargador listo={!!b && !!estado.datos}>
          {b && estado.datos && (
            <div className="space-y-5">
              {!estado.datos.configurado && (
                <Aviso tono="alerta" titulo="El servidor todavía no puede enviar correos">
                  Falta la clave de Resend (variable <b>RESEND_API_KEY</b> en Railway). Los avisos de la campanita sí funcionan.
                </Aviso>
              )}
              <Interruptor activo={b.activo} onCambio={(v) => set('activo', v)} etiqueta="Enviar correos automáticos" descripcion="Si lo apaga, no sale ningún correo; los avisos de la campanita siguen funcionando." />
              <div className="rounded-xl border border-alerta/40 bg-alerta/5 p-4">
                <Interruptor
                  activo={b.modoPrueba}
                  onCambio={(v) => set('modoPrueba', v)}
                  etiqueta="Modo de prueba"
                  descripcion="Todos los correos (de empleados y del administrador) llegan solo al correo de prueba, con un aviso de a quién iban. Ideal para probar sin molestar a nadie."
                />
                {b.modoPrueba && (
                  <Campo etiqueta="Correo de prueba" ayuda="Con Resend sin dominio propio, debe ser el correo con el que creó la cuenta de Resend." className="mt-3">
                    <Entrada type="email" value={b.correoPrueba} placeholder="sucorreo@gmail.com" onChange={(x) => set('correoPrueba', x.target.value)} />
                  </Campo>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Campo etiqueta="Nombre del remitente" opcional ayuda="Así aparece en la bandeja de entrada. Vacío: la razón social de la empresa.">
                  <Entrada value={b.nombreRemitente} placeholder="Talento Humano" onChange={(x) => set('nombreRemitente', x.target.value)} />
                </Campo>
                <Campo etiqueta="Responder a" opcional ayuda="Si el empleado responde el correo, la respuesta llega aquí.">
                  <Entrada type="email" value={b.responderA} placeholder="talentohumano@empresa.co" onChange={(x) => set('responderA', x.target.value)} />
                </Campo>
                <Campo etiqueta="Correos del administrador" opcional ayuda="Reciben los avisos (cumpleaños del día, ausencias). Separe varios con coma. Vacío: los correos de los usuarios de la empresa.">
                  <Entrada value={b.correosAdministrador} placeholder="jefe@empresa.co, rrhh@empresa.co" onChange={(x) => set('correosAdministrador', x.target.value)} />
                </Campo>
                <Campo etiqueta="Hora de envío" ayuda="Hora de Colombia a la que salen las felicitaciones del día.">
                  <Entrada type="time" value={b.horaEnvio} onChange={(x) => set('horaEnvio', x.target.value)} className="w-40" />
                </Campo>
              </div>
              <Interruptor activo={b.avisarAdministrador} onCambio={(v) => set('avisarAdministrador', v)} etiqueta="Enviar al administrador el resumen de cumpleaños del día" />
              <Interruptor activo={b.ausenciasPorCorreo} onCambio={(v) => set('ausenciasPorCorreo', v)} etiqueta="Enviar al administrador un correo cuando alguien no ha llegado" descripcion="El aviso también aparece en la campanita. Los minutos de espera se configuran en Marcación." />
            <div className="space-y-4 border-t border-borde pt-5">
              <div>
                <h3 className="font-semibold">Felicitación de cumpleaños</h3>
                <p className="text-sm text-suave">La campanita avisa 2 días antes, 1 día antes y el mismo día. Ese día, a la hora de envío, le llega el correo al empleado.</p>
              </div>
              <Interruptor activo={b.cumpleanos.activo} onCambio={(v) => setC('activo', v)} etiqueta="Enviar la felicitación por correo" />
              <Campo etiqueta="Asunto">
                <Entrada value={b.cumpleanos.asunto} onChange={(x) => setC('asunto', x.target.value)} />
              </Campo>
              <Campo etiqueta="Mensaje" ayuda="Deje una línea en blanco entre párrafos.">
                <AreaTexto rows={6} value={b.cumpleanos.mensaje} onChange={(x) => setC('mensaje', x.target.value)} />
              </Campo>
              <p className="text-sm text-suave">
                Puede usar <code>{'{nombre}'}</code> (primer nombre), <code>{'{nombreCompleto}'}</code>, <code>{'{empresa}'}</code> y <code>{'{cargo}'}</code>.
              </p>
              <div className="flex flex-wrap gap-2">
                <Boton variante="secundario" icono={<MailCheck className="h-4 w-4" />} onClick={verVista} disabled={cambiado} title={cambiado ? 'Guarde primero los cambios' : undefined}>
                  Ver cómo se ve
                </Boton>
                <Boton icono={<Send className="h-4 w-4" />} cargando={cargando} onClick={probar} disabled={cambiado || !b.correoPrueba}>
                  Enviarme un correo de prueba
                </Boton>
                <Boton variante="secundario" icono={<RefreshCw className="h-4 w-4" />} cargando={cargando} onClick={revisar} disabled={cambiado}>
                  Revisar ahora
                </Boton>
              </div>
              {!b.correoPrueba && <p className="text-sm text-suave">Para enviar un correo de prueba, escriba el correo de prueba arriba y guarde.</p>}
              {vista && (
                <div className="overflow-hidden rounded-xl border border-borde">
                  <iframe title="Vista previa del correo" srcDoc={vista} className="h-[620px] w-full bg-white" />
                </div>
              )}
            </div>
            </div>
          )}
        </Cargador>
      </Seccion>

      {estado.datos && (estado.datos.sinFechaNacimiento.length > 0 || estado.datos.sinCorreo.length > 0 || estado.datos.noRecibenCorreos.length > 0) && (
        <Seccion titulo="Datos que faltan" descripcion="Complételos en la ficha de cada empleado para que les lleguen sus correos.">
          <div className="space-y-3 text-sm">
            {estado.datos.sinFechaNacimiento.length > 0 && (
              <p>
                <b>Sin fecha de nacimiento ({estado.datos.sinFechaNacimiento.length}):</b> {estado.datos.sinFechaNacimiento.join(', ')}
              </p>
            )}
            {estado.datos.sinCorreo.length > 0 && (
              <p>
                <b>Sin correo ({estado.datos.sinCorreo.length}):</b> {estado.datos.sinCorreo.join(', ')}
              </p>
            )}
            {estado.datos.noRecibenCorreos.map((x: any) => (
              <div key={x.id} className="flex flex-wrap items-center gap-3">
                <span>
                  <b>{x.nombre}</b> pidió no recibir estos correos.
                </span>
                <Boton tamano="sm" variante="secundario" onClick={async () => (await ejecutar(() => patch(`/empleados/${x.id}`, { recibeCorreos: true }), 'Correos activados de nuevo')) && estado.recargar()}>
                  Volver a enviarle correos
                </Boton>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      <Seccion titulo="Historial de envíos" descripcion="Los últimos 50 correos: a quién iban, a dónde llegaron y si salieron bien.">
        <Tabla
          filas={historial.datos ?? []}
          clave={(h: any) => h.id}
          vacio="Todavía no se ha enviado ningún correo"
          columnas={[
            { clave: 'fecha', titulo: 'Fecha', celda: (h: any) => fechaHora(h.enviadoEn ?? h.creadoEn) },
            { clave: 'tipo', titulo: 'Tipo', celda: (h: any) => TIPO[h.tipo] ?? h.tipo },
            { clave: 'asunto', titulo: 'Asunto' },
            { clave: 'para', titulo: 'Para', celda: (h: any) => (h.para && h.enviadoA && h.para !== h.enviadoA ? `${h.para} → ${h.enviadoA} (prueba)` : (h.enviadoA ?? h.para ?? '—')) },
            { clave: 'estado', titulo: 'Estado', celda: (h: any) => <span title={h.error ?? undefined}><Insignia tono={ESTADO[h.estado]?.tono ?? 'neutro'}>{ESTADO[h.estado]?.texto ?? h.estado}</Insignia>{h.error && <span className="ml-2 text-xs text-suave">{h.error}</span>}</span> },
          ]}
        />
      </Seccion>
    </div>
  );
}
