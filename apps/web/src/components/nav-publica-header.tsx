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
 * directo a la app; con sesión sin registro, por "Completar registro" (H-R2). "Dar" no depende de la sesión, se mantiene siempre.
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

  return NAV_PUBLICA_ACCIONES.map((item) => {
    if (item.href !== '/ingresar' || !session) return item;
    if (yaEsMiembro) return { href: '/inicio', labelKey: 'irALaApp', destacado: true };
    // FR-042 de la 002 (H-R2): con sesión y sin registro, "Ingresar" junto al
    // nombre confundía — ya entró; lo que le falta es completar el registro.
    return { href: '/registro', labelKey: 'completarRegistro', destacado: true };
  }).map((item) => ({ ...item, label: t(item.labelKey) }));
}

/**
 * Clases de un ítem de los paneles laterales (hamburguesa público y "Más" de
 * la app): ajustes-ux #2 — antes medían 20 px de alto con 16 px entre uno y
 * otro; ahora cada uno es una fila de 48 px con separador, en 16 px (D150).
 * Exportado: lo usa también nav-app-mas.tsx (Principio XI).
 */
export const CLASES_ITEM_PANEL =
  'flex min-h-12 items-center border-b border-border py-3 text-base font-medium text-foreground last:border-b-0';

function EnlaceMenu({
  href,
  label,
  activo,
  onNavigate,
  enPanel = false,
}: {
  href: string;
  label: string;
  activo: boolean;
  onNavigate?: () => void;
  enPanel?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? 'page' : undefined}
      onClick={onNavigate}
      className={`${enPanel ? CLASES_ITEM_PANEL : 'text-sm font-medium text-foreground/80 hover:text-foreground'} aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:underline-offset-4`}
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
        <Link href="/" aria-current={pathname === '/' ? 'page' : undefined} className="flex min-h-11 min-w-11 items-center">
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
          {/* ajustes-ux #1: con D150 estas acciones ya miden 44 px y van en
              16 px. A 320 px "Completar registro" no entra en una línea: ahí
              se parte en dos, en vez de empujar el hamburguesa afuera. */}
          {acciones.map((item) => (
            <ButtonLink
              key={item.href}
              render={<Link href={item.href} />}
              variant={item.href === '/dar' ? 'outline' : 'default'}
              size="sm"
              className="max-[379px]:whitespace-normal max-[379px]:text-center max-[379px]:leading-tight"
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
              <nav aria-label={`${t('principal')} (celular)`} className="flex flex-col overflow-y-auto px-4 py-2">
                {NAV_PUBLICA.map((item) => (
                  <EnlaceMenu
                    key={item.href}
                    href={item.href}
                    label={t(item.labelKey)}
                    activo={pathname === item.href}
                    onNavigate={() => setAbierto(false)}
                    enPanel
                  />
                ))}
                {/* ajustes-ux #4: con el panel abierto, "Dar" e "Ingresar" del
                    header quedan detrás del velo — se repiten acá, como ya
                    hace "Más" en la app. */}
                {acciones.map((item) => (
                  <EnlaceMenu
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    activo={pathname === item.href}
                    onNavigate={() => setAbierto(false)}
                    enPanel
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
