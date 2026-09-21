'use client';

import { useEffect, useRef } from 'react';

export interface ErrorResumen {
  campo: string;
  mensaje: string;
}

/**
 * Resumen de errores de formulario — H-50 (revisión manual ronda 4),
 * docs/15-guia-ux-ui.md: "resumen arriba con enlaces a cada campo, foco
 * movido al resumen" al enviar con errores. Cada campo tiene que tener
 * `id={`campo-${campo}`}` para que los enlaces funcionen.
 *
 * `foco` (H-72, `useValidacionCampos().foco`) es lo que dispara el efecto de
 * abajo — un contador que solo avanza en un intento de envío. Antes de H-72
 * se derivaba del CONTENIDO de `errores`, que entonces solo cambiaba al
 * enviar; con la revalidación al escribir/salir de un campo (H-72) ese
 * contenido cambia todo el tiempo, y enfocar el resumen en esos casos le
 * robaría el foco al campo que la persona está usando en ese momento.
 */
export function ResumenErrores({
  errores,
  titulo = 'Revisá estos campos:',
  foco,
}: {
  errores: ErrorResumen[];
  titulo?: string;
  foco?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const clave = errores.map((e) => `${e.campo}:${e.mensaje}`).join('|');

  useEffect(() => {
    if (errores.length > 0) {
      ref.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `foco` (si se pasa) es la única dependencia real: un contador que solo avanza en un intento de envío. Sin él, se cae al viejo comportamiento por `clave` (contenido) para no romper un uso directo sin el hook.
  }, [foco ?? clave]);

  if (errores.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive outline-none"
    >
      <p className="font-medium">{titulo}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errores.map(({ campo, mensaje }) => (
          <li key={campo}>
            <a
              href={`#campo-${campo}`}
              className="underline underline-offset-2 hover:no-underline"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`campo-${campo}`)?.focus();
              }}
            >
              {mensaje}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Mensaje de error debajo de un campo — asociarlo con `aria-describedby={id}`
 * en el input. Sin `role="alert"` a propósito: el `<ResumenErrores>` ya
 * anuncia los errores una sola vez al enviar (`role="alert"` ahí); ponerlo
 * también acá anunciaría cada campo por separado y en simultáneo, ruidoso
 * con más de un campo con error (Principio IV) — `aria-describedby` alcanza
 * para que un lector de pantalla lo lea al enfocar el campo.
 */
export function MensajeErrorCampo({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} className="text-sm font-normal text-destructive">
      {mensaje}
    </p>
  );
}
