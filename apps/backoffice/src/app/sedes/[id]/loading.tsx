import { Skeleton } from '@vida-sobrenatural/ui';

// H-60/H-43 (revisión manual ronda 7, Principio VIII): esqueleto del
// detalle mientras el Server Component resuelve GET /sedes/:id.
export default function CargandoSedeDetalle() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
