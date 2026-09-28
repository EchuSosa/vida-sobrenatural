import {
  ApiError,
  erroresPorCampo,
  type DiscipuladoResumen,
  type EncuentroAdministrativo,
  type EncuentroDelDiscipulador,
  type Franja,
  type PersonaBreve,
  formatearFechaLarga,
  hoyEnArgentina,
  type MiDiscipulado,
  type PropuestaParaMi,
} from '@vida-sobrenatural/shared-types';
import { minutosAHHMM } from '@vida-sobrenatural/ui';

/**
 * specs/004, lote B: piezas que comparten las pantallas del discipulado
 * (`/mis-discipulados` y `/grupos`, las dos del lote). Sin `'use client'`: las
 * importan tanto los Server Components como las islas de cliente.
 */

/**
 * `MiDiscipulado` con el `personaId` de cada Persona, que la API ya manda:
 * las asistencias de un Encuentro vienen por `personaId`.
 * TODO(merge): sumar `personaId` a `MiDiscipulado.personas` en shared-types.
 */
export type MiDiscipuladoConIds = Omit<MiDiscipulado, 'personas'> & {
  personas: Array<MiDiscipulado['personas'][number] & { personaId: string }>;
};

/** Lo que devuelve `GET /discipulado/mis-discipulados` (contracts/discipulado-api.md). */
export interface MisDiscipuladosRespuesta {
  propuestas: PropuestaParaMi[];
  discipulados: MiDiscipuladoConIds[];
  tieneAgenda: boolean;
}

/** `GET /discipulado/mis-discipulados/:grupoId`. */
export type DetalleMiDiscipulado = MiDiscipuladoConIds & { encuentros: EncuentroDelDiscipulador[] };

/**
 * La vista del Admin (`GET /grupos/discipulados/:grupoId`), con la Inscripción
 * y la baja pedida de cada Persona, que la API ya manda.
 * TODO(merge): sumar esos campos a `DiscipuladoResumen.personas` en shared-types.
 */
export type DetalleDiscipuladoAdmin = Omit<DiscipuladoResumen, 'personas'> & {
  personas: Array<
    DiscipuladoResumen['personas'][number] & { inscripcionId: string; bajaPropuestaEn: string | null; bajaPropuestaMotivo: string | null }
  >;
  encuentros: EncuentroAdministrativo[];
  liderazgos: Array<{ discipulador: PersonaBreve; desde: string; hasta: string | null }>;
  franjasDelGrupo: Franja[];
};

/**
 * Una fecha para leer: si es un instante (`2026-09-28T21:30:00Z`), el día
 * civil en Argentina (a las 21:30 del 28 en Buenos Aires ya es 29 en UTC);
 * si ya es una fecha civil (`2026-09-28`, un Encuentro), tal cual.
 */
export function fechaParaLeer(valor: string, locale: string): string {
  const civil = valor.length === 10 ? valor : hoyEnArgentina(new Date(valor));
  return formatearFechaLarga(civil, locale);
}

type Traductor = ((clave: string) => string) & { has: (clave: string) => boolean };

/**
 * El mensaje de un error de la API en el namespace de la pantalla
 * (`errores.<CODE>`), o el genérico. Los códigos de estas pantallas se
 * explican en contexto ("el Admin la retiró"), no con el texto general.
 */
export function mensajeDeError(e: unknown, t: Traductor): string {
  if (e instanceof ApiError && t.has(`errores.${e.code}`)) return t(`errores.${e.code}`);
  return t('errores.generico');
}

/** Los errores de campo de la API (H-50), traducidos con `campos.<CODE>` del namespace. */
export function mensajesDeCampo(e: unknown, t: Traductor): Record<string, string> | null {
  const campos = erroresPorCampo(e);
  if (!campos) return null;
  return Object.fromEntries(
    campos.map(({ campo, code }) => [campo, t.has(`campos.${code}`) ? t(`campos.${code}`) : t('errores.generico')]),
  );
}

export function nombresDe(personas: Array<{ nombre: string; apellido: string }>): string {
  return personas.map((p) => `${p.nombre} ${p.apellido}`).join(', ');
}

/** "Martes 19:00 a 21:00", con los días de `franjas.dias` (next-intl). */
export function textoFranja(f: Franja, dias: string[]): string {
  return `${dias[f.diaSemana]} ${minutosAHHMM(f.inicio)} a ${minutosAHHMM(f.fin)}`;
}
