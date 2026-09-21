'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@vida-sobrenatural/ui';

// H-60/H-43 (revisión manual ronda 7): mismo patrón que arregló H-04.
export default function ErrorPapelera({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[sedes/papelera/error.tsx]', error.digest, error);
  }, [error]);

  function reintentar() {
    router.refresh();
    reset();
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">No pudimos cargar la papelera</h1>
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
