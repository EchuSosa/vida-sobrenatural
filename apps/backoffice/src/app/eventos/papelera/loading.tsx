import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

export default function CargandoPapeleraEventos() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-64" />
      <TablaEsqueleto columnas={[{ id: 'nombre', encabezado: 'Nombre' }, { id: 'fecha', encabezado: 'Fecha', className: 'hidden sm:table-cell' }]} conAcciones />
    </div>
  );
}
