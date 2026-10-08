import { getTranslations } from 'next-intl/server';
import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

/** spec 012, T048 — "cargando" de Notificaciones (Principio VIII). */
export default async function CargandoNotificaciones() {
  const t = await getTranslations('notificaciones.columnas');
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <TablaEsqueleto
        columnas={[
          { id: 'titulo', encabezado: t('titulo') },
          { id: 'alcance', encabezado: t('alcance'), className: 'hidden sm:table-cell' },
          { id: 'leidas', encabezado: t('leidas'), className: 'hidden md:table-cell' },
          { id: 'fecha', encabezado: t('fecha'), className: 'hidden lg:table-cell' },
        ]}
        conAcciones
      />
    </div>
  );
}
