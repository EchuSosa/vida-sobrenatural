import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function MiCaminoPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Mi camino</h1>
      <EstadoVacio mensaje="Acá vas a ver Vida Nueva, Vida de Servicio, Ministerio y Bautismo apenas estén disponibles." />
    </div>
  );
}
