'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger } from '@vida-sobrenatural/ui';
import { NAV_PUBLICA, NAV_PUBLICA_ACCIONES } from '../config/nav-publica';

function EnlaceMenu({
  href,
  label,
  activo,
  onNavigate,
}: {
  href: string;
  label: string;
  activo: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? 'page' : undefined}
      onClick={onNavigate}
      className="text-sm font-medium text-foreground/80 hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:underline-offset-4"
    >
      {label}
    </Link>
  );
}

export function NavPublicaHeader() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const t = useTranslations('nav');

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold" aria-current={pathname === '/' ? 'page' : undefined}>
          Vida Sobrenatural
        </Link>

        {/* Desktop */}
        <nav aria-label={t('principal')} className="hidden items-center gap-6 md:flex">
          {NAV_PUBLICA.map((item) => (
            <EnlaceMenu
              key={item.href}
              href={item.href}
              label={t(item.labelKey)}
              activo={pathname === item.href}
            />
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {NAV_PUBLICA_ACCIONES.map((item) => (
            <Button
              key={item.href}
              variant={item.href === '/dar' ? 'outline' : 'default'}
              size="sm"
              render={<Link href={item.href}>{t(item.labelKey)}</Link>}
            />
          ))}
        </div>

        {/* Celular: menú hamburguesa (accesible — FR-014, T049) */}
        <div className="flex items-center gap-2 md:hidden">
          {NAV_PUBLICA_ACCIONES.map((item) => (
            <Button
              key={item.href}
              variant={item.href === '/dar' ? 'outline' : 'default'}
              size="sm"
              render={<Link href={item.href}>{t(item.labelKey)}</Link>}
            />
          ))}
          <Sheet open={abierto} onOpenChange={setAbierto}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={t('abrirMenu')}>
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="right">
              <SheetTitle>{t('menu')}</SheetTitle>
              <nav aria-label={`${t('principal')} (celular)`} className="flex flex-col gap-4 px-4 py-2">
                {NAV_PUBLICA.map((item) => (
                  <EnlaceMenu
                    key={item.href}
                    href={item.href}
                    label={t(item.labelKey)}
                    activo={pathname === item.href}
                    onNavigate={() => setAbierto(false)}
                  />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
