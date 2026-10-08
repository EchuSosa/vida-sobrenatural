import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 011, T058 — "cargando" de Mis eventos, con esqueletos de tarjeta. */
export default function CargandoMisEventos() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10" aria-busy="true">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-72" />
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-44 w-full" />
      ))}
    </div>
  );
}
