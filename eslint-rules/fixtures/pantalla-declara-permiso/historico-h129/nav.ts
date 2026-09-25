// Fixture de pantalla-declara-permiso.test.mjs: `git show 7fbeea2:apps/backoffice/src/config/nav.ts` (antes de la Historia 3, H-129). No editar.
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
  Mic,
  BookOpen,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { CATALOGO_PERMISOS, type Permiso, type RolDeCargo } from '@vida-sobrenatural/shared-types';

/**
 * Menú lateral del backoffice, filtrado por permiso — Historia 1, FR-004.
 * Contrato para features futuras: specs/002-base-transversal/contracts/nav-config.md.
 */
export interface ItemNavBackoffice {
  href: string;
  /** Clave en messages/es.json, namespace "nav" (FR-030 — sin texto fijo acá). */
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * D132: quién puede acceder se resuelve vía `CATALOGO_PERMISOS[permiso]`,
   * nunca con una lista de roles declarada acá — 'cualquier-sesion' es la
   * única excepción (cualquier Persona con sesión, sin permiso del catálogo
   * de por medio).
   */
  permiso: Permiso | 'cualquier-sesion';
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
  { href: '/', labelKey: 'inicio', icon: Home, permiso: 'inicio.ver' },
  { href: '/personas', labelKey: 'personas', icon: Users, permiso: 'personas.ver' },
  {
    href: '/pendientes-tutor',
    labelKey: 'pendientesTutor',
    icon: UserRoundCheck,
    permiso: 'pendientes_tutor.ver',
  },
  { href: '/solicitudes', labelKey: 'solicitudes', icon: Inbox, permiso: 'solicitudes.ver' },
  { href: '/grupos', labelKey: 'grupos', icon: UsersRound, permiso: 'grupos.ver' },
  { href: '/eventos', labelKey: 'eventos', icon: CalendarDays, permiso: 'eventos.ver' },
  { href: '/notificaciones', labelKey: 'notificaciones', icon: Bell, permiso: 'notificaciones.ver' },
  { href: '/sedes', labelKey: 'sedes', icon: Building2, permiso: 'sedes.ver' },
  { href: '/sedes/[id]', labelKey: 'sedes', icon: Building2, permiso: 'sedes.ver', enMenu: false },
  {
    href: '/sedes/papelera',
    labelKey: 'papelera',
    icon: Trash2,
    permiso: 'sedes.papelera.ver',
    enMenu: false,
  },
  // specs/003-contenido-institucional (FR-028/FR-029): Admin edita, Pastor lee.
  {
    href: '/palabra-profetica',
    labelKey: 'palabraProfetica',
    icon: Mic,
    permiso: 'palabra_profetica.ver',
  },
  { href: '/libros', labelKey: 'libros', icon: BookOpen, permiso: 'libros.ver' },
  { href: '/libros/[id]', labelKey: 'libros', icon: BookOpen, permiso: 'libros.ver', enMenu: false },
  {
    href: '/libros/papelera',
    labelKey: 'papeleraLibros',
    icon: Trash2,
    permiso: 'libros.papelera.ver',
    enMenu: false,
  },
  { href: '/catalogos', labelKey: 'catalogos', icon: FolderKanban, permiso: 'catalogos.ver' },
  {
    href: '/mis-discipulados',
    labelKey: 'misDiscipulados',
    icon: UsersRound,
    permiso: 'mis_discipulados.ver',
  },
  {
    href: '/mi-disponibilidad',
    labelKey: 'miDisponibilidad',
    icon: CalendarClock,
    permiso: 'mi_disponibilidad.ver',
  },
  { href: '/mis-grupos', labelKey: 'misGrupos', icon: UsersRound, permiso: 'mis_grupos.ver' },
];

function rolesEfectivos(permiso: Permiso | 'cualquier-sesion'): RolDeCargo[] | 'cualquier-sesion' {
  return permiso === 'cualquier-sesion' ? 'cualquier-sesion' : CATALOGO_PERMISOS[permiso];
}

/** Ítems del menú lateral para los roles de una Persona (puede tener más de uno) — sin las rutas secundarias (enMenu: false). */
export function itemsParaRoles(roles: string[]): ItemNavBackoffice[] {
  const vistos = new Set<string>();
  return NAV_BACKOFFICE.filter((item) => {
    if (item.enMenu === false) return false;
    const rolesDelPermiso = rolesEfectivos(item.permiso);
    const corresponde =
      rolesDelPermiso === 'cualquier-sesion' || rolesDelPermiso.some((rol) => roles.includes(rol));
    if (!corresponde || vistos.has(item.href)) return false;
    vistos.add(item.href);
    return true;
  });
}
