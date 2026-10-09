/**
 * spec 012 (D197, D198) — el ÚNICO catálogo de avisos automáticos de la app
 * (`specs/012-notificaciones/contracts/catalogo-eventos.md`). Una spec que
 * quiere avisar algo emite uno de estos eventos con
 * `NotificacionesService.emitir(tx, evento)` DENTRO de la transacción del
 * cambio (`contracts/emision.md`). Si el que necesita no está, lo agrega acá
 * en su PR, con sus textos y su test (FR-040).
 *
 * Lote 0 global: el catálogo ya trae los eventos de todas las specs 004–011
 * (unificando los nombres que cada spec proponía en su `contracts/eventos*.md`
 * con los de la 012). Ningún texto de interfaz vive acá: la web lo arma con
 * `avisos.eventos.<nombre>` de next-intl y el mail con
 * `apps/api/src/email/mensajes/<idioma>.json` (D84). Solo ids y datos no
 * personales en `datos` (FR-013) — el nombre de un Evento o de un Ministerio
 * sí; el de una Persona o un motivo, nunca.
 */

/** Disparadores de `docs/04` + `proceso_actualizado` (D199). Se derivan del catálogo; no se guardan. */
export type Disparador =
  | 'contenido_liberado'
  | 'solicitud_actualizada'
  | 'evento_proximo'
  | 'recordatorio_inscripcion'
  | 'proceso_actualizado';

export type PrioridadAviso = 'normal' | 'importante';

/** A quién llega un aviso. Lo resuelve `resolverDestinatarios` (apps/api/src/notificaciones/destinatarios.ts). */
export type DestinatarioAviso =
  | { tipo: 'persona'; personaId: string } // la interesada
  | { tipo: 'discipulador'; personaId: string }
  | { tipo: 'admin' } // sin aviso en esta tanda (D201): lo ve en Pendientes del backoffice
  | { tipo: 'grupo'; grupoId: string } // Inscripciones `activa` del Grupo
  | { tipo: 'lideres_grupo'; grupoId: string } // Liderazgos vigentes del Grupo (Líderes de curso, 008)
  | { tipo: 'ministerio'; ministerioId: string } // miembros vigentes (Postulación `aprobada`, 009)
  | { tipo: 'evento_confirmados'; eventoId: string } // Inscripciones a Evento `confirmada`
  | { tipo: 'evento_inscriptos'; eventoId: string } // Inscripciones a Evento abiertas (confirmada, pendiente, lista_espera)
  | { tipo: 'todas' } // Personas activas
  | { tipo: 'todas_sin_inscripcion'; eventoId: string }; // activas sin inscripción vigente al Evento

export type TipoDestinatarioAviso = DestinatarioAviso['tipo'];

type DePersona = { tipo: 'persona'; personaId: string };
type Admin = { tipo: 'admin' };

/** Todos los eventos del catálogo, con su destinatario y sus datos tipados. */
export type EventoAviso =
  // --- 004 — Vida Nueva / Discipulado ---
  | { nombre: 'discipulado.propuesta_nueva'; a: { tipo: 'discipulador'; personaId: string }; datos: { propuestaId: string; solicitudId?: string; grupoId?: string } }
  | { nombre: 'discipulado.propuesta_aceptada'; a: DePersona; datos: { solicitudId: string; grupoId: string; discipuladorId: string } }
  | { nombre: 'discipulado.solicitud_rechazada'; a: DePersona; datos: { solicitudId: string } }
  | { nombre: 'discipulado.finalizacion_confirmada'; a: DePersona; datos: { grupoId: string; inscripcionId: string } }
  | { nombre: 'discipulado.baja_confirmada'; a: DePersona; datos: { grupoId: string; inscripcionId: string } }
  | { nombre: 'discipulado.propuesta_declinada'; a: Admin; datos: { propuestaId: string; solicitudId?: string; grupoId?: string } }
  | { nombre: 'discipulado.propuesta_retirada'; a: Admin; datos: { propuestaId: string; retiradaPor: 'admin' | 'persona' } }
  | { nombre: 'discipulado.finalizacion_propuesta'; a: Admin; datos: { grupoId: string } }
  | { nombre: 'discipulado.baja_propuesta'; a: Admin; datos: { grupoId: string; inscripcionId: string } }
  // --- 001 / Flujo 7 / Flujo 12 — activación de cuenta ---
  | { nombre: 'persona.cuenta_activada'; a: DePersona; datos: { personaId: string } }
  // --- 006 — historial previo ---
  | { nombre: 'historial.declaracion_creada'; a: Admin; datos: { declaracionId: string; etapa: string } }
  | { nombre: 'historial.declaracion_confirmada'; a: DePersona; datos: { declaracionId: string; etapa: string } }
  | { nombre: 'historial.declaracion_rechazada'; a: DePersona; datos: { declaracionId: string; etapa: string } }
  | { nombre: 'historial.completitud_registrada'; a: DePersona; datos: { completitudId: string; etapa: string } }
  // --- 008 — Vida de Servicio ---
  | { nombre: 'vida_servicio.solicitud_creada'; a: Admin; datos: { solicitudId: string } }
  | { nombre: 'vida_servicio.inscripcion_aprobada'; a: DePersona; datos: { solicitudId: string; grupoId: string; inscripcionId: string } }
  | { nombre: 'vida_servicio.inscripcion_rechazada'; a: DePersona; datos: { solicitudId: string } }
  | { nombre: 'vida_servicio.contenido_liberado'; a: { tipo: 'grupo'; grupoId: string }; datos: { grupoId: string; cronogramaItemId: string; semana: number } }
  | { nombre: 'vida_servicio.lider_asignado'; a: DePersona; datos: { grupoId: string } }
  | { nombre: 'vida_servicio.baja_propuesta'; a: Admin; datos: { grupoId: string; inscripcionId: string } }
  | { nombre: 'vida_servicio.baja_rechazada'; a: { tipo: 'lideres_grupo'; grupoId: string }; datos: { grupoId: string; inscripcionId: string } }
  | { nombre: 'vida_servicio.inscripcion_dada_de_baja'; a: DePersona; datos: { grupoId: string; inscripcionId: string } }
  | { nombre: 'vida_servicio.finalizacion_propuesta'; a: Admin; datos: { grupoId: string } }
  | { nombre: 'vida_servicio.finalizacion_rechazada'; a: { tipo: 'lideres_grupo'; grupoId: string }; datos: { grupoId: string } }
  | { nombre: 'vida_servicio.completada'; a: DePersona; datos: { grupoId: string; inscripcionId: string } }
  // --- 009 — Ministerios ---
  | { nombre: 'ministerio.postulacion_creada'; a: Admin; datos: { postulacionId: string; ministerioId: string; enNombreDe: boolean } }
  | { nombre: 'ministerio.postulacion_retirada'; a: Admin; datos: { postulacionId: string } }
  | { nombre: 'ministerio.postulacion_aprobada'; a: DePersona; datos: { postulacionId: string; ministerioId: string; ministerio: string; celulaId: string | null; reemplazaA: string | null } }
  | { nombre: 'ministerio.postulacion_rechazada'; a: DePersona; datos: { postulacionId: string } }
  | { nombre: 'ministerio.miembro_dado_de_baja'; a: DePersona; datos: { postulacionId: string; ministerioId: string } }
  // --- 010 — Bautismo (D147) ---
  | { nombre: 'bautismo.solicitud_aceptada'; a: DePersona; datos: { solicitudId: string } }
  | { nombre: 'bautismo.solicitud_rechazada'; a: DePersona; datos: { solicitudId: string } }
  | { nombre: 'bautismo.fecha_asignada'; a: DePersona; datos: { solicitudId: string; eventoId: string; fecha: string } }
  | { nombre: 'bautismo.fecha_quitada'; a: DePersona; datos: { solicitudId: string; eventoId: string } }
  | { nombre: 'bautismo.evento_cancelado'; a: DePersona; datos: { solicitudId: string; eventoId: string } }
  | { nombre: 'bautismo.realizado'; a: DePersona; datos: { solicitudId: string; eventoId: string } }
  // --- 011 — Eventos ---
  | { nombre: 'evento.inscripcion_pendiente'; a: Admin; datos: { eventoId: string; inscripcionId: string } }
  | { nombre: 'evento.inscripcion_creada_por_admin'; a: DePersona; datos: { inscripcionId: string; eventoId: string; evento: string; estado: 'confirmada' | 'pendiente' | 'lista_espera' } }
  | { nombre: 'evento.inscripcion_confirmada'; a: DePersona; datos: { inscripcionId: string; eventoId: string; evento: string } }
  | { nombre: 'evento.inscripcion_rechazada'; a: DePersona; datos: { inscripcionId: string; eventoId: string; evento: string } }
  | { nombre: 'evento.inscripcion_cancelada_por_admin'; a: DePersona; datos: { inscripcionId: string; eventoId: string; evento: string } }
  | { nombre: 'evento.lista_espera_promovida'; a: DePersona; datos: { inscripcionId: string; eventoId: string; evento: string; estadoNuevo: 'confirmada' | 'pendiente' } }
  | { nombre: 'evento.pago_registrado'; a: Admin; datos: { pagoId: string; inscripcionId: string; eventoId: string } }
  | { nombre: 'evento.pago_verificado'; a: DePersona; datos: { pagoId: string; inscripcionId: string; eventoId: string; evento: string } }
  | { nombre: 'evento.pago_rechazado'; a: DePersona; datos: { pagoId: string; inscripcionId: string; eventoId: string; evento: string } }
  | { nombre: 'evento.modificado'; a: { tipo: 'evento_inscriptos'; eventoId: string }; datos: { eventoId: string; evento: string; slug: string } }
  | { nombre: 'evento.cancelado'; a: { tipo: 'evento_inscriptos'; eventoId: string }; datos: { eventoId: string; evento: string; slug: string } }
  | { nombre: 'evento.proximo'; a: { tipo: 'evento_confirmados'; eventoId: string }; datos: { eventoId: string; evento: string } }
  | { nombre: 'evento.recordatorio_inscripcion'; a: { tipo: 'todas_sin_inscripcion'; eventoId: string }; datos: { eventoId: string; evento: string; slug: string; dias: number } }
  // --- 014 — Grupos de Extensión (D227). Al líder, uno por líder vigente (`persona`). ---
  | { nombre: 'grupo_extension.solicitud_nueva'; a: DePersona; datos: { solicitudId: string; grupoId: string; grupo: string } }
  | { nombre: 'grupo_extension.solicitud_aceptada'; a: DePersona; datos: { solicitudId: string; grupoId: string; grupo: string } }
  | { nombre: 'grupo_extension.solicitud_rechazada'; a: DePersona; datos: { solicitudId: string; grupoId: string; grupo: string } }
  | { nombre: 'grupo_extension.agregada_por_admin'; a: DePersona; datos: { solicitudId: string; grupoId: string; grupo: string } };

export type NombreEventoAviso = EventoAviso['nombre'];

/** Los `datos` de un evento puntual del catálogo. */
export type DatosDe<N extends NombreEventoAviso> = Extract<EventoAviso, { nombre: N }>['datos'];

/** La spec que es dueña del hecho (para el test del catálogo y para saber quién lo conecta). */
export type SpecDelAviso = '001' | '004' | '006' | '008' | '009' | '010' | '011' | '014' | 'flujo-12';

export interface EntradaCatalogo<N extends NombreEventoAviso> {
  spec: SpecDelAviso;
  /** El único tipo de destinatario permitido para este evento (emitir lo verifica). */
  destinatario: Extract<EventoAviso, { nombre: N }>['a']['tipo'];
  /** null ⇔ destinatario `admin` (sin aviso, D201). */
  disparador: Disparador | null;
  prioridad: PrioridadAviso;
  /** A qué entidad "lleva" (D59): `entidadTipo`/`entidadId` de la Notificación. */
  entidad: { tipo: string; id: (d: DatosDe<N>) => string };
  /** Ruta de la web app, sin dominio. */
  destino: (d: DatosDe<N>) => string;
  /** Clave de idempotencia (FR-014); null = sin clave. */
  clave: (d: DatosDe<N>) => string | null;
}

const MI_CAMINO = '/mi-camino';
const MIS_EVENTOS = '/mis-eventos';
/** spec 014: la card de la persona y la pantalla del líder. */
const MI_GRUPO_EXTENSION = '/mi-camino/grupo-extension';
const LIDER_GRUPO_EXTENSION = '/mi-grupo-extension';
const sinClave = () => null;

export const CATALOGO_AVISOS: { [N in NombreEventoAviso]: EntradaCatalogo<N> } = {
  // 004
  'discipulado.propuesta_nueva': {
    spec: '004', destinatario: 'discipulador', disparador: 'proceso_actualizado',
    // D201 (Pregunta 1 de la 012): el Discipulador también lo recibe por mail.
    prioridad: 'importante',
    entidad: { tipo: 'propuesta_discipulado', id: (d) => d.propuestaId },
    // D156: Mis discipulados vive en la web app (spec 006).
    destino: () => '/mis-discipulados', clave: sinClave,
  },
  'discipulado.propuesta_aceptada': {
    spec: '004', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_discipulado', id: (d) => d.solicitudId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'discipulado.solicitud_rechazada': {
    spec: '004', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_discipulado', id: (d) => d.solicitudId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'discipulado.finalizacion_confirmada': {
    spec: '004', destinatario: 'persona', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'grupo', id: (d) => d.grupoId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'discipulado.baja_confirmada': {
    spec: '004', destinatario: 'persona', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'grupo', id: (d) => d.grupoId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'discipulado.propuesta_declinada': {
    spec: '004', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'propuesta_discipulado', id: (d) => d.propuestaId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'discipulado.propuesta_retirada': {
    spec: '004', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'propuesta_discipulado', id: (d) => d.propuestaId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'discipulado.finalizacion_propuesta': {
    spec: '004', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'grupo', id: (d) => d.grupoId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'discipulado.baja_propuesta': {
    spec: '004', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'grupo', id: (d) => d.grupoId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  // Activación (Flujo 7, existente; Flujo 12, spec 006)
  'persona.cuenta_activada': {
    spec: '001', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'persona', id: (d) => d.personaId }, destino: () => MI_CAMINO,
    clave: (d) => `persona.cuenta_activada:${d.personaId}`,
  },
  // 006
  'historial.declaracion_creada': {
    spec: '006', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'declaracion_historial', id: (d) => d.declaracionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'historial.declaracion_confirmada': {
    spec: '006', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'declaracion_historial', id: (d) => d.declaracionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'historial.declaracion_rechazada': {
    spec: '006', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'declaracion_historial', id: (d) => d.declaracionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'historial.completitud_registrada': {
    spec: '006', destinatario: 'persona', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'completitud_manual', id: (d) => d.completitudId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  // 008
  'vida_servicio.solicitud_creada': {
    spec: '008', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'solicitud_vida_servicio', id: (d) => d.solicitudId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'vida_servicio.inscripcion_aprobada': {
    spec: '008', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_vida_servicio', id: (d) => d.solicitudId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'vida_servicio.inscripcion_rechazada': {
    spec: '008', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_vida_servicio', id: (d) => d.solicitudId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'vida_servicio.contenido_liberado': {
    spec: '008', destinatario: 'grupo', disparador: 'contenido_liberado', prioridad: 'normal',
    entidad: { tipo: 'item_cronograma', id: (d) => d.cronogramaItemId },
    destino: (d) => `/mi-camino/vida-de-servicio/semanas/${d.semana}`,
    // D162: se libera una sola vez, se cargue antes o después de la fecha.
    clave: (d) => `vida_servicio.contenido_liberado:${d.cronogramaItemId}`,
  },
  'vida_servicio.lider_asignado': {
    spec: '008', destinatario: 'persona', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'grupo', id: (d) => d.grupoId }, destino: (d) => `/mis-grupos/${d.grupoId}`, clave: sinClave,
  },
  'vida_servicio.baja_propuesta': {
    spec: '008', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'grupo', id: (d) => d.grupoId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'vida_servicio.baja_rechazada': {
    spec: '008', destinatario: 'lideres_grupo', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'grupo', id: (d) => d.grupoId }, destino: (d) => `/mis-grupos/${d.grupoId}`, clave: sinClave,
  },
  'vida_servicio.inscripcion_dada_de_baja': {
    spec: '008', destinatario: 'persona', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'inscripcion', id: (d) => d.inscripcionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'vida_servicio.finalizacion_propuesta': {
    spec: '008', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'grupo', id: (d) => d.grupoId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'vida_servicio.finalizacion_rechazada': {
    spec: '008', destinatario: 'lideres_grupo', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'grupo', id: (d) => d.grupoId }, destino: (d) => `/mis-grupos/${d.grupoId}`, clave: sinClave,
  },
  'vida_servicio.completada': {
    spec: '008', destinatario: 'persona', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'inscripcion', id: (d) => d.inscripcionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  // 009
  'ministerio.postulacion_creada': {
    spec: '009', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'postulacion', id: (d) => d.postulacionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'ministerio.postulacion_retirada': {
    spec: '009', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'postulacion', id: (d) => d.postulacionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'ministerio.postulacion_aprobada': {
    spec: '009', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'postulacion', id: (d) => d.postulacionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'ministerio.postulacion_rechazada': {
    spec: '009', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'postulacion', id: (d) => d.postulacionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'ministerio.miembro_dado_de_baja': {
    spec: '009', destinatario: 'persona', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'postulacion', id: (d) => d.postulacionId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  // 010 — ningún texto fuera de la app nombra el bautismo (docs/13 §5).
  'bautismo.solicitud_aceptada': {
    spec: '010', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_bautismo', id: (d) => d.solicitudId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'bautismo.solicitud_rechazada': {
    spec: '010', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_bautismo', id: (d) => d.solicitudId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'bautismo.fecha_asignada': {
    spec: '010', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_bautismo', id: (d) => d.solicitudId }, destino: () => MI_CAMINO,
    clave: (d) => `bautismo.fecha_asignada:${d.solicitudId}:${d.eventoId}`,
  },
  'bautismo.fecha_quitada': {
    spec: '010', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'normal',
    entidad: { tipo: 'solicitud_bautismo', id: (d) => d.solicitudId }, destino: () => MI_CAMINO, clave: sinClave,
  },
  'bautismo.evento_cancelado': {
    spec: '010', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_bautismo', id: (d) => d.solicitudId }, destino: () => MI_CAMINO,
    clave: (d) => `bautismo.evento_cancelado:${d.solicitudId}:${d.eventoId}`,
  },
  'bautismo.realizado': {
    spec: '010', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'normal',
    entidad: { tipo: 'solicitud_bautismo', id: (d) => d.solicitudId }, destino: () => MI_CAMINO,
    clave: (d) => `bautismo.realizado:${d.solicitudId}`,
  },
  // 011
  'evento.inscripcion_pendiente': {
    spec: '011', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'inscripcion_evento', id: (d) => d.inscripcionId }, destino: () => MIS_EVENTOS, clave: sinClave,
  },
  'evento.inscripcion_creada_por_admin': {
    spec: '011', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'normal',
    entidad: { tipo: 'inscripcion_evento', id: (d) => d.inscripcionId }, destino: () => MIS_EVENTOS, clave: sinClave,
  },
  'evento.inscripcion_confirmada': {
    spec: '011', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'inscripcion_evento', id: (d) => d.inscripcionId }, destino: () => MIS_EVENTOS, clave: sinClave,
  },
  'evento.inscripcion_rechazada': {
    spec: '011', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'inscripcion_evento', id: (d) => d.inscripcionId }, destino: () => MIS_EVENTOS, clave: sinClave,
  },
  'evento.inscripcion_cancelada_por_admin': {
    spec: '011', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'inscripcion_evento', id: (d) => d.inscripcionId }, destino: () => MIS_EVENTOS, clave: sinClave,
  },
  'evento.lista_espera_promovida': {
    spec: '011', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'inscripcion_evento', id: (d) => d.inscripcionId }, destino: () => MIS_EVENTOS, clave: sinClave,
  },
  'evento.pago_registrado': {
    spec: '011', destinatario: 'admin', disparador: null, prioridad: 'normal',
    entidad: { tipo: 'pago', id: (d) => d.pagoId }, destino: () => MIS_EVENTOS, clave: sinClave,
  },
  'evento.pago_verificado': {
    spec: '011', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'pago', id: (d) => d.pagoId }, destino: () => MIS_EVENTOS, clave: sinClave,
  },
  'evento.pago_rechazado': {
    spec: '011', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'pago', id: (d) => d.pagoId }, destino: () => MIS_EVENTOS, clave: sinClave,
  },
  'evento.modificado': {
    spec: '011', destinatario: 'evento_inscriptos', disparador: 'proceso_actualizado', prioridad: 'normal',
    entidad: { tipo: 'evento', id: (d) => d.eventoId }, destino: (d) => `/eventos/${d.slug}`, clave: sinClave,
  },
  'evento.cancelado': {
    // D193: cancelar avisa como importante (también por mail).
    spec: '011', destinatario: 'evento_inscriptos', disparador: 'proceso_actualizado', prioridad: 'importante',
    entidad: { tipo: 'evento', id: (d) => d.eventoId }, destino: (d) => `/eventos/${d.slug}`,
    clave: (d) => `evento.cancelado:${d.eventoId}`,
  },
  'evento.proximo': {
    // D202: el día anterior, a la mañana (tarea programada de la 012).
    spec: '011', destinatario: 'evento_confirmados', disparador: 'evento_proximo', prioridad: 'normal',
    entidad: { tipo: 'evento', id: (d) => d.eventoId }, destino: () => MIS_EVENTOS,
    clave: (d) => `evento.proximo:${d.eventoId}`,
  },
  'evento.recordatorio_inscripcion': {
    // D202: solo a quienes no tienen inscripción vigente.
    spec: '011', destinatario: 'todas_sin_inscripcion', disparador: 'recordatorio_inscripcion', prioridad: 'normal',
    entidad: { tipo: 'evento', id: (d) => d.eventoId }, destino: (d) => `/eventos/${d.slug}`,
    clave: (d) => `evento.recordatorio_inscripcion:${d.eventoId}`,
  },
  // 014 — D227: sin el nombre de la persona (FR-013 de la 012): el líder lo ve al abrir el pedido.
  'grupo_extension.solicitud_nueva': {
    spec: '014', destinatario: 'persona', disparador: 'proceso_actualizado', prioridad: 'importante',
    entidad: { tipo: 'solicitud_grupo_extension', id: (d) => d.solicitudId }, destino: () => LIDER_GRUPO_EXTENSION, clave: sinClave,
  },
  'grupo_extension.solicitud_aceptada': {
    spec: '014', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_grupo_extension', id: (d) => d.solicitudId }, destino: () => MI_GRUPO_EXTENSION, clave: sinClave,
  },
  'grupo_extension.solicitud_rechazada': {
    spec: '014', destinatario: 'persona', disparador: 'solicitud_actualizada', prioridad: 'importante',
    entidad: { tipo: 'solicitud_grupo_extension', id: (d) => d.solicitudId }, destino: () => MI_GRUPO_EXTENSION, clave: sinClave,
  },
  'grupo_extension.agregada_por_admin': {
    spec: '014', destinatario: 'persona', disparador: 'proceso_actualizado', prioridad: 'importante',
    entidad: { tipo: 'solicitud_grupo_extension', id: (d) => d.solicitudId }, destino: () => MI_GRUPO_EXTENSION, clave: sinClave,
  },
};

export const NOMBRES_EVENTOS_AVISO = Object.keys(CATALOGO_AVISOS) as NombreEventoAviso[];

/** La entrada del catálogo de un evento, sin perder el tipo de sus datos. */
export function entradaDe<N extends NombreEventoAviso>(nombre: N): EntradaCatalogo<N> {
  return CATALOGO_AVISOS[nombre] as EntradaCatalogo<N>;
}

/** `alcance` de la Notificación según el destinatario (contracts/catalogo-eventos.md). */
export type AlcanceAviso = 'todos' | 'grupo' | 'ministerio' | 'evento' | 'persona';

export function alcanceDe(a: DestinatarioAviso): { alcance: AlcanceAviso; alcanceId: string | null } {
  switch (a.tipo) {
    case 'persona':
    case 'discipulador':
      return { alcance: 'persona', alcanceId: a.personaId };
    case 'grupo':
    case 'lideres_grupo':
      return { alcance: 'grupo', alcanceId: a.grupoId };
    case 'ministerio':
      return { alcance: 'ministerio', alcanceId: a.ministerioId };
    case 'evento_confirmados':
    case 'evento_inscriptos':
      return { alcance: 'evento', alcanceId: a.eventoId };
    case 'todas':
    case 'todas_sin_inscripcion':
    case 'admin':
      return { alcance: 'todos', alcanceId: null };
  }
}

// --- Constantes (data-model de la 012) ---
export const TITULO_AVISO_MAX = 80;
export const MENSAJE_AVISO_MAX = 1000;
export const AVISOS_POR_PAGINA = 20;
export const MAX_INTENTOS_EMAIL = 5;
/** D204: esperas entre reintentos (1 min, 10 min, 1 h, 6 h). */
export const ESPERAS_REINTENTO_EMAIL_MS: readonly number[] = [60_000, 600_000, 3_600_000, 21_600_000];
export const DIAS_MAILS_FALLIDOS_VISIBLES = 30;
/** D202 */
export const DIAS_ANTES_EVENTO_PROXIMO = 1;

/** Fila de `GET /avisos` (contracts/avisos-api.md). */
export interface AvisoResumen {
  id: string;
  tipo: 'manual' | 'automatica';
  evento: NombreEventoAviso | null;
  params: Record<string, string | number | boolean | null> | null;
  titulo: string | null;
  extracto: string | null;
  importante: boolean;
  leido: boolean;
  fecha: string;
  destino: string;
}

export type AvisoDetalle = AvisoResumen & { mensaje: string | null };

// --- Avisos manuales del backoffice (spec 012, lote D; contracts/notificaciones-api.md) ---

export const NOTIFICACIONES_POR_PAGINA = 20;

export type AlcanceManual = 'todos' | 'grupo' | 'ministerio';
export const ALCANCES_MANUALES: readonly AlcanceManual[] = ['todos', 'grupo', 'ministerio'];

export interface NotificacionManualResumen {
  id: string;
  titulo: string;
  alcance: AlcanceManual;
  /** Nombre del Grupo (con su Curso) o del Ministerio, para la tabla. */
  alcanceNombre: string | null;
  importante: boolean;
  autor: { id: string; nombre: string; apellido: string };
  fecha: string;
  /** Entregas `app`. */
  destinatarios: number;
  /** Entregas `app` leídas. */
  leidas: number;
}

export interface NotificacionManualDetalle extends NotificacionManualResumen {
  mensaje: string;
  emails: { enviados: number; pendientes: number; fallidos: number; personasFallidas: { id: string; nombre: string; apellido: string }[] } | null;
}

export interface NuevaNotificacionManual {
  titulo: string;
  mensaje: string;
  alcance: AlcanceManual;
  alcanceId?: string;
  importante: boolean;
}

export interface ConteoDestinatarios {
  personas: number;
  conEmail: number;
}

export interface OpcionesAlcance {
  grupos: { id: string; nombre: string; curso: string }[];
  ministerios: { id: string; nombre: string }[];
}

export type MotivoMailFallido = 'SIN_EMAIL' | 'PERSONA_INACTIVA' | 'ENVIO_FALLIDO';

export interface MailFallido {
  entregaId: string;
  persona: { id: string; nombre: string; apellido: string };
  evento: NombreEventoAviso;
  fecha: string;
  motivo: MotivoMailFallido;
}

/**
 * FR-027, FR-034 — las reglas de campo de un aviso manual, con el texto ya
 * recortado. Pura: la usan la API (la barrera real) y el diálogo del
 * backoffice (para marcar los errores sin ir al servidor). Todos a la vez (H-50).
 */
export function validarNuevaNotificacion(n: Partial<Record<keyof NuevaNotificacionManual, unknown>>): { campo: string; code: string }[] {
  const errores: { campo: string; code: string }[] = [];
  const titulo = typeof n.titulo === 'string' ? n.titulo.trim() : '';
  const mensaje = typeof n.mensaje === 'string' ? n.mensaje.trim() : '';
  if (!titulo) errores.push({ campo: 'titulo', code: 'TITULO_REQUERIDO' });
  else if (titulo.length > TITULO_AVISO_MAX) errores.push({ campo: 'titulo', code: 'TITULO_DEMASIADO_LARGO' });
  if (!mensaje) errores.push({ campo: 'mensaje', code: 'MENSAJE_REQUERIDO' });
  else if (mensaje.length > MENSAJE_AVISO_MAX) errores.push({ campo: 'mensaje', code: 'MENSAJE_DEMASIADO_LARGO' });
  if (typeof n.alcance !== 'string' || !ALCANCES_MANUALES.includes(n.alcance as AlcanceManual)) {
    errores.push({ campo: 'alcance', code: 'ALCANCE_REQUERIDO' });
  } else if (n.alcance !== 'todos' && (typeof n.alcanceId !== 'string' || !n.alcanceId.trim())) {
    errores.push({ campo: 'alcanceId', code: 'ALCANCE_ID_REQUERIDO' });
  }
  return errores;
}
