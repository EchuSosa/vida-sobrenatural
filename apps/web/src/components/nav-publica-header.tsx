'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button, ButtonLink, Marca, Sheet, SheetContent, SheetTitle, SheetTrigger } from '@vida-sobrenatural/ui';
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
  const tc = useTranslations('comun');
  const acciones = useAccionesPublicas();

  return (
    // H-65 (revisión manual ronda 5): en celular, al bajar, el header (y el
    // acceso al menú) desaparecía — no hacía falta compensar el <main> con
    // padding: a diferencia de `fixed`, `sticky` sigue ocupando su lugar en
    // el flujo normal.
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        {/* FR-037/FR-040 (D122): logotipo en escritorio, isotipo en celular
            (H-80/H-87, componente Marca de packages/ui). */}
        <Link href="/" aria-current={pathname === '/' ? 'page' : undefined} className="flex items-center">
          <span className="md:hidden">
            <Marca variante="isotipo" />
          </span>
          <span className="hidden md:block">
            <Marca variante="logotipo" />
          </span>
        </Link>

        {/* Desktop — H-105: el corte con el hamburguesa sube a `lg` (1024px);
            a `md` (768, iPad Mini vertical) el contenido no entraba cómodo
            ("Primeros pasos" se partía en dos líneas). */}
        <nav aria-label={t('principal')} className="hidden items-center gap-6 lg:flex">
          {NAV_PUBLICA.map((item) => (
            <EnlaceMenu
              key={item.href}
              href={item.href}
              label={t(item.labelKey)}
              activo={pathname === item.href}
            />
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {acciones.map((item) => (
            // H-01/H-100 (revisión manual): estas acciones navegan — son
            // <a>, no botones. ButtonLink (packages/ui) es un <a> de verdad
            // con el estilo de Button, sin pasar por el Button de Base UI
            // (que fuerza semántica/comportamiento de botón) — el arreglo
            // durable que H-01 proponía y H-100 volvió a pedir, ya no una
            // copia de clases a mano por archivo.
            <ButtonLink
              key={item.href}
              render={<Link href={item.href} />}
              variant={item.href === '/dar' ? 'outline' : 'default'}
              size="sm"
            >
              {item.label}
            </ButtonLink>
          ))}
          {/* H-38: menú de usuario (Perfil/tema/cerrar sesión) — no renderiza nada sin sesión. */}
          <MenuUsuarioPublico />
        </div>

        {/* Celular Y tablet (hasta 1023px, H-105): menú hamburguesa (accesible — FR-014, T049) */}
        <div className="flex items-center gap-2 lg:hidden">
          {acciones.map((item) => (
            <ButtonLink
              key={item.href}
              render={<Link href={item.href} />}
              variant={item.href === '/dar' ? 'outline' : 'default'}
              size="sm"
            >
              {item.label}
            </ButtonLink>
          ))}
          <Sheet open={abierto} onOpenChange={setAbierto}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={t('abrirMenu')}>
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="right" className="gap-0" etiquetaCerrar={tc('cerrarPanel')}>
              {/* H-63 (revisión manual ronda 5): cabecera propia, separada
                  por un borde, para que la lista no arranque a la misma
                  altura que la X de cerrar. H-27 pedía el título solo para
                  lectores de pantalla porque no había dónde mostrarlo sin
                  duplicar texto — ahora es el título visible de la cabecera,
                  sin duplicarlo. */}
              <SheetTitle className="flex h-14 shrink-0 items-center border-b border-border px-4 text-base font-semibold">
                <Marca variante="isotipo" />
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
