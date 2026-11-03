import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 017: carga de Mis turnos. */
export default function CargandoMisTurnos() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
