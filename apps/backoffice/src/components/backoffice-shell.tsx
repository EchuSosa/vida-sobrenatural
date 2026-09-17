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
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <SidebarTrigger />
          <MenuUsuario />
        </header>
        <main id="contenido" className="flex-1 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
