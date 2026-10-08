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
