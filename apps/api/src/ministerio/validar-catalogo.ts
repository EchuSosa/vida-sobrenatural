import {
  CELULA_DESCRIPCION_MAX,
  CELULA_NOMBRE_MAX,
  MINISTERIO_DESCRIPCION_MAX,
  MINISTERIO_LINEA_PUBLICA_MAX,
  MINISTERIO_NOMBRE_MAX,
} from '@vida-sobrenatural/shared-types';
import type { AppExceptionErrorField } from '../common/errors/app-exception.js';

/**
 * spec 009, FR-026/FR-027 (+ docs/22): los campos del catálogo, puros. Los
 * errores se juntan todos (H-50); el duplicado de nombre lo agrega el
 * servicio, que necesita la base. `parcial` = PATCH (solo lo que viene).
 */
export interface CamposMinisterio {
  nombre?: string;
  descripcion?: string;
  lineaPublica?: string | null;
}

export function erroresMinisterio(
  c: CamposMinisterio,
  parcial: boolean,
): AppExceptionErrorField[] {
  const errores: AppExceptionErrorField[] = [];
  if (!parcial || c.nombre !== undefined) {
    const nombre = c.nombre?.trim() ?? '';
    if (nombre === '')
      errores.push({ campo: 'nombre', code: 'NOMBRE_REQUERIDO' });
    else if (nombre.length > MINISTERIO_NOMBRE_MAX)
      errores.push({ campo: 'nombre', code: 'NOMBRE_DEMASIADO_LARGO' });
  }
  if (!parcial || c.descripcion !== undefined) {
    const descripcion = c.descripcion?.trim() ?? '';
    if (descripcion === '')
      errores.push({ campo: 'descripcion', code: 'DESCRIPCION_REQUERIDA' });
    else if (descripcion.length > MINISTERIO_DESCRIPCION_MAX)
      errores.push({
        campo: 'descripcion',
        code: 'DESCRIPCION_DEMASIADO_LARGA',
      });
  }
  if ((c.lineaPublica?.trim().length ?? 0) > MINISTERIO_LINEA_PUBLICA_MAX) {
    errores.push({
      campo: 'lineaPublica',
      code: 'LINEA_PUBLICA_DEMASIADO_LARGA',
    });
  }
  return errores;
}

export interface CamposCelula {
  nombre?: string;
  descripcion?: string | null;
}

export function erroresCelula(
  c: CamposCelula,
  parcial: boolean,
): AppExceptionErrorField[] {
  const errores: AppExceptionErrorField[] = [];
  if (!parcial || c.nombre !== undefined) {
    const nombre = c.nombre?.trim() ?? '';
    if (nombre === '')
      errores.push({ campo: 'nombre', code: 'NOMBRE_REQUERIDO' });
    else if (nombre.length > CELULA_NOMBRE_MAX)
      errores.push({ campo: 'nombre', code: 'NOMBRE_DEMASIADO_LARGO' });
  }
  if ((c.descripcion?.trim().length ?? 0) > CELULA_DESCRIPCION_MAX) {
    errores.push({ campo: 'descripcion', code: 'DESCRIPCION_DEMASIADO_LARGA' });
  }
  return errores;
}

/** Vacío o solo espacios = null. */
export function opcional(
  texto: string | null | undefined,
): string | null | undefined {
  if (texto === undefined) return undefined;
  const limpio = texto?.trim() ?? '';
  return limpio === '' ? null : limpio;
}
