'use client';

import { BookOpen, Keyboard, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Buscador, Encabezado, Tarjeta } from '@/components/ui';

const TEMAS: { grupo: string; titulo: string; texto: string; enlace?: { href: string; texto: string } }[] = [
  { grupo: 'Para empezar', titulo: '¿Por dónde empiezo?', texto: 'Use el asistente de primeros pasos: datos de la empresa, días laborales, sedes, valores de ley, marcación y empleados. Todo se puede cambiar después.', enlace: { href: '/asistente', texto: 'Abrir el asistente' } },
  { grupo: 'Para empezar', titulo: '¿Los valores de ley ya vienen cargados?', texto: 'Sí: salario mínimo, auxilio de transporte, UVT, porcentajes de salud, pensión, ARL, parafiscales, recargos (Ley 2466 de 2025), jornada máxima, tablas de retención y fondo de solidaridad. Cada valor tiene fecha de vigencia y su base legal.', enlace: { href: '/configuracion?seccion=parametros', texto: 'Ver parámetros' } },
  { grupo: 'Configuración', titulo: 'Cambiar el salario mínimo o cualquier valor legal', texto: 'En Configuración > Parámetros abra el valor y agregue el nuevo con la fecha desde la que rige. El anterior se conserva, así las nóminas viejas se pueden recalcular igual.', enlace: { href: '/configuracion?seccion=parametros', texto: 'Ir a parámetros' } },
  { grupo: 'Configuración', titulo: 'Días laborales, sábados y domingos', texto: 'En Configuración > Días laborales marque qué días se trabaja, cuál es el descanso obligatorio y si el sábado cuenta como hábil para vacaciones. Cada sede, área o grupo de pago puede tener los suyos.', enlace: { href: '/configuracion?seccion=calendario', texto: 'Ir a días laborales' } },
  { grupo: 'Configuración', titulo: 'Crear un bono, auxilio o descuento', texto: 'En Configuración > Conceptos cree uno nuevo. Elija una plantilla (valor fijo, porcentaje del salario, valor por hora) o escriba la fórmula como en Excel. Marque si es salario y en qué bases influye; pruébelo con un empleado antes de activarlo.', enlace: { href: '/configuracion?seccion=conceptos', texto: 'Ir a conceptos' } },
  { grupo: 'Configuración', titulo: 'Cómo escribir fórmulas', texto: 'Decimales con coma (0,5) y separe los argumentos con punto y coma. Funciones: SI(condición; sí; no), Y, O, NO, MIN, MAX, ABS, REDONDEAR, TRUNCAR y TABLA(\'NOMBRE\'; valor). Variables: SALARIO, DIAS_SALARIO, SMMLV, VALOR_HORA y muchas más en el panel «Insertar».' },
  { grupo: 'Asistencia', titulo: 'Cómo marcan los empleados', texto: 'En la entrada de cada sede se muestra un código QR que cambia cada 30 segundos. El empleado lo escanea con su celular vinculado. Quien no tenga celular marca en el kiosco con su cédula y un PIN de 4 dígitos, o lo registra el supervisor.', enlace: { href: '/asistencia?pestana=qr', texto: 'Pantalla del QR' } },
  { grupo: 'Asistencia', titulo: 'Vincular el celular de un empleado', texto: 'En la ficha del empleado use «Vincular celular». Aparece un código QR y un código de 6 dígitos; el empleado lo abre en su celular, acepta el tratamiento de datos y queda vinculado. Un celular por empleado.' },
  { grupo: 'Asistencia', titulo: 'Horas extra', texto: 'Se calculan solas al comparar las marcaciones con el turno: extra diurna, nocturna, dominical y festiva, y recargo nocturno desde las 7:00 p. m. Quedan pendientes hasta que las apruebe; sin aprobar no pasan a la nómina.', enlace: { href: '/asistencia?pestana=horas', texto: 'Horas por aprobar' } },
  { grupo: 'Nómina', titulo: 'Liquidar la nómina', texto: 'Nómina > Nuevo periodo > Liquidar. Revise el comparativo con el periodo anterior y las alertas, apruebe y cierre. Al cerrar se generan los pagos y se actualizan saldos de préstamos y vacaciones.', enlace: { href: '/nomina', texto: 'Ir a nómina' } },
  { grupo: 'Nómina', titulo: '¿Cómo se calculó este valor?', texto: 'En el detalle del periodo toque un empleado y luego cualquier valor: verá la fórmula, cada variable con su valor, los tramos si cambió el salario o un parámetro, la regla del 40 % y la depuración de la retención.' },
  { grupo: 'Nómina', titulo: 'Corregir una nómina cerrada', texto: 'Use «Reabrir» con un motivo (queda en la auditoría) o, si el cambio vino después (aumento retroactivo), use «Retroactivo» en el periodo actual para pagar las diferencias.' },
  { grupo: 'Nómina', titulo: 'Archivo para el banco y la contabilidad', texto: 'En el periodo, pestaña Pagos: elija el banco y descargue el archivo. En Contabilidad descargue el comprobante para Siigo, World Office, Helisa o CSV. Puede crear formatos propios en Configuración.' },
  { grupo: 'Prestaciones', titulo: 'Prima, cesantías e intereses', texto: 'En Prestaciones elija el semestre o el año y liquide. El sistema toma el salario, el promedio de lo variable y el auxilio de transporte. Para cesantías verá cuánto consignar a cada fondo.', enlace: { href: '/prestaciones', texto: 'Ir a prestaciones' } },
  { grupo: 'Retiros', titulo: 'Liquidar un contrato', texto: 'En Retiros elija el empleado, la fecha y la causa. Si es despido sin justa causa se calcula la indemnización (CST art. 64). Si paga después de la fecha de retiro, se calcula la moratoria (art. 65).', enlace: { href: '/retiros', texto: 'Ir a retiros' } },
  { grupo: 'Seguridad', titulo: 'Usuarios y auditoría', texto: 'Cada cambio queda registrado con quién, cuándo, qué había antes y qué quedó; ese registro no se puede borrar. Cree usuarios con roles distintos en Configuración > Usuarios.', enlace: { href: '/reportes', texto: 'Ver auditoría en Reportes' } },
];

const ATAJOS = [
  { teclas: 'Ctrl + K', accion: 'Buscar empleados y pantallas' },
  { teclas: 'Esc', accion: 'Cerrar una ventana' },
  { teclas: 'Tab', accion: 'Pasar al siguiente campo' },
];

export default function Ayuda() {
  const [q, setQ] = useState('');
  const filtrados = useMemo(() => {
    const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return TEMAS.filter((t) => !q || n(`${t.titulo} ${t.texto}`).includes(n(q)));
  }, [q]);
  const grupos = [...new Set(filtrados.map((t) => t.grupo))];
  return (
    <>
      <Encabezado titulo="Ayuda" descripcion="Respuestas cortas a lo que más se pregunta." />
      <Buscador valor={q} onCambio={setQ} placeholder="¿Qué necesita hacer? Ej.: horas extra, prima, fórmula" className="mb-6 max-w-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {grupos.map((g) => (
            <section key={g}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-suave">
                <BookOpen className="h-4 w-4" /> {g}
              </h2>
              <div className="space-y-2">
                {filtrados
                  .filter((t) => t.grupo === g)
                  .map((t) => (
                    <details key={t.titulo} className="group rounded-2xl border border-borde bg-tarjeta p-4 shadow-suave" open={!!q}>
                      <summary className="cursor-pointer list-none font-medium">{t.titulo}</summary>
                      <p className="mt-2 text-suave">{t.texto}</p>
                      {t.enlace && (
                        <Link href={t.enlace.href} className="mt-2 inline-block font-medium text-marca-600 hover:underline">
                          {t.enlace.texto} →
                        </Link>
                      )}
                    </details>
                  ))}
              </div>
            </section>
          ))}
          {!filtrados.length && (
            <p className="flex items-center gap-2 text-suave">
              <Search className="h-4 w-4" /> No encontramos ese tema. Pruebe con otras palabras.
            </p>
          )}
        </div>
        <div className="space-y-5">
          <Tarjeta titulo={<span className="flex items-center gap-2"><Keyboard className="h-5 w-5" /> Atajos</span>}>
            <ul className="space-y-2 text-sm">
              {ATAJOS.map((a) => (
                <li key={a.teclas} className="flex items-center justify-between gap-3">
                  <kbd className="rounded-lg border border-borde bg-fondo px-2 py-0.5 font-mono text-xs">{a.teclas}</kbd>
                  <span className="text-right text-suave">{a.accion}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
          <Tarjeta titulo="Base legal">
            <p className="text-sm text-suave">Los cálculos siguen el Código Sustantivo del Trabajo con las reformas de la Ley 2466 de 2025, la Ley 2101 de 2021 (jornada), la Ley 100 de 1993 (seguridad social) y el Estatuto Tributario (retención, art. 383 y 387). Los valores se pueden ajustar si cambia la norma.</p>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
