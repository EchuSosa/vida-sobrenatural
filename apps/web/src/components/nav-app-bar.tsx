'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@vida-sobrenatural/ui';
import { NAV_APP } from '../config/nav-app';
import { useItemsMas } from './nav-app-mas';

/**
 * H-37 (revisión manual ronda 3, docs/14-navegacion.md sección 2): en
 * escritorio, las secciones públicas (Nosotros, Primeros pasos, Ministerios,
 * Visitanos, Dar) se agregan a esta misma barra, agrupadas bajo "Más" — en
 * celular esta barra sigue siendo solo la de pestañas; el acceso a "Más" ahí
 * vive en `NavAppTopBarCelular` (nav-app-mas.tsx), una barra aparte.
 */
function MenuMasEscritorio() {
  const t = useTranslations('nav');
  const items = useItemsMas();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1">
            {t('mas')}
            <ChevronDown className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" aria-label={t('secundario')}>
        {items.map((item) => (
          <DropdownMenuItem key={item.href} render={<Link href={item.href}>{item.label}</Link>} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Barra de navegación de la app con sesión — Historia 1 (FR-003, FR-015). */
export function NavAppBar() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav
      aria-label={t('principal')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:sticky md:top-0 md:border-t-0 md:border-b"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-1 md:justify-start md:gap-8 md:py-3">
        {NAV_APP.map(({ href, labelKey, icon: Icon }) => {
          const activo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? 'page' : undefined}
              className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-2 py-1 text-xs text-muted-foreground aria-[current=page]:text-foreground aria-[current=page]:font-semibold md:flex-row md:gap-2 md:text-sm"
            >
              <Icon className="size-5" />
              <span>{t(labelKey)}</span>
            </Link>
          );
        })}
        <div className="hidden md:block">
          <MenuMasEscritorio />
        </div>
      </div>
    </nav>
  );
}
