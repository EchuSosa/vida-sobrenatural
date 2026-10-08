'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheck, Undo2 } from 'lucide-react';
import { ApiError, COMENTARIO_DECLARACION_MAX, apiFetch, erroresPorCampo, type EtapaCamino } from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, DialogoTextoOpcional, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 006, T041 (FR-008, FR-009, FR-011, D151): "Ya lo hice" y "Retirar" en
 * las cards de Mi camino. Las dos son reversibles, así que sus confirmaciones
 * son neutras (no rojas). Al terminar, `router.refresh()` vuelve a pedir
 * `GET /camino/me` y la card cambia sin recargar la página.
 */

function useLlamarApi() {
  const { data: session } = useSession();
  return function llamar<T>(ruta: string, init: RequestInit = {}) {
    return apiFetch<T>(ruta, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}`, ...init.headers },
    });
  };
}

function useMensajeDeError() {
  const t = useTranslations('miCamino.estados');
  const te = useTranslations('errors');
  return (error: unknown) => {
    const code = error instanceof ApiError ? error.code : null;
    return code && te.has(code) ? te(code) : t('errorGenerico');
  };
}

/** "Ya lo hice": un paso, con comentario opcional de hasta 500 y su contador (FR-009). */
export function YaLoHice({ etapa, nombreEtapa }: { etapa: EtapaCamino; nombreEtapa: string }) {
  const t = useTranslations('miCamino.estados');
  const te = useTranslations('errors');
  const router = useRouter();
  const llamar = useLlamarApi();
  const mensajeDeError = useMensajeDeError();

  return (
    <DialogoTextoOpcional
      trigger={
        <Button type="button" variant="outline" size="xl" className="text-base">
          <CircleCheck aria-hidden />
          {t('yaLoHice')}
        </Button>
      }
      titulo={t('yaLoHiceTitulo', { etapa: nombreEtapa })}
      descripcion={t('yaLoHiceDescripcion')}
      campo="comentario"
      etiqueta={t('comentarioEtiqueta')}
      ayuda={t('comentarioAyuda')}
      max={COMENTARIO_DECLARACION_MAX}
      contador={(cantidad, maximo) => t('comentarioContador', { cantidad, maximo })}
      mensajeDemasiadoLargo={te('campos.COMENTARIO_DEMASIADO_LARGO')}
      tituloResumen={t('resumenErrores')}
      textoEnviar={t('yaLoHiceEnviar')}
      textoVolver={t('yaLoHiceVolver')}
      onEnviar={async (comentario) => {
        try {
          await llamar('/camino/me/declaraciones', { method: 'POST', body: JSON.stringify({ etapa, comentario: comentario ?? undefined }) });
          toast.success(t('yaLoHiceEnviado'));
        } catch (error) {
          if (erroresPorCampo(error)) return { errorCampo: te('campos.COMENTARIO_DEMASIADO_LARGO') };
          // Otro rechazo (ya estaba pendiente, ya figura hecha…): se avisa y la card muestra el estado real.
          toast.error(mensajeDeError(error));
        }
        router.refresh();
      }}
    />
  );
}

/** "Retirar" lo que contó, mientras la iglesia lo revisa (FR-011). Confirmación neutra (D151). */
export function RetirarDeclaracion({ declaracionId, nombreEtapa }: { declaracionId: string; nombreEtapa: string }) {
  const t = useTranslations('miCamino.estados');
  const router = useRouter();
  const llamar = useLlamarApi();
  const mensajeDeError = useMensajeDeError();

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await llamar(`/camino/me/declaraciones/${declaracionId}`, { method: 'DELETE' });
      toast.success(t('retirado'));
    } catch (error) {
      toast.error(mensajeDeError(error));
    }
    router.refresh();
  });

  return (
    <ConfirmDestructiveDialog
      tono="neutro"
      trigger={
        <Button type="button" variant="outline" size="xl" className="text-base" loading={enviando}>
          <Undo2 aria-hidden />
          {t('retirar')}
        </Button>
      }
      titulo={t('retirarTitulo', { etapa: nombreEtapa })}
      descripcion={t('retirarDescripcion')}
      textoConfirmar={t('retirarConfirmar')}
      textoCancelar={t('retirarMantener')}
      onConfirmar={() => void ejecutar()}
    />
  );
}
