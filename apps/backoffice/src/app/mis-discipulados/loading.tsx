import { Skeleton } from '@vida-sobrenatural/ui';

// specs/004 (Principio VIII): el esqueleto tiene la forma de las tarjetas de
// propuestas y discipulados, a 360 px primero.
export default function CargandoMisDiscipulados() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
