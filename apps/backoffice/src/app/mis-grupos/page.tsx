import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function MisGruposPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mis grupos</h1>
      <EstadoVacio mensaje="Todavía no tenés Grupos asignados." />
    </div>
  );
}
