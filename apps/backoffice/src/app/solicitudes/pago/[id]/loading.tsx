import { Skeleton } from '@vida-sobrenatural/ui';

export default function CargandoPago() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
