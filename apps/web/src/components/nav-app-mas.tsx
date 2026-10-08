'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button, Marca, Sheet, SheetTrigger, SheetContent, SheetTitle } from '@vida-sobrenatural/ui';
import { NAV_PUBLICA } from '../config/nav-publica';
import { CLASES_ITEM_PANEL, useAccionesPublicas } from './nav-publica-header';

/**
 * H-37 (revisión manual ronda 3, D107, docs/14-navegacion.md sección 2): la
 * app con sesión no tenía forma de llegar a las secciones públicas
 * (NAV_PUBLICA + NAV_PUBLICA_ACCIONES — H-46/D115 las bajó a cuatro fijas
 * más Dar/Ingresar) — NAV_APP solo tiene las cinco pestañas propias. El
 * "volver" (FR-047) no necesita código nuevo: el header público ya ofrece
 * "Ir a la app" de forma permanente (H-19, FR-042) en cualquier pantalla
 * pública, incluidas estas.
 */

/** Ítems del panel "Más" — usados acá (Sheet, celular) y en nav-app-bar.tsx (DropdownMenu, escritorio). */
export function useItemsMas() {
  const t = useTranslations('nav');
  // H-64 (revisión manual ronda 5, D115): las acciones (Dar/Ingresar) pasan
  // por useAccionesPublicas() — acá la sesión SIEMPRE está activa, así que
  // sin este filtro "Ingresar" quedaba apuntando a /registro también para
  // quien ya es Miembro registrado.
  const acciones = useAccionesPublicas();
  return [
    ...NAV_PUBLICA.map((item) => ({ href: item.href, label: t(item.labelKey) })),
    ...acciones.map((item) => ({ href: item.href, label: item.label })),
  ];
}

/** Barra superior delgada de la app en celular — logo (a Inicio) + "Más". */
export function NavAppTopBarCelular() {
  const [abierto, setAbierto] = useState(false);
  const t = useTranslations('nav');
  const tc = useTranslations('comun');
  const items = useItemsMas();

  return (
    // H-66 (revisión manual ronda 5): esta barra se iba con el scroll — acá
    // vive "Más", la única salida de la app hacia las páginas públicas
    // (H-37). `fixed`, como la barra inferior (nav-app-bar.tsx) — el
    // `<main>` compensa con `pt-14` (app/(app)/layout.tsx).
    // `<header>` y no `<div>` (T061, merge de la 004): el logo quedaba fuera
    // de todo landmark y axe lo marcaba (regla `region`) en celular.
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      {/* H-87: acá no había marca, solo el nombre en texto — isotipo, no
          logotipo (7.5:1 produce scroll horizontal a 320px, H-62). */}
      <Link href="/inicio" className="flex min-h-11 min-w-11 items-center">
        <Marca variante="isotipo" />
      </Link>
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="sm" aria-label={t('mas')}>
              <Menu className="size-4" />
              {t('mas')}
            </Button>
          }
        />
        <SheetContent side="right" className="gap-0" etiquetaCerrar={tc('cerrarPanel')}>
          {/* H-63 (revisión manual ronda 5): mismo criterio que el menú
              hamburguesa público (nav-publica-header.tsx) — cabecera propia
              separada por un borde, en vez de que la lista arranque a la
              misma altura que la X. */}
          <SheetTitle className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 text-base font-semibold">
            <Marca variante="isotipo" />
            {t('mas')}
          </SheetTitle>
          {/* ajustes-ux #2: filas de 48 px con separador, como el panel público. */}
          <nav aria-label={t('secundario')} className="flex flex-col overflow-y-auto px-4 py-2">
            {items.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setAbierto(false)} className={CLASES_ITEM_PANEL}>
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
