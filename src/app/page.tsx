'use client';

import { Building2, Copy, ExternalLink, KeyRound, LogIn, LogOut, Pencil, Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AvisosSesion, FormularioIngreso } from '@/components/ingreso';
import { Logo } from '@/components/logo';
import { Aviso, Boton, Campo, Cargando, Encabezado, Entrada, Insignia, Modal, Tabla, Tarjeta, useAccion, useAvisos, Vacio } from '@/components/ui';
import { guardarEspacio, guardarToken, guardarTokenPlataforma, obtenerTokenPlataforma, plataforma } from '@/lib/api';
import { fecha, fechaHora, numero } from '@/lib/formato';

/** Igual que en el servidor: "Alcaldía de Pasto" → "alcaldia-de-pasto". */
const aEspacio = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40);

const enlace = (espacio: string) => (typeof window !== 'undefined' ? `${window.location.origin}/${espacio}` : `/${espacio}`);

/** Página principal: el espacio del administrador de la plataforma. */
function Plataforma() {
  const q = useSearchParams();
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => setToken(obtenerTokenPlataforma()), []);

  if (token === undefined) return <Cargando />;
  if (!token)
    return (
      <FormularioIngreso
        titulo="Administración de la plataforma"
        subtitulo="Cree y administre los espacios de cada empresa."
        avisos={<AvisosSesion vencida={!!q.get('vencida')} />}
        alEntrar={async (usuario, password) => {
          const r = await plataforma.post<{ token: string }>('/plataforma/login', { usuario, password });
          guardarTokenPlataforma(r.token);
          setToken(r.token);
        }}
      />
    );
  return (
    <Panel
      salir={() => {
        guardarTokenPlataforma(null);
        setToken(null);
      }}
    />
  );
}

function Panel({ salir }: { salir: () => void }) {
  const [espacios, setEspacios] = useState<any[] | null>(null);
  const [yo, setYo] = useState<any>(null);
  const [nuevo, setNuevo] = useState<{ espacio: string; usuario: string; password: string } | null>(null);
  const [creado, setCreado] = useState<any>(null);
  const [renombrar, setRenombrar] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<{ espacio: any; lista: any[] } | null>(null);
  const [clave, setClave] = useState<{ usuario: any; password: string } | null>(null);
  const { ejecutar, cargando } = useAccion();
  const { avisar, error } = useAvisos();

  const recargar = () => plataforma.get<any[]>('/plataforma/espacios').then(setEspacios).catch(error);
  useEffect(() => {
    recargar();
    plataforma.get('/plataforma/yo').then(setYo).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copiar = (espacio: string) => navigator.clipboard.writeText(enlace(espacio)).then(() => avisar('Enlace copiado'));
  const entrar = async (e: any) => {
    const r: any = await ejecutar(() => plataforma.post(`/plataforma/espacios/${e.id}/entrar`));
    if (!r) return;
    guardarToken(r.token);
    guardarEspacio(r.espacio);
    window.location.href = '/inicio';
  };
  const verUsuarios = async (e: any) => {
    const lista = await ejecutar(() => plataforma.get<any[]>(`/plataforma/espacios/${e.id}/usuarios`));
    if (lista) setUsuarios({ espacio: e, lista });
  };

  return (
    <div className="min-h-screen bg-fondo">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-borde bg-tarjeta/90 px-4 backdrop-blur sm:px-8">
        <Logo tamano={30} />
        <Insignia tono="marca">Plataforma</Insignia>
        <span className="ml-auto text-sm text-suave">{yo?.nombre}</span>
        <Boton tamano="sm" variante="fantasma" icono={<LogOut className="h-4 w-4" />} onClick={salir}>
          Salir
        </Boton>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">
        <Encabezado
          titulo="Espacios de trabajo"
          descripcion="Cada empresa tiene su propio espacio, con su enlace, sus usuarios y sus datos, separado de las demás."
          acciones={
            <Boton icono={<Plus className="h-4 w-4" />} onClick={() => setNuevo({ espacio: '', usuario: '', password: '' })}>
              Nuevo espacio
            </Boton>
          }
        />
        <Tarjeta>
          {!espacios ? (
            <Cargando />
          ) : espacios.length === 0 ? (
            <Vacio icono={<Building2 className="h-8 w-8" />} titulo="Aún no hay espacios" accion={<Boton onClick={() => setNuevo({ espacio: '', usuario: '', password: '' })}>Crear el primero</Boton>} />
          ) : (
            <Tabla
              filas={espacios}
              clave={(e: any) => e.id}
              columnas={[
                {
                  clave: 'espacio',
                  titulo: 'Espacio',
                  celda: (e: any) => (
                    <div>
                      <p className="font-medium">/{e.espacio}</p>
                      <p className="text-sm text-suave">{e.asistenteCompletado ? e.razonSocial : 'Sin configurar todavía'}</p>
                    </div>
                  ),
                },
                { clave: 'empleados', titulo: 'Empleados', derecha: true, celda: (e: any) => numero(e.empleados) },
                { clave: 'usuarios', titulo: 'Usuarios', derecha: true, celda: (e: any) => numero(e.usuarios) },
                { clave: 'ultimo', titulo: 'Último ingreso', celda: (e: any) => (e.ultimoAcceso ? fechaHora(e.ultimoAcceso) : 'Nunca') },
                { clave: 'creado', titulo: 'Creado', celda: (e: any) => fecha(e.creadoEn) },
                {
                  clave: 'acc',
                  titulo: '',
                  celda: (e: any) => (
                    <div className="flex flex-wrap justify-end gap-1">
                      <Boton tamano="sm" variante="fantasma" aria-label="Copiar enlace" icono={<Copy className="h-4 w-4" />} onClick={() => copiar(e.espacio)} />
                      <Boton tamano="sm" variante="fantasma" aria-label="Cambiar nombre del espacio" icono={<Pencil className="h-4 w-4" />} onClick={() => setRenombrar({ ...e, nuevo: e.espacio })} />
                      <Boton tamano="sm" variante="fantasma" aria-label="Usuarios y contraseñas" icono={<KeyRound className="h-4 w-4" />} onClick={() => verUsuarios(e)} />
                      <Boton tamano="sm" variante="secundario" icono={<LogIn className="h-4 w-4" />} onClick={() => entrar(e)}>
                        Entrar
                      </Boton>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Tarjeta>
      </main>

      <Modal
        abierto={!!nuevo}
        onCerrar={() => setNuevo(null)}
        titulo="Nuevo espacio de trabajo"
        pie={
          <Boton
            cargando={cargando}
            onClick={async () => {
              const r = await ejecutar(() => plataforma.post('/plataforma/espacios', nuevo), 'Espacio creado');
              if (r) {
                setCreado({ ...r, usuario: nuevo!.usuario });
                setNuevo(null);
                recargar();
              }
            }}
          >
            Crear espacio
          </Boton>
        }
      >
        {nuevo && (
          <div className="space-y-4">
            <Campo etiqueta="Nombre del espacio" ayuda="Es la dirección por la que entra la empresa. Solo minúsculas, números y guiones.">
              <Entrada value={nuevo.espacio} placeholder="nombre-de-la-empresa" onChange={(e) => setNuevo({ ...nuevo, espacio: aEspacio(e.target.value) })} autoFocus />
            </Campo>
            {nuevo.espacio && <p className="text-sm text-suave">Enlace: <b>{enlace(nuevo.espacio)}</b></p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Usuario del superusuario">
                <Entrada value={nuevo.usuario} autoComplete="off" onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value.trim() })} />
              </Campo>
              <Campo etiqueta="Contraseña" ayuda="Mínimo 8 caracteres. Désela a la empresa.">
                <Entrada value={nuevo.password} autoComplete="new-password" onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} />
              </Campo>
            </div>
            <Aviso>La empresa pone su razón social, NIT y demás datos cuando entre por primera vez, en el asistente de primeros pasos.</Aviso>
          </div>
        )}
      </Modal>

      <Modal abierto={!!creado} onCerrar={() => setCreado(null)} titulo="Espacio listo" ancho="sm">
        {creado && (
          <div className="space-y-4">
            <p>Envíele a la empresa estos datos para entrar:</p>
            <div className="space-y-1 rounded-xl bg-fondo p-4 text-sm">
              <p>
                Enlace: <b>{enlace(creado.espacio)}</b>
              </p>
              <p>
                Usuario: <b>{creado.usuario}</b>
              </p>
              <p>Contraseña: la que usted le asignó</p>
            </div>
            <div className="flex gap-2">
              <Boton variante="secundario" icono={<Copy className="h-4 w-4" />} onClick={() => copiar(creado.espacio)}>
                Copiar enlace
              </Boton>
              <a href={enlace(creado.espacio)} target="_blank" rel="noreferrer">
                <Boton variante="fantasma" icono={<ExternalLink className="h-4 w-4" />}>
                  Abrir
                </Boton>
              </a>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        abierto={!!renombrar}
        onCerrar={() => setRenombrar(null)}
        titulo="Cambiar el nombre del espacio"
        ancho="sm"
        pie={
          <Boton
            cargando={cargando}
            onClick={async () => {
              if (await ejecutar(() => plataforma.patch(`/plataforma/espacios/${renombrar.id}`, { espacio: renombrar.nuevo }), 'Nombre del espacio cambiado')) {
                setRenombrar(null);
                recargar();
              }
            }}
          >
            Guardar
          </Boton>
        }
      >
        {renombrar && (
          <div className="space-y-3">
            <Campo etiqueta="Nombre del espacio">
              <Entrada value={renombrar.nuevo} onChange={(e) => setRenombrar({ ...renombrar, nuevo: aEspacio(e.target.value) })} />
            </Campo>
            <p className="text-sm text-suave">Nuevo enlace: <b>{enlace(renombrar.nuevo)}</b></p>
            <Aviso tono="alerta">El enlace anterior deja de funcionar. Avísele a la empresa.</Aviso>
          </div>
        )}
      </Modal>

      <Modal abierto={!!usuarios} onCerrar={() => setUsuarios(null)} titulo={usuarios ? `Usuarios de /${usuarios.espacio.espacio}` : ''} ancho="lg">
        {usuarios && (
          <Tabla
            filas={usuarios.lista}
            clave={(u: any) => u.id}
            columnas={[
              { clave: 'usuario', titulo: 'Usuario', celda: (u: any) => <span className="font-medium">{u.usuario}</span> },
              { clave: 'rol', titulo: 'Rol', celda: (u: any) => (u.rol === 'superusuario' ? 'Superusuario' : u.rol) },
              { clave: 'ultimo', titulo: 'Último ingreso', celda: (u: any) => (u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : 'Nunca') },
              {
                clave: 'acc',
                titulo: '',
                celda: (u: any) => (
                  <Boton tamano="sm" variante="secundario" icono={<KeyRound className="h-4 w-4" />} onClick={() => setClave({ usuario: u, password: '' })}>
                    Nueva contraseña
                  </Boton>
                ),
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        abierto={!!clave}
        onCerrar={() => setClave(null)}
        titulo={clave ? `Nueva contraseña para ${clave.usuario.usuario}` : ''}
        ancho="sm"
        pie={
          <Boton
            cargando={cargando}
            onClick={async () => {
              if (await ejecutar(() => plataforma.post(`/plataforma/espacios/${usuarios!.espacio.id}/usuarios/${clave!.usuario.id}/password`, { password: clave!.password }), 'Contraseña cambiada')) setClave(null);
            }}
          >
            Guardar
          </Boton>
        }
      >
        {clave && (
          <Campo etiqueta="Contraseña" ayuda="Mínimo 8 caracteres. También desbloquea al usuario si estaba bloqueado.">
            <Entrada value={clave.password} autoComplete="new-password" onChange={(e) => setClave({ ...clave, password: e.target.value })} autoFocus />
          </Campo>
        )}
      </Modal>
    </div>
  );
}

export default function PaginaPlataforma() {
  return (
    <Suspense fallback={<Cargando />}>
      <Plataforma />
    </Suspense>
  );
}
