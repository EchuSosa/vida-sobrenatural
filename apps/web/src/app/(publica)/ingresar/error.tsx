'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/**
 * spec 007 (Principio VIII): error de la pantalla de ingreso (y del paso del
 * código). Un fallo de la API al VERIFICAR no llega acá: va a
 * `/error-verificacion` (D88). Nunca se loguea el email ni el código.
 */
export default function ErrorIngreso({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations('ingreso');

  useEffect(() => {
    console.error('[ingresar/error.tsx]', error.digest);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('errorTitulo')}</h1>
      <p className="text-base text-muted-foreground">{t('errorTexto')}</p>
      <Button
        size="xl"
        className="mx-auto text-base"
        onClick={() => retry()}
      >
        {t('reintentar')}
      </Button>
    </div>
  );
}
