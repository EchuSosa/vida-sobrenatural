/**
 * spec 008 — Vida de Servicio. Lote 0 global: constantes y valores que ya usa
 * el esquema. Los tipos de los contratos (`EstadoMiVidaDeServicio`,
 * `MiGrupoDetalle`, …) y las reglas puras (`cumplePrerrequisito`,
 * `cronogramaValido`, `liberada`, `semanasVisibles`, `materialCargado`,
 * `alertaFaltas`, `sePuedeProponerFinalizacion`) los agrega la sesión de la
 * 008 EN ESTE ARCHIVO (tarea T002 de su tasks.md), sin tocar index.ts.
 */

/** D158 */
export type TipoBaja = 'dada_de_baja' | 'abandono';

/** D164: se destaca desde 2 faltas. */
export const FALTAS_PARA_ALERTA = 2;
export const SEMANAS_MIN = 1;
export const SEMANAS_MAX = 52;
export const NOMBRE_EDICION_MAX = 80;
export const TITULO_CONTENIDO_MAX = 120;
export const TEXTO_CONTENIDO_MAX = 10_000;
export const ARCHIVO_MAX_BYTES = 15 * 1024 * 1024;
export const ARCHIVOS_POR_SEMANA_MAX = 5;
export const ENLACES_POR_SEMANA_MAX = 10;
export const MIME_CONTENIDO_ADMITIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
/** Misma frontera que Vida Nueva, constante propia (H-128). */
export const EDAD_MINIMA_PEDIR_VIDA_DE_SERVICIO_SOLO = 12;
