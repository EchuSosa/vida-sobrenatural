export type Genero = 'masculino' | 'femenino';

export type EstadoCivil =
  | 'soltero_a'
  | 'casado_a'
  | 'en_concubinato'
  | 'viudo_a'
  | 'divorciado_a'
  | 'separado_a';

// Nombres tal como los expone el cliente de Prisma (apps/api/src/generated/prisma/enums.ts);
// el valor "canónico" sin el prefijo `de_` (ej. "6_meses_a_1_anio") es solo el
// almacenamiento físico en Postgres vía @map, invisible para la app.
export type TiempoCongregacion =
  | 'menos_6_meses'
  | 'de_6_meses_a_1_anio'
  | 'de_1_a_3_anios'
  | 'de_3_a_5_anios'
  | 'mas_5_anios';

export type EstadoPersona = 'activa' | 'pendiente_tutor';

/** Base Transversal (specs/002-base-transversal) — solo "es" en el MVP (D84). */
export type Idioma = 'es';

export type TemaPreferido = 'claro' | 'oscuro' | 'sistema';

export type Profesion =
  | 'salud'
  | 'educacion'
  | 'tecnologia_ingenieria'
  | 'comercio_ventas'
  | 'oficios_construccion'
  | 'administracion_finanzas'
  | 'legal'
  | 'comunicacion_marketing'
  | 'arte_diseno'
  | 'servicios_gastronomia'
  | 'transporte'
  | 'estudiante'
  | 'ama_de_casa'
  | 'jubilado_a'
  | 'sin_ocupacion'
  | 'otro';

/** Body de POST /personas — ver contracts/personas-api.md. */
export interface RegistroPersonaInput {
  apellido: string;
  nombre: string;
  genero: Genero;
  fechaNacimiento: string; // YYYY-MM-DD
  telefono: string;
  direccion: string;
  sedeId: string;
  estadoCivil: EstadoCivil;
  profesion: Profesion;
  /** Obligatorio cuando profesion = 'otro'. */
  profesionDetalle?: string;
  tiempoCongregacion: TiempoCongregacion;
  consentimientoDatos: boolean;
  /** Foto de perfil de Google (picture) — no editable por ahora. */
  fotoUrl?: string;
}

/** Response de POST /personas. */
export interface RegistroPersonaResult {
  id: string;
  estado: EstadoPersona;
}

/** Response de GET /personas/by-email (uso interno, ver contracts/auth-integration.md). */
export interface PersonaLookup {
  id: string;
  estado: EstadoPersona;
  activo: boolean;
  rol: string[];
  /** Base Transversal — para hidratar session.user.temaPreferido sin flash (research.md Decisión 3). */
  temaPreferido: TemaPreferido;
}

/** Response de GET /personas/me — specs/002-base-transversal/contracts/personas-api.md. */
export interface PersonaPerfil {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  fotoUrl: string | null;
  sedeId: string;
  estado: EstadoPersona;
  idiomaPreferido: Idioma;
  temaPreferido: TemaPreferido;
}

/** Body de PATCH /personas/me/preferencias. */
export interface ActualizarPreferenciasInput {
  temaPreferido: TemaPreferido;
}

/** Elemento de GET /personas/pendientes-tutor. */
export interface PersonaPendienteTutor {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  fechaNacimiento: string;
  sedeId: string;
}

/**
 * Body de PATCH /personas/:id/activar. Exactamente uno de los dos caminos —
 * `tutorPersonaId` (vincula una Relación Familiar) o `tutorNombre`+
 * `tutorTelefono` (texto libre) — nunca ambos, nunca ninguno (H-29,
 * D108/D112).
 */
export type ActivarPersonaInput =
  | { tutorPersonaId: string; tutorNombre?: never; tutorTelefono?: never }
  | { tutorPersonaId?: never; tutorNombre: string; tutorTelefono: string };

/** Elemento de GET /personas/buscar?q= — H-29 (D108), elegir a quién vincular. */
export interface BusquedaPersona {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
}
