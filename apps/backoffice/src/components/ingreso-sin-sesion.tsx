'use client';

import { usePathname } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { CODIGO_INGRESO_VIDA_MIN } from '@vida-sobrenatural/shared-types';
import { BotonIngresarGoogle, FormularioIngresoCodigo } from '@vida-sobrenatural/ui';
import { pedirCodigo, verificarCodigo } from './acciones-ingreso';

const CODIGOS_CONOCIDOS = new Set([
  'EMAIL_INVALIDO',
  'DEMASIADOS_PEDIDOS',
  'ENVIO_EMAIL_FALLIDO',
  'CODIGO_INVALIDO',
  'CODIGO_INCORRECTO',
  'CODIGO_SIN_INTENTOS',
  'CODIGO_VENCIDO',
]);

/**
 * spec 007 (T036, FR-001): Google con contorno, "o" y el formulario de código,
 * en ese orden, igual que en la web. Los dos pasos (email y código) viven en
 * esta misma pantalla. Después de entrar, se vuelve a la ruta en la que se
 * estaba (H-116), con Google o con código.
 */
export function IngresoSinSesion() {
  const t = useTranslations('ingreso');
  const pathname = usePathname();

  return (
    <div className="flex w-full flex-col gap-6">
      <BotonIngresarGoogle onIngresar={() => void signIn('google', { callbackUrl: pathname })}>{t('google')}</BotonIngresarGoogle>
      <div className="flex items-center gap-3 text-base text-muted-foreground" role="separator" aria-label={t('separador')}>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span aria-hidden="true">{t('separador')}</span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <FormularioIngresoCodigo
        textos={{
          tituloEmail: t('tituloEmail'),
          ayudaEmail: t('ayudaEmail'),
          campoEmail: t('campoEmail'),
          enviarCodigo: t('enviarCodigo'),
          enviandoCodigo: t('enviandoCodigo'),
          tituloCodigo: t('tituloCodigo'),
          explicacionCodigo: (email) => t('explicacionCodigo', { email, minutos: CODIGO_INGRESO_VIDA_MIN }),
          campoCodigo: t('campoCodigo'),
          ayudaCodigo: t('ayudaCodigo'),
          entrar: t('entrar'),
          entrando: t('entrando'),
          otroCodigo: t('otroCodigo'),
          codigoReenviado: t('codigoReenviado'),
          otroEmail: t('otroEmail'),
          tituloResumen: t('tituloResumen'),
          mensajeError: (code, { minutos }) =>
            CODIGOS_CONOCIDOS.has(code) ? t(`errores.${code}`, { minutos }) : t('errores.desconocido'),
        }}
        pedirCodigo={pedirCodigo}
        verificarCodigo={(email, codigo) => verificarCodigo(email, codigo, pathname)}
      />
    </div>
  );
}
