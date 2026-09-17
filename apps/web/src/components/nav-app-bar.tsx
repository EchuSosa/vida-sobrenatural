'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { NAV_APP } from '../config/nav-app';

/** Barra de navegación de la app con sesión — Historia 1 (FR-003, FR-015). */
export function NavAppBar() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav
      aria-label={t('principal')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:sticky md:top-0 md:border-t-0 md:border-b"
    >
      <div className="mx-auto flex max-w-5xl justify-around px-2 py-1 md:justify-start md:gap-8 md:py-3">
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
      </div>
    </nav>
  );
}
