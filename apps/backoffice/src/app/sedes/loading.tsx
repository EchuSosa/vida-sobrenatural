import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

// H-60/H-43 (revisión manual ronda 7, Principio VIII): esqueleto, no un
// spinner a pantalla completa — Next.js lo muestra mientras el Server
// Component de la página resuelve GET /sedes.
export default function CargandoSedes() {
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
          { id: 'nombre', encabezado: 'Nombre' },
          { id: 'direccion', encabezado: 'Dirección', className: 'hidden sm:table-cell' },
          { id: 'horarios', encabezado: 'Horarios', className: 'hidden md:table-cell' },
        ]}
        conAcciones
      />
    </div>
  );
}
