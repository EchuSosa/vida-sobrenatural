'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * H-57 (revisión manual, docs/15-guia-ux-ui.md: "mientras una acción se
 * procesa: botón en estado de carga y bloqueado, para evitar envíos
 * duplicados" — y la fila "Acción en curso" de docs/16-sistemas-
 * transversales.md): envuelve un envío asincrónico y expone `enviando`
 * para el estado de carga del botón.
 *
 * El guard real vive en `enCursoRef` (un ref, no el estado `enviando`):
 * `useState` se actualiza en el próximo render, así que dos clics muy
 * seguidos podían pasar la guarda ANTES de que `enviando` pasara a
 * `true` — el ref cambia de forma síncrona, en el mismo clic. El botón
 * en estado de carga evita el reintento normal; este guard es lo que
 * evita el que ya pasó (doble clic, Enter en un campo que dispara el
 * submit del formulario sin pasar por el botón).
 */
export function useEnvio<Args extends unknown[]>(accion: (...args: Args) => Promise<void>) {
  const [enviando, setEnviando] = useState(false);
  const enCursoRef = useRef(false);

  const ejecutar = useCallback(
    async (...args: Args) => {
      if (enCursoRef.current) return;
      enCursoRef.current = true;
      setEnviando(true);
      try {
        await accion(...args);
      } finally {
        enCursoRef.current = false;
        setEnviando(false);
      }
    },
    [accion],
  );

  return { enviando, ejecutar };
}
