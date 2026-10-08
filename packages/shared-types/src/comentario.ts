/**
 * spec 013 — "Contanos qué te parece" (D102, D211). Lote 0 global: valores y
 * límites; lote 5: los DTOs de `contracts/comentarios-api.md` y
 * `resumirNavegador()` (T017).
 */
import type { PersonaBreve } from './discipulado.js';
export type TipoComentario = 'problema' | 'sugerencia';
export type AppOrigen = 'web' | 'backoffice';

export const COMENTARIO_TEXTO_MAX = 2000;
export const COMENTARIOS_POR_HORA_SIN_SESION = 5;
export const COMENTARIOS_POR_HORA_CON_SESION = 20;

/** Largo del extracto en el listado. */
export const COMENTARIO_EXTRACTO_LARGO = 140;
/** Topes de los datos técnicos (`contracts/comentarios-api.md`). */
export const COMENTARIO_NAVEGADOR_MAX = 80;
export const COMENTARIO_REQUEST_ID_MAX = 64;
export const COMENTARIO_PAGINA_MAX = 200;

/** Body de `POST /comentarios`. */
export interface ComentarioNuevo {
  tipo: TipoComentario;
  texto: string;
  aceptaContacto: boolean;
  /** Solo sin sesión: con sesión se usan los del perfil. */
  contactoEmail?: string;
  contactoTelefono?: string;
  /** Path de la pantalla desde donde se abrió, sin query string. */
  paginaOrigen: string;
  navegador?: string;
  ultimoRequestId?: string;
  app: AppOrigen;
}

export interface ComentarioResumen {
  id: string;
  tipo: TipoComentario;
  extracto: string;
  createdAt: string;
  paginaOrigen: string;
  app: AppOrigen;
  persona: (PersonaBreve & { activo: boolean }) | null;
  aceptaContacto: boolean;
  revisado: { en: string; por: PersonaBreve } | null;
}

export interface ComentarioDetalle extends ComentarioResumen {
  texto: string;
  navegador: string | null;
  ultimoRequestId: string | null;
  /** Solo si acepta que la contacten: los del comentario (sin sesión) o los de su perfil (con sesión). */
  contacto: { email: string | null; telefono: string | null } | null;
}

export type FiltroRevisado = 'no' | 'si' | 'todos';

/**
 * spec 013 (research #10, FR-042): "familia + versión mayor · sistema" (ej.
 * "Chrome 141 · Android"), nunca el user agent completo, que es casi una
 * huella del dispositivo. Lo que no se reconoce queda como "Otro".
 */
export function resumirNavegador(userAgent: string | null | undefined): string {
  const ua = (userAgent ?? '').trim();
  if (!ua) return 'Otro';
  const sistema = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /CrOS/i.test(ua)
            ? 'ChromeOS'
            : /Linux/i.test(ua)
              ? 'Linux'
              : null;
  // El orden importa: Edge y Opera también dicen "Chrome"; Chrome también dice "Safari".
  const familias: Array<[string, RegExp]> = [
    ['Edge', /Edg(?:e|A|iOS)?\/(\d+)/],
    ['Opera', /OPR\/(\d+)/],
    ['Samsung Internet', /SamsungBrowser\/(\d+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/],
    ['Chrome', /(?:Chrome|CriOS)\/(\d+)/],
    ['Safari', /Version\/(\d+)[\d.]*.*Safari\//],
  ];
  for (const [nombre, patron] of familias) {
    const m = ua.match(patron);
    if (m) return sistema ? `${nombre} ${m[1]} · ${sistema}` : `${nombre} ${m[1]}`;
  }
  return 'Otro';
}
