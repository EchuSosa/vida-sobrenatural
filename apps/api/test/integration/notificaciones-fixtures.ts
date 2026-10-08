import type { PrismaService } from '../../src/prisma/prisma.service.js';

/**
 * spec 012 — avisos armados directo por Prisma para los tests de integración
 * (como hace el seed), y su limpieza: las Entregas de estas Personas, las
 * Notificaciones que crearon y las que quedaron sin Entregas.
 */
export async function crearAvisoManual(
  prisma: PrismaService,
  personaId: string,
  opciones: { autorId: string; titulo?: string; mensaje?: string; importante?: boolean; leida?: boolean; fecha?: Date },
): Promise<string> {
  const n = await prisma.notificacion.create({
    data: {
      tipo: 'manual',
      prioridad: opciones.importante ? 'importante' : 'normal',
      alcance: 'todos',
      titulo: opciones.titulo ?? 'Aviso de la iglesia',
      mensaje: opciones.mensaje ?? 'Mensaje del aviso.',
      creadoPorId: opciones.autorId,
      createdAt: opciones.fecha,
    },
    select: { id: true },
  });
  const e = await prisma.entregaNotificacion.create({
    data: { notificacionId: n.id, personaId, canal: 'app', estado: 'enviada', enviadaEn: new Date(), leidaEn: opciones.leida ? new Date() : null, createdAt: opciones.fecha },
    select: { id: true },
  });
  return e.id;
}

export async function crearAvisoAutomatico(
  prisma: PrismaService,
  personaId: string,
  opciones: { evento?: string; params?: Record<string, unknown>; leida?: boolean; fecha?: Date; importante?: boolean } = {},
): Promise<string> {
  const n = await prisma.notificacion.create({
    data: {
      tipo: 'automatica',
      prioridad: opciones.importante ? 'importante' : 'normal',
      alcance: 'persona',
      alcanceId: personaId,
      evento: opciones.evento ?? 'discipulado.finalizacion_confirmada',
      params: (opciones.params ?? { grupoId: 'g', inscripcionId: 'i' }) as object,
      createdAt: opciones.fecha,
    },
    select: { id: true },
  });
  const e = await prisma.entregaNotificacion.create({
    data: { notificacionId: n.id, personaId, canal: 'app', estado: 'enviada', enviadaEn: new Date(), leidaEn: opciones.leida ? new Date() : null, createdAt: opciones.fecha },
    select: { id: true },
  });
  return e.id;
}

export async function limpiarAvisos(prisma: PrismaService, personaIds: string[]): Promise<void> {
  const notificaciones = (
    await prisma.notificacion.findMany({
      where: { OR: [{ creadoPorId: { in: personaIds } }, { entregas: { some: { personaId: { in: personaIds } } } }] },
      select: { id: true },
    })
  ).map((n) => n.id);
  await prisma.entregaNotificacion.deleteMany({ where: { OR: [{ personaId: { in: personaIds } }, { notificacionId: { in: notificaciones } }] } });
  await prisma.notificacion.deleteMany({ where: { id: { in: notificaciones } } });
}
