import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 014: carga de Mi grupo del líder. */
export default function CargandoMiGrupoExtension() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-full" />
      <div className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-40" />
      </div>
    </div>
  );
}
