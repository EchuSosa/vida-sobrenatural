/**
 * spec 018 (D261–D264): la baja de la app. Una sola fuente para la API, la web y el backoffice.
 */

/** Lo que la persona (o el Admin) escribe para confirmar que entiende que no se puede deshacer. */
export const PALABRA_CONFIRMACION_BAJA = 'BAJA';

/** Largo máximo del motivo interno del Admin (no va a logs ni a avisos). */
export const MOTIVO_BAJA_MAX = 200;

/** Cómo queda la Persona (D261): se ve "Persona dada de baja" donde aparecía su nombre. */
export const NOMBRE_ANONIMO = { nombre: 'Persona', apellido: 'dada de baja' } as const;

/** Fecha de nacimiento fija: ni la edad queda (FR-002). */
export const FECHA_NACIMIENTO_ANONIMA = '1900-01-01';

/** ¿Escribió la palabra? Sin distinguir mayúsculas ni espacios alrededor. */
export function confirmacionBajaValida(valor: unknown): boolean {
  return typeof valor === 'string' && valor.trim().toUpperCase() === PALABRA_CONFIRMACION_BAJA;
}

/** Lo que devuelve la baja: cuánto se cerró, para el aviso al Admin. Sin datos personales. */
export interface ResultadoBaja {
  personaId: string;
  cerrados: {
    liderazgosMinisterio: number;
    liderazgosGrupoExtension: number;
    liderazgosGrupo: number;
    inscripciones: number;
    membresias: number;
    turnos: number;
    propuestas: number;
    pedidos: number;
  };
}
