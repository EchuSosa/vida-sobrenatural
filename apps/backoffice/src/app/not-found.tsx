import Link from 'next/link';

export const metadata = {
  title: 'No encontrado — Backoffice',
  robots: { index: false, follow: false },
};

// FR-023
export default function NoEncontrado() {
  return (
    <main id="contenido" className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No encontramos esta sección</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Puede que el link esté roto o que la página ya no exista.
      </p>
      <Link
        href="/"
        className="mx-auto flex h-11 items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/80"
      >
        Ir a Inicio
      </Link>
    </main>
  );
}
