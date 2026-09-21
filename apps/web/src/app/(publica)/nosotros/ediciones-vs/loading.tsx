import { Skeleton } from '@vida-sobrenatural/ui';

// Estado de carga — Next.js lo muestra automáticamente mientras el Server
// Component de la página resuelve el fetch a GET /libros.
export default function CargandoEdicionesVs() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-4 w-full" />
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key -- placeholders sin identidad propia
          <Skeleton key={i} className="aspect-[2/3] w-full" />
        ))}
      </div>
    </div>
  );
}
