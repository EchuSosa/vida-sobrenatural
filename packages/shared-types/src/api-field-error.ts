import { ApiError } from './api-client.js';

export interface ErrorDeCampo {
  campo: string;
  code: string;
}

/**
 * Agrupa `ApiError.errors` (`{campo, code}[]`, ver `error-code.ts`) por
 * campo — H-50 (revisión manual ronda 4). Si class-validator devolvió más
 * de un error para el mismo campo, se queda con el primero: alcanza para
 * mostrar un mensaje por campo, que es lo que pide `docs/15-guia-ux-ui.md`.
 * Devuelve `null` si el error no trae `errors` (no es un 400 de validación
 * por campo, sino un error de negocio general).
 */
export function erroresPorCampo(error: unknown): ErrorDeCampo[] | null {
  if (!(error instanceof ApiError) || !error.errors || error.errors.length === 0) {
    return null;
  }
  const vistos = new Set<string>();
  const resultado: ErrorDeCampo[] = [];
  for (const { campo, code } of error.errors) {
    if (vistos.has(campo)) continue;
    vistos.add(campo);
    resultado.push({ campo, code });
  }
  return resultado.length > 0 ? resultado : null;
}

/**
 * Copia "cómo corregir" por código de campo — docs/15-guia-ux-ui.md: "decir
 * cómo corregir ('Ingresá un teléfono con código de área, por ejemplo 221
 * 555 1234'), no solo 'inválido'". Un solo diccionario para `apps/web` y
 * `apps/backoffice` (Principio XI): el error de un teléfono mal formado se
 * corrige igual en cualquiera de las dos. Los códigos derivados de
 * `${CAMPO}_INVALIDO` (validation-exception-factory.ts) que no tienen copia
 * específica acá caen a un mensaje genérico que sigue nombrando el campo,
 * nunca solo "inválido".
 */
const COPIA_POR_CODIGO: Record<string, string> = {
  TELEFONO_INVALIDO: 'Ingresá un teléfono con código de área, por ejemplo 221 555 1234.',
  CONTACTOTELEFONO_INVALIDO: 'Ingresá un teléfono con código de área, por ejemplo 221 555 1234.',
  TUTORTELEFONO_INVALIDO: 'Ingresá un teléfono con código de área, por ejemplo 221 555 1234.',
  HORARIOS_INVALIDO: 'Usá un formato como "Domingos 10:30 hs" o "Domingos 10 hs y Martes 19 hs".',
  CONTACTOEMAIL_INVALIDO: 'Ingresá un email válido, por ejemplo nombre@ejemplo.com.',
  FECHANACIMIENTO_INVALIDO: 'Ingresá una fecha válida.',
  // specs/003-contenido-institucional, FR-011: no es un código derivado de
  // `${CAMPO}_INVALIDO` por class-validator — lo lanza el service a mano
  // (AppException), pero se muestra igual bajo el campo youtubeUrl.
  YOUTUBE_URL_INVALIDA: 'Pegá la URL completa de un video de YouTube (ej. https://www.youtube.com/watch?v=...).',
};

export function mensajeDeCampo(code: string, etiquetaCampo: string): string {
  return COPIA_POR_CODIGO[code] ?? `"${etiquetaCampo}" no es válido — revisalo e intentá de nuevo.`;
}
