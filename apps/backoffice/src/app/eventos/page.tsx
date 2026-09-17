import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function EventosPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Eventos</h1>
      <EstadoVacio mensaje="Todavía no hay Eventos para gestionar acá." />
    </div>
  );
}
