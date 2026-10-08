import type { PersonaBreve } from './discipulado.js';

/**
 * spec 009 — Ministerios y Células. Lote 0 global: estados, límites y la regla
 * de aptitud (la leen 006 y 009). Los DTOs (`MinisterioPublico`,
 * `PostulacionDetalle`, `EstadoMiMinisterio`, …) los agrega la sesión de la
 * 009 en este archivo (T002).
 */

export type EstadoPostulacion = 'pendiente' | 'aprobada' | 'rechazada' | 'inactiva' | 'retirada';
export type MotivoInactivacionPostulacion = 'cambio_de_ministerio' | 'baja';

export const MINISTERIO_NOMBRE_MAX = 80;
export const MINISTERIO_DESCRIPCION_MAX = 600;
export const CELULA_NOMBRE_MAX = 80;
export const POSTULACION_TEXTO_MAX = 500;

/**
 * D159, D169: Apto para Ministerio es el rol de estado `apto_ministerio`, que
 * escribe el sistema (al completar Vida de Servicio o con Completitud Manual
 * de Vida de Servicio, D160). Nunca se activa a mano.
 */
export function esAptaParaMinisterio(roles: readonly string[]): boolean {
  return roles.includes('apto_ministerio');
}

/** docs/22 (migración `ministerios_contenido`): la línea de la web pública y lo que se hace en cada área. */
export const MINISTERIO_LINEA_PUBLICA_MAX = 140;
export const CELULA_DESCRIPCION_MAX = 400;

// ---------------------------------------------------------------------------
// T002 (sesión de la 009): las formas de respuesta de
// `contracts/ministerios-api.md` y `contracts/postulaciones-api.md`.
// ---------------------------------------------------------------------------

/**
 * `GET /ministerios/publicos` — la página pública (FR-034). Por decisión de
 * Echu (docs/22, 2026-10-08) la web pública muestra SOLO el nombre y la línea
 * pública: ni áreas, ni requisitos, ni audiciones.
 */
export interface MinisterioPublico {
  id: string;
  nombre: string;
  lineaPublica: string | null;
}

/** Un área (Célula) tal como la ve la Persona al postularse. */
export interface CelulaParaPostularse {
  id: string;
  nombre: string;
  descripcion: string | null;
}

/**
 * `GET /ministerios/me/disponibles` (FR-009) — dentro de la app, con sesión:
 * el contenido completo de docs/22 (descripción, áreas y si requiere formación).
 */
export interface MinisterioParaPostularse {
  id: string;
  nombre: string;
  descripcion: string;
  lineaPublica: string | null;
  requiereFormacion: boolean;
  celulas: CelulaParaPostularse[];
}

/** `GET /ministerios/me/:ministerioId` (FR-010): el detalle según la situación de la Persona. */
export type SituacionEnMinisterio = 'puede_postularse' | 'ya_es_miembro' | 'tiene_pendiente' | 'no_apta';

export interface MinisterioDetalleParaPersona extends MinisterioParaPostularse {
  situacion: SituacionEnMinisterio;
  /** Con `tiene_pendiente`: a qué Ministerio está la postulación en revisión. */
  pendienteA?: { nombre: string };
}

/** Cuerpo de `POST /ministerios/:ministerioId/postulaciones/me`. */
export interface NuevaPostulacion {
  celulaId?: string | null;
  motivacion?: string;
  disponibilidad?: string;
}

// --- Lo que ve la Persona en Mi camino (FR-011 a FR-014) ---

export interface MembresiaVista {
  postulacionId: string;
  ministerio: { id: string; nombre: string; activo: boolean };
  celula: { id: string; nombre: string; activo: boolean } | null;
  desde: string;
}

export interface PendienteVista {
  postulacionId: string;
  ministerio: { id: string; nombre: string };
  celula: { id: string; nombre: string } | null;
  /** docs/22: "Este ministerio requiere capacitación o audición: el equipo te va a contactar". */
  requiereFormacion: boolean;
  createdAt: string;
}

/** El desenlace más reciente que la card cuenta (nunca con el motivo, FR-014). */
export type UltimoDesenlacePostulacion =
  | { tipo: 'rechazada'; ministerio: { nombre: string }; en: string }
  | { tipo: 'retirada'; ministerio: { nombre: string }; en: string }
  | { tipo: 'baja'; ministerio: { nombre: string }; en: string };

/** `GET /ministerios/me` — unión discriminada (contracts/postulaciones-api.md). */
export type EstadoMiMinisterio =
  | { estado: 'no_apta' }
  | { estado: 'puede_postularse'; ultimo?: UltimoDesenlacePostulacion }
  | { estado: 'pendiente'; pendiente: PendienteVista }
  | { estado: 'miembro'; membresia: MembresiaVista; pendiente: PendienteVista | null };

// --- Backoffice: catálogo (Historias 4 y 6) ---

export interface CelulaCatalogo {
  id: string;
  nombre: string;
  descripcion: string | null;
  ofreceRolDiscipulador: boolean;
  activo: boolean;
  miembrosActivos: number;
  postulacionesPendientes: number;
  /** D119: con alguna Postulación (de cualquier estado) no se elimina. */
  tieneDatosRelacionados: boolean;
}

export interface MinisterioCatalogo {
  id: string;
  nombre: string;
  descripcion: string;
  lineaPublica: string | null;
  requiereFormacion: boolean;
  activo: boolean;
  celulasActivas: number;
  miembrosActivos: number;
  postulacionesPendientes: number;
  tieneDatosRelacionados: boolean;
}

/** `GET /ministerios/:id`. */
export interface MinisterioDetalleCatalogo extends MinisterioCatalogo {
  celulas: CelulaCatalogo[];
}

/** Papeleras de Ministerios y de Células (D119). */
export interface EliminadoEnPapelera {
  id: string;
  nombre: string;
  eliminadoEn: string;
  eliminadoPor: PersonaBreve | null;
}

/** `GET /ministerios/:id/miembros` (FR-032) — paginado con `Pagina<MiembroMinisterio>`. */
export interface MiembroMinisterio {
  postulacionId: string;
  persona: PersonaBreve;
  celula: { id: string; nombre: string; activo: boolean } | null;
  desde: string;
}

/** Cuerpos del catálogo. */
export interface DatosMinisterio {
  nombre: string;
  descripcion: string;
  lineaPublica?: string | null;
  requiereFormacion?: boolean;
}
export interface DatosCelula {
  nombre: string;
  descripcion?: string | null;
  ofreceRolDiscipulador?: boolean;
}

/** 409 `CONFIRMACION_NOMBRE_REQUERIDA` (D38): cuántos hay, para que el diálogo lo diga. */
export interface ExtensionConfirmacionNombre {
  miembrosActivos: number;
  postulacionesPendientes: number;
}

/** D38: la confirmación reforzada compara el nombre exacto, sin espacios de los costados. */
export function confirmaNombre(escrito: string | null | undefined, nombre: string): boolean {
  return (escrito ?? '').trim() === nombre.trim();
}

// --- Backoffice: revisión (Historias 2 y 5) ---

/** Lo que la Postulación suma en `extra` de la bandeja (columna "Detalle"). */
export interface ExtraBandejaPostulacion {
  ministerio: string;
  celula: string | null;
  requiereFormacion: boolean;
}

export interface PostulacionHistorial {
  id: string;
  ministerio: { id: string; nombre: string };
  celula: { id: string; nombre: string } | null;
  estado: EstadoPostulacion;
  motivoInactivacion: MotivoInactivacionPostulacion | null;
  createdAt: string;
  /** Cuándo se resolvió (aprobó, rechazó, retiró o inactivó); null si sigue pendiente. */
  resueltaEn: string | null;
  /** Motivo de rechazo o de baja — interno: solo con `solicitudes.aprobar` (FR-014, FR-023). */
  motivo?: string | null;
}

/** `GET /postulaciones/:id` (FR-016). */
export interface PostulacionDetalle {
  id: string;
  estado: EstadoPostulacion;
  createdAt: string;
  persona: PersonaBreve & {
    edad: number;
    telefono: string;
    email: string | null;
    sinAccesoALaApp: boolean;
    esDiscipulador: boolean;
  };
  ministerio: { id: string; nombre: string; activo: boolean };
  celula: { id: string; nombre: string; activo: boolean; ofreceRolDiscipulador: boolean } | null;
  /** docs/22: el Ministerio requería capacitación o audición al postularse. */
  requiereFormacion: boolean;
  motivacion: string | null;
  disponibilidad: string | null;
  creadoPor: PersonaBreve | null;
  revisadoPor: PersonaBreve | null;
  revisadaEn: string | null;
  /** Solo con `solicitudes.aprobar`. */
  motivoRechazo?: string | null;
  /** La OTRA Postulación aprobada de la Persona (FR-017), si tiene. */
  ministerioActual: { id: string; nombre: string } | null;
  /**
   * docs/22: aprobar una postulación a "Discipulados Vida Nueva" ofrece otorgar
   * el rol `discipulador` en el mismo paso — solo si la Persona es mayor de
   * edad y todavía no lo tiene (reglas de la 005).
   */
  ofrecerRolDiscipulador: boolean;
  historial: PostulacionHistorial[];
}

/** Cuerpo de `POST /postulaciones/:id/aprobar`. */
export interface AprobarPostulacion {
  confirmarCambio?: boolean;
  /** docs/22: otorgar también el rol `discipulador` (solo si `ofrecerRolDiscipulador`). */
  otorgarRolDiscipulador?: boolean;
}

/** Cuerpo de `POST /postulaciones` (FR-024, en nombre de). */
export interface PostulacionEnNombreDe extends NuevaPostulacion {
  personaId: string;
  ministerioId: string;
}

/** `GET /personas/:id/ministerio` — la sección del Perfil de Persona. */
export interface MinisterioDePersona {
  persona: PersonaBreve;
  actual: { postulacionId: string; ministerio: { id: string; nombre: string }; celula: { id: string; nombre: string } | null; desde: string } | null;
  pendiente: { postulacionId: string; ministerio: { id: string; nombre: string }; createdAt: string } | null;
  historial: PostulacionHistorial[];
}
