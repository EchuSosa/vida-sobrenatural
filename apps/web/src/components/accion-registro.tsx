'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

/**
 * H-19 (actualización 2026-09-18): con sesión de una Persona ya activa,
 * "Registrarme" ya no tiene sentido en Primeros pasos — se reemplaza por un
 * acceso directo a la app. Mismo criterio que useAccionesPublicas() en
 * nav-publica-header.tsx.
 */
export function AccionRegistro() {
  const { data: session } = useSession();
  const t = useTranslations('primerosPasos');
  const tNav = useTranslations('nav');
  const yaEsMiembro = session?.user.estado === 'activa';

  return (
    <Link
      href={yaEsMiembro ? '/inicio' : '/registro'}
      className="flex h-11 items-center justify-center rounded-lg border border-border px-5 text-center font-medium transition-colors hover:bg-muted"
    >
      {yaEsMiembro ? tNav('irALaApp') : t('registrarme')}
    </Link>
  );
}
