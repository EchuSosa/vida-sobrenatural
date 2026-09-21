import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

export default function CargandoPapeleraLibros() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-4 w-full max-w-md" />
      <TablaEsqueleto
        columnas={[
          { id: 'titulo', encabezado: 'Título' },
          { id: 'autor', encabezado: 'Autor/a', className: 'hidden sm:table-cell' },
          { id: 'eliminadoEn', encabezado: 'Eliminado el', className: 'hidden sm:table-cell' },
        ]}
        conAcciones
      />
    </div>
  );
}
