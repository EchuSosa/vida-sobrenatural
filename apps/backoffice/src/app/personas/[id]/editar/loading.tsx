import { Skeleton } from '@vida-sobrenatural/ui';

/** spec 013, T082: carga de "Editar datos" — miga, título y las secciones del formulario. */
export default function CargandoEditarPersona() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-8 w-72" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}
