import { Skeleton } from '@vida-sobrenatural/ui';

// Principio VIII: esqueleto con la forma de la pantalla (frase de estado,
// horarios, disponibilidad, máximo y períodos), no un spinner.
export default function CargandoMiDisponibilidad() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-16">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-16 w-full" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}
