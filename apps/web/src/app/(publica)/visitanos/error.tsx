'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/**
 * H-03 (revisión manual, actualización 2026-09-18): límite de error propio
 * de esta ruta — antes, una falla de `GET /sedes` caía en la pantalla de
 * error genérica de la raíz (`app/error.tsx`), indistinguible de "no hay
 * ninguna Sede activa" (ese otro caso ya lo maneja `page.tsx` sin lanzar,
 * mostrando `sinSedes`). Este límite solo atrapa el primero: cuando la API
 * no responde o responde con error.
 */
export default function ErrorVisitanos({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const t = useTranslations('visitanos');

  useEffect(() => {
    console.error('[visitanos/error.tsx]', error.digest, error);
  }, [error]);

  // H-04: mismo fix que el error.tsx de la raíz — reset() solo remonta el
  // segmento, router.refresh() es lo que realmente vuelve a pedir los datos.
  function reintentar() {
    router.refresh();
    reset();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('errorCargaTitulo')}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {t('errorCarga')}{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button onClick={reintentar} className="mx-auto">
        Reintentar
      </Button>
    </div>
  );
}
