import type { MiInscripcionEvento } from '@vida-sobrenatural/shared-types';

/**
 * BUG-15 (QA ronda 2): el "qué sigue" de una inscripción cancelada depende de quién la canceló
 * (`motivoCancelacion`). Antes siempre decía "Cancelaste tu inscripción", aunque la hubiera cancelado
 * el equipo o un pago rechazado. Lo usan la página del Evento y Mis eventos (una sola regla).
 */
export type ClaveQueSigue =
  | 'queSigue.confirmadaConCosto'
  | 'queSigue.confirmada'
  | 'queSigue.pendiente'
  | 'queSigue.lista_espera'
  | 'queSigue.rechazada'
  | 'queSigue.cancelada'
  | 'queSigue.canceladaPorEquipo'
  | 'queSigue.canceladaPagoRechazado'
  | 'queSigue.canceladaPagoRechazadoSinMotivo';

export function claveQueSigue(i: Pick<MiInscripcionEvento, 'estado' | 'estadoPago' | 'motivoCancelacion' | 'ultimoRechazoPago'>): ClaveQueSigue {
  if (i.estado === 'confirmada' && i.estadoPago === 'sin_pago') return 'queSigue.confirmadaConCosto';
  if (i.estado === 'cancelada') {
    if (i.motivoCancelacion === 'pago_rechazado') return i.ultimoRechazoPago ? 'queSigue.canceladaPagoRechazado' : 'queSigue.canceladaPagoRechazadoSinMotivo';
    if (i.motivoCancelacion === 'admin') return 'queSigue.canceladaPorEquipo';
  }
  return `queSigue.${i.estado}`;
}

/** Si el motivo del pago rechazado ya va en el "qué sigue", no se repite en otra línea. */
export function motivoYaIncluido(clave: ClaveQueSigue): boolean {
  return clave === 'queSigue.canceladaPagoRechazado';
}
