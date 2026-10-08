/**
 * H-44 (revisión manual): tipos y constantes de los cuatro pasos del
 * registro, separados de `formulario-registro.tsx` (antes 778 líneas) sin
 * cambiar ningún valor ni ninguna regla — solo mover código.
 */

export const TOTAL_PASOS = 4;
export const EDAD_MINIMA = 18;

/** H-50: a qué paso pertenece cada campo del DTO, para saltar ahí si el error del servidor lo señala. */
export const CAMPO_A_PASO: Record<string, number> = {
  apellido: 1,
  nombre: 1,
  genero: 1,
  fechaNacimiento: 1,
  telefono: 2,
  direccion: 2,
  sedeId: 2,
  estadoCivil: 3,
  profesion: 3,
  profesionDetalle: 3,
  congregaDesde: 3,
  // H-104: la casilla de consentimiento participa del sistema de errores
  // como cualquier otro campo — vive en el paso 4 (resumen).
  consentimientoDatos: 4,
};

export interface DatosFormulario {
  apellido: string;
  nombre: string;
  genero: string;
  fechaNacimiento: string;
  telefonoCodigoPais: string;
  telefonoNumero: string;
  direccion: string;
  sedeId: string;
  estadoCivil: string;
  profesion: string;
  profesionDetalle: string;
  /** D214: el año, como texto del select ('' = sin elegir). */
  congregaDesde: string;
  consentimientoDatos: boolean;
}
