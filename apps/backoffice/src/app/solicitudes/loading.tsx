import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

/** Estado de carga de la bandeja: la forma del listado mientras responde GET /solicitudes. */
export default function CargandoSolicitudes() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <TablaEsqueleto
        columnas={[
          { id: 'persona', encabezado: 'Persona' },
          { id: 'estado', encabezado: 'Estado' },
          { id: 'pedida', encabezado: 'Pedida', className: 'hidden sm:table-cell' },
          { id: 'creadaPor', encabezado: 'La cargó', className: 'hidden md:table-cell' },
          { id: 'revisadaPor', encabezado: 'Revisada por', className: 'hidden lg:table-cell' },
        ]}
      />
    </div>
  );
}
