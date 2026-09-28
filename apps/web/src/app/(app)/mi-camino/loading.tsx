import { Skeleton } from '@vida-sobrenatural/ui';

/** Estado de carga de Mi camino: la forma de la tarjeta de Vida Nueva mientras responde GET /discipulado/me. */
export default function CargandoMiCamino() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-9 w-40" />
      <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-11 w-56" />
      </div>
    </div>
  );
}
