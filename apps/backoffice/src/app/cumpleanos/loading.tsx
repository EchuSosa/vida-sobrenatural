import { getTranslations } from 'next-intl/server';
import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

/** Cargando el listado de cumpleaños (spec 013, T052). */
export default async function CargandoCumpleanos() {
  const t = await getTranslations('cumpleanos');
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16" aria-busy="true" aria-label={t('cargando')}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-11 w-full" />
      <TablaEsqueleto
        columnas={[
          { id: 'nombre', encabezado: t('columnas.nombre') },
          { id: 'dia', encabezado: t('columnas.dia') },
          { id: 'telefono', encabezado: t('columnas.telefono'), className: 'hidden sm:table-cell' },
        ]}
      />
    </div>
  );
}
