import type { PersonaBreve } from './discipulado.js';
import { tienePermiso, type Permiso } from './permisos.js';

/**
 * Bandeja unificada de Solicitudes (D178, D207, D208) —
 * `specs/013-backoffice-admin/contracts/bandeja-api.md`.
 *
 * Lote 0 global: los siete tipos ya están conectados en la vista
 * `solicitudes_bandeja` (`apps/api/prisma/vistas/solicitudes_bandeja.sql`).
 * Cada spec de tipo suma su `FuenteSolicitudes` (la que hidrata las filas) y
 * su pantalla de detalle; no toca esta lista ni la vista, salvo que cambie un
 * estado de su tipo (y entonces el test de coherencia de la vista falla
 * hasta que las dos coincidan).
 */
export const TIPOS_SOLICITUD = [
  'discipulado', // 004
  'historial', // 006 — "Ya lo hice" (Declaración de Historial)
  'vida_de_servicio', // 008
  'postulacion', // 009
  'bautismo', // 010
  'inscripcion_evento', // 011
  'pago', // 011
  'grupo_extension', // 014 (D227)
] as const;

export type TipoSolicitud = (typeof TIPOS_SOLICITUD)[number];

/** Todos los estados de cada tipo, tal como los guarda su tabla. */
export const ESTADOS_POR_TIPO: { readonly [T in TipoSolicitud]: readonly string[] } = {
  discipulado: ['pendiente', 'propuesta', 'aprobada', 'rechazada', 'retirada'],
  historial: ['pendiente', 'confirmada', 'rechazada', 'retirada'],
  vida_de_servicio: ['pendiente', 'aprobada', 'rechazada', 'retirada'],
  postulacion: ['pendiente', 'aprobada', 'rechazada', 'inactiva', 'retirada'],
  bautismo: ['pendiente', 'aprobada', 'rechazada', 'retirada', 'realizada'],
  inscripcion_evento: ['confirmada', 'pendiente', 'rechazada', 'lista_espera', 'cancelada'],
  pago: ['pendiente_verificacion', 'verificado', 'rechazado'],
  grupo_extension: ['pendiente', 'aceptada', 'rechazada', 'retirada', 'finalizada'],
};

/**
 * D208: "abierta" = espera una acción del Admin. Una aceptada de Bautismo sin
 * fecha no lo es (D186), ni una Inscripción confirmada con el pago pendiente
 * (D196: lo abierto es su Pago). Tiene que coincidir con la columna `abierta`
 * de la vista — lo verifica un test de integración.
 */
export const ESTADOS_ABIERTOS: { readonly [T in TipoSolicitud]: readonly string[] } = {
  discipulado: ['pendiente', 'propuesta'],
  historial: ['pendiente'],
  vida_de_servicio: ['pendiente'],
  postulacion: ['pendiente'],
  bautismo: ['pendiente'],
  inscripcion_evento: ['pendiente'],
  pago: ['pendiente_verificacion'],
  grupo_extension: ['pendiente'],
};

export function esAbierta(tipo: TipoSolicitud, estado: string): boolean {
  return ESTADOS_ABIERTOS[tipo].includes(estado);
}

/**
 * D216: los tipos que, además de `solicitudes.ver`, piden un permiso propio
 * para verse en la bandeja. Verificar pagos es tarea del Admin: el Pastor no
 * ve las filas `pago` (ni en la lista, ni en el conteo, ni en el filtro).
 */
export const PERMISO_EXTRA_POR_TIPO: { readonly [T in TipoSolicitud]?: Permiso } = {
  pago: 'pagos.verificar',
};

/** Los tipos de `tipos` que estos roles pueden ver en la bandeja (D216). */
export function tiposVisiblesEnBandeja<T extends TipoSolicitud>(roles: readonly string[], tipos: readonly T[]): T[] {
  return tipos.filter((tipo) => {
    const permiso = PERMISO_EXTRA_POR_TIPO[tipo];
    return permiso === undefined || tienePermiso(roles, permiso);
  });
}

export function esTipoSolicitud(valor: string): valor is TipoSolicitud {
  return (TIPOS_SOLICITUD as readonly string[]).includes(valor);
}

export const FILTROS_ABIERTAS = ['abiertas', 'resueltas', 'todas'] as const;
export type FiltroAbiertas = (typeof FILTROS_ABIERTAS)[number];

/** D208: por defecto "más tiempo esperando". */
export const ORDENES_BANDEJA = ['espera', 'fecha', 'persona'] as const;
export type OrdenBandeja = (typeof ORDENES_BANDEJA)[number];

/** `take` máximo de `GET /solicitudes` (contracts/bandeja-api.md). */
export const BANDEJA_TAKE_MAX = 100;

export function esEstadoDeTipo(tipo: TipoSolicitud, estado: string): boolean {
  return ESTADOS_POR_TIPO[tipo].includes(estado);
}

export const BANDEJA_PAGINA = 20;

/** Fila de la bandeja: la forma base de docs/04 + lo propio de cada tipo en `extra`. */
export interface SolicitudBandeja {
  tipo: TipoSolicitud;
  id: string;
  persona: PersonaBreve;
  estado: string;
  abierta: boolean;
  createdAt: string;
  esperaDesde: string;
  /** null = la pidió la propia Persona. */
  creadoPor: PersonaBreve | null;
  revisadoPor: PersonaBreve | null;
  revisadaEn: string | null;
  /** Lo que cada tipo agrega para su columna "Detalle" (ej. la propuesta vigente de Discipulado). */
  extra?: Record<string, unknown>;
}

/** Lo que Discipulado (004) suma en `extra`: "propuesta a X, hace N días" (FR-008). */
export type ExtraBandejaDiscipulado = {
  propuestaVigente?: { discipulador: PersonaBreve; propuestaEn: string };
};

/** `GET /solicitudes/conteo-abiertas`: un número por tipo conectado (0 si no hay). */
export type ConteoAbiertas = { [T in TipoSolicitud]?: number };
