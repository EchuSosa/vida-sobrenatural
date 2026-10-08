'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@vida-sobrenatural/shared-types';

export type EstadoCarga<T> = { estado: 'cargando' } | { estado: 'error' } | { estado: 'listo'; datos: T };

/**
 * spec 013 (D209): los datos de UN bloque, pedidos desde el navegador para
 * que cada bloque cargue y falle solo, con su "Reintentar" (Inicio del
 * backoffice). Nace en 'cargando'; `reintentar` vuelve a pedir. Con `ruta`
 * null no pide nada (un dato que esa sesión no puede ver).
 */
export function useDatosApi<T>(ruta: string | null, apiToken: string): EstadoCarga<T> & { reintentar: () => void } {
  const [carga, setCarga] = useState<EstadoCarga<T>>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (ruta === null) return;
    let vigente = true;
    apiFetch<T>(ruta, { headers: { Authorization: `Bearer ${apiToken}` }, cache: 'no-store' })
      .then((datos) => vigente && setCarga({ estado: 'listo', datos }))
      .catch(() => vigente && setCarga({ estado: 'error' }));
    return () => {
      vigente = false;
    };
  }, [ruta, apiToken, intento]);

  const reintentar = useCallback(() => {
    setCarga({ estado: 'cargando' });
    setIntento((n) => n + 1);
  }, []);

  return { ...carga, reintentar };
}
