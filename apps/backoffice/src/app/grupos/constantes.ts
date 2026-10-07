// Sin `'use client'` a propósito (H-113): lo importan page.tsx (servidor) y el cliente.
export const TAMANIO_PAGINA = 20;
export const FILTROS_PENDIENTE = ['finalizacion', 'baja', 'reasignacion'] as const;
export type FiltroPendiente = (typeof FILTROS_PENDIENTE)[number];
