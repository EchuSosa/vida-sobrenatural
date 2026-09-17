import { EstadoVacio } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'Ministerios — Vida Sobrenatural',
  description: 'Ministerios de Vida Sobrenatural.',
};

export default function MinisteriosPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Ministerios</h1>
      <EstadoVacio mensaje="Todavía no publicamos los Ministerios acá — pronto vas a poder conocerlos." />
    </div>
  );
}
