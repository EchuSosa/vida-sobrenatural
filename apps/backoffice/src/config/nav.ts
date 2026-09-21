import {
  Home,
  Users,
  UserRoundCheck,
  Inbox,
  UsersRound,
  CalendarDays,
  Bell,
  FolderKanban,
  CalendarClock,
  Building2,
  Trash2,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type RolBackoffice = 'admin' | 'discipulador' | 'lider_curso' | 'pastor';

/**
 * Menú lateral del backoffice, filtrado por rol — Historia 1, FR-004.
 * Contrato para features futuras: specs/002-base-transversal/contracts/nav-config.md.
 */
export interface ItemNavBackoffice {
  href: string;
  /** Clave en messages/es.json, namespace "nav" (FR-030 — sin texto fijo acá). */
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  roles: RolBackoffice[];
  /**
   * D119/H-61: rutas secundarias (ej. la papelera de Sedes, alcanzable desde
   * un link dentro de /sedes) no van en el menú lateral, pero siguen siendo
   * rutas reales del backoffice — quedan en NAV_BACKOFFICE (una sola fuente
   * de verdad, Principio XI) para que el smoke de axe/scroll horizontal
   * (H-61) las recorra igual, sin mantener una segunda lista a mano.
   */
  enMenu?: boolean;
}

export const NAV_BACKOFFICE: ItemNavBackoffice[] = [
  { href: '/', labelKey: 'inicio', icon: Home, roles: ['admin', 'pastor'] },
  { href: '/personas', labelKey: 'personas', icon: Users, roles: ['admin', 'pastor'] },
  {
    href: '/pendientes-tutor',
    labelKey: 'pendientesTutor',
    icon: UserRoundCheck,
    roles: ['admin', 'discipulador', 'pastor'],
  },
  { href: '/solicitudes', labelKey: 'solicitudes', icon: Inbox, roles: ['admin', 'pastor'] },
  { href: '/grupos', labelKey: 'grupos', icon: UsersRound, roles: ['admin', 'pastor'] },
  { href: '/eventos', labelKey: 'eventos', icon: CalendarDays, roles: ['admin', 'pastor'] },
  { href: '/notificaciones', labelKey: 'notificaciones', icon: Bell, roles: ['admin', 'pastor'] },
  { href: '/sedes', labelKey: 'sedes', icon: Building2, roles: ['admin', 'pastor'] },
  { href: '/sedes/papelera', labelKey: 'papelera', icon: Trash2, roles: ['admin'], enMenu: false },
  { href: '/catalogos', labelKey: 'catalogos', icon: FolderKanban, roles: ['admin', 'pastor'] },
  {
    href: '/mis-discipulados',
    labelKey: 'misDiscipulados',
    icon: UsersRound,
    roles: ['discipulador'],
  },
  {
    href: '/mi-disponibilidad',
    labelKey: 'miDisponibilidad',
    icon: CalendarClock,
    roles: ['discipulador'],
  },
  { href: '/mis-grupos', labelKey: 'misGrupos', icon: UsersRound, roles: ['lider_curso'] },
];

/** Ítems del menú lateral para los roles de una Persona (puede tener más de uno) — sin las rutas secundarias (enMenu: false). */
export function itemsParaRoles(roles: string[]): ItemNavBackoffice[] {
  const vistos = new Set<string>();
  return NAV_BACKOFFICE.filter((item) => {
    if (item.enMenu === false) return false;
    const corresponde = item.roles.some((rol) => roles.includes(rol));
    if (!corresponde || vistos.has(item.href)) return false;
    vistos.add(item.href);
    return true;
  });
}
