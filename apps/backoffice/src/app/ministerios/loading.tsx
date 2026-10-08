import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

/** spec 009, T041: esqueleto del catálogo mientras responde GET /ministerios. */
export default function CargandoMinisterios() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-40" />
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-7 w-32" />
      </div>
      <Skeleton className="h-9 w-full" />
      <TablaEsqueleto
        columnas={[
          { id: 'nombre', encabezado: 'Nombre' },
          { id: 'celulas', encabezado: 'Áreas activas', className: 'hidden sm:table-cell' },
          { id: 'miembros', encabezado: 'Miembros', className: 'hidden sm:table-cell' },
        ]}
        conAcciones
      />
    </div>
  );
}
