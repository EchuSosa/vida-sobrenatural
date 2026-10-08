import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 006, T031 (FR-006): carga de Mi camino — las cuatro cards mientras responde GET /camino/me. */
export default function CargandoMiCamino() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-full" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-11 w-40 self-end" />
        </div>
      ))}
    </div>
  );
}
