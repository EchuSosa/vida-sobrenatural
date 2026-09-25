import { getTranslations } from 'next-intl/server';
import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

// Principio VIII: "cargando" con la forma del contenido — mismas columnas y
// mismas clases responsive que personas-cliente.tsx.
export default async function CargandoPersonas() {
  const t = await getTranslations('personas');
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <TablaEsqueleto
        columnas={[
          { id: 'apellido', encabezado: t('columnas.nombre') },
          { id: 'contacto', encabezado: t('columnas.contacto'), className: 'hidden md:table-cell' },
          { id: 'roles', encabezado: t('columnas.roles'), className: 'hidden sm:table-cell' },
        ]}
      />
    </div>
  );
}
