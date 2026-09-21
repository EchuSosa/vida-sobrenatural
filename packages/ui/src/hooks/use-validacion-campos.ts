'use client';

import { useMemo, useState } from 'react';
import type { ErrorResumen } from '../components/form-errors';

export interface ValidacionCampo<V> {
  /** true si `valor` es válido — se corre al perder el foco del campo. */
  esValido: (valor: V) => boolean;
  /** Mensaje a mostrar cuando `esValido` da false. */
  mensaje: string;
}

/**
 * H-72 (revisión manual ronda 7): pieza compartida para que un error de
 * campo se comporte igual en los seis formularios (docs/15-guia-ux-ui.md —
 * validar al salir del campo Y al enviar, hoy solo había al enviar):
 *
 * - `limpiar(campo)` en el `onChange` de cada campo — el error desaparece
 *   apenas se escribe, venga de una validación local o del servidor.
 * - `revalidar(campo, valor, validacion)` en el `onBlur` — si `valor` sigue
 *   sin cumplir `validacion.esValido`, el error vuelve con `validacion.mensaje`.
 * - `reemplazar(errores)` para los `{campo, code}` que devuelve la API al
 *   enviar (ver `erroresPorCampo`/`mensajeDeCampo` en shared-types).
 * - `resumen` (para `<ResumenErrores>`) y `mensajes` (para
 *   `<MensajeErrorCampo>`/`error`+`errorTexto` de cada campo) se derivan
 *   del mismo estado — si no quedan errores, `resumen` queda vacío y
 *   `<ResumenErrores>` desaparece sola (ya lo hace así).
 *
 * Deliberadamente NO sabe nada de mensajes de "campo vacío" ni de qué hace
 * válido a un campo — cada formulario define sus propias reglas y textos
 * (algunos con next-intl, otros con texto fijo); esta pieza solo maneja
 * CUÁNDO aparece y desaparece un error, no QUÉ dice.
 */
export function useValidacionCampos() {
  const [errores, setErrores] = useState<Record<string, string>>({});
  // H-72: cuántas veces se intentó enviar con errores — es lo que dispara el
  // foco al resumen (ver `<ResumenErrores foco>`), no el contenido de
  // `errores` en sí. Antes el resumen se enfocaba solo con `reemplazar`
  // (errores del servidor al enviar), así que derivar el foco del CONTENIDO
  // de errores era equivalente; ahora `limpiar`/`revalidar` (al escribir o
  // salir de un campo) también cambian ese contenido, y enfocar el resumen
  // en esos casos le robaría el foco al campo que la persona está usando.
  const [intentosDeEnvio, setIntentosDeEnvio] = useState(0);

  function limpiar(campo: string) {
    setErrores((actuales) => {
      if (!(campo in actuales)) return actuales;
      return Object.fromEntries(Object.entries(actuales).filter(([c]) => c !== campo));
    });
  }

  function revalidar<V>(campo: string, valor: V, validacion: ValidacionCampo<V>) {
    if (validacion.esValido(valor)) {
      limpiar(campo);
    } else {
      setErrores((actuales) => ({ ...actuales, [campo]: validacion.mensaje }));
    }
  }

  /** Reemplaza todo el mapa de errores — para los `{campo, code}` de una respuesta del servidor. */
  function reemplazar(nuevos: Record<string, string>) {
    setErrores(nuevos);
    setIntentosDeEnvio((n) => n + 1);
  }

  function reset() {
    setErrores({});
  }

  const resumen: ErrorResumen[] = useMemo(
    () => Object.entries(errores).map(([campo, mensaje]) => ({ campo, mensaje })),
    [errores],
  );

  return { mensajes: errores, resumen, limpiar, revalidar, reemplazar, reset, foco: intentosDeEnvio };
}
