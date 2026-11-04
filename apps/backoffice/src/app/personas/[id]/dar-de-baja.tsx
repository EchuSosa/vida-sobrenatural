'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { UserX } from 'lucide-react';
import { ApiError, CODIGOS_BAJA_CON_TEXTO_PROPIO, MOTIVO_BAJA_MAX, apiFetch, confirmacionBajaValida, erroresPorCampo } from '@vida-sobrenatural/shared-types';
import { Button, DialogoTextoOpcional, MensajeErrorCampo, textoDeCampo, type Traductor } from '@vida-sobrenatural/ui';

/**
 * spec 018, US2 (D263): el Admin da de baja a una Persona en su nombre. Destructivo (D151: rojo +
 * ícono), con la palabra BAJA (validada antes de enviar, error por campo H-50) y un motivo interno
 * opcional. El diálogo protege el envío (H-57); si la API falla, no se borró nada y lo dice.
 */
export function DarDeBaja({ personaId, nombre, apiToken }: { personaId: string; nombre: string; apiToken: string }) {
  const t = useTranslations('perfil.baja');
  const te = useTranslations('errors');
  const router = useRouter();
  const [palabra, setPalabra] = useState('');
  const texto = (code: string) => textoDeCampo(te as unknown as Traductor, code, t('errorGenerico'));

  return (
    <DialogoTextoOpcional
      tono="destructivo"
      trigger={
        <Button type="button" variant="destructive" className="h-11 w-fit">
          <UserX aria-hidden />
          {t('abrir')}
        </Button>
      }
      titulo={t('titulo', { nombre })}
      descripcion={t('descripcion')}
      campo="motivo"
      etiqueta={t('motivo')}
      ayuda={t('motivoAyuda')}
      max={MOTIVO_BAJA_MAX}
      contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
      mensajeDemasiadoLargo={te('campos.MOTIVO_BAJA_LARGO')}
      tituloResumen={t('resumen')}
      textoEnviar={t('confirmar')}
      textoVolver={t('volver')}
      validar={(): Record<string, string> => (confirmacionBajaValida(palabra) ? {} : { confirmacion: texto('CONFIRMACION_BAJA_INVALIDA') })}
      alCerrar={() => setPalabra('')}
      onEnviar={async (motivo) => {
        try {
          await apiFetch(`/personas/${personaId}/baja`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
            body: JSON.stringify({ confirmacion: palabra, motivo }),
          });
        } catch (error) {
          const campos = erroresPorCampo(error);
          if (campos) return { errores: Object.fromEntries(campos.map(({ campo, code }) => [campo, texto(code)])) };
          const code = error instanceof ApiError ? error.code : null;
          toast.error(code && CODIGOS_BAJA_CON_TEXTO_PROPIO.includes(code) && te.has(code) ? te(code) : t('errorGenerico'));
          return;
        }
        toast.success(t('listo'));
        router.push('/personas');
      }}
    >
      {({ mensajes, limpiar, enviando }) => (
        <div className="flex flex-col gap-1">
          <label htmlFor="campo-confirmacion" className="font-medium">
            {t('confirmacion')}
          </label>
          <input
            id="campo-confirmacion"
            autoComplete="off"
            value={palabra}
            disabled={enviando}
            onChange={(e) => {
              setPalabra(e.target.value);
              limpiar('confirmacion');
            }}
            aria-invalid={mensajes.confirmacion ? true : undefined}
            aria-describedby={mensajes.confirmacion ? 'campo-confirmacion-error' : undefined}
            className="h-11 rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
          />
          <MensajeErrorCampo id="campo-confirmacion-error" mensaje={mensajes.confirmacion} />
        </div>
      )}
    </DialogoTextoOpcional>
  );
}
