import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 009, T020: carga del detalle — miga, título, descripción, áreas y el formulario. */
export default function CargandoMinisterio() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-11 w-40" />
    </div>
  );
}
