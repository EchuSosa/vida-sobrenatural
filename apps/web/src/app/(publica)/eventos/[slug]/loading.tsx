import { Skeleton } from '@vida-sobrenatural/ui';

export default function CargandoEvento() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16" aria-busy="true">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-9 w-3/4" />
      <div className="grid gap-8 md:grid-cols-[2fr_3fr]">
        <Skeleton className="aspect-[4/5] w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
