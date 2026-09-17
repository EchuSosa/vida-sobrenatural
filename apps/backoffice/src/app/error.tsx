'use client';

import { useEffect } from 'react';
import { Button } from '@vida-sobrenatural/ui';

// FR-022/FR-023
export default function ErrorPantalla({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error.tsx]', error.digest, error);
  }, [error]);

  return (
    <main id="contenido" className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Ocurrió un error inesperado</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Podés reintentar en unos segundos. Código de referencia:{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button onClick={reset} className="mx-auto">
        Reintentar
      </Button>
    </main>
  );
}
