'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Paginacion } from '@vida-sobrenatural/ui';

/** La paginación de la cartelera: `Paginacion` recibe una función, así que se arma del lado del cliente. */
export function PaginacionEventos({ paginaActual, totalPaginas }: { paginaActual: number; totalPaginas: number }) {
  const t = useTranslations('eventos.publico');
  return (
    <Paginacion
      paginaActual={paginaActual}
      totalPaginas={totalPaginas}
      renderEnlace={(p) => <Link href={p <= 1 ? '/eventos' : `/eventos?pagina=${p}`} />}
      etiquetaNav={t('paginado')}
      etiquetaAnterior={t('anterior')}
      etiquetaSiguiente={t('siguiente')}
    />
  );
}
