import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function SolicitudesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Solicitudes</h1>
      <EstadoVacio mensaje="Todavía no hay solicitudes para revisar acá." />
    </div>
  );
}
