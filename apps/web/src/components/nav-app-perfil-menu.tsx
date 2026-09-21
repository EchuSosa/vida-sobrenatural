'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@vida-sobrenatural/ui';
import { OPCIONES_TEMA, useSincronizarTemaPropio } from './menu-usuario-publico';
import { type TemaPreferido } from '@vida-sobrenatural/shared-types';

/**
 * H-47 (revisión manual ronda 4): en escritorio, el ítem "Perfil" de la
 * barra de la app abre un menú con Perfil, colores de la app y cerrar
 * sesión — antes era un link directo, igual que los demás ítems de
 * `NAV_APP`. "Cerrar sesión" es una fila más del propio DropdownMenu (a
 * diferencia de `MenuUsuarioPublico`/`MenuUsuario` del backoffice, que la
 * ponen afuera como botón aparte): el diálogo de confirmación no va
 * anidado dentro del `DropdownMenuContent` (H-11, conflicto de overlays)
 * — el ítem cierra el menú primero (estado controlado) y recién ahí abre
 * un `AlertDialog` aparte, también controlado.
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
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmarCerrarSesion, setConfirmarCerrarSesion] = useState(false);
  const [seleccionado, setSeleccionado] = useState<TemaPreferido>(
    (session?.user.temaPreferido as TemaPreferido) ?? 'claro',
  );

  function elegir(tema: TemaPreferido) {
    setSeleccionado(tema);
    elegirTema(tema);
  }

  return (
    <>
      <DropdownMenu open={menuAbierto} onOpenChange={setMenuAbierto}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-current={activo ? 'page' : undefined}
              className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-2 py-1 text-xs text-muted-foreground aria-[current=page]:text-foreground aria-[current=page]:font-semibold md:flex-row md:gap-2 md:text-sm"
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </button>
          }
        />
        <DropdownMenuContent align="end" aria-label={t('menuUsuario')}>
          <DropdownMenuItem render={<Link href="/perfil">{t('perfil')}</Link>} />
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t('tema')}</div>
          {OPCIONES_TEMA.map(({ value, labelKey, Icono }) => (
            <DropdownMenuItem key={value} data-active={seleccionado === value} onClick={() => elegir(value)}>
              <Icono className="size-4" aria-hidden="true" />
              {t(labelKey)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setMenuAbierto(false);
              setConfirmarCerrarSesion(true);
            }}
          >
            {t('cerrarSesion')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmarCerrarSesion} onOpenChange={setConfirmarCerrarSesion}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a tener que volver a autorizar el acceso con tu cuenta de Google para entrar de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={() => signOut({ callbackUrl: '/?sesion=cerrada' })}>
              Sí, cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
