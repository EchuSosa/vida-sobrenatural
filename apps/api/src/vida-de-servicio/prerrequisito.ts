import { cumplePrerrequisito, type MotivoNoCumple, type ViaPrerrequisito } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { completoEtapa, vidaNuevaEnMarcha } from '../camino/consultas.js';

type Db = PrismaService | Prisma.TransactionClient;

export type EstadoPrerrequisito = { cumple: true; via: ViaPrerrequisito } | { cumple: false; motivo: MotivoNoCumple };

/**
 * spec 008, FR-008/FR-009 (research #8): ¿la Persona cumple el prerrequisito
 * de Vida de Servicio (Vida Nueva completa), por qué vía, o por qué no? La
 * pregunta "¿completó la etapa?" es la única de la 006 (`completoEtapa`, D155):
 * acá solo se arma el detalle para el Admin (FR-015) y el motivo para la card
 * (FR-009). La regla pura (`cumplePrerrequisito`) decide con los dos insumos.
 * La usan Mi camino, crear la Solicitud (las dos vías) y aprobar.
 */
export async function estadoPrerrequisito(db: Db, personaId: string): Promise<EstadoPrerrequisito> {
  const como = await completoEtapa(db, personaId, 'vida_nueva');
  const cumple = cumplePrerrequisito(
    { inscripcionesCompletadas: como === 'sistema' ? ['vida_nueva'] : [], completitudes: como === 'historial' ? ['vida_nueva'] : [] },
    'vida_nueva',
  );
  if (cumple && como === 'sistema') {
    const inscripcion = await db.inscripcion.findFirst({
      where: { personaId, estado: 'completada', grupo: { curso: { categoria: 'vida_nueva' } } },
      orderBy: { cerradaEn: 'desc' },
      select: { grupoId: true, cerradaEn: true, grupo: { select: { curso: { select: { tipo: true } } } } },
    });
    if (inscripcion) {
      return {
        cumple: true,
        via: { via: 'inscripcion', grupoId: inscripcion.grupoId, cursoTipo: inscripcion.grupo.curso.tipo, cerradaEn: inscripcion.cerradaEn?.toISOString() ?? null },
      };
    }
  }
  if (cumple) {
    const completitud = await db.completitudManual.findFirst({
      where: { personaId, etapa: 'vida_nueva', anuladaEn: null },
      select: { registradaEn: true },
    });
    return { cumple: true, via: { via: 'completitud_manual', fecha: (completitud?.registradaEn ?? new Date()).toISOString() } };
  }
  if (await vidaNuevaEnMarcha(db, personaId)) return { cumple: false, motivo: 'vida_nueva_en_curso' };
  const declaracion = await db.declaracionHistorial.findFirst({ where: { personaId, etapa: 'vida_nueva', estado: 'pendiente' }, select: { id: true } });
  return { cumple: false, motivo: declaracion ? 'declaracion_en_revision' : 'sin_vida_nueva' };
}
