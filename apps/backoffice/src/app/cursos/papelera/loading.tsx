import { getTranslations } from 'next-intl/server';
import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

/** Cargando (spec 013, T074). */
export default async function Cargando() {
  const t = await getTranslations('cursos');
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16" aria-busy="true" aria-label={t('cargando')}>
      <Skeleton className="h-8 w-48" />
      <TablaEsqueleto columnas={[{ id: 'nombre', encabezado: t('columnas.nombre') }, { id: 'estado', encabezado: t('columnas.estado') }]} />
    </div>
  );
}
