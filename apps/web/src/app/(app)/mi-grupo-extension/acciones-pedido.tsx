'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, MessageCircle, X } from 'lucide-react';
import { ApiError, MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX, apiFetch, enlaceWhatsapp, erroresPorCampo } from '@vida-sobrenatural/shared-types';
import { Button, DialogoTextoOpcional, useEnvio } from '@vida-sobrenatural/ui';

/** "Escribir por WhatsApp" con un saludo armado (texto + ícono, D81). */
export function EnlaceWhatsappPedido({ whatsapp, nombre, texto }: { whatsapp: string; nombre: string; texto: string }) {
  const t = useTranslations('miGrupoExtension');
  return (
    <a
      href={`${enlaceWhatsapp(whatsapp)}?text=${encodeURIComponent(texto)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('whatsappAria', { nombre })}
      className="flex min-h-11 w-fit items-center gap-2 font-medium text-primary underline underline-offset-2"
    >
      <MessageCircle aria-hidden className="size-4 shrink-0" />
      {t('whatsapp')}
    </a>
  );
}

/**
 * spec 014 (D225): "Aceptar" y "No es para este grupo" (con mensaje opcional)
 * de un pedido. Envíos protegidos de la reentrada (H-57); al terminar,
 * `router.refresh()` mueve a la persona a integrantes o la saca de la lista.
 */
export function AccionesPedidoGex({ solicitudId, nombre }: { solicitudId: string; nombre: string }) {
  const t = useTranslations('miGrupoExtension');
  const te = useTranslations('errors');
  const router = useRouter();
  const { data: session } = useSession();
  const errorDe = (error: unknown) => {
    const code = error instanceof ApiError ? error.code : null;
    return code && te.has(code) ? te(code) : t('errorGenerico');
  };

  const aceptar = useEnvio(async () => {
    try {
      await apiFetch(`/grupos-extension/liderados/solicitudes/${solicitudId}/aceptar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.apiToken}` },
      });
      toast.success(t('aceptado', { nombre }));
    } catch (error) {
      toast.error(errorDe(error));
    }
    router.refresh();
  });

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button type="button" size="xl" className="w-full text-base sm:w-fit" loading={aceptar.enviando} aria-label={t('aceptarAria', { nombre })} onClick={() => void aceptar.ejecutar()}>
        <Check aria-hidden />
        {t('aceptar')}
      </Button>
      <DialogoTextoOpcional
        tono="neutro"
        trigger={
          <Button type="button" variant="outline" size="xl" className="w-full text-base sm:w-fit" disabled={aceptar.enviando} aria-label={t('rechazarAria', { nombre })}>
            <X aria-hidden />
            {t('rechazar')}
          </Button>
        }
        titulo={t('rechazarTitulo', { nombre })}
        descripcion={t('rechazarDescripcion')}
        campo={`mensaje-${solicitudId}`}
        etiqueta={t('rechazarMensajeEtiqueta', { nombre })}
        ayuda={t('rechazarMensajeAyuda')}
        max={MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX}
        contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
        mensajeDemasiadoLargo={t('demasiadoLargo', { maximo: MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX })}
        tituloResumen={t('resumenErrores')}
        textoEnviar={t('rechazarConfirmar')}
        textoVolver={t('rechazarCancelar')}
        onEnviar={async (mensaje) => {
          try {
            await apiFetch(`/grupos-extension/liderados/solicitudes/${solicitudId}/rechazar`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
              body: JSON.stringify(mensaje ? { mensaje } : {}),
            });
            toast.success(t('rechazado', { nombre }));
          } catch (error) {
            if (erroresPorCampo(error)) return { errorCampo: t('demasiadoLargo', { maximo: MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX }) };
            toast.error(errorDe(error));
          }
          router.refresh();
        }}
      />
    </div>
  );
}
