import { getTranslations } from 'next-intl/server';
import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

/** Estado de carga de la bandeja: la forma del listado mientras responde GET /solicitudes (spec 013, T024). */
export default async function CargandoSolicitudes() {
  const t = await getTranslations('bandeja');
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16" aria-busy="true" aria-label={t('cargando')}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <TablaEsqueleto
        conAcciones
        encabezadoAcciones={t('columnas.acciones')}
        columnas={[
          { id: 'persona', encabezado: t('columnas.persona') },
          { id: 'estado', encabezado: t('columnas.estado') },
          { id: 'espera', encabezado: t('columnas.espera'), className: 'hidden sm:table-cell' },
          { id: 'pedida', encabezado: t('columnas.pedida'), className: 'hidden md:table-cell' },
          { id: 'cargadaPor', encabezado: t('columnas.cargadaPor'), className: 'hidden lg:table-cell' },
          { id: 'revisadaPor', encabezado: t('columnas.revisadaPor'), className: 'hidden lg:table-cell' },
        ]}
      />
    </div>
  );
}
