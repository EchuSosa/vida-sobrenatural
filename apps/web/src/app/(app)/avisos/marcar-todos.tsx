'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, CheckCheck } from 'lucide-react';
import { apiFetch, ApiError } from '@vida-sobrenatural/shared-types';
import { Button, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 012, T023 (FR-004) — "Marcar todos como leídos", la acción secundaria
 * de Avisos. `useEnvio` contra la reentrada (H-57); al terminar, toast breve
 * (aria-live, del `Toaster`) y `router.refresh()` para que la lista y el
 * contador de la barra cambien a la vista (docs/16: toast + cambio visible).
 * Si falla, el mensaje queda en la pantalla con "Reintentar" y el código.
 */
export function MarcarTodosLeidos({ apiToken }: { apiToken: string }) {
  const t = useTranslations('avisos');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { enviando, ejecutar } = useEnvio(async () => {
    setError(null);
    try {
      await apiFetch<{ marcados: number }>('/avisos/leer-todos', { method: 'POST', headers: { Authorization: `Bearer ${apiToken}` } });
      toast(t('marcadosTodos'));
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.requestId : '');
    }
  });

  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="outline" size="xl" className="text-base" onClick={() => ejecutar()} disabled={enviando} aria-busy={enviando}>
        <CheckCheck aria-hidden="true" className="size-5" />
        {enviando ? t('marcando') : t('marcarTodos')}
      </Button>
      {error !== null && (
        <div role="alert" className="flex w-full flex-col gap-2 rounded-lg border border-destructive bg-card p-4">
          <p className="flex items-start gap-2 text-base">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
            {t('errorMarcar')}
          </p>
          {error && <p className="text-sm text-muted-foreground">{t('codigoReferencia', { codigo: error })}</p>}
          <Button variant="outline" size="xl" className="self-start text-base" onClick={() => ejecutar()} disabled={enviando}>
            {t('reintentar')}
          </Button>
        </div>
      )}
    </div>
  );
}
