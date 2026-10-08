import type { PersonaBreve, EstadoGrupo, EstadoInscripcion } from './discipulado.js';
import type { EstadoCivil, EstadoPersona, Genero, Profesion } from './persona.js';
import type { ResultadoQuitarRol, RolDeCargo } from './permisos.js';
import type { CategoriaCurso, TipoCurso } from './curso.js';

/**
 * spec 013 — perfil de Persona del backoffice (D209). Lo completa la sesión de
 * la 013 (T004: `PerfilPersona`, `relacionDesde`, `INVERSO_RELACION` movido
 * desde la API). Acá queda lo que ya usan otras specs.
 */

/** Iniciales para el avatar cuando no hay foto (D87): "José Pérez" → "JP". */
export function iniciales(nombre: string, apellido: string): string {
  const primera = (s: string) => s.trim().charAt(0).toLocaleUpperCase('es');
  return `${primera(nombre)}${primera(apellido)}`;
}

// ─── Lote 2 (T004): el Perfil de Persona del backoffice ───────────────────


/** Los tipos de Relación Familiar tal como se guardan (una fila por vínculo, D112). */
export type TipoRelacionFamiliar = 'tutor' | 'conyuge' | 'hijo_a' | 'padre_madre' | 'hermano_a';

/**
 * D112: la inversa de cada tipo, para detectar el "duplicado espejo" (el mismo
 * vínculo cargado desde el otro lado). `tutor` no tiene inversa guardable: su
 * otro lado ("a cargo de") se resuelve al mostrar (`relacionDesde`). Movida
 * desde `apps/api/src/persona/persona.service.ts` (research #6): una sola tabla.
 */
export const INVERSO_RELACION: Partial<Record<TipoRelacionFamiliar, TipoRelacionFamiliar>> = {
  hijo_a: 'padre_madre',
  padre_madre: 'hijo_a',
  conyuge: 'conyuge',
  hermano_a: 'hermano_a',
};

/**
 * Qué es el familiar PARA la Persona del perfil. Una fila `{personaId: A,
 * familiarId: B, tipo: T}` dice "B es T de A" (en `tutor`, A es el menor).
 * `tutor_de` = el familiar es su tutor/a; `a_cargo_de` = el familiar está a
 * cargo de la Persona del perfil (es su tutor/a quien mira).
 */
export type RelacionDesde = 'tutor_de' | 'a_cargo_de' | 'conyuge' | 'hijo_a' | 'padre_madre' | 'hermano_a';

/**
 * El nombre del vínculo visto desde un lado (research #6): `sujeto` = la
 * Persona del perfil es `personaId` de la fila; `familiar` = es `familiarId`.
 */
export function relacionDesde(tipo: TipoRelacionFamiliar, lado: 'sujeto' | 'familiar'): RelacionDesde {
  if (tipo === 'tutor') return lado === 'sujeto' ? 'tutor_de' : 'a_cargo_de';
  const visto = lado === 'sujeto' ? tipo : (INVERSO_RELACION[tipo] ?? tipo);
  return visto as Exclude<TipoRelacionFamiliar, 'tutor'>;
}

export interface RelacionFamiliarVista {
  familiar: PersonaBreve;
  relacion: RelacionDesde;
}

/** `GET /personas/:id/perfil` (contracts/perfil-persona-api.md). Nunca notas ni campos técnicos (FR-015). */
export interface PerfilPersona {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
  /** YYYY-MM-DD */
  fechaNacimiento: string;
  edad: number;
  genero: Genero;
  estadoCivil: EstadoCivil;
  profesion: Profesion;
  profesionDetalle: string | null;
  telefono: string;
  direccion: string;
  /** D145: null = sin email. */
  email: string | null;
  /**
   * D215: solo dígitos; null = no cargado. Viaja solo en el perfil (que exige
   * `personas.ver`), nunca en listados ni en logs; lo usa el formulario de edición.
   */
  dni: string | null;
  sede: { id: string; nombre: string; activa: boolean };
  /** D214: el año; la pantalla calcula "hace N años". */
  congregaDesde: number;
  estado: EstadoPersona;
  /** false = "Dada de baja" (FR-017). */
  activo: boolean;
  /** Tiene email con el que puede entrar (D97, D145). */
  usaLaApp: boolean;
  origenAlta: 'autorregistro' | 'admin';
  altaPor: PersonaBreve | null;
  consentimiento: { fecha: string; origen: 'app' | 'presencial' } | null;
  /** Solo si es menor: el tutor cargado como texto o, si es una Persona registrada, enlazado. */
  tutor: { nombre: string; apellido: string; telefono: string | null; persona: PersonaBreve | null } | null;
  roles: { deCargo: RolDeCargo[]; delProceso: string[] };
  /**
   * Para el panel de roles (005) abierto desde el perfil: si quien mira puede
   * quitarle cada rol de cargo y, si no, por qué — lo mismo que trae cada fila
   * de `GET /personas` (`puedeQuitarRol`).
   */
  quitar: Record<RolDeCargo, ResultadoQuitarRol>;
  relaciones: RelacionFamiliarVista[];
  createdAt: string;
}

export interface GrupoEnPerfil {
  grupoId: string;
  curso: { nombre: string; categoria: CategoriaCurso; tipo: TipoCurso };
  estadoGrupo: EstadoGrupo;
  /** Solo en los cursados. */
  estadoInscripcion?: EstadoInscripcion;
  desde: string;
  hasta: string | null;
}

/** `GET /personas/:id/grupos`: los 20 más recientes de cada lista y los totales (FR-013). */
export interface GruposDePersona {
  cursados: GrupoEnPerfil[];
  aCargo: GrupoEnPerfil[];
  totalCursados: number;
  totalACargo: number;
}

export const PERFIL_ITEMS_POR_SECCION = 20;
