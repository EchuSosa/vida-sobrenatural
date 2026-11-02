'use client';

import { useEffect, useMemo, useState } from 'react';
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
 * - **El resumen solo muestra los campos del último intento** (`reemplazar`, o
 *   `intentar(campos)` para validar un paso sin llamar a la API). Salir de un
 *   campo (`revalidar`) muestra el mensaje debajo de ESE campo y nada más: no
 *   agrega ni hace aparecer el resumen. Auditoría de tests del 2026-10-13
 *   (docs/24, hallazgo 1; opción 1 elegida por Echu el 2026-11-01): cuando el
 *   resumen aparecía al salir de un campo, la pantalla se corría justo entre
 *   que el dedo apoyaba y levantaba sobre "Siguiente" y el toque se perdía.
 *   Corregir un campo sí lo saca del resumen (`limpiar`/`revalidar` válido).
 *
 * Deliberadamente NO sabe nada de mensajes de "campo vacío" ni de qué hace
 * válido a un campo — cada formulario define sus propias reglas y textos
 * (algunos con next-intl, otros con texto fijo); esta pieza solo maneja
 * CUÁNDO aparece y desaparece un error, no QUÉ dice.
 */
/**
 * Toque perdido (docs/24, hallazgo 1): al apoyar el dedo sobre un botón, el campo enfocado pierde el
 * foco ANTES de que se levante el dedo; si `revalidar` cambia la pantalla en ese momento (aparece o
 * desaparece un mensaje), el botón se corre y el click cae afuera. Mientras haya un puntero apoyado,
 * los cambios que vienen de salir de un campo esperan a que se suelte (y a que el click se despache).
 * Con teclado (Tab) no hay puntero apoyado y el mensaje aparece en el acto.
 */
let punteroApoyado = false;
let escuchando = false;
const pendientesAlSoltar: Array<() => void> = [];

function escucharPuntero() {
  if (escuchando || typeof document === 'undefined') return;
  escuchando = true;
  document.addEventListener('pointerdown', () => {
    punteroApoyado = true;
  }, true);
  const soltar = () => {
    punteroApoyado = false;
    // Después del `click`, que el navegador despacha en la misma tanda que el `pointerup`.
    setTimeout(() => pendientesAlSoltar.splice(0).forEach((f) => f()), 0);
  };
  document.addEventListener('pointerup', soltar, true);
  document.addEventListener('pointercancel', soltar, true);
}

function cuandoSeSuelteElPuntero(cambio: () => void) {
  if (punteroApoyado) pendientesAlSoltar.push(cambio);
  else cambio();
}

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
  // Los campos que entran al resumen: los del último intento (ver arriba).
  const [camposDelIntento, setCamposDelIntento] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(escucharPuntero, []);

  function limpiar(campo: string) {
    setErrores((actuales) => {
      if (!(campo in actuales)) return actuales;
      return Object.fromEntries(Object.entries(actuales).filter(([c]) => c !== campo));
    });
  }

  function revalidar<V>(campo: string, valor: V, validacion: ValidacionCampo<V>) {
    const valido = validacion.esValido(valor);
    cuandoSeSuelteElPuntero(() => {
      if (valido) limpiar(campo);
      else setErrores((actuales) => ({ ...actuales, [campo]: validacion.mensaje }));
    });
  }

  /** Reemplaza todo el mapa de errores — para los `{campo, code}` de una respuesta del servidor. */
  function reemplazar(nuevos: Record<string, string>) {
    setErrores(nuevos);
    setCamposDelIntento(new Set(Object.keys(nuevos)));
    setIntentosDeEnvio((n) => n + 1);
  }

  /**
   * Un intento sin pasar por la API (ej. "Siguiente" en un formulario por pasos): el resumen
   * muestra, de estos campos, los que tienen error, y el foco va al resumen. Llamarlo DESPUÉS de
   * `revalidar` de cada campo.
   */
  function intentar(campos: readonly string[]) {
    setCamposDelIntento(new Set(campos));
    setIntentosDeEnvio((n) => n + 1);
  }

  function reset() {
    setErrores({});
    setCamposDelIntento(new Set());
  }

  const resumen: ErrorResumen[] = useMemo(
    () => Object.entries(errores).filter(([campo]) => camposDelIntento.has(campo)).map(([campo, mensaje]) => ({ campo, mensaje })),
    [errores, camposDelIntento],
  );

  return { mensajes: errores, resumen, limpiar, revalidar, reemplazar, intentar, reset, foco: intentosDeEnvio };
}
