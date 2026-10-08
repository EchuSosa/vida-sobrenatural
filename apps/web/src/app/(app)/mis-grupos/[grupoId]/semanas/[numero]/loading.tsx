import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 008, T041: carga del material de una semana. */
export default function CargandoMaterial() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
