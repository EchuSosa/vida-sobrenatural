import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 008, T074: carga de Mis grupos. */
export default function CargandoMisGrupos() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-full" />
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      ))}
    </div>
  );
}
