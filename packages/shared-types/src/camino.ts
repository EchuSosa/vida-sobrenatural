import type { EstadoMiDiscipulado } from './discipulado.js';
import { EDAD_MINIMA_PEDIR_VIDA_NUEVA_SOLO } from './persona.js';

/**
 * spec 006 — Mi camino por etapas (D153, D155). Reglas PURAS: la API las usa
 * para rechazar y Mi camino para explicar; no pueden discrepar (Principio XI).
 * La consulta "¿completó esta etapa?" contra la base es `completoEtapa`
 * (apps/api/src/camino/consultas.ts); acá llega ya resuelta en `HechosCamino`.
 */

export type EtapaCamino = 'vida_nueva' | 'vida_de_servicio' | 'ministerio' | 'bautismo';

/** FR-001: orden de las cards. */
export const ETAPAS_CAMINO: readonly EtapaCamino[] = ['vida_nueva', 'vida_de_servicio', 'ministerio', 'bautismo'];

/**
 * research #2 — las etapas cuyo pedido ya está construido. Cada spec de etapa
 * (008 Vida de Servicio, 009 Ministerio, 010 Bautismo) se suma acá en el
 * mismo commit que habilita su pedido; mientras tanto su card dice
 * "Próximamente".
 */
export const ETAPAS_CONSTRUIDAS: readonly EtapaCamino[] = ['vida_nueva'];

export type EstadoDeclaracion = 'pendiente' | 'confirmada' | 'rechazada' | 'retirada';

/** FR-009: comentario opcional de "Ya lo hice" (CHECK `declaracion_textos_largo`). */
export const COMENTARIO_DECLARACION_MAX = 500;
/** FR-013: motivo opcional de "No confirmar" — lo lee la Persona. */
export const MOTIVO_RECHAZO_DECLARACION_MAX = 500;
/** FR-014: nota opcional del Admin al registrar una etapa hecha. */
export const NOTA_COMPLETITUD_MAX = 500;
export type OrigenCompletitud = 'declaracion' | 'admin';

/** Por qué camino quedó completa una etapa (FR-016). */
export type ComoSeCompleto = 'sistema' | 'historial';
export type Completas = Partial<Record<EtapaCamino, ComoSeCompleto>>;

/** Lo que una etapa necesita para habilitarse (FR-003), para decirlo en pantalla. */
export type Requisito =
  | { tipo: 'ninguno' }
  | { tipo: 'etapa_completa'; etapa: EtapaCamino } // VS ← VN; Ministerio ← VS
  | { tipo: 'etapa_en_curso_o_completa'; etapa: EtapaCamino }; // Bautismo ← VN (D147)

export function requisitoDeEtapa(etapa: EtapaCamino): Requisito {
  switch (etapa) {
    case 'vida_nueva':
      return { tipo: 'ninguno' };
    case 'vida_de_servicio':
      return { tipo: 'etapa_completa', etapa: 'vida_nueva' };
    case 'ministerio':
      return { tipo: 'etapa_completa', etapa: 'vida_de_servicio' };
    case 'bautismo':
      return { tipo: 'etapa_en_curso_o_completa', etapa: 'vida_nueva' };
  }
}

/** ¿Cumple el requisito? `enCurso` = etapas en curso en el sistema (hoy solo Vida Nueva con Grupo). */
export function reglaDeEtapa(etapa: EtapaCamino, completas: Completas, enCurso: readonly EtapaCamino[]): boolean {
  const requisito = requisitoDeEtapa(etapa);
  switch (requisito.tipo) {
    case 'ninguno':
      return true;
    case 'etapa_completa':
      return completas[requisito.etapa] !== undefined;
    case 'etapa_en_curso_o_completa':
      return completas[requisito.etapa] !== undefined || enCurso.includes(requisito.etapa);
  }
}

export type EstadoDeclaracionVisible =
  | { estado: 'en_revision'; declaracionId: string; desde: string }
  | { estado: 'no_confirmada'; motivo: string | null; en: string };

/** FR-002: lo que ve la card. */
export type EstadoEtapa =
  | { etapa: EtapaCamino; estado: 'proximamente'; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
  | { etapa: EtapaCamino; estado: 'bloqueada'; requisito: Requisito; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
  | { etapa: EtapaCamino; estado: 'disponible'; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
  | { etapa: EtapaCamino; estado: 'en_curso' }
  | { etapa: EtapaCamino; estado: 'completada'; como: ComoSeCompleto }
  | { etapa: EtapaCamino; estado: 'en_revision'; declaracionId: string; desde: string };

/** `GET /camino/me`: siempre las cuatro etapas, en ETAPAS_CAMINO. */
export interface CaminoDeLaPersona {
  etapas: EstadoEtapa[];
  /** El de `GET /discipulado/me`, para el texto y el enlace de la card de Vida Nueva (FR-005). */
  vidaNueva: EstadoMiDiscipulado;
  /**
   * T041: a quién escribirle si una declaración no se confirmó — el contacto de
   * la Sede de la Persona (`Sede.contactoTelefono`, el mismo de Visitanos).
   * `telefono: null` → la card dice "acercate a la Sede".
   */
  sede: { nombre: string; telefono: string | null } | null;
}

/** `POST /camino/me/declaraciones` (201). */
export interface DeclaracionCreada {
  id: string;
  etapa: EtapaCamino;
  estado: 'pendiente';
  createdAt: string;
}

/** Hechos que la API junta por Persona para calcular todo lo de arriba sin Prisma. */
export interface HechosCamino {
  edad: number;
  vidaNueva: EstadoMiDiscipulado;
  completas: Completas;
  /** La declaración MÁS RECIENTE de cada etapa, en cualquier estado. */
  ultimaDeclaracion: Partial<
    Record<EtapaCamino, { id: string; estado: EstadoDeclaracion; fecha: string; motivo: string | null }>
  >;
}

/**
 * Para la regla de Bautismo (D147, "Vida Nueva en curso"): solo cuenta un
 * discipulado en marcha (`en_curso`, hay Inscripción activa), no un pedido
 * todavía sin Discipulador (`buscando`).
 */
export function etapasEnCurso(hechos: Pick<HechosCamino, 'vidaNueva'>): EtapaCamino[] {
  return hechos.vidaNueva.estado === 'en_curso' ? ['vida_nueva'] : [];
}

/** FR-008: ¿se puede declarar "Ya lo hice"? La API usa la misma para rechazar. */
export function puedeDeclarar(etapa: EtapaCamino, hechos: HechosCamino): boolean {
  if (hechos.edad < EDAD_MINIMA_PEDIR_VIDA_NUEVA_SOLO) return false;
  if (hechos.completas[etapa] !== undefined) return false;
  if (hechos.ultimaDeclaracion[etapa]?.estado === 'pendiente') return false;
  if (etapa === 'vida_nueva') return hechos.vidaNueva.estado === 'puede_pedir' || hechos.vidaNueva.estado === 'baja';
  return true;
}

function declaracionVisible(etapa: EtapaCamino, hechos: HechosCamino): EstadoDeclaracionVisible | undefined {
  const ultima = hechos.ultimaDeclaracion[etapa];
  if (ultima?.estado !== 'rechazada') return undefined;
  return { estado: 'no_confirmada', motivo: ultima.motivo, en: ultima.fecha };
}

/** El estado de una card, en el orden de reglas de data-model.md (cada rama con su test). */
export function estadoDeEtapa(etapa: EtapaCamino, hechos: HechosCamino): EstadoEtapa {
  const como = hechos.completas[etapa];
  if (como !== undefined) return { etapa, estado: 'completada', como };

  const ultima = hechos.ultimaDeclaracion[etapa];
  if (ultima?.estado === 'pendiente') return { etapa, estado: 'en_revision', declaracionId: ultima.id, desde: ultima.fecha };

  if (etapa === 'vida_nueva' && (hechos.vidaNueva.estado === 'buscando' || hechos.vidaNueva.estado === 'en_curso')) {
    return { etapa, estado: 'en_curso' };
  }

  const comun = { puedeDeclarar: puedeDeclarar(etapa, hechos), ...(declaracionVisible(etapa, hechos) ? { declaracion: declaracionVisible(etapa, hechos) } : {}) };
  if (!ETAPAS_CONSTRUIDAS.includes(etapa)) return { etapa, estado: 'proximamente', ...comun };
  if (!reglaDeEtapa(etapa, hechos.completas, etapasEnCurso(hechos))) {
    return { etapa, estado: 'bloqueada', requisito: requisitoDeEtapa(etapa), ...comun };
  }
  return { etapa, estado: 'disponible', ...comun };
}
