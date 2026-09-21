'use client';

import Link from 'next/link';
import { useState, type ComponentType } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { MenuUsuario } from '@vida-sobrenatural/ui';
import { OPCIONES_TEMA, useSincronizarTemaPropio } from './menu-usuario-publico';
import { type TemaPreferido } from '@vida-sobrenatural/shared-types';

/**
 * H-47 (revisión manual ronda 4) / H-58 (unificación): en escritorio, el
 * ítem "Perfil" de la barra de la app abre el mismo `MenuUsuario`
 * compartido (Perfil / colores de la app / cerrar sesión) que ahora
 * también usan el header público y el backoffice — antes era un link
 * directo, igual que los demás ítems de `NAV_APP`. En celular sigue
 * siendo un link común (nav-app-bar.tsx).
 */
export function NavAppPerfilMenu({
  label,
  Icon,
  activo,
}: {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  activo: boolean;
}) {
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const elegirTema = useSincronizarTemaPropio();
  const [seleccionado, setSeleccionado] = useState<TemaPreferido>(
    (session?.user.temaPreferido as TemaPreferido) ?? 'claro',
  );

  return (
    <MenuUsuario
      trigger={
        <button
          type="button"
          aria-current={activo ? 'page' : undefined}
          className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-2 py-1 text-xs text-muted-foreground aria-[current=page]:text-foreground aria-[current=page]:font-semibold md:flex-row md:gap-2 md:text-sm"
        >
          <Icon className="size-5" />
          <span>{label}</span>
        </button>
      }
      ariaLabel={t('menuUsuario')}
      perfil={<Link href="/perfil">{t('perfil')}</Link>}
      labelColoresDeLaApp={t('tema')}
      opcionesTema={OPCIONES_TEMA.map(({ value, labelKey, Icono }) => ({ value, label: t(labelKey), Icono }))}
      temaSeleccionado={seleccionado}
      onElegirTema={async (value) => {
        setSeleccionado(value as TemaPreferido);
        await elegirTema(value as TemaPreferido);
      }}
      labelCerrarSesion={t('cerrarSesion')}
      onCerrarSesion={() => signOut({ callbackUrl: '/?sesion=cerrada' })}
    />
  );
}
