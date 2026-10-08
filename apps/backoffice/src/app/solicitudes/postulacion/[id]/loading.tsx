import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 009, T028: carga del detalle de una Postulación — miga, título, datos y lo que pidió. */
export default function CargandoPostulacion() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-80 max-w-full" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
