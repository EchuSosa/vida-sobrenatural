'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { TriangleAlert } from 'lucide-react';
import { ApiError, CODIGOS_BAJA_CON_TEXTO_PROPIO, apiFetch, confirmacionBajaValida, erroresPorCampo } from '@vida-sobrenatural/shared-types';
import { Button, MensajeErrorCampo, ResumenErrores, textoDeCampo, useEnvio, useValidacionCampos, type Traductor } from '@vida-sobrenatural/ui';

/**
 * spec 018, US1: la palabra BAJA y el botón destructivo (D151: rojo + ícono). Un solo envío
 * (`useEnvio`, H-57); error por campo con resumen (H-50); si la API falla, no se borró nada y lo
 * dice. Al terminar, cierra la sesión y lleva a la despedida.
 */
export function FormularioBaja({ apiToken }: { apiToken: string }) {
  const t = useTranslations('perfil.baja');
  const te = useTranslations('errors');
  const validacion = useValidacionCampos();
  const [palabra, setPalabra] = useState('');
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const { enviando, ejecutar } = useEnvio(async () => {
    setErrorGeneral(null);
    if (!confirmacionBajaValida(palabra)) {
      validacion.reemplazar({ confirmacion: te('campos.CONFIRMACION_BAJA_INVALIDA') });
      return;
    }
    try {
      await apiFetch('/personas/me/baja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ confirmacion: palabra }),
      });
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) {
        validacion.reemplazar(Object.fromEntries(campos.map(({ campo, code }) => [campo, textoDeCampo(te as unknown as Traductor, code, t('errorGenerico'))])));
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      setErrorGeneral(code && CODIGOS_BAJA_CON_TEXTO_PROPIO.includes(code) && te.has(code) ? te(code) : t('errorGenerico'));
      return;
    }
    await signOut({ callbackUrl: '/baja-lista' });
  });

  const error = validacion.mensajes.confirmacion;
  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-destructive p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
    >
      {errorGeneral && (
        <p role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-base text-foreground">
          {errorGeneral}
        </p>
      )}
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumen')} />
      <div className="flex flex-col gap-1">
        <label htmlFor="campo-confirmacion" className="text-base font-medium">
          {t('confirmacion')}
        </label>
        <input
          id="campo-confirmacion"
          autoComplete="off"
          autoCapitalize="characters"
          value={palabra}
          onChange={(e) => {
            setPalabra(e.target.value);
            validacion.limpiar('confirmacion');
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'campo-confirmacion-error' : 'campo-confirmacion-ayuda'}
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30 sm:max-w-xs"
        />
        <p id="campo-confirmacion-ayuda" className="text-sm text-muted-foreground">
          {t('confirmacionAyuda')}
        </p>
        <MensajeErrorCampo id="campo-confirmacion-error" mensaje={error} />
      </div>
      <Button type="submit" variant="destructive" size="xl" className="text-base sm:self-start" loading={enviando} loadingText={t('enviando')}>
        <TriangleAlert aria-hidden />
        {t('confirmar')}
      </Button>
    </form>
  );
}
