import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 014: carga de Grupos de extensión. */
export default function CargandoGruposExtension() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-5 w-full" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
