'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button, Sheet, SheetTrigger, SheetContent, SheetTitle } from '@vida-sobrenatural/ui';
import { NAV_PUBLICA, NAV_PUBLICA_ACCIONES } from '../config/nav-publica';

/**
 * H-37 (revisión manual ronda 3, D107, docs/14-navegacion.md sección 2): la
 * app con sesión no tenía forma de llegar a las secciones públicas
 * (Nosotros, Primeros pasos, Ministerios, Visitanos, Dar) — NAV_APP solo
 * tiene las cinco pestañas propias. El "volver" (FR-047) no necesita código
 * nuevo: el header público ya ofrece "Ir a la app" de forma permanente
 * (H-19, FR-042) en cualquier pantalla pública, incluidas estas.
 */
const ITEMS_MAS = [...NAV_PUBLICA, ...NAV_PUBLICA_ACCIONES];

/** Ítems del panel "Más" — usados acá (Sheet, celular) y en nav-app-bar.tsx (DropdownMenu, escritorio). */
export function useItemsMas() {
  const t = useTranslations('nav');
  return ITEMS_MAS.map((item) => ({ href: item.href, label: t(item.labelKey) }));
}

/** Barra superior delgada de la app en celular — logo (a Inicio) + "Más". */
export function NavAppTopBarCelular() {
  const [abierto, setAbierto] = useState(false);
  const t = useTranslations('nav');
  const items = useItemsMas();

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2 md:hidden">
      <Link href="/inicio" className="font-semibold">
        Vida Sobrenatural
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
        <SheetContent side="right">
          <SheetTitle className="sr-only">{t('mas')}</SheetTitle>
          <nav aria-label={t('secundario')} className="flex flex-col gap-4 px-4 py-2">
            {items.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setAbierto(false)} className="text-sm font-medium">
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
