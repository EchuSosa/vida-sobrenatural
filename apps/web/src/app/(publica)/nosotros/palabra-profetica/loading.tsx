import { Skeleton } from '@vida-sobrenatural/ui';

// Estado de carga — Next.js lo muestra automáticamente mientras el Server
// Component de la página resuelve el fetch a GET /palabra-profetica.
export default function CargandoPalabraProfetica() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="aspect-video w-full" />
    </div>
  );
}
