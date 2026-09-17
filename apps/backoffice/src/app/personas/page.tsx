import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function PersonasPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Personas</h1>
      <EstadoVacio mensaje="Todavía no hay una vista unificada de Personas acá." />
    </div>
  );
}
