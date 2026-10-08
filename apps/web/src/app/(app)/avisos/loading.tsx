import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 012, T023 — "cargando" de Avisos: esqueleto de cinco tarjetas. */
export default function CargandoAvisos() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10" aria-busy="true">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-5 w-72" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
