import type { ErrorDeCampo } from './api-field-error.js';
import type { CategoriaCurso } from './curso.js';
import { sumarDias } from './cumpleanos.js';
import type { EstadoInscripcion, PersonaBreve } from './discipulado.js';

/**
 * spec 008 — Vida de Servicio. Constantes, tipos de los contratos
 * (`specs/008-vida-de-servicio/contracts/`) y reglas PURAS: la API las usa
 * para rechazar y la web y el backoffice para explicar; no pueden discrepar
 * (Principio XI). Fechas civiles siempre como `YYYY-MM-DD` (Argentina), con
 * `hoy = hoyEnArgentina()`.
 */

/** D158 */
export type TipoBaja = 'dada_de_baja' | 'abandono';
export const TIPOS_BAJA: readonly TipoBaja[] = ['dada_de_baja', 'abandono'];

/** D164: se destaca desde 2 faltas. */
export const FALTAS_PARA_ALERTA = 2;
export const SEMANAS_MIN = 1;
export const SEMANAS_MAX = 52;
export const NOMBRE_EDICION_MAX = 80;
export const TITULO_CONTENIDO_MAX = 120;
export const TEXTO_CONTENIDO_MAX = 10_000;
export const ARCHIVO_MAX_BYTES = 15 * 1024 * 1024;
export const ARCHIVOS_POR_SEMANA_MAX = 5;
export const ENLACES_POR_SEMANA_MAX = 10;
export const MIME_CONTENIDO_ADMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
export type MimeContenido = (typeof MIME_CONTENIDO_ADMITIDOS)[number];
/** Texto alternativo de una imagen y texto de un enlace (no hay límite en la spec: el mismo que el título). */
export const TEXTO_ENLACE_MAX = 120;
export const TEXTO_ALTERNATIVO_MAX = 300;
/** Misma frontera que Vida Nueva, constante propia (H-128). */
export const EDAD_MINIMA_PEDIR_VIDA_DE_SERVICIO_SOLO = 12;

export type EstadoEdicion = 'en_curso' | 'finalizado';

// ─── Reglas puras ───────────────────────────────────────────────────────────

/** FR-008 (research #8, D74): por el sistema (Inscripción `completada`) o por historial (Completitud Manual). */
export function cumplePrerrequisito(
  hechos: { inscripcionesCompletadas: readonly CategoriaCurso[]; completitudes: readonly CategoriaCurso[] },
  prerequisito: CategoriaCurso | null,
): boolean {
  if (prerequisito === null) return true;
  return hechos.inscripcionesCompletadas.includes(prerequisito) || hechos.completitudes.includes(prerequisito);
}

/** Día de la semana (0 = domingo) de una fecha civil. */
export function diaDeLaSemana(fecha: string): number {
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** FR-002: una semana cada 7 días desde la fecha de inicio. */
export function cronogramaPropuesto(fechaInicio: string, semanas: number): string[] {
  return Array.from({ length: semanas }, (_, i) => sumarDias(fechaInicio, 7 * i));
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * FR-002, FR-004: entre 1 y 52 semanas, fechas válidas, estrictamente
 * crecientes y la primera no antes del inicio. El campo con error lleva el
 * índice (`semanas.3`) para marcarlo en la pantalla.
 */
export function cronogramaValido(fechas: readonly string[], fechaInicio: string): ErrorDeCampo[] {
  if (fechas.length < SEMANAS_MIN || fechas.length > SEMANAS_MAX) return [{ campo: 'semanas', code: 'SEMANAS_FUERA_DE_RANGO' }];
  const errores: ErrorDeCampo[] = [];
  fechas.forEach((fecha, i) => {
    if (!FECHA_RE.test(fecha) || Number.isNaN(Date.parse(fecha))) {
      errores.push({ campo: `semanas.${i}`, code: 'FECHA_INVALIDA' });
    } else if (i === 0 && fecha < fechaInicio) {
      errores.push({ campo: 'semanas.0', code: 'PRIMERA_SEMANA_ANTES_DEL_INICIO' });
    } else if (i > 0 && fecha <= fechas[i - 1]) {
      errores.push({ campo: `semanas.${i}`, code: 'FECHAS_NO_CRECIENTES' });
    }
  });
  return errores;
}

/** FR-021, D27: liberada = fecha alcanzada Y material cargado. Se calcula al leer (research #4). */
export function liberada(item: { fechaLiberacion: string }, contenido: unknown, hoy: string): boolean {
  return contenido !== null && contenido !== undefined && item.fechaLiberacion <= hoy;
}

/** FR-020: hay material = título y al menos un texto, archivo o enlace. */
export function materialCargado(contenido: { titulo: string; texto?: string | null; archivos: number; enlaces: number }): boolean {
  return contenido.titulo.trim() !== '' && ((contenido.texto?.trim() ?? '') !== '' || contenido.archivos > 0 || contenido.enlaces > 0);
}

/** FR-029, D164: alerta desde `FALTAS_PARA_ALERTA`. Nunca da de baja a nadie (D42). */
export function alertaFaltas(faltas: number): boolean {
  return faltas >= FALTAS_PARA_ALERTA;
}

/** FR-035: desde el día de la última semana. `null` si el cronograma está vacío. */
export function sePuedeProponerFinalizacion(fechas: readonly string[], hoy: string): boolean {
  const ultima = ultimaFecha(fechas);
  return ultima !== null && ultima <= hoy;
}

export function ultimaFecha(fechas: readonly string[]): string | null {
  return fechas.length === 0 ? null : [...fechas].sort().at(-1)!;
}

export type EstadoSemanaLider = 'sin_material' | 'cargado_por_liberar' | 'liberada' | 'vencida_sin_material';
export type EstadoSemanaPersona = 'liberada' | 'proxima' | 'sin_material';
/** Todos los estados que muestra el badge `EstadoSemana` de `packages/ui`. */
export type EstadoSemana = EstadoSemanaLider | 'proxima';

/** El estado de una semana para el Líder y el backoffice (`SemanaParaLider.estado`). */
export function estadoSemanaLider(fechaLiberacion: string, conMaterial: boolean, hoy: string): EstadoSemanaLider {
  const llego = fechaLiberacion <= hoy;
  if (conMaterial) return llego ? 'liberada' : 'cargado_por_liberar';
  return llego ? 'vencida_sin_material' : 'sin_material';
}

/** El estado para la Persona: de una fecha futura no se dice si hay material (`contracts/persona-api.md`). */
export function estadoSemanaPersona(fechaLiberacion: string, conMaterial: boolean, hoy: string): EstadoSemanaPersona {
  if (fechaLiberacion > hoy) return 'proxima';
  return conMaterial ? 'liberada' : 'sin_material';
}

/**
 * FR-021, FR-034 (research #11): ¿la Persona tiene derecho a ver ESTA semana?
 * `activa` y `completada` ven las liberadas; `dada_de_baja` y `abandono`, las
 * liberadas hasta la fecha de cierre (`cerradaEn`, fecha civil) — no las
 * posteriores.
 */
export function semanaVisible(
  inscripcion: { estado: EstadoInscripcion; cerradaEn: string | null },
  item: { fechaLiberacion: string },
  conMaterial: boolean,
  hoy: string,
): boolean {
  if (!liberada(item, conMaterial ? true : null, hoy)) return false;
  if (inscripcion.estado === 'activa' || inscripcion.estado === 'completada') return true;
  return inscripcion.cerradaEn !== null && item.fechaLiberacion <= inscripcion.cerradaEn.slice(0, 10);
}

/**
 * FR-034: las semanas que la Persona ve en su lista. Con la Inscripción
 * cerrada por baja, las posteriores al cierre directamente no aparecen.
 */
export function semanasVisibles<T extends { numero: number; fechaLiberacion: string; conMaterial: boolean }>(
  inscripcion: { estado: EstadoInscripcion; cerradaEn: string | null },
  items: readonly T[],
  hoy: string,
): T[] {
  const cerrada = inscripcion.estado === 'dada_de_baja' || inscripcion.estado === 'abandono';
  const corte = cerrada && inscripcion.cerradaEn ? inscripcion.cerradaEn.slice(0, 10) : null;
  return items.filter((i) => (corte === null ? true : i.fechaLiberacion <= corte)).filter((i) => !cerrada || semanaVisible(inscripcion, i, i.conMaterial, hoy));
}

/**
 * FR-004: el cronograma nuevo contra el actual. Una semana liberada (fecha
 * alcanzada y con material) no se mueve ni se quita; solo se quitan semanas
 * del final, y sin material; se agregan al final; fechas crecientes.
 */
export function validarCambioCronograma(
  actual: ReadonlyArray<{ numero: number; fechaLiberacion: string; conMaterial: boolean }>,
  nuevo: ReadonlyArray<{ numero: number; fechaLiberacion: string }>,
  fechaInicio: string,
  hoy: string,
): { errores: ErrorDeCampo[]; conflicto: 'SEMANA_LIBERADA_NO_EDITABLE' | 'SEMANA_CON_MATERIAL' | null } {
  const ordenado = [...nuevo].sort((a, b) => a.numero - b.numero);
  const numerosOk = ordenado.every((s, i) => s.numero === i + 1);
  if (!numerosOk) return { errores: [{ campo: 'semanas', code: 'SEMANAS_NO_CONSECUTIVAS' }], conflicto: null };
  const errores = cronogramaValido(
    ordenado.map((s) => s.fechaLiberacion),
    fechaInicio,
  );
  const porNumero = new Map(ordenado.map((s) => [s.numero, s.fechaLiberacion]));
  for (const semana of actual) {
    const fueLiberada = liberada(semana, semana.conMaterial ? true : null, hoy);
    const nuevaFecha = porNumero.get(semana.numero);
    if (fueLiberada && nuevaFecha !== semana.fechaLiberacion) return { errores, conflicto: 'SEMANA_LIBERADA_NO_EDITABLE' };
    if (nuevaFecha === undefined && semana.conMaterial) return { errores, conflicto: 'SEMANA_CON_MATERIAL' };
  }
  return { errores, conflicto: null };
}

// ─── Persona — `contracts/persona-api.md` ──────────────────────────────────

export interface EdicionAbierta {
  grupoId: string;
  nombre: string;
  /** Solo si hay más de una Sede activa. */
  sede: string | null;
  fechaInicio: string;
  /** Día de la semana (0 = domingo) de la primera liberación. */
  diaLiberacion: number;
}

export interface EdicionResumen {
  grupoId: string;
  nombre: string;
  fechaInicio: string;
  estado: EstadoEdicion;
}

export type SemanaParaPersona =
  | { numero: number; fechaLiberacion: string; estado: 'liberada'; contenidoId: string; titulo: string }
  | { numero: number; fechaLiberacion: string; estado: 'proxima' }
  | { numero: number; fechaLiberacion: string; estado: 'sin_material' };

export interface MiAsistencia {
  encuentros: number;
  presentes: number;
  /** Fechas de falta. */
  faltas: string[];
}

export type CierreAnterior =
  | { tipo: 'rechazada' }
  | { tipo: 'dada_de_baja' | 'abandono'; edicion: EdicionResumen; semanas: SemanaParaPersona[] };

export type MotivoNoCumple = 'sin_vida_nueva' | 'vida_nueva_en_curso' | 'declaracion_en_revision';

export type EstadoMiVidaDeServicio =
  | { estado: 'no_cumple'; motivo: MotivoNoCumple }
  | { estado: 'lo_pide_su_tutor' }
  | { estado: 'puede_pedir'; ediciones: EdicionAbierta[]; anterior?: CierreAnterior }
  | { estado: 'pendiente'; solicitudId: string; edicion: EdicionAbierta | null; creadaEnSuNombre: boolean }
  | { estado: 'en_curso'; inscripcionId: string; edicion: EdicionResumen; semanas: SemanaParaPersona[]; asistencia: MiAsistencia }
  | { estado: 'completada'; via: 'inscripcion' | 'completitud_manual'; edicion?: EdicionResumen; semanas?: SemanaParaPersona[] };

export interface ArchivoDeContenido {
  id: string;
  nombre: string;
  mimeType: string;
  tamanioBytes: number;
  textoAlternativo: string | null;
}

export interface EnlaceDeContenido {
  texto: string;
  url: string;
}

export interface ContenidoParaPersona {
  numero: number;
  fechaLiberacion: string;
  titulo: string;
  texto: string | null;
  archivos: ArchivoDeContenido[];
  enlaces: EnlaceDeContenido[];
}

// ─── Líder — `contracts/lider-api.md` ──────────────────────────────────────

export interface MiGrupoResumen {
  grupoId: string;
  nombre: string;
  estado: EstadoEdicion;
  inscriptosActivos: number;
  conAlertaDeFaltas: number;
  proximaSemana: { numero: number; fechaLiberacion: string; conMaterial: boolean } | null;
  semanasSinMaterialVencidas: number;
}

export interface SemanaParaLider {
  numero: number;
  fechaLiberacion: string;
  estado: EstadoSemanaLider;
}

export interface InscriptoParaLider {
  inscripcionId: string;
  personaId: string;
  nombre: string;
  apellido: string;
  /** Solo de las `activa` (Pregunta 3). */
  telefono: string | null;
  estado: EstadoInscripcion;
  faltas: number;
  alertaFaltas: boolean;
  bajaPropuesta: { tipo: TipoBaja; en: string; comentario: string | null } | null;
  bajaRechazada: { en: string; motivo: string | null } | null;
}

export interface FinalizacionDeEdicion {
  propuestaEn: string | null;
  rechazadaEn: string | null;
  motivoRechazo: string | null;
  /** Fecha de la última semana. */
  sePuedeProponerDesde: string | null;
}

export interface MiGrupoDetalle {
  grupoId: string;
  nombre: string;
  sede: string;
  fechaInicio: string;
  estado: EstadoEdicion;
  lideres: Array<{ personaId: string; nombre: string; apellido: string }>;
  semanas: SemanaParaLider[];
  inscriptos: InscriptoParaLider[];
  finalizacion: FinalizacionDeEdicion;
}

export type ContenidoParaLider =
  | (ContenidoParaPersona & {
      estado: EstadoSemanaLider;
      cargadoPor: PersonaBreve | null;
      cargadoEn: string;
      editadoPor: PersonaBreve | null;
      editadoEn: string | null;
    })
  | { numero: number; fechaLiberacion: string; estado: 'sin_material' | 'vencida_sin_material' };

export interface AsistenciaDelDia {
  fecha: string;
  /** Ya hay un Encuentro guardado en esa fecha. */
  guardada: boolean;
  inscriptos: Array<{ inscripcionId: string; nombre: string; apellido: string; presente: boolean; faltas: number; alertaFaltas: boolean }>;
}

// ─── Admin y Pastor — `contracts/admin-api.md` ─────────────────────────────

export interface EdicionAdminResumen {
  grupoId: string;
  nombre: string;
  sede: string;
  fechaInicio: string;
  estado: EstadoEdicion;
  inscripcionAbierta: boolean;
  inscriptosActivos: number;
  conAlertaDeFaltas: number;
  lideres: Array<{ personaId: string; nombre: string; apellido: string }>;
  pendientes: { finalizacion: boolean; bajas: number };
}

export interface LiderazgoHistorial {
  personaId: string;
  nombre: string;
  apellido: string;
  desde: string;
  hasta: string | null;
}

export interface EdicionAdminDetalle extends MiGrupoDetalle {
  sedeId: string;
  inscripcionAbierta: boolean;
  historialLideres: LiderazgoHistorial[];
  finalizacionPropuestaPor: PersonaBreve | null;
  bajasPropuestas: Array<{ inscripcionId: string; persona: PersonaBreve; tipo: TipoBaja; en: string; comentario: string | null; propuestaPor: PersonaBreve | null }>;
}

export type ViaPrerrequisito =
  | { via: 'inscripcion'; grupoId: string; cursoTipo: 'individual' | 'grupal'; cerradaEn: string | null }
  | { via: 'completitud_manual'; fecha: string };

export interface SolicitudVidaServicioDetalle {
  id: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'retirada';
  createdAt: string;
  persona: PersonaBreve & { edad: number; email: string | null; telefono: string | null; sinAccesoALaApp: boolean };
  prerrequisito: ViaPrerrequisito | null;
  edicionPedida: { grupoId: string; nombre: string; estado: EstadoEdicion; inscripcionAbierta: boolean } | null;
  creadoPor: PersonaBreve | null;
  revisadoPor: PersonaBreve | null;
  revisadaEn: string | null;
  motivoRechazo: string | null;
  /** La Inscripción que creó la aprobación. */
  inscripcion: { inscripcionId: string; grupoId: string; nombre: string } | null;
  /** Ediciones en curso para elegir al aprobar. */
  edicionesEnCurso: Array<{ grupoId: string; nombre: string; fechaInicio: string; inscripcionAbierta: boolean; yaCursada: boolean }>;
}

/** `GET /personas/:id/vida-de-servicio` — la sección del perfil (FR-013): qué puede hacer el Admin. */
export interface VidaDeServicioDePersona {
  estado: EstadoMiVidaDeServicio['estado'];
  motivo: MotivoNoCumple | null;
  /** Se puede pedir en su nombre ahora mismo. */
  puedePedirEnSuNombre: boolean;
  solicitudPendienteId: string | null;
  edicion: EdicionResumen | null;
  ediciones: EdicionAbierta[];
}
