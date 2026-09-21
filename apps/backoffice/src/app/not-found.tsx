import Link from 'next/link';
import { buttonVariants } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'No encontrado — Backoffice',
  robots: { index: false, follow: false },
};

// FR-023
export default function NoEncontrado() {
  return (
    <main id="contenido" className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No encontramos esta sección</h1>
      <p className="text-muted-foreground">
        Puede que el link esté roto o que la página ya no exista.
      </p>
      <Link href="/" className={buttonVariants({ size: 'xl', className: 'mx-auto' })}>
        Ir a Inicio
      </Link>
    </main>
  );
}
