import { Skeleton } from '@vida-sobrenatural/ui';

export default function CargandoEvento() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
