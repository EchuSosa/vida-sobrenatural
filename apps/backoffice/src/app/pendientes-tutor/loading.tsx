import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

// H-60/H-43 (revisión manual ronda 7, Principio VIII).
export default function CargandoPendientesTutor() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <TablaEsqueleto
        columnas={[
          { id: 'nombre', encabezado: 'Nombre' },
          { id: 'contacto', encabezado: 'Contacto', className: 'hidden sm:table-cell' },
        ]}
        conAcciones
      />
    </div>
  );
}
