'use client';

import Link from 'next/link';
import { Paginacion } from '@vida-sobrenatural/ui';

/** Los enlaces de página del listado de cumpleaños (`?mes=` se conserva). */
export function PaginacionCumpleanos({ mes, paginaActual, totalPaginas, etiqueta }: { mes: number; paginaActual: number; totalPaginas: number; etiqueta: string }) {
  return (
    <Paginacion
      paginaActual={paginaActual}
      totalPaginas={totalPaginas}
      renderEnlace={(p) => <Link href={`/cumpleanos?mes=${mes}${p > 1 ? `&pagina=${p}` : ''}`} />}
      etiquetaNav={etiqueta}
    />
  );
}
