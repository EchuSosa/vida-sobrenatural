import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 010, T029: carga del detalle de una Solicitud de Bautismo: miga, título, comentario y situación. */
export default function CargandoBautismo() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
