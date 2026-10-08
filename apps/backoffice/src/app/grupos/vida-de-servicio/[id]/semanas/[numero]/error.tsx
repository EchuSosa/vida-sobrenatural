'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/** spec 008, T061: error del detalle de una edición — qué pasó, el código y "Reintentar". */
export default function ErrorMaterialEdicion({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const t = useTranslations('edicionesServicio.detalle');

  useEffect(() => {
    console.error('[grupos/vida-de-servicio/[id]/semanas/[numero]/error.tsx]', error.digest, error);
  }, [error]);

  function reintentar() {
    router.refresh();
    reset();
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('errorCargaTitulo')}</h1>
      <p className="text-muted-foreground">
        {t('errorCarga')} <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{error.digest ?? 'sin-id'}</code>
      </p>
      <Button onClick={reintentar} className="mx-auto">
        {t('reintentar')}
      </Button>
      <Link href="/grupos?curso=vida_de_servicio" className="text-sm underline underline-offset-4">
        {t('irAGrupos')}
      </Link>
    </div>
  );
}
