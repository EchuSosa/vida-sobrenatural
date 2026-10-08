'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** spec 013, T082: no se pudieron cargar los datos para editar — qué pasó, "Reintentar" y la salida al listado. */
export default function ErrorEditarPersona({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const t = useTranslations('personasEditar');

  useEffect(() => {
    console.error('[personas/[id]/editar/error.tsx]', error.digest, error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('errorCargaTitulo')}</h1>
      <p className="text-muted-foreground">
        {t('errorCarga')} <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button
        className="mx-auto"
        onClick={() => {
          router.refresh();
          reset();
        }}
      >
        {t('reintentar')}
      </Button>
      <Link href="/personas" className="text-sm underline underline-offset-4">
        {t('irAPersonas')}
      </Link>
    </div>
  );
}
