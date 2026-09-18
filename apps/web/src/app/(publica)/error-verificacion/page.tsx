import Link from 'next/link';

export const metadata = {
  title: 'No pudimos verificar tu cuenta — Vida Sobrenatural',
};

export default function ErrorVerificacionPage() {
  return (
    // Sin <main id="contenido"> propio — (publica)/layout.tsx ya lo provee
    // (H-05, actualización 2026-09-18).
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">No pudimos verificar tu cuenta</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        No pudimos verificar tu cuenta, probá de nuevo en un momento.
      </p>
      <Link
        href="/registro"
        className="flex h-11 w-fit items-center justify-center rounded-lg bg-zinc-900 px-5 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
      >
        Reintentar
      </Link>
    </div>
  );
}
