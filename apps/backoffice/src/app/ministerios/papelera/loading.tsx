import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 009, T043: carga de la papelera de Ministerios. */
export default function CargandoPapeleraMinisterios() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
