'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { UserX } from 'lucide-react';
import { ApiError, MOTIVO_CANCELACION_MAX, apiFetch, erroresPorCampo, formatearDiaDeServicio } from '@vida-sobrenatural/shared-types';
import { Button, DialogoTextoOpcional, textoDeCampo, type Traductor } from '@vida-sobrenatural/ui';

/**
 * spec 017, US4 (D257): "No puedo ir" en un turno publicado y futuro, con motivo opcional que ve
 * solo el líder. Dos toques mandan un solo aviso (el diálogo protege el envío, H-57); si la API
 * falla, el aviso trae "Reintentar".
 */
export function NoPuedoIr({ turnoId, dia, apiToken }: { turnoId: string; dia: string; apiToken: string }) {
  const t = useTranslations('misTurnos');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const fecha = formatearDiaDeServicio(dia, locale);

  const avisar = async (motivo: string | null): Promise<{ errores?: Record<string, string> } | void> => {
    try {
      await apiFetch(`/turnos/${turnoId}/cancelacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ motivo }),
      });
      toast.success(t('avisado', { fecha }));
      router.refresh();
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) return { errores: Object.fromEntries(campos.map(({ campo, code }) => [campo, textoDeCampo(te as unknown as Traductor, code, t('errorGenerico'))])) };
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'), { action: { label: t('reintentar'), onClick: () => void avisar(motivo) } });
    }
  };

  return (
    <DialogoTextoOpcional
      tono="neutro"
      trigger={
        <Button type="button" variant="outline" size="xl" className="w-fit text-base" aria-label={t('noPuedoIrA', { fecha })}>
          <UserX aria-hidden />
          {t('noPuedoIr')}
        </Button>
      }
      titulo={t('noPuedoTitulo', { fecha })}
      descripcion={t('noPuedoDescripcion')}
      campo="motivo"
      etiqueta={t('motivo')}
      max={MOTIVO_CANCELACION_MAX}
      contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
      mensajeDemasiadoLargo={te('campos.MOTIVO_CANCELACION_LARGO')}
      tituloResumen={t('resumen')}
      textoEnviar={t('avisar')}
      textoVolver={t('volver')}
      onEnviar={avisar}
    />
  );
}
