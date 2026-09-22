'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger, buttonVariants } from '@vida-sobrenatural/ui';
import isotipoClaro from '@vida-sobrenatural/ui/assets/marca/logo-oscuro-1024.png';
import isotipoOscuro from '@vida-sobrenatural/ui/assets/marca/logo-blanco-1024.png';
import logotipoClaro from '@vida-sobrenatural/ui/assets/marca/logotipo-oscuro-600.png';
import logotipoOscuro from '@vida-sobrenatural/ui/assets/marca/logotipo-blanco-600.png';
import { NAV_PUBLICA, NAV_PUBLICA_ACCIONES } from '../config/nav-publica';
import { MenuUsuarioPublico, ItemsUsuarioCelular } from './menu-usuario-publico';

/**
 * H-19 (actualización 2026-09-18): con sesión de una Persona ya activa, la
 * acción "Ingresar" deja de tener sentido — se reemplaza por un acceso
 * directo a la app. "Dar" no depende de la sesión, se mantiene siempre.
 * Exportado: H-64 (revisión manual ronda 5, D115) — nav-app-mas.tsx (el
 * panel "Más" de la app, con sesión SIEMPRE activa) usaba NAV_PUBLICA_ACCIONES
 * crudo, sin este filtro. Con sesión, cualquier enlace a `/registro` termina
 * en el redirect de esa página hacia `/primeros-pasos?ya_registrado=1`, con
 * el toast de sorpresa — una sola fuente de verdad para el filtro evita que
 * se rompa en un lugar y no en el otro (Principio XI).
 */
export function useAccionesPublicas() {
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const yaEsMiembro = session?.user.estado === 'activa';

  return NAV_PUBLICA_ACCIONES.map((item) =>
    item.href === '/registro' && yaEsMiembro
      ? { href: '/inicio', labelKey: 'irALaApp' as const, destacado: true }
      : item,
  ).map((item) => ({ ...item, label: t(item.labelKey) }));
}

/**
 * FR-037/FR-040 (D122): logotipo en escritorio, isotipo solo en celular
 * (la proporción 7.5:1 del logotipo completo produciría scroll horizontal
 * a 320px, H-62) — claro/oscuro alternados por CSS (`dark:hidden`/
 * `hidden dark:block`, research.md Decisión 7), sin condición en JS.
 */
function MarcaHeader() {
  return (
    <>
      <span className="flex items-center gap-2 md:hidden">
        <Image src={isotipoClaro} alt="Vida Sobrenatural" className="size-8 dark:hidden" />
        <Image src={isotipoOscuro} alt="Vida Sobrenatural" className="hidden size-8 dark:block" />
      </span>
      <span className="hidden items-center md:flex">
        <Image src={logotipoClaro} alt="Vida Sobrenatural" className="h-7 w-auto dark:hidden" />
        <Image src={logotipoOscuro} alt="Vida Sobrenatural" className="hidden h-7 w-auto dark:block" />
      </span>
    </>
  );
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
        <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>
          <MarcaHeader />
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
            <SheetContent side="right" className="gap-0">
              {/* H-63 (revisión manual ronda 5): cabecera propia, separada
                  por un borde, para que la lista no arranque a la misma
                  altura que la X de cerrar. H-27 pedía el título solo para
                  lectores de pantalla porque no había dónde mostrarlo sin
                  duplicar texto — ahora es el título visible de la cabecera,
                  sin duplicarlo. */}
              <SheetTitle className="flex h-14 shrink-0 items-center border-b border-border px-4 text-base font-semibold">
                <Image src={isotipoClaro} alt="Vida Sobrenatural" className="size-8 dark:hidden" />
                <Image src={isotipoOscuro} alt="Vida Sobrenatural" className="hidden size-8 dark:block" />
              </SheetTitle>
              <nav aria-label={`${t('principal')} (celular)`} className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
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
