/**
 * spec 011 — Eventos. Lote 0 global: estados, límites y MIME. Los DTOs
 * (`EventoPublico`, `MiInscripcionEvento`, …) y las reglas puras
 * (`estadoPagoDeInscripcion`, `estadoInscripcionDeEvento`) los agrega la
 * sesión de la 011 en este archivo (T002). `instanteEnArgentina` está en
 * formato.ts y `destinoSeguro` en navegacion.ts (los usan otras specs).
 */

export type TipoEvento = 'general' | 'bautismo';
export type EstadoEvento = 'publicado' | 'cancelado';
export type EstadoInscripcionEvento = 'confirmada' | 'pendiente' | 'rechazada' | 'lista_espera' | 'cancelada';
export type MotivoCancelacionInscripcion = 'persona' | 'admin' | 'pago_rechazado';
export type MedioPago = 'transferencia' | 'efectivo' | 'otro';
export type EstadoPago = 'pendiente_verificacion' | 'verificado' | 'rechazado';

/** D192: ocupan lugar. */
export const ESTADOS_QUE_OCUPAN_LUGAR: readonly EstadoInscripcionEvento[] = ['confirmada', 'pendiente'];
/** research #2: una sola abierta por Persona y Evento (índice parcial). */
export const ESTADOS_INSCRIPCION_ABIERTA: readonly EstadoInscripcionEvento[] = ['confirmada', 'pendiente', 'lista_espera'];

export const EVENTO_NOMBRE_MAX = 120;
export const EVENTO_DESCRIPCION_MAX = 5000;
export const EVENTO_LUGAR_MAX = 300;
export const INSTRUCCIONES_PAGO_MAX = 1000;
export const DIAS_RECORDATORIO_MAX = 60;
/** D195 */
export const MIME_TIPOS_COMPROBANTE_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const COMPROBANTE_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const MIME_TIPOS_FLYER_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const FLYER_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

// ============================================================================
// spec 011 — tipos de respuesta y reglas puras (T002). Fuente de verdad única
// para la API (que los arma) y las dos apps (que los muestran).
// ============================================================================

/** research #4: el estado de pago de una Inscripción se deriva, no se guarda. */
export type EstadoPagoInscripcion = 'no_aplica' | 'sin_pago' | 'pendiente_verificacion' | 'verificado';

/** data-model.md: qué puede hacer quien mira la página del Evento (FR-002, FR-004, FR-005, FR-046). */
export type EstadoInscripcionDeEvento =
  | 'no_requiere'
  | 'abierta'
  | 'lista_espera'
  | 'cupo_completo'
  | 'cerrada'
  | 'cancelado'
  | 'solo_admin';

export interface SedeDeEvento {
  id: string;
  nombre: string;
  direccion: string;
}

/** `GET /eventos/publicos[/:slug]`: nunca incluye inscriptos (FR-046). Montos como string decimal. */
export interface EventoPublico {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  tipo: TipoEvento;
  inicio: string;
  fin: string | null;
  /** Ya resuelto: el propio del Evento o la dirección de la Sede (D190). */
  lugar: string;
  sede: SedeDeEvento;
  publicoObjetivo: string | null;
  imagenUrl: string | null;
  descripcionImagen: string | null;
  requiereInscripcion: boolean;
  requiereAprobacion: boolean;
  permiteListaEspera: boolean;
  cupo: number | null;
  lugaresDisponibles: number | null;
  costo: string | null;
  instruccionesPago: string | null;
  estado: EstadoEvento;
  estadoInscripcion: EstadoInscripcionDeEvento;
}

/** Totales de un Evento para el backoffice (FR-009, FR-025). */
export interface TotalesEvento {
  ocupados: number;
  enEspera: number;
  pendientes: number;
  pagosAVerificar: number;
}

/** Fila de `GET /eventos` (backoffice). */
export interface EventoResumen extends TotalesEvento {
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoEvento;
  inicio: string;
  fin: string | null;
  estado: EstadoEvento;
  requiereInscripcion: boolean;
  cupo: number | null;
  sede: { id: string; nombre: string };
  eliminadoEn: string | null;
}

/** `GET /eventos/:id` (backoffice): todo lo público + lo que el Admin necesita para editar. */
export interface EventoDetalle extends EventoPublico, TotalesEvento {
  /** El `lugar` propio, sin resolver (null = el de la Sede) — para el formulario. */
  lugarPropio: string | null;
  diasAnticipacionRecordatorio: number | null;
  /** Todas, incluidas las canceladas (D119: eliminar solo sin ninguna, FR-042). */
  inscripcionesTotal: number;
  /** Pagos registrados en cualquier estado (FR-014: no cambiar el costo). */
  pagosTotal: number;
  creadoPor: { id: string; nombre: string; apellido: string } | null;
  createdAt: string;
  canceladoEn: string | null;
  eliminadoEn: string | null;
}

/** Body de `POST /eventos` y `PATCH /eventos/:id` (contracts/eventos-api.md). */
export interface DatosEvento {
  sedeId: string;
  nombre: string;
  descripcion: string;
  tipo: TipoEvento;
  inicio: string;
  fin?: string | null;
  lugar?: string | null;
  publicoObjetivo?: string | null;
  requiereInscripcion: boolean;
  requiereAprobacion: boolean;
  cupo?: number | null;
  permiteListaEspera: boolean;
  costo?: string | null;
  instruccionesPago?: string | null;
  diasAnticipacionRecordatorio?: number | null;
}

export const EVENTO_NOMBRE_MIN = 3;
export const EVENTO_PUBLICO_OBJETIVO_MAX = 120;
export const EVENTO_DESCRIPCION_IMAGEN_MAX = 500;

export type FiltroEventos = 'proximos' | 'pasados' | 'cancelados' | 'todos';
export const FILTROS_EVENTOS: readonly FiltroEventos[] = ['proximos', 'pasados', 'cancelados', 'todos'];

/**
 * FR-002, FR-004, FR-005, FR-046 — qué estado de inscripción muestra la
 * página del Evento. El orden importa: un Evento cancelado lo dice antes que
 * nada; uno sin inscripción no tiene nada que abrir; uno que ya empezó está
 * cerrado (FR-019); el de bautismo solo lo inscribe el Admin.
 */
export function estadoInscripcionDeEvento(
  evento: {
    tipo: TipoEvento;
    estado: EstadoEvento;
    requiereInscripcion: boolean;
    inicio: string | Date;
    cupo: number | null;
    permiteListaEspera: boolean;
  },
  ocupados: number,
  ahora: Date = new Date(),
): EstadoInscripcionDeEvento {
  if (evento.estado === 'cancelado') return 'cancelado';
  if (!evento.requiereInscripcion) return 'no_requiere';
  if (new Date(evento.inicio).getTime() <= ahora.getTime()) return 'cerrada';
  if (evento.tipo === 'bautismo') return 'solo_admin';
  if (evento.cupo !== null && ocupados >= evento.cupo) {
    return evento.permiteListaEspera ? 'lista_espera' : 'cupo_completo';
  }
  return 'abierta';
}

/**
 * FR-024 (research #4, D148) — el estado de pago de una Inscripción a partir
 * de sus Pagos. Un verificado gana; si no, uno en revisión; si no, falta el
 * pago. `ultimoRechazo` es el motivo del rechazo más reciente, para que la
 * Persona sepa por qué tiene que volver a subirlo.
 */
export function estadoPagoDeInscripcion(
  costo: string | number | null,
  pagos: ReadonlyArray<{ estado: EstadoPago; createdAt: string | Date; motivoRechazo?: string | null }>,
): { estado: EstadoPagoInscripcion; ultimoRechazo: string | null } {
  if (costo === null || Number(costo) <= 0) return { estado: 'no_aplica', ultimoRechazo: null };
  const rechazados = pagos
    .filter((p) => p.estado === 'rechazado')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const ultimoRechazo = rechazados[0]?.motivoRechazo ?? null;
  if (pagos.some((p) => p.estado === 'verificado')) return { estado: 'verificado', ultimoRechazo: null };
  if (pagos.some((p) => p.estado === 'pendiente_verificacion')) return { estado: 'pendiente_verificacion', ultimoRechazo };
  return { estado: 'sin_pago', ultimoRechazo };
}

/** El último Pago de una Inscripción, para la Persona (FR-024). */
export interface UltimoPagoInscripcion {
  id: string;
  estado: EstadoPago;
  monto: string;
  medio: MedioPago;
  fechaPago: string;
  motivoRechazo: string | null;
  tieneComprobante: boolean;
}

/** Una Inscripción vista por su dueña (contracts/inscripciones-api.md). */
export interface MiInscripcionEvento {
  id: string;
  estado: EstadoInscripcionEvento;
  createdAt: string;
  /** Solo en `lista_espera` (FR-017). */
  posicionEnLista: number | null;
  promovidaEn: string | null;
  motivoRechazo: string | null;
  motivoCancelacion: MotivoCancelacionInscripcion | null;
  estadoPago: EstadoPagoInscripcion;
  /** Motivo del último pago rechazado, para saber qué corregir. */
  ultimoRechazoPago: string | null;
  ultimoPago: UltimoPagoInscripcion | null;
  evento: EventoPublico;
}

/** `GET /eventos/:id/mi-inscripcion`: lo que necesita la isla de la página del Evento. */
export interface MiInscripcionEnEvento {
  inscripcion: MiInscripcionEvento | null;
  lugaresDisponibles: number | null;
  estadoInscripcion: EstadoInscripcionDeEvento;
}

export type CuandoMisInscripciones = 'proximas' | 'pasadas';

/** `PagoResumen` (contracts/pagos-api.md). */
export interface PagoResumen {
  id: string;
  inscripcionEventoId: string;
  monto: string;
  medio: MedioPago;
  fechaPago: string;
  estado: EstadoPago;
  tieneComprobante: boolean;
  comprobanteMime: string | null;
  creadoPor: { id: string; nombre: string; apellido: string } | null;
  verificadoPor: { id: string; nombre: string; apellido: string } | null;
  revisadoEn: string | null;
  motivoRechazo: string | null;
  createdAt: string;
}

/** Fila de `GET /pagos` y de la bandeja: el Pago con su Persona y su Evento. */
export interface PagoEnBandeja extends PagoResumen {
  persona: { id: string; nombre: string; apellido: string };
  evento: { id: string; nombre: string; inicio: string; slug: string };
}

export const MEDIOS_PAGO: readonly MedioPago[] = ['transferencia', 'efectivo', 'otro'];
export const MOTIVO_RECHAZO_PAGO_MAX = 500;

type PersonaBreveEvento = { id: string; nombre: string; apellido: string };

/** Fila de `GET /eventos/:id/inscripciones` (backoffice, FR-025). */
export interface InscripcionEventoResumen {
  id: string;
  persona: PersonaBreveEvento & { tieneAcceso: boolean };
  estado: EstadoInscripcionEvento;
  createdAt: string;
  creadoPor: PersonaBreveEvento | null;
  posicionEnLista: number | null;
  /** Subió desde la lista y el Admin todavía no marcó "Ya le avisé". */
  promovidaSinVer: boolean;
  estadoPago: EstadoPagoInscripcion;
  /** Confirmada en un Evento con costo, sin Pago verificado ni en revisión: días desde que se anotó. */
  diasSinPago: number | null;
  /** El Pago en revisión (para verificarlo desde el detalle). */
  pagoPendienteId: string | null;
  revisadoPor: PersonaBreveEvento | null;
  motivoRechazo: string | null;
  motivoCancelacion: MotivoCancelacionInscripcion | null;
}

/** Inscripción con su Evento, para el perfil de una Persona y para la 010 (FR-048). */
export interface InscripcionDePersona {
  id: string;
  estado: EstadoInscripcionEvento;
  createdAt: string;
  estadoPago: EstadoPagoInscripcion;
  evento: { id: string; slug: string; nombre: string; tipo: TipoEvento; inicio: string; estado: EstadoEvento };
}

export interface ResultadoAprobarLote {
  aprobadas: string[];
  fallidas: Array<{ id: string; code: string }>;
}

export const APROBAR_LOTE_MAX = 50;
export const MOTIVO_RECHAZO_INSCRIPCION_MAX = 500;
