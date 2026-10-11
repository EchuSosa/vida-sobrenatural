import type { PersonaBreve } from './discipulado.js';
import type { DecisionMembresia, MembresiaActual } from './ministerios.js';

/**
 * spec 015 — Elección de ministerio al terminar Vida de Servicio (D239–D242).
 * Reemplaza la encuesta en papel: la persona elige de 1 a 2 Ministerios y un
 * área de cada uno (Discipulados Vida Nueva aparte, D217), el líder de Vida de
 * Servicio hace la charla y deja notas privadas (D240), y el Admin confirma
 * cada área (D242).
 */

export const ELECCION_COMENTARIO_MAX = 500;
export const ELECCION_NOTAS_MAX = 2000;
export const ELECCION_MOTIVO_MAX = 500;

export type EstadoEleccionMinisterio = 'borrador' | 'charla_hecha' | 'resuelta' | 'cancelada';
export type ResultadoOpcionEleccion = 'pendiente' | 'confirmada' | 'descartada';

/**
 * Lo elegido de un Ministerio: su área (Célula) o, si el Ministerio no tiene
 * áreas (docs/22: Ceremonial, Mesa de entrada…), el Ministerio entero
 * (`celulaId: null`).
 */
export interface OpcionElegida {
  ministerioId: string;
  celulaId: string | null;
}

/** Lo que la regla necesita saber de cada Ministerio pedido (por `ministerioId`). */
export interface MinisterioParaValidar {
  /** Activo y sin eliminar. */
  disponible: boolean;
  /** Sus áreas activas: con alguna, se elige una; sin ninguna, el Ministerio entero. */
  areas: ReadonlyMap<string, { enParalelo: boolean }>;
}

export interface ErrorCampoEleccion {
  campo: 'opciones' | 'comentario' | 'notas';
  code:
    | 'ELECCION_VACIA'
    | 'ELECCION_MAXIMO_MINISTERIOS'
    | 'ELECCION_UN_AREA_POR_MINISTERIO'
    | 'ELECCION_AREA_NO_DISPONIBLE'
    | 'TEXTO_DEMASIADO_LARGO';
}

/**
 * D239: la regla única de la elección (la usan la API, la web y el backoffice,
 * Principio XI). De 1 a 2 Ministerios distintos fuera del paralelo, un área
 * por Ministerio, y como mucho un área en paralelo (Discipulados Vida Nueva).
 * Devuelve los errores por campo (H-50), sin repetir.
 */
export function validarEleccionMinisterio(
  opciones: readonly OpcionElegida[],
  ministerios: ReadonlyMap<string, MinisterioParaValidar>,
  textos: { comentario?: string | null; notas?: string | null } = {},
): ErrorCampoEleccion[] {
  const errores: ErrorCampoEleccion[] = [];
  const agregar = (e: ErrorCampoEleccion) => {
    if (!errores.some((x) => x.campo === e.campo && x.code === e.code)) errores.push(e);
  };
  if (opciones.length === 0) agregar({ campo: 'opciones', code: 'ELECCION_VACIA' });
  const porMinisterio = new Map<string, number>();
  let principales = 0;
  let enParalelo = 0;
  for (const o of opciones) {
    const ministerio = ministerios.get(o.ministerioId);
    // Con áreas activas se elige una de ellas; sin ninguna, el Ministerio entero.
    const area = o.celulaId === null ? null : ministerio?.areas.get(o.celulaId);
    const valida = !!ministerio && ministerio.disponible && (o.celulaId === null ? ministerio.areas.size === 0 : !!area);
    if (!valida) {
      agregar({ campo: 'opciones', code: 'ELECCION_AREA_NO_DISPONIBLE' });
      continue;
    }
    porMinisterio.set(o.ministerioId, (porMinisterio.get(o.ministerioId) ?? 0) + 1);
    if (porMinisterio.get(o.ministerioId) === 1) {
      if (area?.enParalelo) enParalelo += 1;
      else principales += 1;
    }
  }
  if ([...porMinisterio.values()].some((n) => n > 1)) agregar({ campo: 'opciones', code: 'ELECCION_UN_AREA_POR_MINISTERIO' });
  if (principales > MAX_MINISTERIOS_ELECCION || enParalelo > 1) agregar({ campo: 'opciones', code: 'ELECCION_MAXIMO_MINISTERIOS' });
  if ((textos.comentario?.length ?? 0) > ELECCION_COMENTARIO_MAX) agregar({ campo: 'comentario', code: 'TEXTO_DEMASIADO_LARGO' });
  if ((textos.notas?.length ?? 0) > ELECCION_NOTAS_MAX) agregar({ campo: 'notas', code: 'TEXTO_DEMASIADO_LARGO' });
  return errores;
}

/** D239: el mismo máximo que el de membresías (D241); se repite acá para no importar en ciclo. */
const MAX_MINISTERIOS_ELECCION = 2;

// --- Lo que se muestra ---

export interface AreaParaElegir {
  id: string;
  nombre: string;
  descripcion: string | null;
  enParalelo: boolean;
}

/** Un Ministerio del listado, con sus áreas activas (docs/22); sin áreas, se elige el Ministerio entero. */
export interface MinisterioParaElegir {
  id: string;
  nombre: string;
  descripcion: string;
  /** docs/22: "Requieren formación antes" vs "Para empezar a servir ya". */
  requiereFormacion: boolean;
  areas: AreaParaElegir[];
}

/** D239: lo que la app ya sabe de la persona — no se vuelve a preguntar. */
export interface DatosConocidos {
  nombre: string;
  apellido: string;
  telefono: string;
  grupoExtension: { nombre: string; lideres: string[] } | null;
}

export interface OpcionVista {
  id: string;
  ministerio: { id: string; nombre: string };
  /** null = el Ministerio entero (no tiene áreas). */
  celula: { id: string; nombre: string } | null;
  enParalelo: boolean;
  requiereFormacion: boolean;
  resultado: ResultadoOpcionEleccion;
  /** El Ministerio o el área se inactivaron después de elegirlos. */
  disponible: boolean;
}

/** La elección como la ve la persona: nunca las notas (D240). */
export interface EleccionVistaPersona {
  id: string;
  estado: EstadoEleccionMinisterio;
  comentario: string | null;
  opciones: OpcionVista[];
}

/** `GET /elecciones-ministerio/me`. */
export type MiEleccionMinisterio =
  | { disponible: false }
  | {
      disponible: true;
      edicion: { id: string; nombre: string };
      /** La elección de la edición está abierta (D239). */
      abierta: boolean;
      /** Puede elegir o cambiar: abierta y sin charla todavía. */
      editable: boolean;
      conocido: DatosConocidos;
      catalogo: MinisterioParaElegir[];
      eleccion: EleccionVistaPersona | null;
    };

/** Cuerpo de `PUT /elecciones-ministerio/me`. */
export interface GuardarMiEleccion {
  opciones: OpcionElegida[];
  comentario?: string | null;
}

/**
 * `GET /elecciones-ministerio/me/resumen` — lo que muestra la card de Ministerio
 * de Mi camino. `ninguna`: no hay nada que mostrar (siempre un objeto: un `null`
 * viaja como cuerpo vacío y no se puede leer como JSON).
 */
export type ResumenMiEleccion =
  | { estado: 'ninguna' }
  | { estado: 'puede_elegir'; edicion: { nombre: string } }
  | {
      estado: 'borrador' | 'charla_hecha';
      editable: boolean;
      opciones: Array<{ ministerio: string; celula: string | null }>;
    };

// --- Líder de Vida de Servicio (D240) ---

export interface FilaEleccionLider {
  persona: PersonaBreve;
  eleccion: {
    id: string;
    estado: EstadoEleccionMinisterio;
    opciones: Array<{ ministerio: string; celula: string | null }>;
  } | null;
}

/** `GET /vida-de-servicio/mis-grupos/:grupoId/elecciones`. */
export interface EleccionesDeMiGrupo {
  grupo: { id: string; nombre: string };
  eleccionAbierta: boolean;
  personas: FilaEleccionLider[];
}

/** La elección con lo que ve el líder: con las notas. */
export interface EleccionVistaLider extends EleccionVistaPersona {
  notas: string | null;
  notasPor: PersonaBreve | null;
  notasEn: string | null;
  charlaPor: PersonaBreve | null;
  charlaEn: string | null;
  cargadaPor: PersonaBreve | null;
  /** Versión optimista: el `updatedAt` que se leyó. */
  version: string;
}

/** `GET /vida-de-servicio/mis-grupos/:grupoId/elecciones/:personaId`. */
export interface DetalleEleccionLider {
  grupo: { id: string; nombre: string };
  persona: PersonaBreve & { telefono: string };
  conocido: DatosConocidos;
  catalogo: MinisterioParaElegir[];
  eleccion: EleccionVistaLider | null;
  /** Puede cambiar las opciones (ninguna resuelta por el Admin). */
  opcionesEditables: boolean;
  /** Puede escribir notas (no resuelta ni cancelada). */
  notasEditables: boolean;
}

/** Cuerpo de `PUT /vida-de-servicio/mis-grupos/:grupoId/elecciones/:personaId`. */
export interface GuardarEleccionLider {
  opciones: OpcionElegida[];
  notas?: string | null;
  /** Marca "Charla hecha" en el mismo paso. */
  charlaHecha?: boolean;
  /** El `version` que se leyó (versión optimista). */
  version?: string | null;
}

// --- Admin (D242) ---

export interface OpcionVistaAdmin extends OpcionVista {
  motivoDescarte?: string | null;
  resueltaPor: PersonaBreve | null;
  resueltaEn: string | null;
  /** Si es "Discipulados Vida Nueva": ofrecer el rol `discipulador` al confirmar (docs/22). */
  ofrecerRolDiscipulador: boolean;
}

/** `GET /elecciones-ministerio/:id`. Las notas solo con `solicitudes.aprobar` (D240). */
export interface DetalleEleccionAdmin {
  id: string;
  estado: EstadoEleccionMinisterio;
  createdAt: string;
  persona: PersonaBreve & { edad: number; telefono: string; email: string | null };
  edicion: { id: string; nombre: string };
  conocido: DatosConocidos;
  comentario: string | null;
  notas?: string | null;
  charlaPor: PersonaBreve | null;
  charlaEn: string | null;
  cargadaPor: PersonaBreve | null;
  /** D242: confirmar requiere que haya completado Vida de Servicio. */
  apta: boolean;
  /** D241: lo que ya tiene, por carril, para decidir sumar o reemplazar. */
  membresias: { principales: MembresiaActual[]; enParalelo: MembresiaActual[] };
  opciones: OpcionVistaAdmin[];
}

/** Cuerpo de `POST /elecciones-ministerio/:id/opciones/:opcionId/confirmar`. */
export interface ConfirmarOpcionEleccion extends DecisionMembresia {
  otorgarRolDiscipulador?: boolean;
}
