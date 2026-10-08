import type { DatosPersonales, EstadoCivil, Genero, Profesion } from './persona.js';
import { TELEFONO_REGEX, congregaDesdeValido } from './persona.js';

/**
 * spec 006 (FR-031, research #9) — las validaciones de los datos personales,
 * una sola vez para el registro (web) y el alta por el Admin (backoffice).
 * Las reglas son EXACTAMENTE las de `RegistroPersonaDto` (apps/api), y los
 * códigos, los que su fábrica de validación deriva del nombre del campo
 * (`<CAMPO>_INVALIDO`, ej. `TELEFONO_INVALIDO`, `PROFESIONDETALLE_INVALIDO`):
 * `apps/api/test/unit/registro-compartido.spec.ts` compara las dos sobre los
 * mismos casos, así no pueden discrepar. El tipo `DatosPersonales` está en
 * persona.ts.
 */

export const GENEROS: readonly Genero[] = ['masculino', 'femenino'];
export const ESTADOS_CIVILES: readonly EstadoCivil[] = ['soltero_a', 'casado_a', 'en_concubinato', 'viudo_a', 'divorciado_a', 'separado_a'];
export const PROFESIONES: readonly Profesion[] = [
  'salud',
  'educacion',
  'tecnologia_ingenieria',
  'comercio_ventas',
  'oficios_construccion',
  'administracion_finanzas',
  'legal',
  'comunicacion_marketing',
  'arte_diseno',
  'servicios_gastronomia',
  'transporte',
  'estudiante',
  'ama_de_casa',
  'jubilado_a',
  'sin_ocupacion',
  'otro',
];

export interface ErrorDeDatoPersonal {
  campo: keyof DatosPersonales;
  code: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}/;

function textoRequerido(v: unknown): boolean {
  return typeof v === 'string' && v.length > 0;
}

function fechaValida(v: unknown): boolean {
  if (typeof v !== 'string' || !FECHA.test(v)) return false;
  return !Number.isNaN(new Date(v).getTime());
}

/**
 * Los errores de campo de unos datos personales, en el orden del formulario.
 * Lista vacía = válidos. `anioActual` (en Argentina) es para `congregaDesde`
 * (D214). La edad mínima de cada caso (menor de 18 en el alta, FR-033) la
 * agrega quien la usa: el registro admite menores (van a Pendientes de tutor).
 */
export function erroresDeDatosPersonales(d: Partial<Record<keyof DatosPersonales, unknown>>, anioActual: number): ErrorDeDatoPersonal[] {
  const errores: ErrorDeDatoPersonal[] = [];
  const error = (campo: keyof DatosPersonales) => errores.push({ campo, code: `${campo.toUpperCase()}_INVALIDO` });

  if (!textoRequerido(d.apellido)) error('apellido');
  if (!textoRequerido(d.nombre)) error('nombre');
  if (!GENEROS.includes(d.genero as Genero)) error('genero');
  if (!fechaValida(d.fechaNacimiento)) error('fechaNacimiento');
  if (!textoRequerido(d.telefono) || !TELEFONO_REGEX.test(d.telefono as string)) error('telefono');
  if (!textoRequerido(d.direccion)) error('direccion');
  if (typeof d.sedeId !== 'string' || !UUID.test(d.sedeId)) error('sedeId');
  if (!ESTADOS_CIVILES.includes(d.estadoCivil as EstadoCivil)) error('estadoCivil');
  if (!PROFESIONES.includes(d.profesion as Profesion)) error('profesion');
  if (d.profesion === 'otro' && !textoRequerido(d.profesionDetalle)) error('profesionDetalle');
  if (!congregaDesdeValido(d.congregaDesde, anioActual)) error('congregaDesde');
  return errores;
}
