import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function MisDiscipuladosPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mis discipulados</h1>
      <EstadoVacio mensaje="Todavía no tenés discípulos asignados." />
    </div>
  );
}
