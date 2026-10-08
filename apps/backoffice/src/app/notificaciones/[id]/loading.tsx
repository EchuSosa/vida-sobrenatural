import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 012, T050 — "cargando" del detalle de un aviso. */
export default function CargandoAviso() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10" aria-busy="true">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
