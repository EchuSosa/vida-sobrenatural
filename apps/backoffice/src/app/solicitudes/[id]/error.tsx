'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** Error del detalle (la API no respondió): sin miga (docs/15), con "Reintentar" y un enlace suelto a la bandeja. */
export default function ErrorSolicitud({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const t = useTranslations('solicitudes');

  useEffect(() => {
    console.error('[solicitudes/[id]/error.tsx]', error.digest, error);
  }, [error]);

  function reintentar() {
    router.refresh();
    reset();
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('detalle.errorCargaTitulo')}</h1>
      <p className="text-muted-foreground">
        {t('errorCarga')} <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button onClick={reintentar} className="mx-auto">
        {t('reintentar')}
      </Button>
      <Link href="/solicitudes" className="text-sm underline underline-offset-4">
        {t('detalle.irASolicitudes')}
      </Link>
    </div>
  );
}
