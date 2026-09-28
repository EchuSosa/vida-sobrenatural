import {
  CAPITULOS_MAX,
  MINUTOS_MINIMOS_EN_COMUN,
  type Franja,
  MOTIVO_MAX,
  NOTAS_ENCUENTRO_MAX,
  type Contacto,
} from '@vida-sobrenatural/shared-types';
import { AppException, type AppExceptionErrorField } from '../common/errors/app-exception.js';

/**
 * specs/004, lote B: las reglas puras del discipulado — sin base, para que
 * los tests unitarios las prueben por rama (Principio VI) y los servicios las
 * llamen dentro de su transacción. Los errores de campo van bajo `VALIDACION`
 * con `errors: [{ campo, code }]` (H-50), con los códigos de campo de
 * `error-code.ts` (que NO son `ErrorCode`: caen en `VALIDACION`).
 */

export function errorDeValidacion(errors: AppExceptionErrorField[]): AppException {
  return new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', errors);
}

/** Motivo opcional de declinar, rechazar una finalización o una baja (FR-037, FR-019a, FR-042): hasta `MOTIVO_MAX`. Vacío = sin motivo. */
export function normalizarMotivo(motivo: string | undefined | null): string | null {
  const limpio = motivo?.trim() ?? '';
  if (limpio.length > MOTIVO_MAX) {
    throw errorDeValidacion([{ campo: 'motivo', code: 'MOTIVO_DEMASIADO_LARGO' }]);
  }
  return limpio === '' ? null : limpio;
}

export interface DatosEncuentro {
  fecha?: string;
  capitulos?: string;
  notas?: string | null;
  asistencias?: Array<{ inscripcionId: string; presente: boolean }>;
}

export interface EncuentroValidado {
  fecha?: string;
  capitulos?: string;
  notas?: string | null;
  asistencias?: Map<string, boolean>;
}

const FECHA_CIVIL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * FR-009/FR-013/FR-013a/FR-041: valida un Encuentro al registrar (`parcial =
 * false`: fecha y capítulos obligatorios) o al editar (`parcial = true`:
 * cualquier subconjunto). `hoy` es la fecha civil de Argentina
 * (`hoyEnArgentina()`, research #7). `inscripcionesDelGrupo` son las
 * Inscripciones a las que se puede cargar asistencia: una de otro Grupo es
 * error de campo. Junta todos los errores antes de tirar (H-50: se muestran
 * todos juntos, no de a uno).
 */
export function validarEncuentro(
  datos: DatosEncuentro,
  hoy: string,
  inscripcionesDelGrupo: ReadonlySet<string>,
  parcial: boolean,
): EncuentroValidado {
  const errores: AppExceptionErrorField[] = [];
  const resultado: EncuentroValidado = {};

  if (datos.fecha !== undefined || !parcial) {
    const fecha = datos.fecha?.trim() ?? '';
    if (!FECHA_CIVIL.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00Z`))) {
      errores.push({ campo: 'fecha', code: 'FECHA_REQUERIDA' });
    } else if (fecha > hoy) {
      errores.push({ campo: 'fecha', code: 'FECHA_FUTURA' });
    } else {
      resultado.fecha = fecha;
    }
  }

  if (datos.capitulos !== undefined || !parcial) {
    const capitulos = datos.capitulos?.trim() ?? '';
    if (capitulos === '' || capitulos.length > CAPITULOS_MAX) {
      errores.push({ campo: 'capitulos', code: 'CAPITULOS_REQUERIDO' });
    } else {
      resultado.capitulos = capitulos;
    }
  }

  if (datos.notas !== undefined) {
    const notas = datos.notas?.trim() ?? '';
    if (notas.length > NOTAS_ENCUENTRO_MAX) {
      errores.push({ campo: 'notas', code: 'NOTAS_DEMASIADO_LARGAS' });
    } else {
      resultado.notas = notas === '' ? null : notas;
    }
  }

  if (datos.asistencias !== undefined) {
    const mapa = new Map<string, boolean>();
    for (const a of datos.asistencias) {
      if (!inscripcionesDelGrupo.has(a.inscripcionId)) {
        errores.push({ campo: 'asistencias', code: 'INSCRIPCION_DE_OTRO_GRUPO' });
        break;
      }
      mapa.set(a.inscripcionId, a.presente);
    }
    resultado.asistencias = mapa;
  }

  if (errores.length > 0) throw errorDeValidacion(errores);
  return resultado;
}

/**
 * FR-013a: una Asistencia por cada Inscripción `activa` del Grupo; las que no
 * vinieron en el pedido, presentes.
 */
export function asistenciasCompletas(inscripcionesActivas: string[], marcadas: Map<string, boolean> | undefined): Array<{ inscripcionId: string; presente: boolean }> {
  return inscripcionesActivas.map((inscripcionId) => ({ inscripcionId, presente: marcadas?.get(inscripcionId) ?? true }));
}

export interface PersonaParaContacto {
  telefono: string;
  direccion: string;
  esMenor: boolean;
  tutorNombre: string | null;
  tutorApellido: string | null;
  tutorTelefono: string | null;
  /** La Persona vinculada como `tutor` por Relación Familiar (D112), si hay. */
  tutorVinculado: { nombre: string; apellido: string; telefono: string } | null;
}

/**
 * research #19, FR-011/FR-044: el contacto que ve el Discipulador — UNA
 * función. Adulto → sin tutor. Menor con Relación Familiar `tutor` → los
 * datos de esa Persona (el vínculo es la única fuente de verdad, D112). Menor
 * sin vínculo → los campos de texto que se cargaron al activarlo.
 */
export function contactoDe(p: PersonaParaContacto): Contacto {
  let tutor: Contacto['tutor'] = null;
  if (p.esMenor) {
    if (p.tutorVinculado) {
      tutor = { nombre: `${p.tutorVinculado.nombre} ${p.tutorVinculado.apellido}`, telefono: p.tutorVinculado.telefono };
    } else if (p.tutorNombre || p.tutorTelefono) {
      tutor = { nombre: [p.tutorNombre, p.tutorApellido].filter(Boolean).join(' '), telefono: p.tutorTelefono ?? '' };
    }
  }
  return { telefono: p.telefono, direccion: p.direccion, tutor };
}

/**
 * research #14: el horario de un Grupo no se guarda, se deriva — la
 * intersección de varias listas de franjas (la agenda del Discipulador y las
 * franjas de la Solicitud de cada Persona activa). Dos franjas del mismo día
 * se intersecan en su tramo común si ese tramo tiene al menos
 * `MINUTOS_MINIMOS_EN_COMUN` (la misma vara que `franjasCoinciden`). Sin
 * listas, no hay horario; con una sola, es esa.
 */
export function interseccionDeFranjas(listas: Franja[][]): Franja[] {
  if (listas.length === 0) return [];
  let actual = listas[0];
  for (const otra of listas.slice(1)) {
    const siguiente: Franja[] = [];
    for (const a of actual) {
      for (const b of otra) {
        if (a.diaSemana !== b.diaSemana) continue;
        const inicio = Math.max(a.inicio, b.inicio);
        const fin = Math.min(a.fin, b.fin);
        if (fin - inicio >= MINUTOS_MINIMOS_EN_COMUN) siguiente.push({ diaSemana: a.diaSemana, inicio, fin });
      }
    }
    actual = siguiente;
  }
  const vistas = new Set<string>();
  return actual
    .filter((f) => {
      const clave = `${f.diaSemana}-${f.inicio}-${f.fin}`;
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    })
    .sort((a, b) => a.diaSemana - b.diaSemana || a.inicio - b.inicio);
}
