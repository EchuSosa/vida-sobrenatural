import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

export default function CargandoLibros() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-16" />
      </div>
      <TablaEsqueleto
        columnas={[
          { id: 'portada', encabezado: 'Portada' },
          { id: 'titulo', encabezado: 'Título' },
          { id: 'autor', encabezado: 'Autor/a', className: 'hidden sm:table-cell' },
          { id: 'anio', encabezado: 'Año', className: 'hidden sm:table-cell' },
        ]}
        conAcciones
      />
    </div>
  );
}
