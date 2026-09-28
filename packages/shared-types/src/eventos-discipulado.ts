/**
 * specs/004-vida-nueva-discipulado — la costura para el sistema de
 * notificaciones futuro (FR-023, FR-048, `contracts/eventos.md`). El envío
 * está fuera de alcance; cada transición emite uno de estos eventos y hoy una
 * sola función de la API lo loguea. Solo ids en `datos`: el texto del aviso se
 * arma cuando se envíe, en el idioma de cada destinatario (D84). Nunca viaja
 * un nombre, un teléfono ni un motivo.
 */

export type Destinatario =
  | { tipo: 'persona'; personaId: string }
  | { tipo: 'discipulador'; personaId: string }
  | { tipo: 'admin' };

export type EventoDiscipulado =
  | { nombre: 'propuesta_nueva'; a: Destinatario; datos: { propuestaId: string; solicitudId?: string; grupoId?: string } }
  | { nombre: 'propuesta_aceptada'; a: Destinatario; datos: { solicitudId: string; grupoId: string; discipuladorId: string } }
  | { nombre: 'propuesta_declinada'; a: Destinatario; datos: { propuestaId: string; solicitudId?: string; grupoId?: string } }
  | { nombre: 'propuesta_retirada'; a: Destinatario; datos: { propuestaId: string; retiradaPor: 'admin' | 'persona' } }
  | { nombre: 'solicitud_rechazada'; a: Destinatario; datos: { solicitudId: string } }
  | { nombre: 'finalizacion_propuesta'; a: Destinatario; datos: { grupoId: string } }
  | { nombre: 'finalizacion_confirmada'; a: Destinatario; datos: { grupoId: string; inscripcionId: string } }
  | { nombre: 'baja_propuesta'; a: Destinatario; datos: { grupoId: string; inscripcionId: string } }
  | { nombre: 'baja_confirmada'; a: Destinatario; datos: { grupoId: string; inscripcionId: string } };

export type NombreEventoDiscipulado = EventoDiscipulado['nombre'];
