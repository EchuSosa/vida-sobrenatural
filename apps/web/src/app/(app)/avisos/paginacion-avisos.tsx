'use client';

import Link from 'next/link';
import { Paginacion } from '@vida-sobrenatural/ui';

/**
 * spec 012, T023 — el paginado de Avisos por URL (`?pagina=N`, docs/15
 * §Listados paginados). Envoltorio cliente porque `Paginacion` recibe una
 * función para armar cada enlace y eso no cruza desde un Server Component.
 */
export function PaginacionAvisos({
  paginaActual,
  totalPaginas,
  etiquetas,
}: {
  paginaActual: number;
  totalPaginas: number;
  etiquetas: { nav: string; anterior: string; siguiente: string };
}) {
  return (
    <Paginacion
      paginaActual={paginaActual}
      totalPaginas={totalPaginas}
      etiquetaNav={etiquetas.nav}
      etiquetaAnterior={etiquetas.anterior}
      etiquetaSiguiente={etiquetas.siguiente}
      renderEnlace={(p) => <Link href={p === 1 ? '/avisos' : `/avisos?pagina=${p}`} />}
    />
  );
}
