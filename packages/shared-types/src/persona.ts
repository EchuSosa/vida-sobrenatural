import type { RolDeCargo, ResultadoQuitarRol } from './permisos.js';
/**
 * Formato de teléfono estructurado (D90) — código de país (+...) y dígitos.
 * Usado por `Persona.telefono` y, desde H-30 (revisión manual, actualización
 * 2026-09-20), también por `Sede.contactoTelefono` — mismo input en el
 * cliente (CampoTelefono, packages/ui), misma validación en el servidor.
 */
export const TELEFONO_REGEX = /^\+[0-9]{1,4}[0-9\s]{5,15}$/;

export type Genero = 'masculino' | 'femenino';

export type EstadoCivil =
  | 'soltero_a'
  | 'casado_a'
  | 'en_concubinato'
  | 'viudo_a'
  | 'divorciado_a'
  | 'separado_a';

/**
 * D214: se guarda el AÑO en que la Persona empezó a venir a la iglesia
 * (`Persona.congregaDesde`), no un rango — el tiempo se calcula al mostrarlo,
 * así las métricas quedan al día solas. Reemplaza al viejo `TiempoCongregacion`.
 */
export const ANIO_MINIMO_CONGREGA_DESDE = 1900;

/** Cuántos años atrás ofrece la lista del registro (la primera opción es "Este año"). */
export const ANIOS_OFRECIDOS_CONGREGA_DESDE = 80;

/**
 * Los años que ofrece la pregunta "¿En qué año empezaste a venir a la
 * iglesia?" — del actual hacia atrás. El primero se muestra como "Este año".
 * Única fuente para el registro (web) y el alta por el Admin (backoffice).
 */
export function opcionesAnioCongregaDesde(anioActual: number, cantidad = ANIOS_OFRECIDOS_CONGREGA_DESDE): number[] {
  return Array.from({ length: cantidad }, (_, i) => anioActual - i);
}

/** ¿Es un año aceptable para `congregaDesde`? Entero, desde 1900 y nunca en el futuro. */
export function congregaDesdeValido(valor: unknown, anioActual: number): valor is number {
  return Number.isInteger(valor) && (valor as number) >= ANIO_MINIMO_CONGREGA_DESDE && (valor as number) <= anioActual;
}

/** Años enteros que lleva viniendo (0 = empezó este año). Nunca negativo. */
export function aniosCongregando(congregaDesde: number, anioActual: number): number {
  return Math.max(0, anioActual - congregaDesde);
}

/** Rangos para agrupar en métricas (D214): se calculan, nunca se guardan. */
export type RangoCongregacion = 'este_anio' | 'de_1_a_2_anios' | 'de_3_a_5_anios' | 'mas_de_5_anios';

export const ORDEN_RANGO_CONGREGACION: readonly RangoCongregacion[] = [
  'este_anio',
  'de_1_a_2_anios',
  'de_3_a_5_anios',
  'mas_de_5_anios',
];

export function rangoCongregacion(congregaDesde: number, anioActual: number): RangoCongregacion {
  const anios = aniosCongregando(congregaDesde, anioActual);
  if (anios === 0) return 'este_anio';
  if (anios <= 2) return 'de_1_a_2_anios';
  if (anios <= 5) return 'de_3_a_5_anios';
  return 'mas_de_5_anios';
}

/**
 * spec 006 (research #7, D145): forma comparable de un teléfono para el aviso
 * de posible duplicado — solo dígitos, y sin el 9 de celular de Argentina
 * (`+54 9 221 …` y `+54 221 …` son el mismo número). La base tiene la MISMA
 * regla en SQL (trigger de `personas.telefonoNormalizado`, migración
 * lote_0_global); un test de integración compara las dos sobre el seed
 * (Principio XI: copia con test que falla si diverge).
 */
export function normalizarTelefono(telefono: string): string {
  return telefono.replace(/[^0-9]/g, '').replace(/^549/, '54');
}

/**
 * spec 006 (research #7): nombre o apellido comparable — sin tildes, en
 * minúsculas y con los espacios colapsados ("José  Pérez" ≡ "jose perez").
 */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export type EstadoPersona = 'activa' | 'pendiente_tutor';

/**
 * D133/H-128: ninguna Persona menor de esta edad puede recibir un rol de
 * cargo (`RolDeCargo`, `permisos.ts`). Constante propia — **no** reutiliza
 * `EDAD_MINIMA` de `apps/api/src/persona/persona.service.ts`, que ya
 * significa otras dos cosas ahí (umbral de auto-registro, mayoría de edad
 * del tutor): aunque hoy coincidan en el valor (18), son tres reglas
 * independientes que deben poder moverse por separado. Vive acá, no en la
 * API, porque FR-024 exige el mismo umbral también del lado del
 * backoffice (research.md #7 del spec 005).
 */
export const EDAD_MINIMA_ROL_DE_CARGO = 18;

/**
 * specs/004-vida-nueva-discipulado (FR-044): una Persona de 12 años o más
 * puede pedir Vida Nueva sola; menor de 12, lo pide el Admin o un Discipulador
 * en su nombre (FR-002). Constante propia — **no** reutiliza `EDAD_MINIMA` ni
 * `EDAD_MINIMA_ROL_DE_CARGO` (H-128): son reglas independientes que deben
 * poder moverse por separado. Se evalúa con `calcularEdad(fechaNacimiento)`.
 */
export const EDAD_MINIMA_PEDIR_VIDA_NUEVA_SOLO = 12;

/** Base Transversal (specs/002-base-transversal) — solo "es" en el MVP (D84). */
export type Idioma = 'es';

export type TemaPreferido = 'claro' | 'oscuro' | 'sistema';

/**
 * H-48/H-49 (revisión manual ronda 4, D116): opciones que ofrece la
 * interfaz — dos, no tres. `sistema` sigue siendo un valor válido en
 * `Persona.tema_preferido` para quien ya lo tenga guardado (no se migra ni
 * se rompe), pero ningún selector lo muestra más.
 */
export type TemaPreferidoVisible = Extract<TemaPreferido, 'claro' | 'oscuro'>;
export const TEMAS_VISIBLES: readonly TemaPreferidoVisible[] = ['claro', 'oscuro'];

/**
 * Un solo mapa de `TemaPreferido` a los valores de `next-themes`, para las
 * dos apps (Principio XI) — antes triplicado en
 * `apps/web/src/components/selector-tema.tsx`,
 * `apps/web/src/components/menu-usuario-publico.tsx` y
 * `apps/backoffice/src/components/selector-tema.tsx`.
 */
export const TEMA_A_NEXT_THEMES: Record<TemaPreferido, string> = {
  claro: 'light',
  oscuro: 'dark',
  sistema: 'system',
};

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
  /** D214: año en que empezó a venir a la iglesia. */
  congregaDesde: number;
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
  /** D145: una Persona dada de alta por el Admin puede no tener email. */
  email: string | null;
  fotoUrl: string | null;
  sedeId: string;
  estado: EstadoPersona;
  idiomaPreferido: Idioma;
  temaPreferido: TemaPreferido;
  /** H-35 (revisión manual ronda 3, Lote 5) — base del self-edit de Perfil (Flujo 11). */
  telefono: string;
  direccion: string;
  estadoCivil: EstadoCivil;
  profesion: Profesion;
  profesionDetalle: string | null;
}

/** Body de PATCH /personas/me/preferencias. */
export interface ActualizarPreferenciasInput {
  temaPreferido: TemaPreferido;
}

/**
 * Body de PATCH /personas/me — H-35, Flujo 11 (FR-028/FR-029). Cualquier
 * subconjunto; nunca `fechaNacimiento` ni `email` (los edita un Admin).
 */
export interface ActualizarPerfilInput {
  telefono?: string;
  direccion?: string;
  estadoCivil?: EstadoCivil;
  profesion?: Profesion;
  /** Obligatorio cuando `profesion` viene como 'otro' en esta misma petición. */
  profesionDetalle?: string;
}

/** Elemento de GET /personas/pendientes-tutor. */
export interface PersonaPendienteTutor {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  fechaNacimiento: string;
  sedeId: string;
  /** Fecha de solicitud — createdAt de la Persona. Columna ordenable (H-88 revisado). */
  createdAt: string;
}

/**
 * Body de PATCH /personas/:id/activar. Exactamente uno de los dos caminos —
 * `tutorPersonaId` (vincula una Relación Familiar) o `tutorNombre`+
 * `tutorApellido`+`tutorTelefono` (texto libre) — nunca ambos, nunca
 * ninguno (H-29, D108/D112; tutorApellido: H-71, revisión manual ronda 7).
 */
export type ActivarPersonaInput =
  | { tutorPersonaId: string; tutorNombre?: never; tutorApellido?: never; tutorTelefono?: never }
  | { tutorPersonaId?: never; tutorNombre: string; tutorApellido: string; tutorTelefono: string };

/**
 * Elemento de GET /personas/buscar?q= — H-29 (D108), elegir a quién vincular.
 * `rol`: specs/005 (T017, FR-005) — los roles actuales, lo mínimo para
 * identificar a la Persona correcta sin mostrar su perfil completo.
 */
export interface BusquedaPersona {
  id: string;
  nombre: string;
  apellido: string;
  /** D145: null = sin acceso a la app. */
  email: string | null;
  telefono: string;
  rol: string[];
}

/**
 * Elemento de GET /personas (paginado, `Pagina<PersonaListado>`) — specs/005,
 * Historia 2: el listado de la pantalla Personas. Mismos campos que
 * `BusquedaPersona` hoy, pero es otro caso de uso (listar vs. elegir un
 * tutor) y cada uno puede crecer por su lado — ver persona.service.ts.
 */
export interface PersonaListado {
  id: string;
  nombre: string;
  apellido: string;
  /** D145: null = sin acceso a la app. */
  email: string | null;
  telefono: string;
  rol: string[];
  /**
   * specs/005, T062: para cada rol de cargo, si quien mira se lo puede quitar
   * a esta Persona y, si no, por qué — `puedeQuitarRol` (permisos.ts), la
   * misma función con la que la API rechaza. Por los cuatro roles, no solo
   * los que tiene: así sigue valiendo después de otorgarle uno en el modal.
   */
  quitar: Record<RolDeCargo, ResultadoQuitarRol>;
}

/**
 * spec 006 (FR-031, D145): los datos personales del Flujo 2, paso 4 — los
 * mismos para el registro y para el alta por el Admin. Las validaciones de
 * campo viven en `registro.ts` (una sola vez para los dos).
 */
export interface DatosPersonales {
  apellido: string;
  nombre: string;
  genero: Genero;
  /** YYYY-MM-DD */
  fechaNacimiento: string;
  telefono: string;
  direccion: string;
  sedeId: string;
  estadoCivil: EstadoCivil;
  profesion: Profesion;
  profesionDetalle?: string;
  /** D214 */
  congregaDesde: number;
}

/** Body de POST /personas/alta (spec 006, contracts/personas-alta-api.md). */
export interface DatosAltaPersona extends DatosPersonales {
  email?: string | null;
  consentimiento: true;
  /** Reintento después de un 409 POSIBLE_DUPLICADO ("Es otra persona, crear igual"). */
  confirmarPosibleDuplicado?: boolean;
}

/** Por qué dos Personas pueden ser la misma (aviso, no bloqueo — D145). */
export type MotivoPosibleDuplicado = 'telefono' | 'nombre_apellido_fecha';

/** Cada coincidencia del 409 POSIBLE_DUPLICADO. */
export interface CoincidenciaDuplicado {
  id: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  telefono: string;
  activa: boolean;
  porque: MotivoPosibleDuplicado[];
}

/**
 * spec 006 (FR-037, FR-038, D145): sin email no hay ingreso a la app — el
 * login busca por un email concreto y nunca encuentra a quien no tiene.
 * Personas lo muestra como "Sin acceso a la app".
 */
export function sinAccesoALaApp(persona: { email: string | null }): boolean {
  return persona.email === null || persona.email.trim() === '';
}

/** Lo que `sonPosiblesDuplicados` necesita de cada Persona. */
export type DatosParaDuplicado = Pick<DatosPersonales, 'nombre' | 'apellido' | 'fechaNacimiento' | 'telefono'>;

/**
 * spec 006 (FR-035, research #7): ¿por qué `a` y `b` podrían ser la misma
 * Persona? Mismo teléfono normalizado, o mismo nombre + apellido normalizados
 * y misma fecha de nacimiento. Lista vacía = no se parecen. Pura (la API la
 * aplica sobre los candidatos que trae por índice).
 */
export function sonPosiblesDuplicados(a: DatosParaDuplicado, b: DatosParaDuplicado): MotivoPosibleDuplicado[] {
  const motivos: MotivoPosibleDuplicado[] = [];
  if (normalizarTelefono(a.telefono) === normalizarTelefono(b.telefono)) motivos.push('telefono');
  if (
    normalizarNombre(a.nombre) === normalizarNombre(b.nombre) &&
    normalizarNombre(a.apellido) === normalizarNombre(b.apellido) &&
    a.fechaNacimiento.slice(0, 10) === b.fechaNacimiento.slice(0, 10)
  ) {
    motivos.push('nombre_apellido_fecha');
  }
  return motivos;
}

/**
 * spec 013 (research #14, D133): ¿es menor de edad (< 18) en `hoy`
 * (YYYY-MM-DD, fecha civil de Argentina)? Pura, para que la API y el backoffice
 * no la reimplementen.
 */
export function esMenorDeEdad(fechaNacimiento: string, hoy: string): boolean {
  const [an, mn, dn] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  const [ah, mh, dh] = hoy.slice(0, 10).split('-').map(Number);
  let edad = ah - an;
  if (mh < mn || (mh === mn && dh < dn)) edad -= 1;
  return edad < EDAD_MINIMA_ROL_DE_CARGO;
}
