import { Skeleton } from '@vida-sobrenatural/ui';

// H-60/H-43 (revisión manual ronda 7, Principio VIII): esqueleto mientras
// el Server Component resuelve GET /sedes (paso 2 del formulario).
export default function CargandoRegistro() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-2 w-full" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
