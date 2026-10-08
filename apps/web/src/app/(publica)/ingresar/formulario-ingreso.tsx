'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { CODIGO_INGRESO_VIDA_MIN } from '@vida-sobrenatural/shared-types';
import {
  BotonIngresarGoogle,
  FormularioIngresoCodigo,
  type PasoIngreso,
  type TextosFormularioIngresoCodigo,
} from '@vida-sobrenatural/ui';
import { pedirCodigo, usarOtroEmail, verificarCodigo } from './acciones';

const CODIGOS_CONOCIDOS = new Set([
  'EMAIL_INVALIDO',
  'DEMASIADOS_PEDIDOS',
  'ENVIO_EMAIL_FALLIDO',
  'CODIGO_INVALIDO',
  'CODIGO_INCORRECTO',
  'CODIGO_SIN_INTENTOS',
  'CODIGO_VENCIDO',
]);

/** Textos del formulario compartido, desde el namespace `ingreso` (D84). */
export function useTextosIngreso(): TextosFormularioIngresoCodigo {
  const t = useTranslations('ingreso');
  return {
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
  };
}

/**
 * spec 007 (T021, FR-001): la pantalla de ingreso de la web, paso email.
 * Orden fijo: Google con contorno, "o", el formulario con "Enviarme el
 * código" como única acción principal. Al pedir bien el código, pasa a
 * `/ingresar/codigo` (el email queda en la cookie).
 */
export function IngresoPasoEmail({ destino }: { destino?: string }) {
  const t = useTranslations('ingreso');
  const router = useRouter();
  const textos = useTextosIngreso();
  const vuelta = destino ? `/ingresar?destino=${encodeURIComponent(destino)}` : '/ingresar';
  const paso: PasoIngreso = 'email';

  return (
    <div className="flex flex-col gap-6">
      <BotonIngresarGoogle onIngresar={() => void signIn('google', { callbackUrl: vuelta })}>{t('google')}</BotonIngresarGoogle>
      <div className="flex items-center gap-3 text-base text-muted-foreground" role="separator" aria-label={t('separador')}>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span aria-hidden="true">{t('separador')}</span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <FormularioIngresoCodigo
        textos={textos}
        pasoInicial={paso}
        pedirCodigo={pedirCodigo}
        verificarCodigo={(_email, codigo) => verificarCodigo('', codigo, destino)}
        alPedirCodigo={() => router.push(destino ? `/ingresar/codigo?destino=${encodeURIComponent(destino)}` : '/ingresar/codigo')}
      />
    </div>
  );
}

/** spec 007 (T022): el paso del código, con el email leído de la cookie en el servidor. */
export function IngresoPasoCodigo({ email, destino }: { email: string; destino?: string }) {
  const textos = useTextosIngreso();
  return (
    <FormularioIngresoCodigo
      textos={textos}
      pasoInicial="codigo"
      emailInicial={email}
      nivelTitulo="h1"
      pedirCodigo={pedirCodigo}
      // El email lo lee la acción de su cookie: no hace falta mandarlo de nuevo.
      verificarCodigo={(_email, codigo) => verificarCodigo('', codigo, destino)}
      alUsarOtroEmail={() => usarOtroEmail(destino)}
    />
  );
}
