import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 008, T046: carga del material de una semana. */
export default function CargandoSemana() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-11 w-48" />
    </div>
  );
}
