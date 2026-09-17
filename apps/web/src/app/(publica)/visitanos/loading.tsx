import { Skeleton } from '@vida-sobrenatural/ui';

// Estado de carga (FR-016) — Next.js lo muestra automáticamente mientras el
// Server Component de la página resuelve el fetch a GET /sedes.
export default function CargandoVisitanos() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-9 w-40" />
      <div className="flex flex-col gap-2 rounded-lg border border-border p-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
