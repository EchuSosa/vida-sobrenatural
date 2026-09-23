'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  Marca,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@vida-sobrenatural/ui';
import { itemsParaRoles, type RolBackoffice } from '../config/nav';
import { MenuUsuario } from './selector-tema';

/**
 * Shell del backoffice — sidebar filtrado por rol (Historia 1, FR-004).
 *
 * H-116: este componente solo se renderiza dentro de la rama "hay sesión"
 * de `apps/backoffice/src/app/layout.tsx` (que ya chequeó `auth()` y
 * sembró `SessionProvider` con esa sesión) — antes cada página decidía por
 * su cuenta si mostrar sidebar o su propio "necesitás iniciar sesión"; esa
 * decisión ahora es del layout, una sola vez. El `if (!session)` de acá no
 * es una pantalla alternativa: es una guarda de tipos para un estado que,
 * con esa garantía, no debería poder darse.
 */
export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations('nav');

  if (!session) return null;

  const roles = session.user.rol as RolBackoffice[];
  const items = itemsParaRoles(roles);

  return (
    <SidebarProvider>
      <Sidebar>
        {/* H-51/H-52 (revisión manual ronda 4): el menú no estaba dentro de
            un <nav> — docs/14-navegacion.md pide un <nav aria-label> por
            menú (D81), y sin esto axe marca cada ítem como contenido fuera
            de cualquier landmark. FR-038 (D122) agregó el logotipo de la
            cabecera del sidebar como hermano de ese menú — el <nav> ahora
            envuelve a los dos (en vez de duplicar el landmark) para que el
            logotipo también quede contenido. */}
        <nav aria-label={t('principal')}>
          {/* FR-038 (D122): logotipo en la cabecera del sidebar, hoy sin ninguna marca. */}
          <SidebarHeader>
            <Link href="/" className="flex items-center px-2 py-1">
              <Marca variante="logotipo" className="h-6" />
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                {items.map(({ href, labelKey, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={pathname === href}
                      render={
                        <Link href={href} aria-current={pathname === href ? 'page' : undefined}>
                          <Icon />
                          <span>{t(labelKey)}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </nav>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <SidebarTrigger />
          <MenuUsuario />
        </header>
        {/* H-51/H-52: SidebarInset ya es un <main> (packages/ui) — un
            <main id="contenido"> acá adentro duplicaba el landmark
            ("at most one main landmark", "main is top level"). Este <div>
            sigue siendo el destino del skip-link (layout.tsx). */}
        <div id="contenido" className="flex-1 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
