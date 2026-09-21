'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger, buttonVariants } from '@vida-sobrenatural/ui';
import { NAV_PUBLICA, NAV_PUBLICA_ACCIONES } from '../config/nav-publica';
import { MenuUsuarioPublico, ItemsUsuarioCelular } from './menu-usuario-publico';

/**
 * H-19 (actualización 2026-09-18): con sesión de una Persona ya activa, la
 * acción "Ingresar" deja de tener sentido — se reemplaza por un acceso
 * directo a la app. "Dar" no depende de la sesión, se mantiene siempre.
 */
function useAccionesPublicas() {
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const yaEsMiembro = session?.user.estado === 'activa';

  return NAV_PUBLICA_ACCIONES.map((item) =>
    item.href === '/registro' && yaEsMiembro
      ? { href: '/inicio', labelKey: 'irALaApp' as const, destacado: true }
      : item,
  ).map((item) => ({ ...item, label: t(item.labelKey) }));
}

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
  const acciones = useAccionesPublicas();

  return (
    // H-65 (revisión manual ronda 5): en celular, al bajar, el header (y el
    // acceso al menú) desaparecía — no hacía falta compensar el <main> con
    // padding: a diferencia de `fixed`, `sticky` sigue ocupando su lugar en
    // el flujo normal.
    <header className="sticky top-0 z-40 border-b border-border bg-background">
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
          {acciones.map((item) => (
            // H-01 (actualización 2026-09-18): estas acciones navegan — son
            // <a>, no botones. Antes pasaban por <Button render={<Link>}>,
            // que además de la advertencia de consola pisaba la semántica: el
            // Button de Base UI siempre expone role="button" (nativeButton
            // solo elige si además gestiona ARIA/teclado él mismo o asume que
            // el <button> nativo ya lo hace), así que un <a> renderizado ahí
            // dejaba de verse como link para lectores de pantalla y tests.
            // Un <Link> con las mismas clases de estilo evita eso: se ve
            // igual, pero conserva su rol de enlace.
            <Link key={item.href} href={item.href} className={buttonVariants({ variant: item.href === '/dar' ? 'outline' : 'default', size: 'sm' })}>
              {item.label}
            </Link>
          ))}
          {/* H-38: menú de usuario (Perfil/tema/cerrar sesión) — no renderiza nada sin sesión. */}
          <MenuUsuarioPublico />
        </div>

        {/* Celular: menú hamburguesa (accesible — FR-014, T049) */}
        <div className="flex items-center gap-2 md:hidden">
          {acciones.map((item) => (
            <Link key={item.href} href={item.href} className={buttonVariants({ variant: item.href === '/dar' ? 'outline' : 'default', size: 'sm' })}>
              {item.label}
            </Link>
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
              {/* H-27 (revisión manual, actualización 2026-09-20): título
                  visible sacado — el nombre accesible del panel (mismo
                  texto) sigue disponible para lectores de pantalla vía
                  `aria-labelledby`, sin duplicar información en pantalla. */}
              <SheetTitle className="sr-only">{t('menu')}</SheetTitle>
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
                {/* H-38: mismos ítems de usuario que el DropdownMenu de escritorio, sin sesión no renderiza nada. */}
                <ItemsUsuarioCelular onNavigate={() => setAbierto(false)} />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
