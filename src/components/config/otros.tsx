'use client';

import { Download, FileUp, Plus, Trash2, UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { borrar, get, patch, post } from '@/lib/api';
import { useDatos } from '@/lib/datos';
import { fechaHora } from '@/lib/formato';
import { Aviso, Boton, Campo, Entrada, Insignia, Interruptor, Modal, Opciones, Selector, Tabla, useAccion, useAvisos } from '../ui';
import { Seccion } from './comun';

// ---------- Usuarios ----------

const ROLES = [
  { valor: 'superusuario', etiqueta: 'Superusuario', descripcion: 'Control total, incluida la configuración' },
  { valor: 'analista', etiqueta: 'Analista de nómina', descripcion: 'Empleados, novedades y liquidación' },
  { valor: 'aprobador', etiqueta: 'Aprobador', descripcion: 'Revisa y aprueba nóminas' },
  { valor: 'contador', etiqueta: 'Contador', descripcion: 'Consulta, reportes y contabilidad' },
  { valor: 'supervisor', etiqueta: 'Supervisor', descripcion: 'Asistencia de su equipo' },
];
/** Por ahora el espacio solo crea superusuarios; los demás roles se habilitan cuando se definan sus permisos. */
const ROLES_DISPONIBLES = ROLES.filter((r) => r.valor === 'superusuario');

export function SeccionUsuarios() {
  const { datos, recargar } = useDatos<any[]>('/usuarios');
  const [ed, setEd] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  const guardar = async () => {
    const { id, ultimoAcceso, creadoEn, ...d } = ed;
    const cuerpo = { ...d, correo: d.correo || null, password: d.password || undefined };
    if (await ejecutar(() => (id ? patch(`/usuarios/${id}`, cuerpo) : post('/usuarios', cuerpo)), 'Usuario guardado')) {
      setEd(null);
      recargar();
    }
  };
  return (
    <Seccion
      titulo="Usuarios"
      descripcion="Quién entra a este espacio. Cada acción queda en la auditoría con su nombre. Por ahora se crean superusuarios; los roles con funciones limitadas llegan pronto."
      accion={
        <Boton tamano="sm" icono={<UserPlus className="h-4 w-4" />} onClick={() => setEd({ usuario: '', nombre: '', correo: '', rol: 'superusuario', password: '' })}>
          Nuevo usuario
        </Boton>
      }
    >
      <Tabla
        filas={datos ?? []}
        clave={(u: any) => u.id}
        alClic={(u) => setEd({ ...u, password: '', correo: u.correo ?? '' })}
        columnas={[
          { clave: 'nombre', titulo: 'Nombre', celda: (u: any) => <span className="font-medium">{u.nombre}</span> },
          { clave: 'usuario', titulo: 'Usuario' },
          { clave: 'rol', titulo: 'Rol', celda: (u: any) => ROLES.find((r) => r.valor === u.rol)?.etiqueta },
          { clave: 'ultimo', titulo: 'Último ingreso', celda: (u: any) => fechaHora(u.ultimoAcceso) },
          { clave: 'activo', titulo: '', celda: (u: any) => (u.activo ? <Insignia tono="exito">Activo</Insignia> : <Insignia>Inactivo</Insignia>) },
        ]}
      />
      <Modal
        abierto={!!ed}
        onCerrar={() => setEd(null)}
        titulo={ed?.id ? 'Editar usuario' : 'Nuevo usuario'}
        pie={
          <Boton cargando={cargando} onClick={guardar}>
            Guardar
          </Boton>
        }
      >
        {ed && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre completo">
                <Entrada value={ed.nombre} onChange={(e) => setEd({ ...ed, nombre: e.target.value })} />
              </Campo>
              <Campo etiqueta="Usuario para ingresar">
                <Entrada value={ed.usuario} autoComplete="off" onChange={(e) => setEd({ ...ed, usuario: e.target.value.trim() })} />
              </Campo>
              <Campo etiqueta="Correo" opcional>
                <Entrada type="email" value={ed.correo} onChange={(e) => setEd({ ...ed, correo: e.target.value })} />
              </Campo>
              <Campo etiqueta={ed.id ? 'Nueva contraseña' : 'Contraseña'} opcional={!!ed.id} ayuda="Mínimo 8 caracteres.">
                <Entrada type="password" autoComplete="new-password" value={ed.password} onChange={(e) => setEd({ ...ed, password: e.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="Rol">
              <Opciones valor={ed.rol} onCambio={(v) => setEd({ ...ed, rol: v })} opciones={ROLES_DISPONIBLES.some((r) => r.valor === ed.rol) ? ROLES_DISPONIBLES : ROLES.filter((r) => r.valor === ed.rol || r.valor === 'superusuario')} />
            </Campo>
            {ed.id && <Interruptor activo={ed.activo} onCambio={(v) => setEd({ ...ed, activo: v })} etiqueta="Puede ingresar" />}
          </div>
        )}
      </Modal>
    </Seccion>
  );
}

// ---------- Formatos de archivo ----------

const FUENTES_BANCO = [
  'empleado.documento',
  'empleado.tipoDocumentoCodigo',
  'empleado.nombre',
  'empleado.banco',
  'empleado.codigoBanco',
  'empleado.cuenta',
  'empleado.tipoCuenta',
  'empleado.tipoCuentaCodigo',
  'empleado.tipoTransaccion',
  'pago.valor',
  'pago.referencia',
  'empresa.nit',
  'empresa.razonSocial',
  'empresa.cuenta',
  'empresa.tipoCuentaCodigo',
  'fechaPago',
  'total.registros',
  'total.valor',
];
const FUENTES_CONTABLE = ['comprobante', 'fecha', 'cuenta', 'tercero.nit', 'tercero.nombre', 'centroCosto', 'descripcion', 'debito', 'credito'];
const FORMATOS_VALOR = [
  { valor: 'texto', etiqueta: 'Texto' },
  { valor: 'numero', etiqueta: 'Número' },
  { valor: 'entero', etiqueta: 'Entero' },
  { valor: 'valor', etiqueta: 'Valor con 2 decimales' },
  { valor: 'valor_centavos', etiqueta: 'Valor en centavos' },
  { valor: 'fecha_aaaammdd', etiqueta: 'Fecha AAAAMMDD' },
  { valor: 'fecha_ddmmaaaa', etiqueta: 'Fecha DDMMAAAA' },
  { valor: 'fecha_iso', etiqueta: 'Fecha AAAA-MM-DD' },
];

const campoVacio = () => ({ nombre: '', fuente: '', literal: '', formato: 'texto', ancho: '', relleno: ' ', alineacion: 'izquierda' });

export function SeccionFormatos() {
  const { datos, recargar } = useDatos<any[]>('/formatos');
  const [ed, setEd] = useState<any>(null);
  const { ejecutar, cargando } = useAccion();
  const { confirmar } = useAvisos();
  const nuevo = (clase: 'banco' | 'contable') =>
    setEd({
      clase,
      codigo: '',
      nombre: '',
      activo: true,
      definicion: { separador: clase === 'contable' ? ';' : null, extension: clase === 'contable' ? 'csv' : 'txt', incluirTitulos: clase === 'contable', encabezado: [], detalle: [campoVacio()], pie: [] },
    });
  const limpiar = (l: any[]) =>
    (l ?? []).map((c) => {
      const x: any = { nombre: c.nombre };
      if (c.literal) x.literal = c.literal;
      else x.fuente = c.fuente;
      if (c.formato && c.formato !== 'texto') x.formato = c.formato;
      if (c.ancho) {
        x.ancho = Number(c.ancho);
        x.relleno = c.relleno || ' ';
        x.alineacion = c.alineacion || 'izquierda';
      }
      return x;
    });
  const guardar = async () => {
    const d = ed.definicion;
    const definicion = { ...d, separador: d.separador === '' ? null : d.separador, encabezado: limpiar(d.encabezado), detalle: limpiar(d.detalle), pie: limpiar(d.pie) };
    if (await ejecutar(() => post('/formatos', { clase: ed.clase, codigo: ed.codigo, nombre: ed.nombre, activo: ed.activo, definicion }), 'Formato guardado')) {
      setEd(null);
      recargar();
    }
  };
  const fuentes = ed?.clase === 'contable' ? FUENTES_CONTABLE : FUENTES_BANCO;
  const bloque = (k: 'encabezado' | 'detalle' | 'pie', titulo: string) => {
    const l: any[] = ed.definicion[k] ?? [];
    const set = (nl: any[]) => setEd({ ...ed, definicion: { ...ed.definicion, [k]: nl } });
    const fijo = !ed.definicion.separador;
    return (
      <div key={k} className="rounded-xl border border-borde p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-medium">{titulo}</p>
          <Boton tamano="sm" variante="secundario" icono={<Plus className="h-4 w-4" />} onClick={() => set([...l, campoVacio()])}>
            Campo
          </Boton>
        </div>
        {!l.length && <p className="text-sm text-suave">Sin campos.</p>}
        <div className="space-y-2">
          {l.map((c, i) => {
            const cambiar = (x: any) => set(l.map((y, j) => (j === i ? { ...y, ...x } : y)));
            return (
              <div key={i} className="grid items-end gap-2 md:grid-cols-[1fr_1.4fr_1fr_80px_90px_auto]">
                <Campo etiqueta={i === 0 ? 'Nombre' : undefined}>
                  <Entrada value={c.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} />
                </Campo>
                <Campo etiqueta={i === 0 ? 'Dato' : undefined}>
                  <Selector value={c.literal ? '__literal' : c.fuente} onChange={(e) => cambiar(e.target.value === '__literal' ? { fuente: '', literal: c.literal || 'X' } : { fuente: e.target.value, literal: '' })} vacio="Elija…" opciones={[...fuentes.map((f) => ({ valor: f, etiqueta: f })), { valor: '__literal', etiqueta: 'Texto fijo…' }]} />
                  {c.literal !== '' && c.literal !== undefined && <Entrada className="mt-1" value={c.literal} onChange={(e) => cambiar({ literal: e.target.value })} placeholder="Texto fijo" />}
                </Campo>
                <Campo etiqueta={i === 0 ? 'Formato' : undefined}>
                  <Selector value={c.formato ?? 'texto'} onChange={(e) => cambiar({ formato: e.target.value })} opciones={FORMATOS_VALOR} />
                </Campo>
                <Campo etiqueta={i === 0 ? 'Ancho' : undefined}>
                  <Entrada type="number" value={c.ancho ?? ''} disabled={!fijo} onChange={(e) => cambiar({ ancho: e.target.value })} />
                </Campo>
                <Campo etiqueta={i === 0 ? 'Relleno' : undefined}>
                  <Selector
                    value={`${c.relleno ?? ' '}|${c.alineacion ?? 'izquierda'}`}
                    disabled={!fijo}
                    onChange={(e) => {
                      const [relleno, alineacion] = e.target.value.split('|');
                      cambiar({ relleno, alineacion });
                    }}
                    opciones={[
                      { valor: ' |izquierda', etiqueta: 'Espacios →' },
                      { valor: '0|derecha', etiqueta: '← Ceros' },
                      { valor: ' |derecha', etiqueta: '← Espacios' },
                    ]}
                  />
                </Campo>
                <Boton tamano="sm" variante="fantasma" aria-label="Quitar" icono={<Trash2 className="h-4 w-4" />} onClick={() => set(l.filter((_, j) => j !== i))} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  return (
    <Seccion
      titulo="Archivos para bancos y contabilidad"
      descripcion="Ya vienen plantillas para Bancolombia, Davivienda, Banco de Bogotá, CSV genérico, Siigo, World Office y Helisa. Si su banco o software pide otra estructura, créela aquí sin programar."
      accion={
        <div className="flex gap-2">
          <Boton tamano="sm" variante="secundario" icono={<Plus className="h-4 w-4" />} onClick={() => nuevo('banco')}>
            Formato de banco
          </Boton>
          <Boton tamano="sm" variante="secundario" icono={<Plus className="h-4 w-4" />} onClick={() => nuevo('contable')}>
            Formato contable
          </Boton>
        </div>
      }
    >
      <Aviso>Las plantillas de los bancos son una base: antes del primer pago, valide el archivo con su banco.</Aviso>
      <div className="mt-4">
        <Tabla
          filas={datos ?? []}
          clave={(f: any) => f.id}
          alClic={(f) => setEd({ ...f, definicion: { ...f.definicion, encabezado: f.definicion.encabezado ?? [], pie: f.definicion.pie ?? [] } })}
          vacio="No ha creado formatos propios"
          columnas={[
            { clave: 'nombre', titulo: 'Formato', celda: (f: any) => <span className="font-medium">{f.nombre}</span> },
            { clave: 'clase', titulo: 'Para', celda: (f: any) => (f.clase === 'banco' ? 'Pago por banco' : 'Contabilidad') },
            { clave: 'tipo', titulo: 'Tipo', celda: (f: any) => (f.definicion?.separador ? `Separado por «${f.definicion.separador === '\t' ? 'tabulador' : f.definicion.separador}»` : 'Ancho fijo') },
            {
              clave: 'acc',
              titulo: '',
              celda: (f: any) => (
                <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                  <Boton tamano="sm" variante="fantasma" aria-label="Borrar" icono={<Trash2 className="h-4 w-4" />} onClick={async () => (await confirmar({ titulo: 'Borrar formato', mensaje: `¿Borrar ${f.nombre}?`, confirmar: 'Borrar', peligro: true })) && (await ejecutar(() => borrar(`/formatos/${f.id}`), 'Formato borrado')) && recargar()} />
                </div>
              ),
            },
          ]}
        />
      </div>
      <Modal
        abierto={!!ed}
        onCerrar={() => setEd(null)}
        titulo={ed?.id ? 'Editar formato' : 'Nuevo formato'}
        ancho="xl"
        pie={
          <Boton cargando={cargando} onClick={guardar}>
            Guardar formato
          </Boton>
        }
      >
        {ed && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Campo etiqueta="Nombre">
                <Entrada value={ed.nombre} onChange={(e) => setEd({ ...ed, nombre: e.target.value, codigo: ed.id ? ed.codigo : e.target.value.normalize('NFD').replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_').toUpperCase() })} />
              </Campo>
              <Campo etiqueta="Código">
                <Entrada className="font-mono" value={ed.codigo} disabled={!!ed.id} onChange={(e) => setEd({ ...ed, codigo: e.target.value.toUpperCase() })} />
              </Campo>
              <Campo etiqueta="Estructura">
                <Selector
                  value={ed.definicion.separador ?? ''}
                  onChange={(e) => setEd({ ...ed, definicion: { ...ed.definicion, separador: e.target.value === '' ? null : e.target.value } })}
                  opciones={[
                    { valor: '', etiqueta: 'Ancho fijo' },
                    { valor: ',', etiqueta: 'Separado por coma' },
                    { valor: ';', etiqueta: 'Separado por punto y coma' },
                    { valor: '|', etiqueta: 'Separado por barra |' },
                    { valor: '\t', etiqueta: 'Separado por tabulador' },
                  ]}
                />
              </Campo>
              <Campo etiqueta="Extensión">
                <Entrada value={ed.definicion.extension} onChange={(e) => setEd({ ...ed, definicion: { ...ed.definicion, extension: e.target.value.replace(/\W/g, '') } })} />
              </Campo>
            </div>
            {ed.definicion.separador && <Interruptor activo={!!ed.definicion.incluirTitulos} onCambio={(v) => setEd({ ...ed, definicion: { ...ed.definicion, incluirTitulos: v } })} etiqueta="Primera fila con los títulos de las columnas" />}
            {ed.clase === 'banco' && bloque('encabezado', 'Encabezado (una vez al inicio)')}
            {bloque('detalle', ed.clase === 'banco' ? 'Detalle (una línea por empleado)' : 'Detalle (una línea por movimiento)')}
            {ed.clase === 'banco' && bloque('pie', 'Pie (una vez al final)')}
            <Interruptor activo={ed.activo !== false} onCambio={(v) => setEd({ ...ed, activo: v })} etiqueta="Disponible para usar" />
          </div>
        )}
      </Modal>
    </Seccion>
  );
}

// ---------- Respaldo de la configuración ----------

export function SeccionRespaldo() {
  const archivo = useRef<HTMLInputElement>(null);
  const [cargado, setCargado] = useState<{ datos: any; cambios: string[] } | null>(null);
  const { ejecutar, cargando } = useAccion();
  const { error, confirmar } = useAvisos();
  const exportar = async () => {
    const d = await ejecutar(() => get('/respaldo/exportar'));
    if (!d) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `jornal360-configuracion-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const leer = async (f: File) => {
    try {
      const datos = JSON.parse(await f.text());
      const r: any = await ejecutar(() => post('/respaldo/importar', { datos, aplicar: false }));
      if (r) setCargado({ datos, cambios: r.cambios });
    } catch (e) {
      error(e instanceof SyntaxError ? new Error('El archivo no es un JSON válido') : e);
    }
  };
  return (
    <Seccion titulo="Copia de la configuración" descripcion="Descargue toda la configuración (parámetros, conceptos, tablas, festivos, turnos y formatos) para guardarla o pasarla a otra empresa. No incluye empleados ni nóminas.">
      <div className="flex flex-wrap gap-3">
        <Boton icono={<Download className="h-4 w-4" />} cargando={cargando} onClick={exportar}>
          Descargar configuración
        </Boton>
        <Boton variante="secundario" icono={<FileUp className="h-4 w-4" />} onClick={() => archivo.current?.click()}>
          Cargar configuración…
        </Boton>
        <input ref={archivo} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} />
      </div>
      {cargado && (
        <div className="mt-4 space-y-3">
          {cargado.cambios.length === 0 ? (
            <Aviso tono="exito">El archivo es igual a la configuración actual. No hay nada que cambiar.</Aviso>
          ) : (
            <>
              <Aviso tono="alerta" titulo={`Se aplicarán ${cargado.cambios.length} cambio(s)`}>
                <ul className="mt-1 max-h-60 list-disc overflow-y-auto pl-5">
                  {cargado.cambios.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </Aviso>
              <Boton
                cargando={cargando}
                onClick={async () => {
                  if (!(await confirmar({ titulo: 'Aplicar configuración', mensaje: 'Se reemplazan los valores actuales por los del archivo. Queda registrado en la auditoría.', confirmar: 'Aplicar' }))) return;
                  if (await ejecutar(() => post('/respaldo/importar', { datos: cargado.datos, aplicar: true }), 'Configuración aplicada')) setCargado(null);
                }}
              >
                Aplicar cambios
              </Boton>
            </>
          )}
        </div>
      )}
    </Seccion>
  );
}
