import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 017: carga de la grilla de turnos. */
export default function CargandoTurnos() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-5 w-60" />
      <Skeleton className="h-9 w-72" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
