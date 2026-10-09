import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 013 (T065): carga del detalle de un comentario. */
export default async function CargandoComentario() {
  const t = await getTranslations('comentarios');
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16" role="status" aria-label={t('cargando')}>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <Skeleton className="h-11 w-80" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
