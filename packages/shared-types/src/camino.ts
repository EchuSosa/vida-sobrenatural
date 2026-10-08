import type { EstadoMiDiscipulado, MisDiscipuladosRespuesta, PersonaBreve } from './discipulado.js';
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
export const ETAPAS_CONSTRUIDAS: readonly EtapaCamino[] = ['vida_nueva', 'vida_de_servicio', 'ministerio'];

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

/**
 * Ajustes 2 (PR #18, Pregunta 5): lo que una etapa sabe de sí misma y la 006
 * no — hoy, que la Persona tiene un pedido PROPIO de esa etapa en revisión
 * (una postulación a un Ministerio pendiente). La API lo junta en
 * `HechosCamino.propios` y `estadoDeEtapa` lo lleva al encabezado de la card.
 */
export type EstadoPropioEtapa = { estado: 'solicitud_en_revision'; desde: string };

/** FR-002: lo que ve la card. */
export type EstadoEtapa =
  | { etapa: EtapaCamino; estado: 'proximamente'; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
  | { etapa: EtapaCamino; estado: 'bloqueada'; requisito: Requisito; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
  | { etapa: EtapaCamino; estado: 'disponible'; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
  /** Su pedido propio de la etapa está en revisión (ver `EstadoPropioEtapa`): el encabezado dice "En revisión". */
  | { etapa: EtapaCamino; estado: 'solicitud_en_revision'; desde: string; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
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
  /** El estado propio de cada etapa, si lo informa (Ajustes 2). */
  propios?: Partial<Record<EtapaCamino, EstadoPropioEtapa>>;
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
  // Ajustes 2: si la etapa informa su propio pedido en revisión, el encabezado lo dice (no "La podés empezar").
  const propio = hechos.propios?.[etapa];
  if (propio?.estado === 'solicitud_en_revision') return { etapa, estado: 'solicitud_en_revision', desde: propio.desde, ...comun };
  if (!reglaDeEtapa(etapa, hechos.completas, etapasEnCurso(hechos))) {
    return { etapa, estado: 'bloqueada', requisito: requisitoDeEtapa(etapa), ...comun };
  }
  return { etapa, estado: 'disponible', ...comun };
}

/**
 * spec 006, FR-023 (T022, contracts/navegacion.md): ¿la pestaña de la barra
 * de la app es la actual? Sí si la ruta es la suya o cuelga de alguna de sus
 * `rutasRelacionadas` (por segmento: `/mi-camino/vida-nueva` sí, `/mi-caminos`
 * no). Así Mi camino queda marcada en sus subrutas, en Mis discipulados y en
 * Mi disponibilidad.
 */
export function esItemActual(item: { href: string; rutasRelacionadas?: readonly string[] }, pathname: string): boolean {
  return [item.href, ...(item.rutasRelacionadas ?? [])].some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));
}

// ─── Lote B: el lado del Admin (contracts/historial-admin-api.md) ──────────

/** Lo que el sistema ya sabe de una Persona en una etapa (FR-013, FR-014). Sin notas de Encuentros (D134). */
export interface ContextoEtapa {
  /** Completa y por qué camino, o `null`. */
  completa: ComoSeCompleto | null;
  /** En marcha en el sistema (hoy solo Vida Nueva: pedido abierto o Grupo en curso). */
  enCurso: boolean;
  completitudVigente: { id: string; origen: OrigenCompletitud; registradaEn: string; registradaPor: PersonaBreve | null; nota: string | null } | null;
}

/** `GET /historial/declaraciones/:id` (FR-013): el detalle para el Admin y el Pastor. */
export interface DeclaracionDetalle {
  id: string;
  etapa: EtapaCamino;
  estado: EstadoDeclaracion;
  comentario: string | null;
  createdAt: string;
  revisadoPor: PersonaBreve | null;
  revisadaEn: string | null;
  motivoRechazo: string | null;
  persona: PersonaBreve & { edad: number; sinAccesoALaApp: boolean };
  contexto: ContextoEtapa & { declaracionesAnteriores: Array<{ estado: EstadoDeclaracion; fecha: string }> };
}

/** Una etapa de `GET /personas/:id/camino` (FR-014): lo que necesita el Admin para registrar o anular. */
export interface EtapaDePersonaAdmin extends ContextoEtapa {
  etapa: EtapaCamino;
  declaracionPendiente: { id: string; createdAt: string } | null;
}

/** `GET /personas/:id/camino`: siempre las cuatro, en ETAPAS_CAMINO. */
export interface CaminoDePersonaAdmin {
  etapas: EtapaDePersonaAdmin[];
}

// ─── Lote C: el Discipulador en la web app ─────────────────────────────────

/** Un rechazo del Admin que el Discipulador todavía no volvió a proponer (FR-021). */
export type RechazoPendiente =
  | { tipo: 'finalizacion'; grupoId: string; personas: string[]; en: string; motivo: string | null }
  | { tipo: 'baja'; grupoId: string; persona: string; en: string; motivo: string | null };

export interface PendientesDelDiscipulador {
  propuestas: number;
  rechazos: RechazoPendiente[];
  /** Lo que cuenta el aviso del Inicio (FR-022). */
  total: number;
}

/**
 * spec 006, FR-021/FR-022 (T054): los pendientes del Discipulador, calculados
 * sobre `GET /discipulado/mis-discipulados` (la API no cambia): las propuestas
 * por responder y las finalizaciones o bajas que propuso y el Admin rechazó y
 * que todavía no volvió a proponer (una propuesta POSTERIOR al rechazo lo
 * saca). Solo de discipulados en curso. La usan Mis discipulados y el Inicio.
 */
export function pendientesDelDiscipulador(datos: Pick<MisDiscipuladosRespuesta, 'propuestas' | 'discipulados'>): PendientesDelDiscipulador {
  const rechazos: RechazoPendiente[] = [];
  for (const d of datos.discipulados) {
    if (d.estado !== 'en_curso') continue;
    const fin = d.finalizacionRechazada;
    if (fin && !(d.propuestaFinalizacionEn && d.propuestaFinalizacionEn > fin.en)) {
      rechazos.push({ tipo: 'finalizacion', grupoId: d.grupoId, personas: d.personas.map((p) => `${p.nombre} ${p.apellido}`), en: fin.en, motivo: fin.motivo });
    }
    for (const p of d.personas) {
      const baja = p.bajaRechazada;
      if (baja && !(p.bajaPropuesta && p.bajaPropuesta.en > baja.en)) {
        rechazos.push({ tipo: 'baja', grupoId: d.grupoId, persona: `${p.nombre} ${p.apellido}`, en: baja.en, motivo: baja.motivo });
      }
    }
  }
  return { propuestas: datos.propuestas.length, rechazos, total: datos.propuestas.length + rechazos.length };
}
