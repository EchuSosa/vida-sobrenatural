import {
  COMENTARIO_NAVEGADOR_MAX,
  COMENTARIO_PAGINA_MAX,
  COMENTARIO_REQUEST_ID_MAX,
  COMENTARIO_TEXTO_MAX,
  COMENTARIOS_POR_HORA_CON_SESION,
  COMENTARIOS_POR_HORA_SIN_SESION,
  TELEFONO_REGEX,
  normalizarEmail,
  type AppOrigen,
  type TipoComentario,
} from '@vida-sobrenatural/shared-types';
import type { AppExceptionErrorField } from '../common/errors/app-exception.js';

/**
 * spec 013, Historia 5 (T060, T062): las reglas de "Contanos qué te parece",
 * puras para poder probarlas sin base. Los códigos de campo siguen la
 * convención de `validation-exception-factory` (`<CAMPO>_INVALIDO`); la regla
 * cruzada de contacto es `CONTACTO_INVALIDO` en el campo `contacto`.
 */

export const VENTANA_LIMITE_MS = 60 * 60 * 1000;

const TIPOS: readonly TipoComentario[] = ['problema', 'sugerencia'];
const APPS: readonly AppOrigen[] = ['web', 'backoffice'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ComentarioValidado {
  tipo: TipoComentario;
  texto: string;
  aceptaContacto: boolean;
  contactoEmail: string | null;
  contactoTelefono: string | null;
  paginaOrigen: string;
  navegador: string | null;
  ultimoRequestId: string | null;
  app: AppOrigen;
}

export type ResultadoValidacion = { ok: true; datos: ComentarioValidado } | { ok: false; errores: AppExceptionErrorField[] };

/**
 * FR-041–FR-043. Con sesión, el contacto que venga se ignora (se usan los
 * datos del perfil, H5.2); sin "Pueden contactarme", tampoco se guarda. Los
 * datos técnicos (navegador, requestId) nunca frenan un comentario: si no
 * sirven, se recortan o se descartan.
 */
export function validarComentario(cuerpo: Record<string, unknown>, conSesion: boolean): ResultadoValidacion {
  const errores: AppExceptionErrorField[] = [];
  const tipo = TIPOS.find((t) => t === cuerpo.tipo);
  if (!tipo) errores.push({ campo: 'tipo', code: 'TIPO_INVALIDO' });

  const texto = typeof cuerpo.texto === 'string' ? cuerpo.texto.trim() : '';
  if (texto.length === 0 || texto.length > COMENTARIO_TEXTO_MAX) errores.push({ campo: 'texto', code: 'TEXTO_INVALIDO' });

  const app = APPS.find((a) => a === cuerpo.app);
  if (!app) errores.push({ campo: 'app', code: 'APP_INVALIDO' });

  const paginaOrigen = limpiarPagina(cuerpo.paginaOrigen);
  if (!paginaOrigen) errores.push({ campo: 'paginaOrigen', code: 'PAGINAORIGEN_INVALIDO' });

  if (cuerpo.aceptaContacto !== undefined && typeof cuerpo.aceptaContacto !== 'boolean') {
    errores.push({ campo: 'aceptaContacto', code: 'ACEPTACONTACTO_INVALIDO' });
  }
  const aceptaContacto = cuerpo.aceptaContacto === true;

  let contactoEmail: string | null = null;
  let contactoTelefono: string | null = null;
  if (aceptaContacto && !conSesion) {
    const email = textoOpcional(cuerpo.contactoEmail);
    if (email !== null) {
      const normalizado = normalizarEmail(email);
      if (EMAIL.test(normalizado) && normalizado.length <= 254) contactoEmail = normalizado;
      else errores.push({ campo: 'contactoEmail', code: 'CONTACTOEMAIL_INVALIDO' });
    }
    const telefono = textoOpcional(cuerpo.contactoTelefono);
    if (telefono !== null) {
      if (TELEFONO_REGEX.test(telefono)) contactoTelefono = telefono;
      else errores.push({ campo: 'contactoTelefono', code: 'CONTACTOTELEFONO_INVALIDO' });
    }
    // H5.3: con la casilla marcada y sin sesión, hace falta uno de los dos.
    if (email === null && telefono === null) errores.push({ campo: 'contacto', code: 'CONTACTO_INVALIDO' });
  }

  if (errores.length > 0 || !tipo || !app || !paginaOrigen) return { ok: false, errores };
  return {
    ok: true,
    datos: {
      tipo,
      texto,
      aceptaContacto,
      contactoEmail,
      contactoTelefono,
      paginaOrigen,
      navegador: recortar(cuerpo.navegador, COMENTARIO_NAVEGADOR_MAX),
      ultimoRequestId: requestIdValido(cuerpo.ultimoRequestId),
      app,
    },
  };
}

/** Cuántos comentarios entran por hora: por Persona con sesión, por origen sin sesión. */
export function limiteDeComentarios(conSesion: boolean): number {
  return conSesion ? COMENTARIOS_POR_HORA_CON_SESION : COMENTARIOS_POR_HORA_SIN_SESION;
}

/**
 * Segundos hasta que se libera un lugar: cuando el más viejo de la ventana
 * cumple una hora. Nunca menos de 1.
 */
export function reintentarEnSegundos(masViejo: Date, ahora: Date): number {
  return Math.max(1, Math.ceil((masViejo.getTime() + VENTANA_LIMITE_MS - ahora.getTime()) / 1000));
}

/** Los primeros caracteres del texto para el listado, sin cortar a mitad de una palabra si se puede. */
export function extracto(texto: string, largo: number): string {
  const plano = texto.replace(/\s+/g, ' ').trim();
  if (plano.length <= largo) return plano;
  const corte = plano.slice(0, largo);
  const espacio = corte.lastIndexOf(' ');
  return `${(espacio > largo * 0.6 ? corte.slice(0, espacio) : corte).trimEnd()}…`;
}

/** Path sin query ni fragmento (FR-042: la query puede tener datos de la Persona). */
function limpiarPagina(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const path = valor.split(/[?#]/)[0]!.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.length > COMENTARIO_PAGINA_MAX) return null;
  return path;
}

function textoOpcional(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

function recortar(valor: unknown, maximo: number): string | null {
  const limpio = textoOpcional(valor);
  return limpio === null ? null : limpio.slice(0, maximo);
}

function requestIdValido(valor: unknown): string | null {
  const limpio = textoOpcional(valor);
  return limpio !== null && limpio.length <= COMENTARIO_REQUEST_ID_MAX && /^[\w.:-]+$/.test(limpio) ? limpio : null;
}
