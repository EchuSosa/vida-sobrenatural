import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 006, T059: carga del Inicio — saludo, tarjeta de tu camino y accesos. */
export default function CargandoInicio() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-9 w-56" />
      <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-14 flex-1" />
        <Skeleton className="h-14 flex-1" />
      </div>
    </div>
  );
}
