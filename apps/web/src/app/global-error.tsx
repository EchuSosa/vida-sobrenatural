'use client';

// FR-022/FR-023 — reemplaza el layout raíz completo cuando el error ocurre
// ahí mismo (ej. falla el layout, no una página). Por eso incluye su propio
// <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Ocurrió un error inesperado</h1>
          <p className="text-muted-foreground">
            Podés reintentar en unos segundos. Si sigue pasando, contanos e incluí este código:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              {error.digest ?? 'sin-id'}
            </code>
          </p>
          <button
            type="button"
            onClick={reset}
            className="mx-auto flex h-11 items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
