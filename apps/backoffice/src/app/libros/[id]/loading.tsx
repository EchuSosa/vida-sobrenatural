import { PORTADA_ASPECTO } from '@vida-sobrenatural/shared-types';
import { Skeleton } from '@vida-sobrenatural/ui';

export default function CargandoLibroDetalle() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-7 w-24" />
      </div>
      <Skeleton className="w-40" style={{ aspectRatio: `${PORTADA_ASPECTO.ancho} / ${PORTADA_ASPECTO.alto}` }} />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
