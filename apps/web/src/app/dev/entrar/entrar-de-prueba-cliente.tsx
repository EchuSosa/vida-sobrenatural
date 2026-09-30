'use client';

import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { EMAILS_DE_PRUEBA, EntrarDePrueba } from '@vida-sobrenatural/ui';

/** H-R13: entra con el proveedor `test-login`. En la web, después de entrar va a `/registro`, que ya manda a Primeros pasos a quien está registrada. */
export function EntrarDePruebaCliente({ nivelTitulo }: { nivelTitulo?: 'h1' | 'h2' }) {
  const t = useTranslations('devEntrar');
  return (
    <EntrarDePrueba
      etiquetas={{
        titulo: t('titulo'),
        descripcion: t('descripcion'),
        email: t('email'),
        entrar: t('entrar'),
        entrando: t('entrando'),
        rapidos: t('rapidos'),
      }}
      emailsRapidos={EMAILS_DE_PRUEBA}
      nivelTitulo={nivelTitulo}
      onEntrar={async (email) => {
        // Con el servidor de desarrollo recién levantado, el primer intento puede
        // volver con MissingCSRF (la ruta de Auth.js se compila en ese momento):
        // se reintenta una vez antes de navegar.
        const intentar = () => signIn('test-login', { email, redirect: false });
        const resultado = (await intentar())?.error ? await intentar() : null;
        if (resultado?.error) return;
        window.location.assign('/registro');
      }}
    />
  );
}
