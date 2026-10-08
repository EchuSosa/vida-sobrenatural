import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 008, T074: carga del detalle de mi grupo. */
export default function CargandoMiGrupo() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-11 w-full sm:w-48" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
