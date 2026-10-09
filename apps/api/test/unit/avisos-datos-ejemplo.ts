import type { DatosDe, NombreEventoAviso } from '@vida-sobrenatural/shared-types';

/**
 * spec 012 (T004, T015, T038) — `datos` de ejemplo para cada evento del
 * catálogo. El tipo obliga a que estén todos: un evento nuevo sin su ejemplo
 * no compila, y así los tests del catálogo y de los textos lo cubren solos.
 */
export const DATOS_EJEMPLO: { [N in NombreEventoAviso]: DatosDe<N> } = {
  'discipulado.propuesta_nueva': { propuestaId: 'pro-1', solicitudId: 'sol-1' },
  'discipulado.propuesta_aceptada': { solicitudId: 'sol-1', grupoId: 'gru-1', discipuladorId: 'dis-1' },
  'discipulado.solicitud_rechazada': { solicitudId: 'sol-1' },
  'discipulado.finalizacion_confirmada': { grupoId: 'gru-1', inscripcionId: 'ins-1' },
  'discipulado.baja_confirmada': { grupoId: 'gru-1', inscripcionId: 'ins-1' },
  'discipulado.propuesta_declinada': { propuestaId: 'pro-1' },
  'discipulado.propuesta_retirada': { propuestaId: 'pro-1', retiradaPor: 'admin' },
  'discipulado.reasignacion_retirada': { propuestaId: 'pro-1', grupoId: 'gru-1' },
  'discipulado.propuesta_nueva_retirada': { propuestaId: 'pro-1', solicitudId: 'sol-1' },
  'discipulado.finalizacion_propuesta': { grupoId: 'gru-1' },
  'discipulado.baja_propuesta': { grupoId: 'gru-1', inscripcionId: 'ins-1' },
  'persona.cuenta_activada': { personaId: 'per-1' },
  'historial.declaracion_creada': { declaracionId: 'dec-1', etapa: 'vida_nueva' },
  'historial.declaracion_confirmada': { declaracionId: 'dec-1', etapa: 'vida_nueva' },
  'historial.declaracion_rechazada': { declaracionId: 'dec-1', etapa: 'vida_nueva' },
  'historial.completitud_registrada': { completitudId: 'com-1', etapa: 'vida_nueva' },
  'vida_servicio.solicitud_creada': { solicitudId: 'sol-1' },
  'vida_servicio.inscripcion_aprobada': { solicitudId: 'sol-1', grupoId: 'gru-1', inscripcionId: 'ins-1' },
  'vida_servicio.inscripcion_rechazada': { solicitudId: 'sol-1' },
  'vida_servicio.contenido_liberado': { grupoId: 'gru-1', cronogramaItemId: 'cro-1', semana: 3 },
  'vida_servicio.lider_asignado': { grupoId: 'gru-1' },
  'vida_servicio.baja_propuesta': { grupoId: 'gru-1', inscripcionId: 'ins-1' },
  'vida_servicio.baja_rechazada': { grupoId: 'gru-1', inscripcionId: 'ins-1' },
  'vida_servicio.inscripcion_dada_de_baja': { grupoId: 'gru-1', inscripcionId: 'ins-1' },
  'vida_servicio.finalizacion_propuesta': { grupoId: 'gru-1' },
  'vida_servicio.finalizacion_rechazada': { grupoId: 'gru-1' },
  'vida_servicio.completada': { grupoId: 'gru-1', inscripcionId: 'ins-1' },
  'ministerio.postulacion_creada': { postulacionId: 'pos-1', ministerioId: 'min-1', enNombreDe: false },
  'ministerio.postulacion_retirada': { postulacionId: 'pos-1' },
  'ministerio.postulacion_aprobada': { postulacionId: 'pos-1', ministerioId: 'min-1', ministerio: 'Alabanza', celulaId: null, reemplazaA: null },
  'ministerio.postulacion_rechazada': { postulacionId: 'pos-1' },
  'ministerio.miembro_dado_de_baja': { postulacionId: 'pos-1', ministerioId: 'min-1' },
  'bautismo.solicitud_aceptada': { solicitudId: 'sol-1' },
  'bautismo.solicitud_rechazada': { solicitudId: 'sol-1' },
  'bautismo.fecha_asignada': { solicitudId: 'sol-1', eventoId: 'eve-1', fecha: '2026-11-15' },
  'bautismo.fecha_quitada': { solicitudId: 'sol-1', eventoId: 'eve-1' },
  'bautismo.evento_cancelado': { solicitudId: 'sol-1', eventoId: 'eve-1' },
  'bautismo.realizado': { solicitudId: 'sol-1', eventoId: 'eve-1' },
  'evento.inscripcion_pendiente': { eventoId: 'eve-1', inscripcionId: 'ins-1' },
  'evento.inscripcion_creada_por_admin': { inscripcionId: 'ins-1', eventoId: 'eve-1', evento: 'Retiro', estado: 'confirmada' },
  'evento.inscripcion_confirmada': { inscripcionId: 'ins-1', eventoId: 'eve-1', evento: 'Retiro' },
  'evento.inscripcion_rechazada': { inscripcionId: 'ins-1', eventoId: 'eve-1', evento: 'Retiro' },
  'evento.inscripcion_cancelada_por_admin': { inscripcionId: 'ins-1', eventoId: 'eve-1', evento: 'Retiro' },
  'evento.lista_espera_promovida': { inscripcionId: 'ins-1', eventoId: 'eve-1', evento: 'Retiro', estadoNuevo: 'confirmada' },
  'evento.pago_registrado': { pagoId: 'pag-1', inscripcionId: 'ins-1', eventoId: 'eve-1' },
  'evento.pago_verificado': { pagoId: 'pag-1', inscripcionId: 'ins-1', eventoId: 'eve-1', evento: 'Retiro' },
  'evento.pago_rechazado': { pagoId: 'pag-1', inscripcionId: 'ins-1', eventoId: 'eve-1', evento: 'Retiro' },
  'evento.modificado': { eventoId: 'eve-1', evento: 'Retiro', slug: 'retiro' },
  'evento.cancelado': { eventoId: 'eve-1', evento: 'Retiro', slug: 'retiro' },
  'evento.proximo': { eventoId: 'eve-1', evento: 'Retiro' },
  'evento.recordatorio_inscripcion': { eventoId: 'eve-1', evento: 'Retiro', slug: 'retiro', dias: 3 },
};

/** Los importantes según `docs/16` §1 — lista fija a propósito (T004 e): cambiarla es una decisión. */
export const IMPORTANTES_DOCS_16: readonly NombreEventoAviso[] = [
  // Resolución de una solicitud (`solicitud_actualizada`)
  'discipulado.propuesta_aceptada',
  'discipulado.solicitud_rechazada',
  'historial.declaracion_confirmada',
  'historial.declaracion_rechazada',
  'vida_servicio.inscripcion_aprobada',
  'vida_servicio.inscripcion_rechazada',
  'bautismo.solicitud_aceptada',
  'bautismo.solicitud_rechazada',
  'bautismo.fecha_asignada', // D147
  'bautismo.evento_cancelado', // D147 + D193
  'ministerio.postulacion_aprobada',
  'ministerio.postulacion_rechazada',
  'evento.inscripcion_confirmada',
  'evento.inscripcion_rechazada',
  'evento.inscripcion_cancelada_por_admin',
  // Promoción desde lista de espera
  'evento.lista_espera_promovida',
  // Pago verificado o rechazado
  'evento.pago_verificado',
  'evento.pago_rechazado',
  // Activación de una cuenta creada por el Admin
  'persona.cuenta_activada',
  // Propuesta de discipulado nuevo para el Discipulador (D201)
  'discipulado.propuesta_nueva',
  // Cancelación de un Evento (D193)
  'evento.cancelado',
];
