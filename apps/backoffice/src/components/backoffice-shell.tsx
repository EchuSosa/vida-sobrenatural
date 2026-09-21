'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
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
 * Sin sesión, no se muestra sidebar: cada página maneja su propio estado de
 * "necesitás iniciar sesión" (patrón ya existente en /sedes, /pendientes-tutor).
 */
export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const roles = (session?.user.rol ?? []) as RolBackoffice[];

  if (!session) {
    // Sin Sidebar en este caso — no hay otro <main> en juego, así que este
    // sigue siendo el único landmark "main" de la página.
    return (
      <main id="contenido" className="flex-1">
        {children}
      </main>
    );
  }

  const items = itemsParaRoles(roles);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            {/* H-51/H-52 (revisión manual ronda 4): el menú no estaba dentro
                de un <nav> — docs/14-navegacion.md pide un <nav aria-label>
                por menú (D81), y sin esto axe marca cada ítem como contenido
                fuera de cualquier landmark. */}
            <nav aria-label={t('principal')}>
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
            </nav>
          </SidebarGroup>
        </SidebarContent>
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
