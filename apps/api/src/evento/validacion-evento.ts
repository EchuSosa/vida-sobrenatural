import {
  DIAS_RECORDATORIO_MAX,
  EVENTO_DESCRIPCION_MAX,
  EVENTO_LUGAR_MAX,
  EVENTO_NOMBRE_MAX,
  EVENTO_NOMBRE_MIN,
  EVENTO_PUBLICO_OBJETIVO_MAX,
  INSTRUCCIONES_PAGO_MAX,
  type ErrorDeCampo,
  type GeneroDestinatario,
  type TipoEvento,
  validarDestinatarios,
} from '@vida-sobrenatural/shared-types';

/**
 * spec 011, FR-010 y FR-045 — la configuración completa de un Evento (la que
 * queda después de aplicar un alta o una edición) y sus reglas de campo. Pura:
 * la usan el servicio y los tests. Devuelve TODOS los errores a la vez, para
 * que el formulario los marque juntos (H-50). Las reglas que dependen de lo
 * que ya pasó (inscriptos, pagos — FR-014) están en el servicio.
 */
export interface ConfigEvento {
  nombre: string;
  descripcion: string;
  tipo: TipoEvento;
  inicio: Date | null;
  fin: Date | null;
  lugar: string | null;
  publicoObjetivo: string | null;
  requiereInscripcion: boolean;
  requiereAprobacion: boolean;
  cupo: number | null;
  permiteListaEspera: boolean;
  costo: number | null;
  instruccionesPago: string | null;
  diasAnticipacionRecordatorio: number | null;
  /** Ampliación 2026-10-09 (FR-060). */
  destinatariosGenero: GeneroDestinatario;
  edadMinima: number | null;
  edadMaxima: number | null;
}

/** El costo máximo que entra en `Decimal(10, 2)`. */
const COSTO_MAXIMO = 99_999_999.99;

export function validarConfigEvento(c: ConfigEvento): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];
  const nombre = c.nombre.trim();
  if (nombre === '') errores.push({ campo: 'nombre', code: 'NOMBRE_REQUERIDO' });
  else if (nombre.length < EVENTO_NOMBRE_MIN) errores.push({ campo: 'nombre', code: 'NOMBRE_DEMASIADO_CORTO' });
  else if (nombre.length > EVENTO_NOMBRE_MAX) errores.push({ campo: 'nombre', code: 'NOMBRE_DEMASIADO_LARGO' });

  const descripcion = c.descripcion.trim();
  if (descripcion === '') errores.push({ campo: 'descripcion', code: 'DESCRIPCION_REQUERIDA' });
  else if (descripcion.length > EVENTO_DESCRIPCION_MAX) errores.push({ campo: 'descripcion', code: 'DESCRIPCION_DEMASIADO_LARGA' });

  if (!c.inicio || Number.isNaN(c.inicio.getTime())) errores.push({ campo: 'inicio', code: 'INICIO_REQUERIDO' });
  else if (c.fin && !Number.isNaN(c.fin.getTime()) && c.fin <= c.inicio) errores.push({ campo: 'fin', code: 'FIN_ANTERIOR_AL_INICIO' });
  if (c.fin && Number.isNaN(c.fin.getTime())) errores.push({ campo: 'fin', code: 'FIN_ANTERIOR_AL_INICIO' });

  if (c.lugar && c.lugar.length > EVENTO_LUGAR_MAX) errores.push({ campo: 'lugar', code: 'LUGAR_DEMASIADO_LARGO' });
  if (c.publicoObjetivo && c.publicoObjetivo.length > EVENTO_PUBLICO_OBJETIVO_MAX) {
    errores.push({ campo: 'publicoObjetivo', code: 'PUBLICO_OBJETIVO_DEMASIADO_LARGO' });
  }

  if (c.cupo !== null && (!Number.isInteger(c.cupo) || c.cupo < 1)) errores.push({ campo: 'cupo', code: 'CUPO_INVALIDO' });
  if (c.requiereAprobacion && !c.requiereInscripcion) errores.push({ campo: 'requiereAprobacion', code: 'APROBACION_SIN_INSCRIPCION' });
  if (c.permiteListaEspera && c.cupo === null) errores.push({ campo: 'permiteListaEspera', code: 'LISTA_ESPERA_SIN_CUPO' });

  if (c.costo !== null && (!Number.isFinite(c.costo) || c.costo <= 0 || c.costo > COSTO_MAXIMO)) {
    errores.push({ campo: 'costo', code: 'COSTO_INVALIDO' });
  }
  const instrucciones = c.instruccionesPago?.trim() ?? '';
  if (c.costo !== null && instrucciones === '') errores.push({ campo: 'instruccionesPago', code: 'INSTRUCCIONES_PAGO_REQUERIDAS' });
  if (instrucciones.length > INSTRUCCIONES_PAGO_MAX) errores.push({ campo: 'instruccionesPago', code: 'INSTRUCCIONES_PAGO_DEMASIADO_LARGAS' });

  const dias = c.diasAnticipacionRecordatorio;
  if (dias !== null && (!Number.isInteger(dias) || dias < 1 || dias > DIAS_RECORDATORIO_MAX || !c.requiereInscripcion)) {
    errores.push({ campo: 'diasAnticipacionRecordatorio', code: 'DIAS_RECORDATORIO_FUERA_DE_RANGO' });
  }

  errores.push(...validarDestinatarios({ genero: c.destinatariosGenero, edadMinima: c.edadMinima, edadMaxima: c.edadMaxima }));

  // FR-045: el bautismo siempre con inscripción, sin aprobación, costo, lista ni recordatorio.
  if (
    c.tipo === 'bautismo' &&
    (!c.requiereInscripcion || c.requiereAprobacion || c.costo !== null || c.permiteListaEspera || dias !== null ||
      c.destinatariosGenero !== 'todas' || c.edadMinima !== null || c.edadMaxima !== null)
  ) {
    errores.push({ campo: 'tipo', code: 'CONFIG_BAUTISMO_INVALIDA' });
  }
  return errores;
}
