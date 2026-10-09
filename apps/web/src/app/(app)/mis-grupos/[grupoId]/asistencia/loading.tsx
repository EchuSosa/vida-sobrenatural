import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 008, T052: carga de tomar asistencia. */
export default function CargandoAsistencia() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-11 w-48" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
