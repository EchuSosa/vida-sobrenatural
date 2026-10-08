import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@vida-sobrenatural/ui';

/** Cargando el perfil (spec 013, T033): la forma de la cabecera y de los datos. */
export default async function CargandoPerfil() {
  const t = await getTranslations('perfil');
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-16" aria-busy="true" aria-label={t('cargando')}>
      <Skeleton className="h-4 w-40" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
