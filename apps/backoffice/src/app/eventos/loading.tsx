import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

/** spec 011, T029 — "cargando" del listado (Principio VIII). */
export default function CargandoEventos() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10" aria-busy="true">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <TablaEsqueleto
        columnas={[
          { id: 'nombre', encabezado: 'Nombre' },
          { id: 'fecha', encabezado: 'Fecha', className: 'hidden sm:table-cell' },
          { id: 'estado', encabezado: 'Estado' },
          { id: 'ocupacion', encabezado: 'Inscriptos', className: 'hidden md:table-cell' },
        ]}
        conAcciones
      />
    </div>
  );
}
