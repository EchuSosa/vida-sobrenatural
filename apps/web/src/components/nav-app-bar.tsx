'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@vida-sobrenatural/ui';
import { esItemActual } from '@vida-sobrenatural/shared-types';
import { NAV_APP } from '../config/nav-app';
import { useItemsMas } from './nav-app-mas';
import { NavAppPerfilMenu } from './nav-app-perfil-menu';

/**
 * H-37 (revisión manual ronda 3, docs/14-navegacion.md sección 2): en
 * escritorio, las secciones públicas (NAV_PUBLICA — H-46/D115: Nosotros,
 * Primeros pasos, Eventos, Visitanos — más Dar) se agregan a esta misma
 * barra, agrupadas bajo "Más" — en celular esta barra sigue siendo solo la
 * de pestañas; el acceso a "Más" ahí vive en `NavAppTopBarCelular`
 * (nav-app-mas.tsx), una barra aparte.
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

/**
 * spec 012, T022 (FR-005, D81): el globo con los avisos sin leer, junto al
 * ícono de Avisos. El número es decorativo para el lector de pantalla: lo que
 * se anuncia es "{n} avisos sin leer". `null` (no se pudo contar) o 0 → nada.
 */
function InsigniaSinLeer({ cantidad }: { cantidad: number | null }) {
  const t = useTranslations('avisos');
  if (!cantidad) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute -top-1 left-1/2 ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-sm leading-5 font-semibold text-primary-foreground md:static md:ml-0"
      >
        {cantidad > 99 ? '99+' : cantidad}
      </span>
      <span className="sr-only">{t('sinLeerAccesible', { n: cantidad })}</span>
    </>
  );
}

/** Barra de navegación de la app con sesión — Historia 1 (FR-003, FR-015). */
export function NavAppBar({ sinLeer = null }: { sinLeer?: number | null }) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav
      aria-label={t('principal')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:sticky md:top-0 md:border-t-0 md:border-b"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-1 md:justify-start md:gap-8 md:py-3">
        {NAV_APP.map((item) => {
          const { href, labelKey, icon: Icon } = item;
          // spec 006 (FR-023): también en sus subrutas y rutas relacionadas.
          const activo = esItemActual(item, pathname);
          const enlace = (
            <Link
              key={href}
              href={href}
              aria-current={activo ? 'page' : undefined}
              // ajustes-ux #5: etiquetas en 14 px (antes 12) e íconos de 24 px;
              // px-1 en celular para que las cinco sigan entrando a 320 px.
              className="relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-1 py-1 text-sm text-muted-foreground aria-[current=page]:text-foreground aria-[current=page]:font-semibold sm:px-2 md:flex-row md:gap-2"
            >
              <Icon className="size-6 md:size-5" />
              <span>{t(labelKey)}</span>
              {href === '/avisos' && <InsigniaSinLeer cantidad={sinLeer} />}
            </Link>
          );
          // H-47: en escritorio, "Perfil" abre un menú (Perfil/colores de la
          // app/cerrar sesión) en vez de navegar directo — en celular sigue
          // siendo un link común, como el resto de esta barra.
          if (href !== '/perfil') return enlace;
          return (
            <div key={href} className="contents">
              <div className="md:hidden">{enlace}</div>
              <div className="hidden md:block">
                <NavAppPerfilMenu label={t(labelKey)} Icon={Icon} activo={activo} />
              </div>
            </div>
          );
        })}
        <div className="hidden md:block">
          <MenuMasEscritorio />
        </div>
      </div>
    </nav>
  );
}
