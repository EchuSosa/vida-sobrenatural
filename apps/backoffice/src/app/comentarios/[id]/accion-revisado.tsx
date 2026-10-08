'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { apiFetch, type ComentarioResumen } from '@vida-sobrenatural/shared-types';
import { Button, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 013 (T065, H5.7): "Marcar como revisado" o "Deshacer", con toast
 * (matriz de `docs/16`) y la pantalla actualizada. Bloqueado mientras se
 * guarda (H-57). Solo se muestra con `comentarios.gestionar`.
 */
export function AccionRevisado({ id, revisado }: { id: string; revisado: boolean }) {
  const t = useTranslations('comentarios');
  const router = useRouter();
  const { data: session } = useSession();
  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await apiFetch<ComentarioResumen>(`/comentarios/${id}/revisado`, {
        method: revisado ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${session?.apiToken}` },
      });
      toast(revisado ? t('deshecho') : t('marcado'));
      router.refresh();
    } catch {
      toast.error(t('errorAccion'));
    }
  });
  return (
    <Button
      type="button"
      size="xl"
      variant={revisado ? 'outline' : 'default'}
      className="self-start"
      loading={enviando}
      loadingText={revisado ? t('deshaciendo') : t('marcando')}
      onClick={() => void ejecutar()}
    >
      {revisado ? t('deshacer') : t('marcar')}
    </Button>
  );
}
