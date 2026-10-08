import { Skeleton } from '@vida-sobrenatural/ui';

export default function CargandoNuevoEvento() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-56" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
