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
 * `id={`campo-${campo}`}` para que los enlaces funcionen. Se enfoca solo
 * cuando el conjunto de errores cambia (aparece por primera vez, o cambia
 * tras un nuevo intento de envío) — no en cada render del formulario.
 */
export function ResumenErrores({
  errores,
  titulo = 'Revisá estos campos:',
}: {
  errores: ErrorResumen[];
  titulo?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const clave = errores.map((e) => `${e.campo}:${e.mensaje}`).join('|');

  useEffect(() => {
    if (errores.length > 0) {
      ref.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  if (errores.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 outline-none dark:border-red-800 dark:bg-red-950 dark:text-red-300"
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
