import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 008, T046: carga de Mi camino → Vida de Servicio mientras responde GET /vida-de-servicio/me. */
export default function CargandoMiVidaDeServicio() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-full" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}
