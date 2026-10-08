'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { formatearFechaHora, type ComentarioResumen, type Pagina } from '@vida-sobrenatural/shared-types';
import { useDatosApi } from '../../hooks/use-datos-api';
import { TipoConIcono } from '../comentarios/marcas';
import { Bloque } from './bloque';

/**
 * spec 013 (T065, FR-046, SC-006): cuántos comentarios hay sin revisar y los 5
 * más recientes, con enlace a cada uno y al listado. Carga y falla solo (D209).
 */
export function BloqueComentarios({ apiToken }: { apiToken: string }) {
  const t = useTranslations('comentarios');
  const locale = useLocale();
  // El filtro por defecto es "Sin revisar": `total` es la cantidad sin revisar.
  const carga = useDatosApi<Pagina<ComentarioResumen>>('/comentarios?take=5', apiToken);

  return (
    <Bloque
      id="bloque-comentarios"
      titulo={t('bloque.titulo')}
      estado={carga.estado}
      mensajeError={t('bloque.error')}
      etiquetaReintentar={t('reintentar')}
      etiquetaCargando={t('cargando')}
      reintentar={carga.reintentar}
    >
      {carga.estado === 'listo' && (
        <div className="flex flex-col gap-3">
          {carga.datos.total === 0 ? (
            <p>{t('bloque.vacio')}</p>
          ) : (
            <>
              <p>{t('bloque.cuantos', { n: carga.datos.total })}</p>
              <ul className="flex flex-col gap-3">
                {carga.datos.items.map((c) => (
                  <li key={c.id} className="flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-x-3 text-sm">
                      <TipoConIcono tipo={c.tipo} texto={t(`tipo.${c.tipo}`)} />
                      <span className="text-muted-foreground">{formatearFechaHora(c.createdAt, locale)}</span>
                    </span>
                    <Link href={`/comentarios/${c.id}`} className="break-words underline underline-offset-4">
                      {c.extracto}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link href="/comentarios" className="flex min-h-11 items-center self-start underline underline-offset-4">
            {t('bloque.verTodos')}
          </Link>
        </div>
      )}
    </Bloque>
  );
}
