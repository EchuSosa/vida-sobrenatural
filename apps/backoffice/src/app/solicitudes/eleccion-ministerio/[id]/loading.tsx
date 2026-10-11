import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 015: carga del detalle de una elección de ministerio — miga, título, datos y las áreas. */
export default function CargandoEleccionMinisterio() {
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
