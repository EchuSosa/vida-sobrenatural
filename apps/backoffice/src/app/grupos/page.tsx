import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function GruposPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Grupos</h1>
      <EstadoVacio mensaje="Todavía no hay Grupos para gestionar acá." />
    </div>
  );
}
