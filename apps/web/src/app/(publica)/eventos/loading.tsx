import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 011, T045 — "cargando" de la cartelera (Principio VIII). */
export default function CargandoEventos() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16" aria-busy="true">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] w-full" />
        ))}
      </div>
    </div>
  );
}
