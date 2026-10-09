import type { PersonaBreve } from './discipulado.js';
import type { Pagina } from './pagina.js';

/**
 * spec 010 — Bautismo (D147, D179–D187). Lote 0 global: estados y límites.
 * Sesión de la 010 (T002): la card de Mi camino (`estadoCardBautismo`), la
 * regla de "¿puede pedirlo?" (`motivoNoPuedePedir`) y los DTOs. Reglas PURAS:
 * la API las usa para rechazar y la web para explicar (Principio XI).
 */

/** `aprobada` se lee "aceptada" en pantalla (D147); `realizada`, D180. */
export type EstadoSolicitudBautismo = 'pendiente' | 'aprobada' | 'rechazada' | 'retirada' | 'realizada';

export const COMENTARIO_BAUTISMO_MAX = 500;
export const MOTIVO_RECHAZO_BAUTISMO_MAX = 500;
/** D184: constante propia, no la de Vida Nueva (H-128). */
export const EDAD_MINIMA_PEDIR_BAUTISMO_SOLO = 12;
/** `POST /bautismo/eventos/:id/asignar`: de a cuántas por llamada. */
export const ASIGNAR_BAUTISMO_MAX = 100;

// ─── Talle de remera (D229) ─────────────────────────────────────────────────

/**
 * D229: la iglesia regala la remera con la que se bautiza la Persona; el
 * talle se elige al pedir (la Persona, o el Admin en su nombre) y el Admin
 * lo puede corregir desde el detalle. En este orden se muestran el selector y
 * el resumen de talles del Evento.
 */
export const TALLES_REMERA = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;
export type TalleRemera = (typeof TALLES_REMERA)[number];

export function esTalleRemera(valor: unknown): valor is TalleRemera {
  return typeof valor === 'string' && (TALLES_REMERA as readonly string[]).includes(valor);
}

/** El código de error del campo `talleRemera`, o `null` si es válido. Vacío = requerido. */
export function errorTalleRemera(valor: unknown): 'TALLE_REQUERIDO' | 'TALLE_INVALIDO' | null {
  if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) return 'TALLE_REQUERIDO';
  return esTalleRemera(valor) ? null : 'TALLE_INVALIDO';
}

/** Cuántas remeras de cada talle (los pedidos de antes de D229 cuentan como `sinDato`). */
export interface ResumenTalles {
  /** Solo los talles con al menos una, en el orden de `TALLES_REMERA`. */
  talles: Array<{ talle: TalleRemera; cantidad: number }>;
  sinDato: number;
  total: number;
}

export function resumirTalles(talles: ReadonlyArray<TalleRemera | null>): ResumenTalles {
  const cuenta = new Map<TalleRemera, number>();
  let sinDato = 0;
  for (const t of talles) {
    if (t === null || !esTalleRemera(t)) sinDato += 1;
    else cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
  }
  return {
    talles: TALLES_REMERA.filter((t) => cuenta.has(t)).map((talle) => ({ talle, cantidad: cuenta.get(talle)! })),
    sinDato,
    total: talles.length,
  };
}

/** FR-002/FR-007: la situación de Vida Nueva que importa para el bautismo (D147). */
export type VidaNuevaParaBautismo = 'en_curso' | 'completada' | 'ninguna';

/** El Evento de bautismo tal como lo ven la card y el backoffice: SIEMPRE leído del Evento (no una copia). */
export interface EventoDeBautismoResumen {
  id: string;
  nombre: string;
  slug: string;
  inicio: string;
  fin: string | null;
  /** Ya resuelto: el propio del Evento o la dirección de la Sede (D190). */
  lugar: string;
}

/** FR-019: exactamente uno de estos estados en la card de Bautismo de Mi camino. */
export type EstadoCardBautismo =
  | { estado: 'no_habilitada' }
  | { estado: 'lo_pide_su_tutor' }
  | { estado: 'puede_pedir'; ultimo?: 'rechazada' | 'retirada' }
  | { estado: 'en_revision'; solicitudId: string; desde: string }
  | { estado: 'esperando_fecha'; solicitudId: string; aceptadaEn: string }
  | { estado: 'con_fecha'; solicitudId: string; evento: EventoDeBautismoResumen }
  | { estado: 'fecha_pasada_sin_confirmar'; solicitudId: string; evento: EventoDeBautismoResumen }
  | { estado: 'bautizada'; en: string | null };

/** Lo que la API junta por Persona para calcular la card y la regla, sin Prisma (research #6). */
export interface HechosBautismo {
  vidaNueva: VidaNuevaParaBautismo;
  /** El Admin le habilitó el bautismo (FR-021). */
  habilitada: boolean;
  edad: number;
  /** La Solicitud `pendiente` o `aprobada`, si hay (hay a lo sumo una, FR-004). */
  solicitudAbierta: { id: string; estado: 'pendiente' | 'aprobada'; createdAt: string; revisadaEn: string | null } | null;
  /** Cómo terminó la última Solicitud cerrada, si no hay abierta (para "puede_pedir"). */
  ultimoDesenlace: 'rechazada' | 'retirada' | null;
  /** FR-030: Solicitud realizada o etapa registrada como hecha (D144). */
  bautizada: boolean;
  bautizadaEn: string | null;
  /** El Evento de la Solicitud abierta, si está asignada (FR-013: uno a la vez). */
  eventoAsignado: EventoDeBautismoResumen | null;
  ahora: string;
}

export type MotivoNoPuedePedirBautismo =
  | 'PERSONA_YA_BAUTIZADA'
  | 'SOLICITUD_BAUTISMO_YA_ABIERTA'
  | 'EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO'
  | 'BAUTISMO_NO_HABILITADO';

/**
 * FR-002 a FR-005: por qué la Persona NO puede pedir el bautismo ella misma,
 * o `null` si puede. Precedencia (contrato): ya bautizada > ya abierta >
 * edad > no habilitada. El pedido en nombre de (FR-022) solo mira las dos
 * primeras.
 */
export function motivoNoPuedePedir(hechos: HechosBautismo): MotivoNoPuedePedirBautismo | null {
  if (hechos.bautizada) return 'PERSONA_YA_BAUTIZADA';
  if (hechos.solicitudAbierta) return 'SOLICITUD_BAUTISMO_YA_ABIERTA';
  if (hechos.edad < EDAD_MINIMA_PEDIR_BAUTISMO_SOLO) return 'EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO';
  if (hechos.vidaNueva === 'ninguna' && !hechos.habilitada) return 'BAUTISMO_NO_HABILITADO';
  return null;
}

/**
 * FR-019: el estado de la card. Con fecha mientras el Evento no empezó
 * (`inicio > ahora`); desde el instante de inicio, "estamos confirmando" (el
 * mismo borde que habilita confirmar, FR-027/FR-028).
 */
export function estadoCardBautismo(hechos: HechosBautismo): EstadoCardBautismo {
  if (hechos.bautizada) return { estado: 'bautizada', en: hechos.bautizadaEn };
  const abierta = hechos.solicitudAbierta;
  if (abierta?.estado === 'pendiente') return { estado: 'en_revision', solicitudId: abierta.id, desde: abierta.createdAt };
  if (abierta?.estado === 'aprobada') {
    const evento = hechos.eventoAsignado;
    if (!evento) return { estado: 'esperando_fecha', solicitudId: abierta.id, aceptadaEn: abierta.revisadaEn ?? abierta.createdAt };
    return new Date(evento.inicio).getTime() > new Date(hechos.ahora).getTime()
      ? { estado: 'con_fecha', solicitudId: abierta.id, evento }
      : { estado: 'fecha_pasada_sin_confirmar', solicitudId: abierta.id, evento };
  }
  switch (motivoNoPuedePedir(hechos)) {
    case 'EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO':
      return { estado: 'lo_pide_su_tutor' };
    case 'BAUTISMO_NO_HABILITADO':
      return { estado: 'no_habilitada' };
    default:
      return hechos.ultimoDesenlace ? { estado: 'puede_pedir', ultimo: hechos.ultimoDesenlace } : { estado: 'puede_pedir' };
  }
}

/** FR-020: ¿puede retirar? Pendiente, o aceptada sin Evento o con Evento futuro. */
export function puedeRetirarBautismo(card: EstadoCardBautismo): boolean {
  return card.estado === 'en_revision' || card.estado === 'esperando_fecha' || card.estado === 'con_fecha';
}

// ─── DTOs del backoffice (contracts/bautismo-api.md) ───────────────────────

/** `GET /bautismo/solicitudes/:id` (FR-007). `motivoRechazo` solo lo ve el equipo (D185). */
export interface SolicitudBautismoDetalle {
  id: string;
  estado: EstadoSolicitudBautismo;
  persona: PersonaBreve & { edad: number; sinAccesoALaApp: boolean };
  comentario: string | null;
  /** D229: `null` en los pedidos de antes del ajuste ("Sin dato"). */
  talleRemera: TalleRemera | null;
  createdAt: string;
  creadoPor: PersonaBreve | null;
  revisadoPor: PersonaBreve | null;
  revisadaEn: string | null;
  motivoRechazo: string | null;
  retiradaEn: string | null;
  realizadaEn: string | null;
  vidaNueva: { estado: VidaNuevaParaBautismo; desde: string | null };
  habilitacion: { en: string; por: PersonaBreve | null } | null;
  /** El Evento asignado (solo `aprobada` o `realizada`). */
  evento: EventoDeBautismoResumen | null;
}

/** Una Persona asignada a un Evento de bautismo (sección del Evento, Historias 3 y 7). */
export interface FilaAsignada {
  solicitudId: string;
  persona: PersonaBreve;
  estado: 'aprobada' | 'realizada';
  asignadaEn: string;
  realizadaEn: string | null;
  /** D229. */
  talleRemera: TalleRemera | null;
}

/** Una Solicitud aceptada sin fecha (la más antigua primero, FR-033). */
export interface FilaEsperando {
  solicitudId: string;
  persona: PersonaBreve;
  aceptadaEn: string;
}

/** `GET /bautismo/eventos/:eventoId`: la sección Bautismo del detalle del Evento. */
export interface SeccionBautismoEventoDatos {
  evento: EventoDeBautismoResumen & { cancelado: boolean; yaEmpezo: boolean };
  asignadas: Pagina<FilaAsignada>;
  esperandoFecha: Pagina<FilaEsperando>;
  /** D229: los talles de TODAS las asignadas (no solo la página), para comprar las remeras. */
  talles: ResumenTalles;
  /** FR-027: el Evento ya empezó y quedan asignadas sin confirmar. */
  puedeConfirmar: boolean;
}

/** `POST /bautismo/eventos/:eventoId/asignar` (FR-014): parcial-tolerante. */
export interface AsignacionResultado {
  asignadas: string[];
  /** Ya asignada a ESTE Evento cuenta como asignada (idempotente). */
  noAsignadas: Array<{ id: string; code: 'SOLICITUD_BAUTISMO_YA_CAMBIO' | 'NO_ENCONTRADO' }>;
}

/** `POST /bautismo/eventos/:eventoId/confirmar` (FR-027). */
export interface ConfirmacionBautismosResultado {
  realizadas: number;
  devueltasAEspera: number;
}

/** `GET /bautismo/personas/:id` — el bloque Bautismo del Perfil de Persona (FR-021, FR-022). */
export interface BautismoDePersona {
  activa: boolean;
  edad: number;
  vidaNueva: { estado: VidaNuevaParaBautismo; desde: string | null };
  habilitacion: { en: string; por: PersonaBreve | null } | null;
  bautizada: { en: string | null } | null;
  /** La Solicitud abierta, si hay, para enlazar a su detalle. */
  solicitudAbierta: { id: string; estado: 'pendiente' | 'aprobada'; evento: EventoDeBautismoResumen | null } | null;
}
