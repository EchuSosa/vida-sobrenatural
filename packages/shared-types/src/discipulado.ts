/**
 * specs/004-vida-nueva-discipulado — tipos compartidos del discipulado (Vida
 * Nueva), leídos por `apps/api`, `apps/web` y `apps/backoffice`. Ver
 * `contracts/solicitudes-api.md` y `contracts/discipulado-api.md`. Ningún
 * texto de interfaz vive acá (Principio IX): solo claves estables y formas.
 */

/** Minutos en común que dos franjas del mismo día deben compartir para "coincidir" (FR-033, Assumption). */
export const MINUTOS_MINIMOS_EN_COMUN = 60;

/** Largo máximo de un texto de motivo (declinar, rechazar finalización o baja) — FR-037, FR-019a, FR-042. */
export const MOTIVO_MAX = 500;

/** `Encuentro.capitulos` (FR-009, research #5) y `Encuentro.notas` (FR-029). */
export const CAPITULOS_MAX = 200;
export const NOTAS_ENCUENTRO_MAX = 2000;

/** Tope general de Personas por Grupo de Vida Nueva; cada Discipulador fija el suyo entre 1 y este (FR-045). */
export const MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA = 6;

/** Días sin respuesta a partir de los cuales una propuesta se señala en los pendientes del Admin (FR-048). No hace nada por sí solo. */
export const DIAS_PROPUESTA_SIN_RESPUESTA = 3;

/**
 * Una franja horaria: un día de la semana (0 domingo … 6 sábado) y un rango
 * en minutos desde las 0:00 (`inicio` 0..1439, `fin` 1..1440, `fin > inicio`).
 * Aparece con la misma forma en la agenda del Discipulador (FR-031) y en la
 * Solicitud de la Persona (FR-032).
 */
export interface Franja {
  diaSemana: number;
  inicio: number;
  fin: number;
}

/**
 * Dos franjas coinciden si son del mismo día de la semana y comparten al
 * menos `minimo` minutos (FR-033). Única implementación (Principio XI): la
 * usan el cruce de la API y la vista de la propuesta.
 */
export function franjasCoinciden(a: Franja, b: Franja, minimo: number = MINUTOS_MINIMOS_EN_COMUN): boolean {
  if (a.diaSemana !== b.diaSemana) return false;
  const enComun = Math.min(a.fin, b.fin) - Math.max(a.inicio, b.inicio);
  return enComun >= minimo;
}

/** Por qué no se puede sumar una franja a las ya cargadas (H-R7/H-R8). Son códigos de campo de `VALIDACION`. */
export type ProblemaDeFranja = 'FRANJA_MUY_CORTA' | 'FRANJA_REPETIDA' | 'FRANJA_SUPERPUESTA';

/**
 * H-R7/H-R8 (revisión manual de la 004): una franja nueva tiene que durar al
 * menos `MINUTOS_MINIMOS_EN_COMUN` — una más corta nunca coincide con nadie
 * en el cruce (`franjasCoinciden`), así que no sirve — y no puede repetir ni
 * pisar otra del mismo día. Supone `fin > inicio` (eso se valida antes, con
 * su propio código). Única implementación (Principio XI): la usan la API
 * (agenda del Discipulador y franjas de la Solicitud) y el editor de franjas.
 */
export function problemaDeFranjaNueva(nueva: Franja, cargadas: readonly Franja[]): ProblemaDeFranja | null {
  if (nueva.fin - nueva.inicio < MINUTOS_MINIMOS_EN_COMUN) return 'FRANJA_MUY_CORTA';
  const mismoDia = cargadas.filter((f) => f.diaSemana === nueva.diaSemana);
  if (mismoDia.some((f) => f.inicio === nueva.inicio && f.fin === nueva.fin)) return 'FRANJA_REPETIDA';
  if (mismoDia.some((f) => f.inicio < nueva.fin && nueva.inicio < f.fin)) return 'FRANJA_SUPERPUESTA';
  return null;
}

export type EstadoSolicitud = 'pendiente' | 'propuesta' | 'aprobada' | 'rechazada' | 'retirada';

/**
 * El tipo de una Solicitud vive en `bandeja.ts` (D178, lote 0 global: los siete
 * tipos de la bandeja unificada). Se importa acá para `SolicitudResumen`.
 */
import type { TipoSolicitud } from './bandeja.js';

/** Las reglas de asignación vigentes (D138). Sumar una regla suma un valor acá y una función en la API. */
export type NombreRegla = 'horario' | 'genero';

export interface PersonaBreve {
  id: string;
  nombre: string;
  apellido: string;
  /** spec 013 (D87, T016): foto de Google o null; opcional hasta que la 013 la sume a todos los select. */
  fotoUrl?: string | null;
}

/**
 * Una Solicitud de Discipulado resumida (detalle de la 004). En la bandeja
 * unificada (spec 013) viaja como `SolicitudBandeja`, con la propuesta
 * vigente en `extra.propuestaVigente`.
 */
export interface SolicitudResumen {
  id: string;
  tipo: TipoSolicitud;
  persona: PersonaBreve;
  estado: EstadoSolicitud;
  createdAt: string;
  revisadoPor: PersonaBreve | null;
  /** spec 013 (bandeja, FR-002): cuándo se resolvió; null mientras está abierta. */
  revisadaEn: string | null;
  creadoPor: PersonaBreve | null;
  /** "propuesta a X, hace N días" (FR-038); null salvo en estado `propuesta`. */
  propuestaVigente: { discipulador: PersonaBreve; propuestaEn: string } | null;
}

/** Una entrada del historial de propuestas de una Solicitud — solo la ve el Admin (FR-038). */
export interface PropuestaHistorial {
  id: string;
  discipulador: PersonaBreve;
  propuestaPor: PersonaBreve | null;
  propuestaEn: string;
  estado: EstadoPropuesta;
  respondidaEn: string | null;
  motivoDeclinacion: string | null;
  retiradaPor: 'admin' | 'persona' | null;
  grupoDestinoId: string | null;
}

export interface SolicitudDetalle extends SolicitudResumen {
  franjas: Franja[];
  personaEdad: number;
  personaGenero: string;
  historial: PropuestaHistorial[];
}

export type EstadoPropuesta = 'pendiente' | 'aceptada' | 'declinada' | 'retirada';
export type TipoPropuesta = 'nueva' | 'reasignacion';

/** Un Grupo en curso del Discipulador con lugar, para "sumar a este Grupo" (FR-045). */
export interface GrupoConLugar {
  grupoId: string;
  ocupado: number;
  maximo: number;
  coincideHorario: boolean;
  personas: string[];
}

export interface DiscipuladorEnCruce {
  id: string;
  nombre: string;
  apellido: string;
  genero: string;
  carga: { discipuladosActivos: number; propuestasPendientes: number };
  gruposConLugar: GrupoConLugar[];
}

/**
 * El cruce que ve el Admin al proponer o reasignar (FR-034): por cada franja
 * de la Persona, los disponibles que cumplen todas las reglas en esa franja;
 * aparte, los disponibles que no cumplen alguna, con cuáles.
 */
export interface Cruce {
  franjas: Array<{ franja: Franja; coinciden: DiscipuladorEnCruce[] }>;
  noCoinciden: Array<DiscipuladorEnCruce & { incumple: NombreRegla[] }>;
  sugeridoId: string | null;
  sinDisponibles: boolean;
}

export type EstadoGrupo = 'en_curso' | 'finalizado';
export type MotivoCierreGrupo = 'completado' | 'abandonado';
export type EstadoInscripcion = 'activa' | 'completada' | 'dada_de_baja' | 'abandono';

/** Lo que ve la Persona en Mi camino (FR-026 a FR-028). Nunca notas ni capítulos (FR-029). */
export type EstadoMiDiscipulado =
  | { estado: 'puede_pedir'; ultimo?: 'rechazada' | 'retirada' | 'abandono' }
  | { estado: 'lo_pide_su_tutor' }
  | { estado: 'buscando'; solicitudId: string; franjas: Franja[]; createdAt: string }
  | { estado: 'en_curso'; grupoId: string; discipulador: { nombre: string; apellido: string; telefono: string }; desde: string }
  | { estado: 'finalizado'; finalizadoEn: string }
  | { estado: 'baja'; en: string };

/** El contacto que ve el Discipulador de una Persona de su Grupo (FR-011, FR-044). */
export interface Contacto {
  telefono: string;
  direccion: string;
  /** El del tutor si la Persona es menor (FR-044); null para un adulto. */
  tutor: { nombre: string; telefono: string } | null;
}

export interface EncuentroAdministrativo {
  id: string;
  fecha: string;
  capitulos: string;
  asistencias: Array<{ personaId: string; presente: boolean }>;
  updatedAt: string;
}

export type EncuentroDelDiscipulador = EncuentroAdministrativo & { notas: string | null };

/** Fila de la vista administrativa de discipulados (D134): sin notas. */
export interface DiscipuladoResumen {
  grupoId: string;
  /**
   * Cada Persona con su Inscripción y la baja pedida (fecha y motivo): el Admin
   * confirma o rechaza la baja por Inscripción, y el motivo es para él (FR-042).
   */
  personas: Array<{
    id: string;
    inscripcionId: string;
    nombre: string;
    apellido: string;
    estadoInscripcion: EstadoInscripcion;
    bajaPropuesta: boolean;
    bajaPropuestaEn: string | null;
    bajaPropuestaMotivo: string | null;
  }>;
  discipulador: PersonaBreve;
  desde: string;
  estado: EstadoGrupo;
  motivoCierre: MotivoCierreGrupo | null;
  lugar: { ocupado: number; maximo: number };
  cantidadEncuentros: number;
  ultimoEncuentro: { fecha: string; capitulos: string } | null;
  propuestaFinalizacionEn: string | null;
  reasignacionPropuesta: { discipulador: PersonaBreve; propuestaEn: string } | null;
}

/** Lo que ve el Discipulador de su propio discipulado (FR-011): con contacto y notas. */
export interface MiDiscipulado {
  grupoId: string;
  personas: Array<{
    /** Las asistencias de un Encuentro vienen por `personaId`; la pantalla las cruza con la Inscripción. */
    personaId: string;
    inscripcionId: string;
    nombre: string;
    apellido: string;
    edad: number;
    contacto: Contacto;
    bajaPropuesta: { en: string; motivo: string | null } | null;
    bajaRechazada: { en: string; motivo: string | null } | null;
  }>;
  desde: string;
  estado: EstadoGrupo;
  lugar: { ocupado: number; maximo: number };
  propuestaFinalizacionEn: string | null;
  finalizacionRechazada: { en: string; motivo: string | null } | null;
}

/** `GET /discipulado/mis-discipulados`: primero las propuestas por responder (FR-037, FR-047). */
export interface MisDiscipuladosRespuesta {
  propuestas: PropuestaParaMi[];
  discipulados: MiDiscipulado[];
  tieneAgenda: boolean;
}

/** `GET /discipulado/mis-discipulados/:grupoId`: con las notas de cada Encuentro (D134). */
export type DetalleMiDiscipulado = MiDiscipulado & { encuentros: EncuentroDelDiscipulador[] };

/** `GET /grupos/discipulados/:grupoId`, la vista del Admin y el Pastor: sin notas (D134). */
export type DetalleDiscipuladoAdmin = DiscipuladoResumen & {
  encuentros: EncuentroAdministrativo[];
  liderazgos: Array<{ discipulador: PersonaBreve; desde: string; hasta: string | null }>;
  /** El horario derivado del Grupo (research #14). */
  franjasDelGrupo: Franja[];
};

/** Una propuesta pendiente como la ve el Discipulador antes de aceptar (FR-037): sin contacto. */
export interface PropuestaParaMi {
  propuestaId: string;
  tipo: TipoPropuesta;
  persona: { nombre: string; apellido: string; edad: number };
  franjasEnComun: Franja[];
  incumple: NombreRegla[];
  grupoDestino: { grupoId: string; personas: string[] } | null;
  propuestaEn: string;
}

/** Lo que nombra el rechazo de quitar el rol discipulador (FR-043). */
export interface DiscipuladoActivo {
  grupoId: string;
  persona: { nombre: string; apellido: string };
}

export interface PropuestaPendiente {
  propuestaId: string;
  persona: { nombre: string; apellido: string };
  /**
   * Adónde enlaza el panel de roles para destrabarla (FR-043, lote D): una
   * propuesta `nueva` tiene su Solicitud; una de `reasignacion`, su Grupo.
   * Exactamente uno de los dos no es null.
   */
  solicitudId: string | null;
  grupoId: string | null;
}

/** Contadores de los pendientes del Admin (FR-048), para la tarjeta de Inicio. */
export interface PendientesAdmin {
  propuestasDeclinadas: { cantidad: number; enlace: string };
  propuestasSinRespuesta: { cantidad: number; enlace: string };
  finalizacionesPropuestas: { cantidad: number; enlace: string };
  bajasPropuestas: { cantidad: number; enlace: string };
  /**
   * Lote 0 global: las filas que suman las specs 006–011 (bajas y
   * finalizaciones de Vida de Servicio, Bautismos sin fecha, pagos por
   * verificar…), cada una registrada desde su módulo con
   * `RegistroPendientesAdmin`. El texto es `inicio.pendientes.extra.<clave>`
   * (con `{cantidad}`) del backoffice. Solo vienen las que tienen cantidad > 0.
   */
  extra: LineaPendienteAdmin[];
}

export interface LineaPendienteAdmin {
  /** Única entre specs, `<dominio>_<que>` (sin puntos: es clave de next-intl), ej. `vida_servicio_bajas`. */
  clave: string;
  cantidad: number;
  enlace: string;
}
