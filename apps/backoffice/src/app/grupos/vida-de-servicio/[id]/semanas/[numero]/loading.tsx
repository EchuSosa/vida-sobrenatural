import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 008, T061: carga del material de una semana. */
export default function CargandoMaterialEdicion() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
