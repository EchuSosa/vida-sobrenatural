import { Skeleton } from '@vida-sobrenatural/ui';

/** ajustes-ux #53 (Principio VIII): carga de Perfil mientras responde GET /personas/me. */
export default function CargandoPerfil() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-9 w-32" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-7 w-28" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-full sm:w-40" />
    </div>
  );
}
