import {
  Cake,
  GraduationCap,
  Home,
  Users,
  UserRoundCheck,
  Inbox,
  UsersRound,
  CalendarDays,
  Bell,
  FolderKanban,
  Building2,
  Trash2,
  Mic,
  BookOpen,
  MessageSquare,
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
  /**
   * D213: rutas que cuelgan de este ítem sin ser subrutas suyas — el ítem queda
   * marcado (`aria-current`) también ahí (`esItemActual`, shared-types). Ej.:
   * Sedes y Cursos viven bajo Catálogos.
   */
  rutasRelacionadas?: readonly string[];
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
  { href: '/solicitudes/[id]', labelKey: 'solicitudes', icon: Inbox, permiso: 'solicitudes.ver', enMenu: false },
  { href: '/grupos', labelKey: 'grupos', icon: UsersRound, permiso: 'grupos.ver' },
  { href: '/grupos/[id]', labelKey: 'grupos', icon: UsersRound, permiso: 'grupos.ver', enMenu: false },
  { href: '/eventos', labelKey: 'eventos', icon: CalendarDays, permiso: 'eventos.ver' },
  { href: '/notificaciones', labelKey: 'notificaciones', icon: Bell, permiso: 'notificaciones.ver' },
  // D213 (013 T077): Sedes sale del menú y se entra por Catálogos.
  { href: '/sedes', labelKey: 'sedes', icon: Building2, permiso: 'sedes.ver', enMenu: false },
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
  {
    href: '/catalogos',
    labelKey: 'catalogos',
    icon: FolderKanban,
    permiso: 'catalogos.ver',
    // spec 009: Ministerios también se entra por Catálogos (D213).
    rutasRelacionadas: ['/sedes', '/cursos', '/ministerios'],
  },
  // Lote 0 global (specs/IMPLEMENTACION.md): cada spec agrega SUS rutas recién
  // cuando existe la página — el smoke de axe recorre esta lista entera, así
  // que una ruta sin página rompe los e2e. Los permisos ya están en
  // CATALOGO_PERMISOS. Cada sesión escribe solo en su bloque, en este orden:
  //   spec 006 — /personas/nueva (personas.alta, enMenu: false) y BORRA
  //              /mis-discipulados, /mi-disponibilidad y /mis-grupos (D142, lote C).
  //   spec 008 — /grupos/servicio/[id] (grupos.ver, enMenu: false).
  //   spec 009 — /ministerios, /ministerios/[id], /ministerios/papelera (ministerios.ver / .papelera.ver, enMenu: false: se entra por Catálogos).
  //   spec 011 — /eventos/[id], /eventos/nuevo, /eventos/papelera (enMenu: false; /eventos ya está).
  //   spec 012 — /notificaciones/nueva (notificaciones.enviar, enMenu: false; /notificaciones ya está).
  //   spec 013 — /comentarios[/[id]] (comentarios.ver), /metricas y /cumpleanos (inicio.ver), /cursos[/[id]] y /cursos/papelera.
  { href: '/personas/[id]', labelKey: 'personas', icon: Users, permiso: 'personas.ver', enMenu: false }, // 013 lote 2: el perfil
  { href: '/cumpleanos', labelKey: 'cumpleanos', icon: Cake, permiso: 'personas.ver', enMenu: false }, // 013 lote 4: se entra desde el Inicio
  { href: '/comentarios', labelKey: 'comentarios', icon: MessageSquare, permiso: 'comentarios.ver', enMenu: false }, // 013 lote 5: se entra desde el Inicio
  { href: '/comentarios/[id]', labelKey: 'comentarios', icon: MessageSquare, permiso: 'comentarios.ver', enMenu: false },
  { href: '/cursos', labelKey: 'cursos', icon: GraduationCap, permiso: 'catalogos.ver', enMenu: false }, // 013 lote 6: se entra por Catálogos
  { href: '/cursos/[id]', labelKey: 'cursos', icon: GraduationCap, permiso: 'catalogos.ver', enMenu: false },
  { href: '/cursos/papelera', labelKey: 'cursos', icon: GraduationCap, permiso: 'cursos.papelera.ver', enMenu: false },
  // --- spec 006 ---
  { href: '/personas/nueva', labelKey: 'personas', icon: Users, permiso: 'personas.alta', enMenu: false },
  { href: '/personas/[id]/editar', labelKey: 'personas', icon: Users, permiso: 'personas.editar', enMenu: false }, // 013 lote 7: se entra desde el perfil
  { href: '/solicitudes/historial/[id]', labelKey: 'solicitudes', icon: Inbox, permiso: 'solicitudes.ver', enMenu: false },
  // --- spec 008 ---
  { href: '/solicitudes/vida-de-servicio/[id]', labelKey: 'solicitudes', icon: Inbox, permiso: 'solicitudes.ver', enMenu: false },
  { href: '/grupos/vida-de-servicio/[id]', labelKey: 'grupos', icon: UsersRound, permiso: 'grupos.ver', enMenu: false },
  { href: '/grupos/vida-de-servicio/[id]/semanas/[numero]', labelKey: 'grupos', icon: UsersRound, permiso: 'grupos.ver', enMenu: false },
  // --- spec 009 (se entra por Catálogos y por la bandeja) ---
  { href: '/solicitudes/postulacion/[id]', labelKey: 'solicitudes', icon: Inbox, permiso: 'solicitudes.ver', enMenu: false },
  { href: '/ministerios', labelKey: 'catalogos', icon: FolderKanban, permiso: 'ministerios.ver', enMenu: false },
  { href: '/ministerios/[id]', labelKey: 'catalogos', icon: FolderKanban, permiso: 'ministerios.ver', enMenu: false },
  { href: '/ministerios/papelera', labelKey: 'papelera', icon: Trash2, permiso: 'ministerios.papelera.ver', enMenu: false },
  // --- spec 011 ---
  { href: '/eventos/nuevo', labelKey: 'eventos', icon: CalendarDays, permiso: 'eventos.gestionar', enMenu: false },
  { href: '/eventos/[id]', labelKey: 'eventos', icon: CalendarDays, permiso: 'eventos.ver', enMenu: false },
  { href: '/eventos/papelera', labelKey: 'eventos', icon: CalendarDays, permiso: 'eventos.papelera.ver', enMenu: false },
  { href: '/solicitudes/inscripcion-evento/[id]', labelKey: 'solicitudes', icon: Inbox, permiso: 'eventos.ver', enMenu: false },
  { href: '/solicitudes/pago/[id]', labelKey: 'solicitudes', icon: Inbox, permiso: 'pagos.verificar', enMenu: false },
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

/**
 * H-134: a dónde aterriza una sesión que no pidió una ruta concreta — `/`
 * (callback de NextAuth, dominio a secas) y el botón del 404. Es el PRIMER
 * ítem del menú de esos roles, derivado de `itemsParaRoles` — nunca un
 * destino fijo, para que siga siendo correcto cuando cambien los roles del
 * catálogo. `null` si no hay ninguno (ej. una cuenta de Google que no es
 * Persona, `rol = []`): quien lo use tiene que mostrar una pantalla terminal,
 * nunca redirigir — si no, es un redirect infinito.
 */
export function itemDeAterrizaje(roles: string[]): ItemNavBackoffice | null {
  return itemsParaRoles(roles)[0] ?? null;
}
