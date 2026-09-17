import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function MiDisponibilidadPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mi disponibilidad</h1>
      <EstadoVacio mensaje="Todavía no podés gestionar tu disponibilidad acá." />
    </div>
  );
}
