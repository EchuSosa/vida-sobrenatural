import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 009, T019: carga de los Ministerios — miga, título, introducción y tres tarjetas. */
export default function CargandoMinisterios() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-20 w-full" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
