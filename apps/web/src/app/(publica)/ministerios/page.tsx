import Link from 'next/link';
import { EstadoVacio, MigaDePan } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'Ministerios — Vida Sobrenatural',
  description: 'Ministerios de Vida Sobrenatural.',
};

/**
 * H-81/D115: Ministerios vive dentro de Primeros pasos aunque no aparece en
 * el menú principal (H-46) — la miga muestra "Primeros pasos › Ministerios"
 * siempre, sin importar desde dónde se haya llegado.
 */
export default function MinisteriosPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: 'Primeros pasos', href: '/primeros-pasos' }, { label: 'Ministerios' }]} LinkComponente={Link} />
      <h1 className="text-3xl font-semibold tracking-tight">Ministerios</h1>
      <EstadoVacio mensaje="Todavía no publicamos los Ministerios acá — pronto vas a poder conocerlos." />
    </div>
  );
}
