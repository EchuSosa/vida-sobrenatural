import {
  esAptaParaMinisterio,
  type EstadoMiMinisterio,
  type EstadoPostulacion,
  type MotivoInactivacionPostulacion,
  type PendienteVista,
  type UltimoDesenlacePostulacion,
} from '@vida-sobrenatural/shared-types';

/** Una Postulación de la Persona, con lo justo para la card (sin motivos: FR-014). */
export interface PostulacionParaEstado {
  id: string;
  estado: EstadoPostulacion;
  motivoInactivacion: MotivoInactivacionPostulacion | null;
  requiereFormacion: boolean;
  /** D217: a un área que se sirve en paralelo ("Discipulados Vida Nueva"). */
  enParalelo: boolean;
  ministerio: { id: string; nombre: string; activo: boolean };
  celula: { id: string; nombre: string; activo: boolean } | null;
  createdAt: Date;
  revisadaEn: Date | null;
  retiradaEn: Date | null;
  inactivadaEn: Date | null;
}

/**
 * spec 009, T033 (contracts/postulaciones-api.md, precedencia): `aprobada` →
 * `miembro` (con la pendiente a otro, si hay); si no, `pendiente`; si no, apta
 * → `puede_postularse` con el desenlace más reciente (rechazada, retirada o
 * baja; una inactiva por cambio de Ministerio no se cuenta); si no, `no_apta`.
 * Pura: la prueba `estado-mi-ministerio.spec.ts` rama por rama (T034).
 */
export function estadoMiMinisterio(
  roles: readonly string[],
  postulaciones: readonly PostulacionParaEstado[],
): EstadoMiMinisterio {
  const pendiente = postulaciones.find((p) => p.estado === 'pendiente');
  const pendienteVista: PendienteVista | null = pendiente
    ? {
        postulacionId: pendiente.id,
        ministerio: {
          id: pendiente.ministerio.id,
          nombre: pendiente.ministerio.nombre,
        },
        celula: pendiente.celula
          ? { id: pendiente.celula.id, nombre: pendiente.celula.nombre }
          : null,
        requiereFormacion: pendiente.requiereFormacion,
        enParalelo: pendiente.enParalelo,
        createdAt: pendiente.createdAt.toISOString(),
      }
    : null;

  // D217: con la membresía del Ministerio y una en paralelo, la card muestra la del Ministerio.
  const aprobadas = postulaciones.filter((p) => p.estado === 'aprobada');
  const aprobada = aprobadas.find((p) => !p.enParalelo) ?? aprobadas[0];
  if (aprobada) {
    return {
      estado: 'miembro',
      membresia: {
        postulacionId: aprobada.id,
        ministerio: aprobada.ministerio,
        celula: aprobada.celula,
        desde: (aprobada.revisadaEn ?? aprobada.createdAt).toISOString(),
        enParalelo: aprobada.enParalelo,
      },
      pendiente: pendienteVista,
    };
  }
  if (pendienteVista) return { estado: 'pendiente', pendiente: pendienteVista };
  if (!esAptaParaMinisterio(roles)) return { estado: 'no_apta' };

  const ultimo = ultimoDesenlace(postulaciones);
  return ultimo
    ? { estado: 'puede_postularse', ultimo }
    : { estado: 'puede_postularse' };
}

function ultimoDesenlace(
  postulaciones: readonly PostulacionParaEstado[],
): UltimoDesenlacePostulacion | undefined {
  let mejor: UltimoDesenlacePostulacion | undefined;
  let mejorEn = -Infinity;
  for (const p of postulaciones) {
    const candidato = desenlaceDe(p);
    if (!candidato) continue;
    const en = new Date(candidato.en).getTime();
    if (en > mejorEn) {
      mejor = candidato;
      mejorEn = en;
    }
  }
  return mejor;
}

function desenlaceDe(
  p: PostulacionParaEstado,
): UltimoDesenlacePostulacion | undefined {
  const ministerio = { nombre: p.ministerio.nombre };
  if (p.estado === 'rechazada')
    return {
      tipo: 'rechazada',
      ministerio,
      en: (p.revisadaEn ?? p.createdAt).toISOString(),
    };
  if (p.estado === 'retirada')
    return {
      tipo: 'retirada',
      ministerio,
      en: (p.retiradaEn ?? p.createdAt).toISOString(),
    };
  if (p.estado === 'inactiva' && p.motivoInactivacion === 'baja') {
    return {
      tipo: 'baja',
      ministerio,
      en: (p.inactivadaEn ?? p.createdAt).toISOString(),
    };
  }
  return undefined;
}
