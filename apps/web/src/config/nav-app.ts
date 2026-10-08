import { Home, MapIcon, CalendarDays, Bell, User } from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Barra de navegación de la app con sesión iniciada — Historia 1, FR-003.
 * Contrato para features futuras: specs/002-base-transversal/contracts/nav-config.md.
 */
export interface ItemNavApp {
  href: string;
  /** Clave en messages/es.json, namespace "nav" (FR-030 — sin texto fijo acá). */
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * spec 006 (FR-023): otras rutas en las que esta pestaña cuenta como la
   * actual (`aria-current="page"`); la comparación es por segmento
   * (`esItemActual` de shared-types).
   */
  rutasRelacionadas?: readonly string[];
}

export const NAV_APP: ItemNavApp[] = [
  { href: '/inicio', labelKey: 'inicio', icon: Home },
  { href: '/mi-camino', labelKey: 'miCamino', icon: MapIcon, rutasRelacionadas: ['/mis-discipulados', '/mi-disponibilidad'] },
  // H-26 (revisión manual, actualización 2026-09-20, D107): /mis-eventos,
  // no /eventos — esa URL ya la usa la cartelera pública (`(publica)/eventos`)
  // y Next.js no permite que dos route groups resuelvan la misma URL.
  { href: '/mis-eventos', labelKey: 'eventos', icon: CalendarDays },
  { href: '/avisos', labelKey: 'avisos', icon: Bell },
  { href: '/perfil', labelKey: 'perfil', icon: User },
];
