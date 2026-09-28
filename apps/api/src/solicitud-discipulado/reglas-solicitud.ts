import type { EstadoMiDiscipulado, Franja } from '@vida-sobrenatural/shared-types';
import { EDAD_MINIMA_PEDIR_VIDA_NUEVA_SOLO } from '@vida-sobrenatural/shared-types';
import type { AppExceptionErrorField } from '../common/errors/app-exception.js';

/**
 * specs/004, Historias 1 y 2 (contracts/solicitudes-api.md): las reglas puras
 * del pedido de Vida Nueva, separadas del acceso a datos para que cada rama
 * tenga su test unitario (Principio VI) sin simular Prisma.
 */

/**
 * FR-032: al menos una franja, y cada una con `diaSemana` 0..6, `inicio`/`fin`
 * en 0..1440 y `fin > inicio` (FR-017). Los códigos van bajo `VALIDACION`, en
 * el campo `franjas` (H-50): la pantalla los muestra debajo del editor.
 */
export function erroresDeFranjas(franjas: unknown): AppExceptionErrorField[] {
  if (!Array.isArray(franjas) || franjas.length === 0) {
    return [{ campo: 'franjas', code: 'FRANJAS_REQUERIDAS' }];
  }
  const codigos = new Set<string>();
  for (const f of franjas as Partial<Franja>[]) {
    if (!esEntero(f?.diaSemana) || f.diaSemana < 0 || f.diaSemana > 6) {
      codigos.add('DIA_SEMANA_INVALIDO');
      continue;
    }
    if (!esEntero(f.inicio) || !esEntero(f.fin) || f.inicio < 0 || f.fin > 1440) {
      codigos.add('FRANJAS_INVALIDO');
      continue;
    }
    if (f.fin <= f.inicio) codigos.add('FRANJA_FIN_ANTERIOR_AL_INICIO');
  }
  return [...codigos].map((code) => ({ campo: 'franjas', code }));
}

function esEntero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor);
}

/** FR-044: una Persona menor de 12 no pide sola; en su nombre, sí. */
export function puedePedirSola(edad: number): boolean {
  return edad >= EDAD_MINIMA_PEDIR_VIDA_NUEVA_SOLO;
}

/** Lo que `estadoPropio` junta de la base para decidir qué ve la Persona. */
export interface HechosMiDiscipulado {
  edad: number;
  /** Su Inscripción `activa` en Vida Nueva, con el Discipulador del Liderazgo vigente. */
  inscripcionActiva: {
    grupoId: string;
    desde: Date;
    discipulador: { nombre: string; apellido: string; telefono: string } | null;
  } | null;
  /** Su Inscripción `completada`, si terminó Vida Nueva. */
  inscripcionCompletada: { cerradaEn: Date | null; createdAt: Date } | null;
  /** Su última Solicitud (por fecha de creación), propia o en su nombre. */
  ultimaSolicitud: {
    id: string;
    estado: 'pendiente' | 'propuesta' | 'aprobada' | 'rechazada' | 'retirada';
    franjas: Franja[];
    createdAt: Date;
    /** Si está `aprobada`: cómo terminó la Inscripción que nació de ella. */
    inscripcion: { estado: 'activa' | 'completada' | 'abandono' | 'dada_de_baja'; cerradaEn: Date | null } | null;
  } | null;
}

/**
 * FR-026 a FR-028 y FR-044 (contracts/solicitudes-api.md, `GET /discipulado/me`).
 * Precedencia: Inscripción `activa` → `en_curso`; `completada` → `finalizado`;
 * Solicitud `pendiente` **o** `propuesta` → el mismo `buscando` (la Persona no
 * distingue, FR-026); si no, el desenlace de su última Solicitud: la baja de
 * la Inscripción que nació de ella → `baja`, o `rechazada`/`retirada` →
 * `puede_pedir` con `ultimo`. Un menor de 12 que quedaría en `puede_pedir`
 * ve `lo_pide_su_tutor` (no tiene botón que apretar). Nunca notas ni
 * capítulos, ni nada de la Propuesta (FR-029).
 */
export function estadoMiDiscipulado(h: HechosMiDiscipulado): EstadoMiDiscipulado {
  if (h.inscripcionActiva) {
    const d = h.inscripcionActiva.discipulador;
    return {
      estado: 'en_curso',
      grupoId: h.inscripcionActiva.grupoId,
      discipulador: d ?? { nombre: '', apellido: '', telefono: '' },
      desde: h.inscripcionActiva.desde.toISOString(),
    };
  }
  if (h.inscripcionCompletada) {
    const { cerradaEn, createdAt } = h.inscripcionCompletada;
    return { estado: 'finalizado', finalizadoEn: (cerradaEn ?? createdAt).toISOString() };
  }

  const s = h.ultimaSolicitud;
  if (s && (s.estado === 'pendiente' || s.estado === 'propuesta')) {
    return { estado: 'buscando', solicitudId: s.id, franjas: s.franjas, createdAt: s.createdAt.toISOString() };
  }
  if (s?.estado === 'aprobada' && s.inscripcion && (s.inscripcion.estado === 'abandono' || s.inscripcion.estado === 'dada_de_baja')) {
    return { estado: 'baja', en: (s.inscripcion.cerradaEn ?? s.createdAt).toISOString() };
  }

  if (!puedePedirSola(h.edad)) return { estado: 'lo_pide_su_tutor' };
  if (s?.estado === 'rechazada' || s?.estado === 'retirada') return { estado: 'puede_pedir', ultimo: s.estado };
  return { estado: 'puede_pedir' };
}
