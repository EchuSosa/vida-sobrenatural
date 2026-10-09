import type { ErrorDeCampo } from './api-field-error.js';
import { diaCivilEnArgentina } from './formato.js';

/**
 * spec 011 — Eventos. Lote 0 global: estados, límites y MIME. Los DTOs
 * (`EventoPublico`, `MiInscripcionEvento`, …) y las reglas puras
 * (`estadoPagoDeInscripcion`, `estadoInscripcionDeEvento`) los agrega la
 * sesión de la 011 en este archivo (T002). `instanteEnArgentina` está en
 * formato.ts y `destinoSeguro` en navegacion.ts (los usan otras specs).
 */

export type TipoEvento = 'general' | 'bautismo';
export type EstadoEvento = 'publicado' | 'cancelado';
export type EstadoInscripcionEvento = 'confirmada' | 'pendiente' | 'rechazada' | 'lista_espera' | 'cancelada';
export type MotivoCancelacionInscripcion = 'persona' | 'admin' | 'pago_rechazado';
export type MedioPago = 'transferencia' | 'efectivo' | 'otro';
export type EstadoPago = 'pendiente_verificacion' | 'verificado' | 'rechazado';

/** D192: ocupan lugar. */
export const ESTADOS_QUE_OCUPAN_LUGAR: readonly EstadoInscripcionEvento[] = ['confirmada', 'pendiente'];
/** research #2: una sola abierta por Persona y Evento (índice parcial). */
export const ESTADOS_INSCRIPCION_ABIERTA: readonly EstadoInscripcionEvento[] = ['confirmada', 'pendiente', 'lista_espera'];

export const EVENTO_NOMBRE_MAX = 120;
export const EVENTO_DESCRIPCION_MAX = 5000;
export const EVENTO_LUGAR_MAX = 300;
export const INSTRUCCIONES_PAGO_MAX = 1000;
export const DIAS_RECORDATORIO_MAX = 60;
/** D195 */
export const MIME_TIPOS_COMPROBANTE_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const COMPROBANTE_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const MIME_TIPOS_FLYER_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const FLYER_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

// ============================================================================
// spec 011 — tipos de respuesta y reglas puras (T002). Fuente de verdad única
// para la API (que los arma) y las dos apps (que los muestran).
// ============================================================================

/** research #4: el estado de pago de una Inscripción se deriva, no se guarda. */
export type EstadoPagoInscripcion = 'no_aplica' | 'sin_pago' | 'pendiente_verificacion' | 'verificado';

/** data-model.md: qué puede hacer quien mira la página del Evento (FR-002, FR-004, FR-005, FR-046). */
export type EstadoInscripcionDeEvento =
  | 'no_requiere'
  | 'abierta'
  | 'lista_espera'
  | 'cupo_completo'
  | 'cerrada'
  | 'cancelado'
  | 'solo_admin';

export interface SedeDeEvento {
  id: string;
  nombre: string;
  direccion: string;
}

/** `GET /eventos/publicos[/:slug]`: nunca incluye inscriptos (FR-046). Montos como string decimal. */
export interface EventoPublico {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  tipo: TipoEvento;
  inicio: string;
  fin: string | null;
  /** Ya resuelto: el propio del Evento o la dirección de la Sede (D190). */
  lugar: string;
  sede: SedeDeEvento;
  publicoObjetivo: string | null;
  imagenUrl: string | null;
  descripcionImagen: string | null;
  requiereInscripcion: boolean;
  requiereAprobacion: boolean;
  permiteListaEspera: boolean;
  cupo: number | null;
  lugaresDisponibles: number | null;
  costo: string | null;
  instruccionesPago: string | null;
  estado: EstadoEvento;
  estadoInscripcion: EstadoInscripcionDeEvento;
  /** Ampliación 2026-10-09 (FR-060): para quién es, con efecto (D220). */
  destinatarios: DestinatariosEvento;
  /** Ampliación 2026-10-09 (FR-064): las preguntas que se responden al anotarse, en orden. */
  preguntas: PreguntaEvento[];
}

/** Totales de un Evento para el backoffice (FR-009, FR-025). */
export interface TotalesEvento {
  ocupados: number;
  enEspera: number;
  pendientes: number;
  pagosAVerificar: number;
}

/** Fila de `GET /eventos` (backoffice). */
export interface EventoResumen extends TotalesEvento {
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoEvento;
  inicio: string;
  fin: string | null;
  estado: EstadoEvento;
  requiereInscripcion: boolean;
  cupo: number | null;
  sede: { id: string; nombre: string };
  eliminadoEn: string | null;
}

/** `GET /eventos/:id` (backoffice): todo lo público + lo que el Admin necesita para editar. */
export interface EventoDetalle extends EventoPublico, TotalesEvento {
  /** El `lugar` propio, sin resolver (null = el de la Sede) — para el formulario. */
  lugarPropio: string | null;
  diasAnticipacionRecordatorio: number | null;
  /** Todas, incluidas las canceladas (D119: eliminar solo sin ninguna, FR-042). */
  inscripcionesTotal: number;
  /** Pagos registrados en cualquier estado (FR-014: no cambiar el costo). */
  pagosTotal: number;
  creadoPor: { id: string; nombre: string; apellido: string } | null;
  createdAt: string;
  canceladoEn: string | null;
  eliminadoEn: string | null;
  /** Con cuántas respuestas cuenta cada una (FR-066: con respuestas no se borra ni cambia de tipo). */
  preguntas: PreguntaEventoGestion[];
}

/** Body de `POST /eventos` y `PATCH /eventos/:id` (contracts/eventos-api.md). */
export interface DatosEvento {
  sedeId: string;
  nombre: string;
  descripcion: string;
  tipo: TipoEvento;
  inicio: string;
  fin?: string | null;
  lugar?: string | null;
  publicoObjetivo?: string | null;
  requiereInscripcion: boolean;
  requiereAprobacion: boolean;
  cupo?: number | null;
  permiteListaEspera: boolean;
  costo?: string | null;
  instruccionesPago?: string | null;
  diasAnticipacionRecordatorio?: number | null;
  /** FR-060 — si no viene, queda como estaba (alta: `todas`). */
  destinatariosGenero?: GeneroDestinatario;
  edadMinima?: number | null;
  edadMaxima?: number | null;
  /** FR-064 — la lista COMPLETA, en orden; si no viene, no se tocan. Con `id`, edita esa. */
  preguntas?: DatosPreguntaEvento[];
}

export const EVENTO_NOMBRE_MIN = 3;
export const EVENTO_PUBLICO_OBJETIVO_MAX = 120;
export const EVENTO_DESCRIPCION_IMAGEN_MAX = 500;

export type FiltroEventos = 'proximos' | 'pasados' | 'cancelados' | 'todos';
export const FILTROS_EVENTOS: readonly FiltroEventos[] = ['proximos', 'pasados', 'cancelados', 'todos'];

/**
 * FR-002, FR-004, FR-005, FR-046 — qué estado de inscripción muestra la
 * página del Evento. El orden importa: un Evento cancelado lo dice antes que
 * nada; uno sin inscripción no tiene nada que abrir; uno que ya empezó está
 * cerrado (FR-019); el de bautismo solo lo inscribe el Admin.
 */
export function estadoInscripcionDeEvento(
  evento: {
    tipo: TipoEvento;
    estado: EstadoEvento;
    requiereInscripcion: boolean;
    inicio: string | Date;
    cupo: number | null;
    permiteListaEspera: boolean;
  },
  ocupados: number,
  ahora: Date = new Date(),
): EstadoInscripcionDeEvento {
  if (evento.estado === 'cancelado') return 'cancelado';
  if (!evento.requiereInscripcion) return 'no_requiere';
  if (new Date(evento.inicio).getTime() <= ahora.getTime()) return 'cerrada';
  if (evento.tipo === 'bautismo') return 'solo_admin';
  if (evento.cupo !== null && ocupados >= evento.cupo) {
    return evento.permiteListaEspera ? 'lista_espera' : 'cupo_completo';
  }
  return 'abierta';
}

/**
 * FR-024 (research #4, D148) — el estado de pago de una Inscripción a partir
 * de sus Pagos. Un verificado gana; si no, uno en revisión; si no, falta el
 * pago. `ultimoRechazo` es el motivo del rechazo más reciente, para que la
 * Persona sepa por qué tiene que volver a subirlo.
 */
export function estadoPagoDeInscripcion(
  costo: string | number | null,
  pagos: ReadonlyArray<{ estado: EstadoPago; createdAt: string | Date; motivoRechazo?: string | null }>,
): { estado: EstadoPagoInscripcion; ultimoRechazo: string | null } {
  if (costo === null || Number(costo) <= 0) return { estado: 'no_aplica', ultimoRechazo: null };
  const rechazados = pagos
    .filter((p) => p.estado === 'rechazado')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const ultimoRechazo = rechazados[0]?.motivoRechazo ?? null;
  if (pagos.some((p) => p.estado === 'verificado')) return { estado: 'verificado', ultimoRechazo: null };
  if (pagos.some((p) => p.estado === 'pendiente_verificacion')) return { estado: 'pendiente_verificacion', ultimoRechazo };
  return { estado: 'sin_pago', ultimoRechazo };
}

/** El último Pago de una Inscripción, para la Persona (FR-024). */
export interface UltimoPagoInscripcion {
  id: string;
  estado: EstadoPago;
  monto: string;
  medio: MedioPago;
  fechaPago: string;
  motivoRechazo: string | null;
  tieneComprobante: boolean;
}

/** Una Inscripción vista por su dueña (contracts/inscripciones-api.md). */
export interface MiInscripcionEvento {
  id: string;
  estado: EstadoInscripcionEvento;
  createdAt: string;
  /** Solo en `lista_espera` (FR-017). */
  posicionEnLista: number | null;
  promovidaEn: string | null;
  motivoRechazo: string | null;
  motivoCancelacion: MotivoCancelacionInscripcion | null;
  estadoPago: EstadoPagoInscripcion;
  /** Motivo del último pago rechazado, para saber qué corregir. */
  ultimoRechazoPago: string | null;
  ultimoPago: UltimoPagoInscripcion | null;
  evento: EventoPublico;
}

/** `GET /eventos/:id/mi-inscripcion`: lo que necesita la isla de la página del Evento. */
export interface MiInscripcionEnEvento {
  inscripcion: MiInscripcionEvento | null;
  lugaresDisponibles: number | null;
  estadoInscripcion: EstadoInscripcionDeEvento;
  /** FR-061: si quien mira está entre los destinatarios (si no, no ve el botón). */
  corresponde: boolean;
  /** FR-068: sus propias respuestas (también las sensibles), de la Inscripción mostrada. */
  respuestas: RespuestaEnInscripcion[];
}

export type CuandoMisInscripciones = 'proximas' | 'pasadas';

/** `PagoResumen` (contracts/pagos-api.md). */
export interface PagoResumen {
  id: string;
  inscripcionEventoId: string;
  monto: string;
  medio: MedioPago;
  fechaPago: string;
  estado: EstadoPago;
  tieneComprobante: boolean;
  comprobanteMime: string | null;
  creadoPor: { id: string; nombre: string; apellido: string } | null;
  verificadoPor: { id: string; nombre: string; apellido: string } | null;
  revisadoEn: string | null;
  motivoRechazo: string | null;
  createdAt: string;
}

/** Fila de `GET /pagos` y de la bandeja: el Pago con su Persona y su Evento. */
export interface PagoEnBandeja extends PagoResumen {
  persona: { id: string; nombre: string; apellido: string };
  evento: { id: string; nombre: string; inicio: string; slug: string };
}

export const MEDIOS_PAGO: readonly MedioPago[] = ['transferencia', 'efectivo', 'otro'];
export const MOTIVO_RECHAZO_PAGO_MAX = 500;

type PersonaBreveEvento = { id: string; nombre: string; apellido: string };

/** Fila de `GET /eventos/:id/inscripciones` (backoffice, FR-025). */
export interface InscripcionEventoResumen {
  id: string;
  persona: PersonaBreveEvento & { tieneAcceso: boolean };
  estado: EstadoInscripcionEvento;
  createdAt: string;
  creadoPor: PersonaBreveEvento | null;
  posicionEnLista: number | null;
  /** Subió desde la lista y el Admin todavía no marcó "Ya le avisé". */
  promovidaSinVer: boolean;
  estadoPago: EstadoPagoInscripcion;
  /** Confirmada en un Evento con costo, sin Pago verificado ni en revisión: días desde que se anotó. */
  diasSinPago: number | null;
  /** El Pago en revisión (para verificarlo desde el detalle). */
  pagoPendienteId: string | null;
  revisadoPor: PersonaBreveEvento | null;
  motivoRechazo: string | null;
  motivoCancelacion: MotivoCancelacionInscripcion | null;
  /** FR-062: el Admin la anotó aunque no estaba entre los destinatarios. */
  fueraDeDestinatarios: boolean;
  /** FR-067, FR-068: las respuestas; las sensibles solo para quien tiene `eventos.gestionar`. */
  respuestas: RespuestaEnInscripcion[];
  /** FR-070: lo que la app ya sabe de la Persona, para no preguntarlo. */
  datosPersona: DatosPersonaInscripta;
}

/** Inscripción con su Evento, para el perfil de una Persona y para la 010 (FR-048). */
export interface InscripcionDePersona {
  id: string;
  estado: EstadoInscripcionEvento;
  createdAt: string;
  estadoPago: EstadoPagoInscripcion;
  evento: { id: string; slug: string; nombre: string; tipo: TipoEvento; inicio: string; estado: EstadoEvento };
}

export interface ResultadoAprobarLote {
  aprobadas: string[];
  fallidas: Array<{ id: string; code: string }>;
}

export const APROBAR_LOTE_MAX = 50;
export const MOTIVO_RECHAZO_INSCRIPCION_MAX = 500;

// ---------------------------------------------------------------------------
// Ampliación 2026-10-09 (specs/011-eventos/ampliacion-2026-10-09.md, D220–D223):
// destinatarios con efecto y preguntas propias del Evento.
// ---------------------------------------------------------------------------

/** FR-060 — a quién está dirigido el Evento. */
export type GeneroDestinatario = 'todas' | 'mujeres' | 'varones';
export const GENEROS_DESTINATARIO: readonly GeneroDestinatario[] = ['todas', 'mujeres', 'varones'];
export const EDAD_DESTINATARIO_MAX = 120;

export interface DestinatariosEvento {
  genero: GeneroDestinatario;
  /** Años cumplidos a la fecha del Evento; null = sin límite. */
  edadMinima: number | null;
  edadMaxima: number | null;
}

/** ¿Tiene alguna restricción? (Sin restricción no se muestra nada nuevo.) */
export function tieneRestriccionDeDestinatarios(d: DestinatariosEvento): boolean {
  return d.genero !== 'todas' || d.edadMinima !== null || d.edadMaxima !== null;
}

/**
 * Años cumplidos el día civil (Argentina) de `fecha`. `fechaNacimiento` es una
 * fecha sin hora (YYYY-MM-DD o ISO a medianoche UTC, como la guarda la API).
 */
export function edadCumplidaEn(fechaNacimiento: string | Date, fecha: string | Date): number {
  const nac = (typeof fechaNacimiento === 'string' ? fechaNacimiento : fechaNacimiento.toISOString()).slice(0, 10);
  const dia = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : diaCivilEnArgentina(fecha);
  const [an, mn, dn] = nac.split('-').map(Number);
  const [ah, mh, dh] = dia.split('-').map(Number);
  let edad = ah - an;
  if (mh < mn || (mh === mn && dh < dn)) edad -= 1;
  return edad;
}

/**
 * FR-061 — ¿la Persona está entre los destinatarios? Edad en años cumplidos
 * al día del inicio del Evento. Una sola regla para la API y las dos apps.
 */
export function correspondeAlEvento(
  persona: { genero: 'masculino' | 'femenino'; fechaNacimiento: string | Date },
  destinatarios: DestinatariosEvento,
  inicioEvento: string | Date,
): boolean {
  if (destinatarios.genero === 'mujeres' && persona.genero !== 'femenino') return false;
  if (destinatarios.genero === 'varones' && persona.genero !== 'masculino') return false;
  if (destinatarios.edadMinima === null && destinatarios.edadMaxima === null) return true;
  const edad = edadCumplidaEn(persona.fechaNacimiento, inicioEvento);
  if (destinatarios.edadMinima !== null && edad < destinatarios.edadMinima) return false;
  if (destinatarios.edadMaxima !== null && edad > destinatarios.edadMaxima) return false;
  return true;
}

/** FR-060 — reglas de campo de los destinatarios (con un código por campo, H-50). */
export function validarDestinatarios(d: { genero: string; edadMinima: number | null; edadMaxima: number | null }): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];
  if (!GENEROS_DESTINATARIO.includes(d.genero as GeneroDestinatario)) errores.push({ campo: 'destinatariosGenero', code: 'DESTINATARIOS_GENERO_INVALIDO' });
  const valida = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= EDAD_DESTINATARIO_MAX);
  if (!valida(d.edadMinima)) errores.push({ campo: 'edadMinima', code: 'EDAD_INVALIDA' });
  if (!valida(d.edadMaxima)) errores.push({ campo: 'edadMaxima', code: 'EDAD_INVALIDA' });
  else if (valida(d.edadMinima) && d.edadMinima !== null && d.edadMaxima !== null && d.edadMaxima < d.edadMinima) {
    errores.push({ campo: 'edadMaxima', code: 'EDAD_MAXIMA_MENOR_A_MINIMA' });
  }
  return errores;
}

/** FR-064 — tipos de pregunta. */
export type TipoPreguntaEvento = 'si_no' | 'opcion' | 'texto';
export const TIPOS_PREGUNTA_EVENTO: readonly TipoPreguntaEvento[] = ['si_no', 'opcion', 'texto'];
export const PREGUNTAS_EVENTO_MAX = 10;
export const PREGUNTA_TEXTO_MAX = 200;
export const PREGUNTA_OPCIONES_MIN = 2;
export const PREGUNTA_OPCIONES_MAX = 10;
export const PREGUNTA_OPCION_MAX = 100;
/** FR-065 — "Texto corto". */
export const RESPUESTA_TEXTO_MAX = 200;
/** Valores guardados de una pregunta Sí/No. */
export const VALORES_SI_NO = ['si', 'no'] as const;
/** FR-069 — días después del fin del Evento en que se borran las respuestas sensibles (D222). */
export const DIAS_BORRADO_RESPUESTAS_SENSIBLES = 30;

export interface PreguntaEvento {
  id: string;
  texto: string;
  tipo: TipoPreguntaEvento;
  /** Solo en `opcion`; vacío en las demás. */
  opciones: string[];
  obligatoria: boolean;
  /** "Dato sensible (salud o alimentación)" (FR-068). */
  sensible: boolean;
}

export interface PreguntaEventoGestion extends PreguntaEvento {
  respuestas: number;
}

/** Una pregunta en el body del Evento. Sin `id`, es nueva. */
export interface DatosPreguntaEvento {
  id?: string;
  texto: string;
  tipo: TipoPreguntaEvento;
  opciones?: string[];
  obligatoria: boolean;
  sensible: boolean;
}

/** Body de la inscripción: una por pregunta respondida. */
export interface RespuestaPregunta {
  preguntaId: string;
  valor: string;
}

export interface RespuestaEnInscripcion {
  preguntaId: string;
  pregunta: string;
  tipo: TipoPreguntaEvento;
  sensible: boolean;
  valor: string;
}

/** FR-067 — resumen por pregunta (lista de inscriptos del backoffice). */
export interface ResumenPreguntaEvento {
  preguntaId: string;
  texto: string;
  tipo: TipoPreguntaEvento;
  sensible: boolean;
  /** Sí/No y Una opción: cuántas eligieron cada valor (en el orden de las opciones). */
  conteos: Array<{ valor: string; cantidad: number }>;
  /** Cuántas Inscripciones abiertas la respondieron. */
  respondidas: number;
}

/** FR-070 — lo que la app ya sabe de cada inscripta. */
export interface DatosPersonaInscripta {
  edad: number;
  telefono: string | null;
  ministerios: string[];
  /** Quien la acompaña en su Grupo (Discipulador o Líder) más reciente. */
  referente: string | null;
  /** Grupo de extensión y su líder: lo completa la spec 014 cuando esté en `main`. */
  grupoExtension: { nombre: string; lider: string | null } | null;
}

/** El campo del error de una respuesta (H-50): `respuesta-<preguntaId>`. */
export function campoDeRespuesta(preguntaId: string): string {
  return `respuesta-${preguntaId}`;
}

/** El campo del error de una pregunta del formulario del Evento: `pregunta-<i>-<parte>`. */
export function campoDePregunta(indice: number, parte: 'texto' | 'opciones' | 'tipo'): string {
  return `pregunta-${indice}-${parte}`;
}

/**
 * FR-064 — reglas de las preguntas del formulario del Evento (un código por
 * campo). Las que dependen de las respuestas ya dadas (FR-066) las aplica la API.
 */
export function validarPreguntas(preguntas: readonly DatosPreguntaEvento[]): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];
  if (preguntas.length > PREGUNTAS_EVENTO_MAX) errores.push({ campo: 'preguntas', code: 'PREGUNTAS_DEMASIADAS' });
  preguntas.forEach((p, i) => {
    const texto = (p.texto ?? '').trim();
    if (texto === '') errores.push({ campo: campoDePregunta(i, 'texto'), code: 'PREGUNTA_TEXTO_REQUERIDO' });
    else if (texto.length > PREGUNTA_TEXTO_MAX) errores.push({ campo: campoDePregunta(i, 'texto'), code: 'PREGUNTA_TEXTO_DEMASIADO_LARGO' });
    if (!TIPOS_PREGUNTA_EVENTO.includes(p.tipo)) errores.push({ campo: campoDePregunta(i, 'tipo'), code: 'PREGUNTA_TIPO_INVALIDO' });
    if (p.tipo === 'opcion') {
      const opciones = (p.opciones ?? []).map((o) => o.trim());
      const distintas = new Set(opciones.map((o) => o.toLocaleLowerCase('es')));
      if (
        opciones.length < PREGUNTA_OPCIONES_MIN ||
        opciones.length > PREGUNTA_OPCIONES_MAX ||
        opciones.some((o) => o === '' || o.length > PREGUNTA_OPCION_MAX) ||
        distintas.size !== opciones.length
      ) {
        errores.push({ campo: campoDePregunta(i, 'opciones'), code: 'PREGUNTA_OPCIONES_INVALIDAS' });
      }
    }
  });
  return errores;
}

/**
 * FR-065 — valida las respuestas contra las preguntas del Evento. Devuelve
 * los errores por campo y las respuestas normalizadas (solo las respondidas).
 */
export function validarRespuestas(
  preguntas: readonly PreguntaEvento[],
  respuestas: readonly RespuestaPregunta[] | undefined,
): { errores: ErrorDeCampo[]; validas: RespuestaPregunta[] } {
  const errores: ErrorDeCampo[] = [];
  const validas: RespuestaPregunta[] = [];
  const porId = new Map<string, string>();
  for (const r of respuestas ?? []) {
    if (r && typeof r.preguntaId === 'string' && typeof r.valor === 'string') porId.set(r.preguntaId, r.valor);
  }
  for (const p of preguntas) {
    const campo = campoDeRespuesta(p.id);
    const valor = (porId.get(p.id) ?? '').trim();
    if (valor === '') {
      if (p.obligatoria) errores.push({ campo, code: 'RESPUESTA_REQUERIDA' });
      continue;
    }
    if (p.tipo === 'si_no' && !(VALORES_SI_NO as readonly string[]).includes(valor)) errores.push({ campo, code: 'RESPUESTA_INVALIDA' });
    else if (p.tipo === 'opcion' && !p.opciones.includes(valor)) errores.push({ campo, code: 'RESPUESTA_INVALIDA' });
    else if (p.tipo === 'texto' && valor.length > RESPUESTA_TEXTO_MAX) errores.push({ campo, code: 'RESPUESTA_DEMASIADO_LARGA' });
    else validas.push({ preguntaId: p.id, valor });
  }
  return { errores, validas };
}

/**
 * FR-063 — argumentos del texto "Este evento es para {genero}{ desde N años}{ hasta M años}"
 * (ICU `select` en los dos `es.json`; "no" = sin ese tramo).
 */
export function argumentosTextoDestinatarios(d: DestinatariosEvento): { genero: GeneroDestinatario; desde: string; hasta: string } {
  return { genero: d.genero, desde: d.edadMinima === null ? 'no' : String(d.edadMinima), hasta: d.edadMaxima === null ? 'no' : String(d.edadMaxima) };
}
