import type { SolicitudBandeja, TipoSolicitud } from '@vida-sobrenatural/shared-types';

/**
 * Bandeja unificada (D178, D207) — `specs/013-backoffice-admin/contracts/bandeja-api.md`.
 *
 * La vista `solicitudes_bandeja` ordena y pagina los siete tipos juntos; cada
 * spec de tipo (004, 006, 008–011) hidrata SUS filas con una
 * `FuenteSolicitudes` y la registra en `RegistroFuentesSolicitudes` desde su
 * propio módulo (en `onModuleInit`). Así ninguna sesión edita un archivo
 * compartido para conectar su tipo: el paso 3 del contrato es un archivo
 * nuevo en la carpeta de la spec.
 */
export interface FuenteSolicitudes {
  readonly tipo: TipoSolicitud;
  /** Devuelve una fila por id, EN EL ORDEN de `ids` (el que decidió la vista). */
  resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]>;
}
