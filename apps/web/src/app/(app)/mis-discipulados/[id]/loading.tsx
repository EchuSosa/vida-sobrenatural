import { Skeleton } from '@vida-sobrenatural/ui';

// Principio VIII: la forma del detalle (miga, Personas, Encuentros), a 360 px primero.
export default function CargandoMiDiscipulado() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-11 w-44" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
