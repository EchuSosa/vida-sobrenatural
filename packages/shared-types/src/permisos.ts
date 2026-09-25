/**
 * Catálogo único de permisos (D132) — tanto `apps/api` (`PermisosGuard`)
 * como `apps/backoffice` (`requerirPermiso`, `itemsParaRoles`) resuelven
 * autorización leyendo este mismo mapa, nunca una lista de roles propia
 * (FR-013). Se llena historia por historia a medida que se migran los
 * sitios existentes y se agregan los nuevos — T001 lo deja vacío, T009
 * agrega los permisos `.ver` de las rutas ya existentes del backoffice.
 */
export type RolDeCargo = 'admin' | 'pastor' | 'discipulador' | 'lider_curso';

/**
 * Los cuatro valores de `RolDeCargo` como lista — Historia 2: la valida el
 * DTO de `POST /personas/:id/roles` y la recorre el modal de roles del
 * backoffice, sin que ninguno de los dos escriba los cuatro a mano.
 */
export const ROLES_DE_CARGO: readonly RolDeCargo[] = ['admin', 'pastor', 'discipulador', 'lider_curso'];

/**
 * Foundational (T009): un permiso `.ver` por cada ruta hoy protegida de
 * `apps/backoffice/src/config/nav.ts` — refactor sin cambio de
 * comportamiento, mismos roles que cada ruta ya tenía. Historia 2/3 suman
 * los permisos de gestión (`personas.gestionar_roles`, `libros.gestionar`,
 * etc.) a esta misma unión.
 */
export type Permiso =
  | 'inicio.ver'
  | 'personas.ver'
  | 'pendientes_tutor.ver'
  | 'solicitudes.ver'
  | 'grupos.ver'
  | 'eventos.ver'
  | 'notificaciones.ver'
  | 'sedes.ver'
  | 'sedes.papelera.ver'
  | 'palabra_profetica.ver'
  | 'libros.ver'
  | 'libros.papelera.ver'
  | 'catalogos.ver'
  | 'mis_discipulados.ver'
  | 'mi_disponibilidad.ver'
  | 'mis_grupos.ver'
  // Historia 2: otorgar/quitar roles de cargo (FR-006/FR-007) — solo Admin.
  | 'personas.gestionar_roles'
  // Historia 2 (T025): GET /personas/buscar, el buscador de tutor (H-29) —
  // mismos roles que ya tenía con `@Roles`, solo cambia cómo se declara.
  | 'personas.buscar'
  // Historia 3 (T030-T033): los `@Roles` que quedaban en la API, migrados
  // con los mismos roles que declaraban — solo cambia la fuente (D132).
  | 'libros.gestionar'
  | 'palabra_profetica.editar'
  | 'pendientes_tutor.gestionar'
  | 'sedes.gestionar';

export const CATALOGO_PERMISOS: Record<Permiso, RolDeCargo[]> = {
  'inicio.ver': ['admin', 'pastor'],
  'personas.ver': ['admin', 'pastor'],
  'pendientes_tutor.ver': ['admin', 'discipulador', 'pastor'],
  'solicitudes.ver': ['admin', 'pastor'],
  'grupos.ver': ['admin', 'pastor'],
  'eventos.ver': ['admin', 'pastor'],
  'notificaciones.ver': ['admin', 'pastor'],
  'sedes.ver': ['admin', 'pastor'],
  'sedes.papelera.ver': ['admin'],
  'palabra_profetica.ver': ['admin', 'pastor'],
  'libros.ver': ['admin', 'pastor'],
  'libros.papelera.ver': ['admin'],
  'catalogos.ver': ['admin', 'pastor'],
  'mis_discipulados.ver': ['discipulador'],
  'mi_disponibilidad.ver': ['discipulador'],
  'mis_grupos.ver': ['lider_curso'],
  'personas.gestionar_roles': ['admin'],
  'personas.buscar': ['admin', 'discipulador'],
  'libros.gestionar': ['admin'],
  // D129: el Pastor carga y edita la Palabra Profética igual que el Admin.
  'palabra_profetica.editar': ['admin', 'pastor'],
  'pendientes_tutor.gestionar': ['admin', 'discipulador'],
  'sedes.gestionar': ['admin'],
};

/**
 * ¿Alguno de estos roles tiene el permiso? — para decidir qué mostrar en una
 * pantalla (ej. el modal de roles de Personas) leyendo el catálogo, nunca un
 * `rol.includes('admin')` a mano.
 */
export function tienePermiso(roles: readonly string[], permiso: Permiso): boolean {
  return CATALOGO_PERMISOS[permiso].some((rol) => roles.includes(rol));
}
