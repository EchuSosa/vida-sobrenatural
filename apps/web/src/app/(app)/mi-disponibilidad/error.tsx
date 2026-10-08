'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

// Mismo patrón que H-04: reset() solo remonta el segmento; router.refresh()
// vuelve a pedir los datos al Server Component.
export default function ErrorMiDisponibilidad({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const t = useTranslations('miDisponibilidad.error');

  useEffect(() => {
    console.error('[mi-disponibilidad/error.tsx]', error.digest, error);
  }, [error]);

  function reintentar() {
    router.refresh();
    reset();
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <p className="text-muted-foreground">
        {t('texto')} <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button onClick={reintentar} className="mx-auto h-11">
        {t('reintentar')}
      </Button>
    </div>
  );
}
