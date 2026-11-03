import { formatearDiaDeServicio, lugarDelTurno, type DatosAvisoTurno } from '@vida-sobrenatural/shared-types';

/** Los `datos` de un aviso de turno (D256): la fecha en palabras y "Ministerio — área". Sin datos personales. */
export function datosAvisoTurno(turnoId: string, ministerio: { id: string; nombre: string }, dia: string, area: string | null): DatosAvisoTurno {
  return { turnoId, ministerioId: ministerio.id, dia, fecha: formatearDiaDeServicio(dia, 'es'), lugar: lugarDelTurno(ministerio.nombre, area) };
}
