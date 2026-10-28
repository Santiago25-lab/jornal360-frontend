'use client';

import { Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { archivoABase64, descargarBase64, get, post } from '@/lib/api';
import { Aviso, Boton, Modal, useAvisos } from './ui';

/** Carga masiva desde Excel: plantilla, validación fila por fila y confirmación (HU-39, HU-59). */
export function Importador({
  abierto,
  onCerrar,
  titulo,
  tipo,
  descripcion,
  alTerminar,
  rutaPlantilla,
  rutaImportar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  tipo: 'empleados' | 'novedades' | 'saldos' | 'horas';
  descripcion: string;
  alTerminar?: () => void;
  rutaPlantilla?: string;
  rutaImportar?: string;
}) {
  const { avisar, error } = useAvisos();
  const [archivo, setArchivo] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [revision, setRevision] = useState<{ validas: number; errores: { fila: number; mensaje: string }[] } | null>(null);
  const [cargando, setCargando] = useState(false);
  const urlPlantilla = rutaPlantilla ?? (tipo === 'horas' ? '/asistencia/horas/plantilla' : `/novedades/plantilla/${tipo}`);
  const urlImportar = rutaImportar ?? (tipo === 'horas' ? '/asistencia/horas/importar' : `/novedades/importar/${tipo}`);

  const cerrar = () => {
    setArchivo(null);
    setRevision(null);
    setNombre('');
    onCerrar();
  };

  const elegir = async (f: File | undefined) => {
    if (!f) return;
    setNombre(f.name);
    setCargando(true);
    try {
      const b64 = await archivoABase64(f);
      setArchivo(b64);
      setRevision(await post(urlImportar, { archivoBase64: b64, confirmar: false }));
    } catch (e) {
      error(e);
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    if (!archivo) return;
    setCargando(true);
    try {
      const r = await post(urlImportar, { archivoBase64: archivo, confirmar: true });
      avisar(`Se cargaron ${r.importadas} registros`);
      alTerminar?.();
      cerrar();
    } catch (e) {
      error(e);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={titulo}
      pie={
        <>
          <Boton variante="secundario" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton onClick={confirmar} disabled={!revision?.validas} cargando={cargando}>
            Cargar {revision?.validas ? `${revision.validas} filas válidas` : ''}
          </Boton>
        </>
      }
    >
      <p className="text-suave">{descripcion}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Boton
          variante="secundario"
          icono={<Download className="h-4 w-4" />}
          onClick={async () => {
            try {
              const p = await get(urlPlantilla);
              descargarBase64(p.archivoBase64, p.nombre);
            } catch (e) {
              error(e);
            }
          }}
        >
          Descargar plantilla
        </Boton>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-marca-500 px-4 font-medium text-white hover:bg-marca-600">
          <Upload className="h-4 w-4" /> Subir archivo
          <input type="file" accept=".xlsx" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
        </label>
      </div>
      {nombre && <p className="mt-3 text-sm text-suave">Archivo: {nombre}</p>}
      {revision && (
        <div className="mt-4 space-y-3">
          <Aviso tono={revision.errores.length ? 'alerta' : 'exito'} titulo={`${revision.validas} filas válidas · ${revision.errores.length} con errores`}>
            {revision.errores.length ? 'Las filas con errores no se cargan. Corríjalas en el archivo y vuelva a subirlo, o cargue solo las válidas.' : 'Todo está listo para cargar.'}
          </Aviso>
          {revision.errores.length > 0 && (
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-borde p-3 text-sm">
              {revision.errores.map((e, i) => (
                <li key={i}>
                  <span className="font-medium">Fila {e.fila}:</span> {e.mensaje}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
