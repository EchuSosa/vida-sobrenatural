import { PORTADA_ASPECTO } from '@vida-sobrenatural/shared-types';
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
          <Skeleton key={i} className="w-full" style={{ aspectRatio: `${PORTADA_ASPECTO.ancho} / ${PORTADA_ASPECTO.alto}` }} />
        ))}
      </div>
    </div>
  );
}
