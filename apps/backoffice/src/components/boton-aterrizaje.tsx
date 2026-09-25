'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '@vida-sobrenatural/ui';
import { itemDeAterrizaje } from '../config/nav';

/**
 * H-134: el botón de salida del 404 — va al MISMO destino que `/` resuelve
 * para esta sesión (`itemDeAterrizaje`, config/nav.ts), nunca a `/` fijo: con
 * `/` fijo, quien no tiene Inicio (un Discipulador, un Líder de curso) caía en
 * un 404 cuyo único botón lo devolvía al mismo 404. Sin ninguna pantalla
 * (`rol = []`), no hay botón: la explicación, en su lugar.
 *
 * Es de cliente (useSession) y no parte de not-found.tsx a propósito: un
 * not-found async (auth() en el servidor) dispara en desarrollo una excepción
 * de React al medir el límite de notFound() ("cannot have a negative time
 * stamp") en cada pantalla que corta sin sesión. Lee los roles de la sesión
 * como el shell — por eso es la tercera excepción declarada de
 * sin-rol-de-sesion-en-pantallas (eslint.config.mjs).
 */
export function BotonAterrizaje() {
  const { data: session } = useSession();
  const t = useTranslations('aterrizaje');
  const tNav = useTranslations('nav');
  if (!session) return null;

  const aterrizaje = itemDeAterrizaje(session.user.rol);
  if (!aterrizaje) return <p className="text-muted-foreground">{t('sinAccesoDescripcion')}</p>;
  return (
    <ButtonLink render={<Link href={aterrizaje.href} />} size="xl" className="mx-auto">
      {t('irA', { seccion: tNav(aterrizaje.labelKey) })}
    </ButtonLink>
  );
}
