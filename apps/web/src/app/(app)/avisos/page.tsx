import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function AvisosPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Avisos</h1>
      <EstadoVacio mensaje="Todavía no tenés avisos." />
    </div>
  );
}
