import type { PostulacionHistorial } from '@vida-sobrenatural/shared-types';

/** spec 009: la clave de `postulaciones.estado` de una Postulación, con el motivo de inactivación si lo tiene. */
export function claveEstado(h: Pick<PostulacionHistorial, 'estado' | 'motivoInactivacion'>): string {
  return h.estado === 'inactiva' ? `inactiva_${h.motivoInactivacion ?? 'baja'}` : h.estado;
}
