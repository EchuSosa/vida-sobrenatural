'use client';

import Link from 'next/link';
import type { FiltroRevisado, TipoComentario } from '@vida-sobrenatural/shared-types';
import { Paginacion } from '@vida-sobrenatural/ui';
import { hrefComentarios } from './href';

/** Los enlaces de página del listado de comentarios (conserva los filtros). */
export function PaginacionComentarios({
  revisado,
  tipo,
  paginaActual,
  totalPaginas,
  etiqueta,
}: {
  revisado: FiltroRevisado;
  tipo?: TipoComentario;
  paginaActual: number;
  totalPaginas: number;
  etiqueta: string;
}) {
  return (
    <Paginacion
      paginaActual={paginaActual}
      totalPaginas={totalPaginas}
      renderEnlace={(p) => <Link href={hrefComentarios({ revisado, tipo, pagina: p })} />}
      etiquetaNav={etiqueta}
    />
  );
}
