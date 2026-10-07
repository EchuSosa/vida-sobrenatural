import type { ErrorCode } from './error-code.js';
import type { DiscipuladoActivo, PropuestaPendiente } from './discipulado.js';

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
 * Roles de ESTADO del proceso (D131, FR-019): los escribe el sistema como
 * consecuencia de un evento de dominio, nunca un Admin — por un único lugar,
 * `RolesDeEstadoService.otorgarRolDeEstado` (apps/api). Hoy solo
 * `miembro_registrado`; FR-021: no se suma ninguno cuyo evento de origen
 * (Vida Nueva, Vida de Servicio, Ministerios) todavía no existe.
 */
export type RolDeEstado = 'miembro_registrado';

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
  | 'sedes.gestionar'
  // specs/004-vida-nueva-discipulado (research #9): resolver Solicitudes,
  // crear en nombre de otra Persona, gestionar Grupos, y las acciones del
  // Discipulador sobre sus discipulados y su disponibilidad.
  | 'solicitudes.aprobar'
  | 'solicitudes.crear_en_nombre'
  | 'grupos.gestionar'
  | 'mis_discipulados.gestionar'
  | 'mi_disponibilidad.gestionar';

export const CATALOGO_PERMISOS: Record<Permiso, RolDeCargo[]> = {
  'inicio.ver': ['admin', 'pastor'],
  'personas.ver': ['admin', 'pastor'],
  // D64: el Pastor ve esta lista (GET /personas/pendientes-tutor, T070) —
  // la única compuesta enteramente por menores, con sus datos de contacto y
  // el teléfono del tutor. Restringirla es enmendar D64, no este valor.
  // D139 (H-R6): el Discipulador ya no la ve ni la gestiona.
  'pendientes_tutor.ver': ['admin', 'pastor'],
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
  // D139 (H-R6): activar un menor y cerrar un caso son del Admin.
  'pendientes_tutor.gestionar': ['admin'],
  'sedes.gestionar': ['admin'],
  // specs/004-vida-nueva-discipulado.
  'solicitudes.aprobar': ['admin'],
  'solicitudes.crear_en_nombre': ['admin', 'discipulador'],
  'grupos.gestionar': ['admin'],
  'mis_discipulados.gestionar': ['discipulador'],
  'mi_disponibilidad.gestionar': ['discipulador'],
};

/**
 * ¿Alguno de estos roles tiene el permiso? — para decidir qué mostrar en una
 * pantalla (ej. el modal de roles de Personas) leyendo el catálogo, nunca un
 * `rol.includes('admin')` a mano.
 */
export function tienePermiso(roles: readonly string[], permiso: Permiso): boolean {
  return CATALOGO_PERMISOS[permiso].some((rol) => roles.includes(rol));
}

/**
 * Por qué no se le puede quitar un rol de cargo a una Persona — cada motivo
 * es el código de error con el que la API rechaza el pedido.
 */
export type MotivoNoQuitable = Extract<
  ErrorCode,
  | 'SESION_SIN_PERSONA'
  | 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS'
  | 'NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO'
  | 'ADMIN_NO_PUEDE_AUTO_REVOCARSE'
>;

/**
 * specs/004, FR-043: el rechazo por discipulados NOMBRA cuáles — el Admin
 * necesita saber qué reasignar, y la pantalla enlaza cada uno a su Grupo (o a
 * su Solicitud, si es una propuesta). Los otros motivos no traen datos.
 */
export type ResultadoQuitarRol =
  | { puede: true }
  | { puede: false; motivo: Exclude<MotivoNoQuitable, 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS'> }
  | {
      puede: false;
      motivo: 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS';
      discipulados: DiscipuladoActivo[];
      propuestas: PropuestaPendiente[];
    };

/** Lo que `puedeQuitarRol` necesita saber de la Persona destino. */
export interface PersonaParaQuitarRol {
  id: string;
  adminSembrado: boolean;
  /**
   * specs/004, D137: calculados en el momento (`discipuladosActivosDe` /
   * `propuestasPendientesDe` en la API), con la fila de la Persona bloqueada
   * cuando se va a escribir. Obligatorios a propósito: quien llama no puede
   * olvidarse de consultarlos y dejar pasar la quita sin mirar.
   */
  discipuladosActivos: readonly DiscipuladoActivo[];
  propuestasPendientes: readonly PropuestaPendiente[];
}

/**
 * specs/005, T062 (D132): "¿se le puede quitar ESTE rol a ESTA Persona, pedido
 * por ESTE autor, ahora?" — no "¿lo tiene?". Una sola respuesta para los dos
 * lados, igual que CATALOGO_PERMISOS para el acceso: `RolesService.quitarRol`
 * la usa para RECHAZAR, y el listado de Personas la expone por rol para que la
 * pantalla NO OFREZCA lo que va a fallar (ofrecer una acción que va a fallar
 * es peor que no ofrecerla — H-133). Antes el modal decidía con `tiene` y
 * ofrecía "Quitar" en tres casos que la API siempre rechaza.
 *
 * El orden importa y es el de la API:
 * 1. Sin autor identificable, nada (H-140 — `autorId` null es "no sé quién es",
 *    nunca "no es él").
 * 2. `discipulador` con discipulados activos o propuestas pendientes
 *    (FR-009 del 005, FR-043 de la 004, D137) — nombrándolos. Cierra H-127:
 *    hasta la 004 esta rama decía SIEMPRE que no (fallo cerrado) porque la
 *    consulta no existía; ahora llega como dato de `persona`, y la API y la
 *    pantalla cambiaron juntas.
 * 3. `admin` del Admin sembrado (FR-002).
 * 4. `admin` de uno mismo (FR-010).
 * No mira si la Persona TIENE el rol: quitar uno que no tiene es un no-op
 * idempotente, y la pantalla ya ofrece "Otorgar" en ese caso.
 */
export function puedeQuitarRol(
  rol: RolDeCargo,
  persona: PersonaParaQuitarRol,
  autorId: string | null,
): ResultadoQuitarRol {
  if (autorId === null) return { puede: false, motivo: 'SESION_SIN_PERSONA' };
  if (rol === 'discipulador' && (persona.discipuladosActivos.length > 0 || persona.propuestasPendientes.length > 0)) {
    return {
      puede: false,
      motivo: 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS',
      discipulados: [...persona.discipuladosActivos],
      propuestas: [...persona.propuestasPendientes],
    };
  }
  if (rol === 'admin' && persona.adminSembrado) return { puede: false, motivo: 'NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO' };
  if (rol === 'admin' && persona.id === autorId) return { puede: false, motivo: 'ADMIN_NO_PUEDE_AUTO_REVOCARSE' };
  return { puede: true };
}
