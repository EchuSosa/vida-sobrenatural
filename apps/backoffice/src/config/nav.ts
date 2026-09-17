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

/** Unión de ítems para los roles de una Persona (puede tener más de uno). */
export function itemsParaRoles(roles: string[]): ItemNavBackoffice[] {
  const vistos = new Set<string>();
  return NAV_BACKOFFICE.filter((item) => {
    const corresponde = item.roles.some((rol) => roles.includes(rol));
    if (!corresponde || vistos.has(item.href)) return false;
    vistos.add(item.href);
    return true;
  });
}
