import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

// Principio VIII: el esqueleto con la forma del listado (mismas columnas y mismas clases responsive).
export default function CargandoGrupos() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <Skeleton className="h-9 w-72" />
      <TablaEsqueleto
        columnas={[
          { id: 'personas', encabezado: '' },
          { id: 'discipulador', encabezado: '', className: 'hidden sm:table-cell' },
          { id: 'desde', encabezado: '', className: 'hidden md:table-cell' },
          { id: 'lugar', encabezado: '', className: 'hidden lg:table-cell' },
          { id: 'encuentros', encabezado: '', className: 'hidden lg:table-cell' },
          { id: 'pendiente', encabezado: '' },
        ]}
        conAcciones
      />
    </div>
  );
}
