import { Home, MapIcon, CalendarDays, Bell, User } from 'lucide-react';
import type { ComponentType } from 'react';
import type { Permiso } from '@vida-sobrenatural/shared-types';

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
  { href: '/mi-camino', labelKey: 'miCamino', icon: MapIcon, rutasRelacionadas: ['/mis-discipulados', '/mi-disponibilidad', '/mis-grupos'] },
  // H-26 (revisión manual, actualización 2026-09-20, D107): /mis-eventos,
  // no /eventos — esa URL ya la usa la cartelera pública (`(publica)/eventos`)
  // y Next.js no permite que dos route groups resuelvan la misma URL.
  { href: '/mis-eventos', labelKey: 'eventos', icon: CalendarDays },
  { href: '/avisos', labelKey: 'avisos', icon: Bell },
  { href: '/perfil', labelKey: 'perfil', icon: User },
];

/**
 * spec 006, FR-023 (D156, contracts/navegacion.md): el selector de arriba de
 * Mi camino — "Mi camino · Mis discipulados". Cada ítem con su permiso del
 * catálogo (D132); se muestra solo si la sesión ve dos o más. La spec de Vida
 * de Servicio suma `{ href: '/mis-grupos', labelKey: 'misGrupos', permiso: 'mis_grupos.ver' }`.
 * `labelKey` es del namespace `miCamino.selector`.
 */
export interface ItemSubnavMiCamino {
  href: string;
  labelKey: string;
  permiso: Permiso | 'cualquier-sesion';
}

export const SUBNAV_MI_CAMINO: ItemSubnavMiCamino[] = [
  { href: '/mi-camino', labelKey: 'miCamino', permiso: 'cualquier-sesion' },
  { href: '/mis-discipulados', labelKey: 'misDiscipulados', permiso: 'mis_discipulados.ver' },
  // spec 008 (T014, D142): las ediciones de Vida de Servicio del Líder de curso.
  { href: '/mis-grupos', labelKey: 'misGrupos', permiso: 'mis_grupos.ver' },
];
