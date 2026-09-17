import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function NotificacionesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Notificaciones</h1>
      <EstadoVacio mensaje="Todavía no podés crear notificaciones manuales acá." />
    </div>
  );
}
