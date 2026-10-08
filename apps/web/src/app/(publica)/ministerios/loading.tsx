import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 009, T055: carga de Ministerios — miga, título y las tarjetas mientras responde GET /ministerios/publicos. */
export default function CargandoMinisterios() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-9 w-44" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
