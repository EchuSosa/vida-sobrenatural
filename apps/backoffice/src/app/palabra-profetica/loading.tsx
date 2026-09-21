import { Skeleton, TablaEsqueleto } from '@vida-sobrenatural/ui';

export default function CargandoPalabraProfetica() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Skeleton className="h-8 w-56" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-6 w-40" />
      <TablaEsqueleto
        columnas={[
          { id: 'anio', encabezado: 'Año' },
          { id: 'titulo', encabezado: 'Título' },
          { id: 'estado', encabezado: 'Estado' },
        ]}
        conAcciones
      />
    </div>
  );
}
