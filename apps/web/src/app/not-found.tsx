import Link from 'next/link';

export const metadata = {
  title: 'No encontrado — Vida Sobrenatural',
};

// FR-023 — reemplaza a la página 404 nativa del navegador.
export default function NoEncontrado() {
  return (
    <main id="contenido" className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No encontramos esta sección</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Puede que el link esté roto o que la página ya no exista.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="flex h-11 items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/80"
        >
          Ir a Inicio
        </Link>
        <Link
          href="/primeros-pasos"
          className="flex h-11 items-center justify-center rounded-lg border border-border px-5 font-medium hover:bg-muted"
        >
          Ver Primeros pasos
        </Link>
      </div>
    </main>
  );
}
