import type { EventoDeBautismoResumen, HechosBautismo, VidaNuevaParaBautismo } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { completoEtapa } from '../camino/consultas.js';
import { calcularEdad } from '../persona/calcular-edad.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * spec 010, T011 (research #7) — los hechos de una Persona que deciden su
 * card y si puede pedir. "¿Completó Vida Nueva?" y "¿ya se bautizó?" salen de
 * `completoEtapa` (D155: la única consulta, sistema o historial), así que no
 * hay un puerto `HistorialPrevio` aparte (IMPLEMENTACION §4, 010).
 */

/** El select del Evento que necesita `EventoDeBautismoResumen` (lugar resuelto con la Sede, D190). */
export const EVENTO_RESUMEN_SELECT = {
  id: true,
  nombre: true,
  slug: true,
  inicio: true,
  fin: true,
  lugar: true,
  sede: { select: { direccion: true } },
} as const satisfies Prisma.EventoSelect;

type EventoLeido = Prisma.EventoGetPayload<{ select: typeof EVENTO_RESUMEN_SELECT }>;

export function aEventoResumen(e: EventoLeido): EventoDeBautismoResumen {
  return {
    id: e.id,
    nombre: e.nombre,
    slug: e.slug,
    inicio: e.inicio.toISOString(),
    fin: e.fin?.toISOString() ?? null,
    lugar: e.lugar?.trim() || e.sede.direccion,
  };
}

/**
 * FR-002 (D147): Vida Nueva `en_curso` = una Inscripción activa en un Grupo de
 * Vida Nueva (no alcanza un pedido sin Discipulador todavía); `completada` =
 * `completoEtapa` (Inscripción completada o etapa registrada como hecha).
 */
export async function vidaNuevaDe(db: Db, personaId: string): Promise<{ estado: VidaNuevaParaBautismo; desde: string | null }> {
  if (await completoEtapa(db, personaId, 'vida_nueva')) return { estado: 'completada', desde: null };
  const activa = await db.inscripcion.findFirst({
    where: { personaId, estado: 'activa', grupo: { curso: { categoria: 'vida_nueva' } } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  return activa ? { estado: 'en_curso', desde: activa.createdAt.toISOString() } : { estado: 'ninguna', desde: null };
}

/**
 * FR-030: el ÚNICO lugar que responde "¿está bautizada?": una Solicitud
 * `realizada` (con su fecha) o la etapa registrada como hecha por historial
 * (D144; sin fecha conocida).
 */
export async function estaBautizada(db: Db, personaId: string): Promise<{ si: boolean; en: string | null }> {
  const como = await completoEtapa(db, personaId, 'bautismo');
  if (!como) return { si: false, en: null };
  if (como === 'historial') return { si: true, en: null };
  const realizada = await db.solicitudBautismo.findFirst({
    where: { personaId, estado: 'realizada' },
    orderBy: { realizadaEn: 'desc' },
    select: { realizadaEn: true },
  });
  return { si: true, en: realizada?.realizadaEn?.toISOString() ?? null };
}

/** La Solicitud abierta (a lo sumo una, FR-004) con su Evento asignado vigente. */
export async function solicitudAbiertaDe(db: Db, personaId: string) {
  return db.solicitudBautismo.findFirst({
    where: { personaId, estado: { in: ['pendiente', 'aprobada'] } },
    select: {
      id: true,
      estado: true,
      createdAt: true,
      revisadaEn: true,
      inscripcionEvento: { select: { id: true, estado: true, evento: { select: EVENTO_RESUMEN_SELECT } } },
    },
  });
}

/** Todo lo que necesitan `estadoCardBautismo` y `motivoNoPuedePedir`. */
export async function hechosDe(db: Db, personaId: string, ahora: Date = new Date()): Promise<HechosBautismo | null> {
  const persona = await db.persona.findUnique({
    where: { id: personaId },
    select: { fechaNacimiento: true, bautismoHabilitadoEn: true },
  });
  if (!persona) return null;
  const [vidaNueva, bautizada, abierta, ultimaCerrada] = await Promise.all([
    vidaNuevaDe(db, personaId),
    estaBautizada(db, personaId),
    solicitudAbiertaDe(db, personaId),
    db.solicitudBautismo.findFirst({
      where: { personaId, estado: { in: ['rechazada', 'retirada'] } },
      orderBy: { updatedAt: 'desc' },
      select: { estado: true },
    }),
  ]);
  const inscripcion = abierta?.inscripcionEvento;
  return {
    vidaNueva: vidaNueva.estado,
    habilitada: persona.bautismoHabilitadoEn !== null,
    edad: calcularEdad(persona.fechaNacimiento, ahora),
    solicitudAbierta: abierta
      ? {
          id: abierta.id,
          estado: abierta.estado as 'pendiente' | 'aprobada',
          createdAt: abierta.createdAt.toISOString(),
          revisadaEn: abierta.revisadaEn?.toISOString() ?? null,
        }
      : null,
    ultimoDesenlace: (ultimaCerrada?.estado as 'rechazada' | 'retirada' | undefined) ?? null,
    bautizada: bautizada.si,
    bautizadaEn: bautizada.en,
    eventoAsignado: inscripcion && inscripcion.estado !== 'cancelada' ? aEventoResumen(inscripcion.evento) : null,
    ahora: ahora.toISOString(),
  };
}

/** research #10: bloquea las Solicitudes en orden de id (evita interbloqueos entre transacciones). */
export async function bloquearSolicitudes(tx: Prisma.TransactionClient, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const ordenados = [...new Set(ids)].sort();
  await tx.$queryRaw`SELECT "id" FROM "solicitudes_bautismo" WHERE "id" = ANY(${ordenados}::text[]) ORDER BY "id" FOR UPDATE`;
}
