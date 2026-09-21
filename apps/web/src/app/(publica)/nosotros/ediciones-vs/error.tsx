'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** Límite de error propio de esta ruta (mismo criterio que visitanos/error.tsx, H-03/H-04). */
export default function ErrorEdicionesVs({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const t = useTranslations('edicionesVs');

  useEffect(() => {
    console.error('[nosotros/ediciones-vs/error.tsx]', error.digest, error);
  }, [error]);

  function reintentar() {
    router.refresh();
    reset();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('errorTitulo')}</h1>
      <p className="text-muted-foreground">
        {t('errorTexto')}{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button onClick={reintentar} className="mx-auto">
        Reintentar
      </Button>
    </div>
  );
}
