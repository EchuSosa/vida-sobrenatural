import type { EstadoSolicitud } from '@vida-sobrenatural/shared-types';

// Sin `'use client'` a propósito (H-113): lo importan page.tsx (servidor) y el cliente.
export const TAMANIO_PAGINA = 20;

/** Los filtros de estado de la bandeja (FR-025). `abiertas` es el default: lo que hay que mirar. */
export const FILTROS_ESTADO = ['abiertas', 'pendiente', 'propuesta', 'aprobada', 'rechazada', 'retirada', 'todas'] as const;
export type FiltroEstado = (typeof FILTROS_ESTADO)[number];

export function estadosDelFiltro(filtro: FiltroEstado): EstadoSolicitud[] {
  if (filtro === 'abiertas') return ['pendiente', 'propuesta'];
  if (filtro === 'todas') return ['pendiente', 'propuesta', 'aprobada', 'rechazada', 'retirada'];
  return [filtro];
}

export const ORDENES = ['fecha', 'persona', 'espera'] as const;
export type OrdenBandeja = (typeof ORDENES)[number];

/** Días enteros desde un instante, para "propuesta a X, hace N días" (FR-038). */
export function diasDesde(iso: string, ahora: number = Date.now()): number {
  return Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 86_400_000));
}
