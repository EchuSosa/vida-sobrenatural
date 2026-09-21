'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@vida-sobrenatural/ui';

// Mismo patrón que sedes/error.tsx (H-04): reset() solo remonta el
// segmento, router.refresh() es lo que vuelve a pedir los datos.
export default function ErrorPalabraProfetica({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[palabra-profetica/error.tsx]', error.digest, error);
  }, [error]);

  function reintentar() {
    router.refresh();
    reset();
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No pudimos cargar la Palabra Profética</h1>
      <p className="text-muted-foreground">
        Podés reintentar en unos segundos. Código de referencia:{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button onClick={reintentar} className="mx-auto">
        Reintentar
      </Button>
    </div>
  );
}
