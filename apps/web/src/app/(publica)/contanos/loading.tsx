import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 013 (T064): carga de /contanos — título y el formulario. */
export default async function CargandoContanos() {
  const t = await getTranslations('comentarios');
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12" role="status" aria-label={t('cargando')}>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-11 w-32 self-end" />
    </div>
  );
}
