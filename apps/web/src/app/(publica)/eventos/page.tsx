import { EstadoVacio } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'Eventos — Vida Sobrenatural',
  description: 'Próximos eventos de Vida Sobrenatural.',
};

export default function EventosPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Eventos</h1>
      <EstadoVacio mensaje="Todavía no hay eventos publicados — volvé a visitarnos pronto." />
    </div>
  );
}
