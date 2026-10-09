'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';
import { ApiError, apiFetch } from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, useEnvio } from '@vida-sobrenatural/ui';

/** spec 014 (D224): retirar el propio pedido. Reversible → confirmación neutra (D151). */
export function RetirarPedidoGex({ solicitudId, grupo }: { solicitudId: string; grupo: string }) {
  const t = useTranslations('grupoExtension.pendiente');
  const te = useTranslations('errors');
  const router = useRouter();
  const { data: session } = useSession();

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await apiFetch(`/solicitudes-grupo-extension/me/${solicitudId}/retirar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.apiToken}` },
      });
      toast.success(t('retirado'));
    } catch (error) {
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    }
    router.refresh();
  });

  return (
    <ConfirmDestructiveDialog
      tono="neutro"
      trigger={
        <Button type="button" variant="outline" size="xl" className="w-full text-base sm:w-fit" loading={enviando}>
          <Undo2 aria-hidden />
          {t('retirar')}
        </Button>
      }
      titulo={t('retirarTitulo', { grupo })}
      descripcion={t('retirarDescripcion')}
      textoConfirmar={t('retirarConfirmar')}
      textoCancelar={t('retirarMantener')}
      onConfirmar={() => void ejecutar()}
    />
  );
}
