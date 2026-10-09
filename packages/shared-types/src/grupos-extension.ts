import type { Genero } from './persona.js';

/**
 * spec 014 — Grupos de Extensión (D219–D227). Tipos de respuesta, límites y
 * reglas puras que usan la API, la web app y el backoffice (Principio XI).
 */

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const ESTADOS_SOLICITUD_GRUPO_EXTENSION = ['pendiente', 'aceptada', 'rechazada', 'retirada', 'finalizada'] as const;
export type EstadoSolicitudGrupoExtension = (typeof ESTADOS_SOLICITUD_GRUPO_EXTENSION)[number];

/** D221: el género del Grupo sale de sus líderes. */
export type GeneroGrupoExtension = 'femenino' | 'masculino' | 'mixto';

export const NOMBRE_GRUPO_EXTENSION_MAX = 80;
export const TEXTO_LUGAR_MAX = 80;
export const MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX = 500;
export const DIRECCION_BUSQUEDA_MAX = 200;
export const EDAD_GRUPO_MAX = 120;
/** D220: la hora de inicio va en pasos de 15 minutos. */
export const PASO_MINUTOS_HORA_GRUPO = 15;

/** D221: todas mujeres → mujeres; todos varones → varones; de los dos → mixto. Sin líderes: null. */
export function generoDelGrupo(generosLideres: readonly Genero[]): GeneroGrupoExtension | null {
  if (generosLideres.length === 0) return null;
  const hayF = generosLideres.includes('femenino');
  const hayM = generosLideres.includes('masculino');
  if (hayF && hayM) return 'mixto';
  return hayF ? 'femenino' : 'masculino';
}

/** Edad cumplida en `hoy` (YYYY-MM-DD, fecha civil de Argentina). */
export function edadEn(fechaNacimiento: string, hoy: string): number {
  const [an, mn, dn] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  const [ah, mh, dh] = hoy.slice(0, 10).split('-').map(Number);
  let edad = ah - an;
  if (mh < mn || (mh === mn && dh < dn)) edad -= 1;
  return edad;
}

export interface CondicionesGrupo {
  genero: GeneroGrupoExtension | null;
  edadMinima: number | null;
  edadMaxima: number | null;
}

/**
 * D223: ¿este Grupo le corresponde a esta persona? Por género (el suyo o
 * mixto) y por edad (sin límite = cualquier edad). Un Grupo sin líderes
 * (género null) no le corresponde a nadie.
 */
export function esCompatible(grupo: CondicionesGrupo, persona: { genero: Genero; edad: number }): boolean {
  if (grupo.genero === null) return false;
  if (grupo.genero !== 'mixto' && grupo.genero !== persona.genero) return false;
  if (grupo.edadMinima !== null && persona.edad < grupo.edadMinima) return false;
  if (grupo.edadMaxima !== null && persona.edad > grupo.edadMaxima) return false;
  return true;
}

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/** Distancia en línea recta (haversine), en km. */
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "1,2" (km, con coma, redondeado a 100 m); por debajo de 100 m, "0,1". */
export function formatearDistanciaKm(km: number, locale = 'es-AR'): string {
  const redondeada = Math.max(0.1, Math.round(km * 10) / 10);
  return redondeada.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Los que tienen distancia, de menor a mayor; los que no, al final, por nombre. */
export function ordenarPorDistancia<T extends { distanciaKm: number | null; nombre: string }>(grupos: readonly T[]): T[] {
  return [...grupos].sort((a, b) => {
    if (a.distanciaKm === null && b.distanciaKm === null) return a.nombre.localeCompare(b.nombre, 'es');
    if (a.distanciaKm === null) return 1;
    if (b.distanciaKm === null) return -1;
    return a.distanciaKm - b.distanciaKm;
  });
}

/** ¿"HH:MM" válido en pasos de 15 minutos? (el mismo CHECK que la base). */
export function esHoraDeGrupoValida(hora: string): boolean {
  return /^([01][0-9]|2[0-3]):(00|15|30|45)$/.test(hora);
}

/** Los días en el orden de la semana, sin repetir. */
export function ordenarDias(dias: readonly DiaSemana[]): DiaSemana[] {
  return DIAS_SEMANA.filter((d) => dias.includes(d));
}

/** D220: el lugar escrito al estilo de La Plata. */
export interface LugarGrupo {
  enLaIglesia: boolean;
  calle: string | null;
  numero: string | null;
  entreCalle1: string | null;
  entreCalle2: string | null;
  /** La dirección de la Sede, cuando es "En la iglesia". */
  direccionSede: string | null;
}

/** Una calle de La Plata escrita como número ("64") se lee "calle 64"; un nombre queda igual. */
function conCalle(calle: string): string {
  return /^\d+\s*(bis)?$/i.test(calle.trim()) ? `calle ${calle.trim()}` : calle.trim();
}

/** "64 nro 820 e/ 11 y 12", "64 e/ 11 y 12", o la dirección de la Sede. */
export function direccionDelGrupo(l: LugarGrupo): string {
  if (l.enLaIglesia) return l.direccionSede ?? '';
  let texto = (l.calle ?? '').trim();
  if (l.numero?.trim()) texto += ` nro ${l.numero.trim()}`;
  if (l.entreCalle1?.trim() && l.entreCalle2?.trim()) texto += ` e/ ${l.entreCalle1.trim()} y ${l.entreCalle2.trim()}`;
  return texto;
}

/**
 * D222: las consultas para ubicar el lugar, de la más precisa a la menos:
 * calle y número; si no hay número, la esquina con la primera entre calle.
 */
export function consultasDeGeocodificacion(l: LugarGrupo): string[] {
  if (l.enLaIglesia) return l.direccionSede ? [l.direccionSede] : [];
  const calle = (l.calle ?? '').trim();
  if (!calle) return [];
  const consultas: string[] = [];
  if (l.numero?.trim()) consultas.push(`${conCalle(calle)} ${l.numero.trim()}`);
  if (l.entreCalle1?.trim()) consultas.push(`${conCalle(calle)} y ${conCalle(l.entreCalle1)}`);
  if (l.entreCalle2?.trim()) consultas.push(`${conCalle(calle)} y ${conCalle(l.entreCalle2)}`);
  return consultas;
}

/** "Cómo llegar": abre el mapa del celular con la dirección (research #6). */
export function enlaceComoLlegar(direccion: string, localidad = 'La Plata, Buenos Aires'): string {
  const consulta = /la plata|berisso|ensenada|buenos aires/i.test(direccion) ? direccion : `${direccion}, ${localidad}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

// --- Respuestas de la API (contracts/api.md) ---

export interface PersonaContactoGex {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  /** Teléfono normalizado para `wa.me` (D218), o null si no es un celular argentino. */
  whatsapp: string | null;
}

/** Lo que ve la persona en la búsqueda: NUNCA la dirección exacta ni el contacto (D223). */
export interface GrupoExtensionEncontrado {
  id: string;
  nombre: string;
  lideres: string[];
  genero: GeneroGrupoExtension;
  dias: DiaSemana[];
  horaInicio: string;
  zona: string | null;
  enLaIglesia: boolean;
  distanciaKm: number | null;
  completo: boolean;
}

/** El Grupo como lo ve su integrante: con dirección exacta y el contacto de sus líderes. */
export interface MiGrupoExtension {
  id: string;
  nombre: string;
  dias: DiaSemana[];
  horaInicio: string;
  zona: string | null;
  enLaIglesia: boolean;
  sede: string | null;
  direccion: string;
  lideres: PersonaContactoGex[];
}

/** `lidera`: cuántos Grupos activos lidera (para enlazar "Mi grupo" aunque la sesión sea vieja). */
export type EstadoMiGrupoExtension = (
  | { estado: 'sin_grupo'; ultima: { estado: 'rechazada' | 'retirada' | 'finalizada'; grupo: string; mensaje: string | null; fecha: string } | null }
  | { estado: 'pendiente'; solicitudId: string; desde: string; grupo: { id: string; nombre: string; lideres: string[]; dias: DiaSemana[]; horaInicio: string; zona: string | null } }
  | { estado: 'integrante'; solicitudId: string; desde: string; grupo: MiGrupoExtension }
) & { lidera: number };

export interface SolicitudGexParaLider {
  id: string;
  persona: PersonaContactoGex & { edad: number };
  desde: string;
}

export interface IntegranteGex {
  solicitudId: string;
  persona: PersonaContactoGex;
  desde: string;
}

export interface GrupoLiderado {
  id: string;
  nombre: string;
  dias: DiaSemana[];
  horaInicio: string;
  cupo: number | null;
  direccion: string;
  zona: string | null;
  pendientes: SolicitudGexParaLider[];
  integrantes: IntegranteGex[];
}

export interface GrupoExtensionResumen {
  id: string;
  nombre: string;
  lideres: string[];
  genero: GeneroGrupoExtension | null;
  dias: DiaSemana[];
  horaInicio: string;
  zona: string | null;
  enLaIglesia: boolean;
  cupo: number | null;
  integrantes: number;
  pendientes: number;
  ubicado: boolean;
  activo: boolean;
}

export interface GrupoExtensionDetalle {
  id: string;
  nombre: string;
  dias: DiaSemana[];
  horaInicio: string;
  cupo: number | null;
  edadMinima: number | null;
  edadMaxima: number | null;
  enLaIglesia: boolean;
  sedeId: string | null;
  sede: string | null;
  calle: string | null;
  numero: string | null;
  entreCalle1: string | null;
  entreCalle2: string | null;
  zona: string | null;
  direccion: string;
  ubicado: boolean;
  activo: boolean;
  genero: GeneroGrupoExtension | null;
  lideres: PersonaContactoGex[];
  integrantes: IntegranteGex[];
  pendientes: SolicitudGexParaLider[];
}

/** Lo que manda el Admin al crear o editar (contracts/api.md). */
export interface DatosGrupoExtension {
  nombre: string;
  lideres: string[];
  dias: DiaSemana[];
  horaInicio: string;
  cupo: number | null;
  edadMinima: number | null;
  edadMaxima: number | null;
  enLaIglesia: boolean;
  sedeId: string | null;
  calle: string | null;
  numero: string | null;
  entreCalle1: string | null;
  entreCalle2: string | null;
  zona: string | null;
}

export interface ResultadoGuardarGrupo {
  id: string;
  /** false: la dirección no se pudo ubicar y el Grupo queda sin distancia (D222). */
  ubicado: boolean;
}

/** Detalle de una Solicitud desde la bandeja del backoffice. */
export interface SolicitudGrupoExtensionDetalle {
  id: string;
  estado: EstadoSolicitudGrupoExtension;
  persona: PersonaContactoGex & { edad: number; genero: Genero };
  grupo: { id: string; nombre: string; activo: boolean; cupo: number | null; integrantes: number; zona: string | null };
  createdAt: string;
  creadoPor: string | null;
  revisadoPor: string | null;
  revisadaEn: string | null;
  mensaje: string | null;
}

/** `extra` de la fila `grupo_extension` en la bandeja. */
export interface ExtraBandejaGrupoExtension {
  grupo: string;
}

export interface ErrorCampoGex {
  campo: keyof DatosGrupoExtension;
  code: string;
}

/**
 * D220: las reglas del formulario del Admin, una sola vez para la API (que
 * es la garantía) y el backoffice (que las muestra por campo, H-50). Los
 * códigos se traducen con `errors.campos.<CODE>`.
 */
export function validarDatosGrupo(d: DatosGrupoExtension): ErrorCampoGex[] {
  const e: ErrorCampoGex[] = [];
  const largo = (v: string | null) => (v ?? '').trim().length;
  if (largo(d.nombre) === 0) e.push({ campo: 'nombre', code: 'NOMBRE_REQUERIDO' });
  else if (largo(d.nombre) > NOMBRE_GRUPO_EXTENSION_MAX) e.push({ campo: 'nombre', code: 'NOMBRE_DEMASIADO_LARGO' });
  if (d.lideres.length === 0) e.push({ campo: 'lideres', code: 'LIDERES_REQUERIDOS' });
  if (d.dias.length === 0) e.push({ campo: 'dias', code: 'DIAS_REQUERIDOS' });
  else if (d.dias.some((dia) => !(DIAS_SEMANA as readonly string[]).includes(dia))) e.push({ campo: 'dias', code: 'DIA_SEMANA_INVALIDO' });
  if (!esHoraDeGrupoValida(d.horaInicio)) e.push({ campo: 'horaInicio', code: 'HORA_INVALIDA' });
  if (d.cupo !== null && (!Number.isInteger(d.cupo) || d.cupo < 1 || d.cupo > 999)) e.push({ campo: 'cupo', code: 'CUPO_INVALIDO' });
  const edadOk = (v: number | null) => v === null || (Number.isInteger(v) && v >= 0 && v <= EDAD_GRUPO_MAX);
  if (!edadOk(d.edadMinima)) e.push({ campo: 'edadMinima', code: 'EDAD_INVALIDA' });
  if (!edadOk(d.edadMaxima)) e.push({ campo: 'edadMaxima', code: 'EDAD_INVALIDA' });
  else if (edadOk(d.edadMinima) && d.edadMinima !== null && d.edadMaxima !== null && d.edadMinima > d.edadMaxima) {
    e.push({ campo: 'edadMaxima', code: 'EDADES_INVERTIDAS' });
  }
  if (d.enLaIglesia) {
    if (!d.sedeId) e.push({ campo: 'sedeId', code: 'SEDE_INVALIDA' });
  } else {
    if (largo(d.calle) === 0) e.push({ campo: 'calle', code: 'CALLE_REQUERIDA' });
    if (largo(d.zona) === 0) e.push({ campo: 'zona', code: 'ZONA_REQUERIDA' });
    if ((largo(d.entreCalle1) === 0) !== (largo(d.entreCalle2) === 0)) e.push({ campo: 'entreCalle2', code: 'ENTRE_CALLES_INCOMPLETAS' });
    for (const campo of ['calle', 'numero', 'entreCalle1', 'entreCalle2', 'zona'] as const) {
      if (largo(d[campo]) > TEXTO_LUGAR_MAX) e.push({ campo, code: 'TEXTO_DEMASIADO_LARGO' });
    }
  }
  return e;
}
