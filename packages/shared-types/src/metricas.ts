import type { RangoCongregacion } from './persona.js';

/** spec 013 — `GET /inicio/metricas` (D210, D214). Lo completa la sesión de la 013. */
export interface Metricas {
  personasActivas: number;
  /** Los cuatro rangos de ORDEN_RANGO_CONGREGACION, calculados desde `congregaDesde`. */
  porTiempoCongregacion: { valor: RangoCongregacion; cantidad: number }[];
  porSede: { sedeId: string; nombre: string; activa: boolean; cantidad: number }[];
}
