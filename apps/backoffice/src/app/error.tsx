'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@vida-sobrenatural/ui';

// FR-022/FR-023
export default function ErrorPantalla({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[error.tsx]', error.digest, error);
  }, [error]);

  // H-04 (actualización 2026-09-18): mismo fix que apps/web — reset() solo
  // remonta el segmento, no revalida el fetch del Server Component.
  function reintentar() {
    router.refresh();
    reset();
  }

  return (
    <main id="contenido" className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Ocurrió un error inesperado</h1>
      <p className="text-muted-foreground">
        Podés reintentar en unos segundos. Código de referencia:{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button onClick={reintentar} className="mx-auto">
        Reintentar
      </Button>
    </main>
  );
}
