import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ESTADOS_QUE_OCUPAN_LUGAR, type EstadoInscripcionEvento, type EventoAviso } from '@vida-sobrenatural/shared-types';
import { AppException } from '../common/errors/app-exception.js';

/**
 * spec 011 — el motor de cupo (research #1 y #3, contracts/inscripciones-api.md
 * § Reglas). Toda operación que crea una Inscripción o la mueve de/a un
 * estado que ocupa lugar corre dentro de `conBloqueoDeEvento`, y si libera
 * lugar termina con `promoverDesdeLista`. Nadie reimplementa el conteo ni la
 * promoción (Principio XI).
 */

export interface ConfigCupo {
  tipo: 'general' | 'bautismo';
  requiereAprobacion: boolean;
  cupo: number | null;
  permiteListaEspera: boolean;
}

/** Transacción interactiva que empieza bloqueando la fila del Evento (`SELECT … FOR UPDATE`). */
export function conBloqueoDeEvento<T>(
  prisma: PrismaService,
  eventoId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const filas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM eventos WHERE id = ${eventoId} FOR UPDATE`;
    if (filas.length === 0) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
    return fn(tx);
  });
}

/** Inscripciones que ocupan lugar (`confirmada` + `pendiente`, D192). */
export function contarOcupados(tx: Prisma.TransactionClient, eventoId: string): Promise<number> {
  return tx.inscripcionEvento.count({ where: { eventoId, estado: { in: [...ESTADOS_QUE_OCUPAN_LUGAR] } } });
}

/**
 * FR-015, FR-047 — el estado con el que nace una Inscripción. Con lugar:
 * `confirmada`, o `pendiente` si el Evento requiere aprobación (el bautismo
 * nunca: lo inscribe el Admin). Sin lugar: `lista_espera` si el Evento la
 * permite; si no, `CUPO_LLENO`.
 */
export function decidirEstadoInicial(evento: ConfigCupo, ocupados: number): 'confirmada' | 'pendiente' | 'lista_espera' {
  const hayLugar = evento.cupo === null || ocupados < evento.cupo;
  if (hayLugar) return evento.requiereAprobacion && evento.tipo !== 'bautismo' ? 'pendiente' : 'confirmada';
  if (evento.permiteListaEspera && evento.tipo !== 'bautismo') return 'lista_espera';
  throw new AppException('CUPO_LLENO', 409, 'El cupo del Evento está completo.');
}

/** ¿Salir de este estado libera un lugar? Solo los que ocupan (D192). */
export function liberaLugar(estado: EstadoInscripcionEvento): boolean {
  return ESTADOS_QUE_OCUPAN_LUGAR.includes(estado);
}

/**
 * FR-018 (research #3) — la ÚNICA promoción: mientras haya lugar y el Evento
 * no esté cancelado ni haya empezado, pasa a la primera de la lista (orden
 * `enListaDesde`, `id`) a `confirmada` o `pendiente`, y emite
 * `evento.lista_espera_promovida` para cada una dentro de la transacción
 * (D197). Devuelve los ids promovidos. Se llama con el Evento ya bloqueado.
 */
export async function promoverDesdeLista(
  tx: Prisma.TransactionClient,
  eventoId: string,
  emitir: (tx: Prisma.TransactionClient, evento: EventoAviso) => Promise<unknown>,
  ahora: Date = new Date(),
): Promise<string[]> {
  const evento = await tx.evento.findUnique({
    where: { id: eventoId },
    select: { nombre: true, estado: true, inicio: true, cupo: true, requiereAprobacion: true, eliminadoEn: true },
  });
  if (!evento || evento.estado !== 'publicado' || evento.eliminadoEn || evento.inicio <= ahora) return [];
  const ocupados = await contarOcupados(tx, eventoId);
  const libres = evento.cupo === null ? Number.POSITIVE_INFINITY : evento.cupo - ocupados;
  if (libres <= 0) return [];
  const enLista = await tx.inscripcionEvento.findMany({
    where: { eventoId, estado: 'lista_espera' },
    orderBy: [{ enListaDesde: 'asc' }, { id: 'asc' }],
    take: Number.isFinite(libres) ? libres : undefined,
    select: { id: true, personaId: true },
  });
  const estadoNuevo = evento.requiereAprobacion ? 'pendiente' : 'confirmada';
  for (const inscripcion of enLista) {
    await tx.inscripcionEvento.update({
      where: { id: inscripcion.id },
      data: { estado: estadoNuevo, enListaDesde: null, promovidaEn: ahora },
    });
    await emitir(tx, {
      nombre: 'evento.lista_espera_promovida',
      a: { tipo: 'persona', personaId: inscripcion.personaId },
      datos: { inscripcionId: inscripcion.id, eventoId, evento: evento.nombre, estadoNuevo },
    });
  }
  return enLista.map((i) => i.id);
}

/** FR-017 — cuántas hay antes en la lista, más uno (la posición no se guarda). */
export async function posicionEnLista(
  tx: Prisma.TransactionClient,
  inscripcion: { id: string; eventoId: string; enListaDesde: Date | null },
): Promise<number | null> {
  if (!inscripcion.enListaDesde) return null;
  const antes = await tx.inscripcionEvento.count({
    where: {
      eventoId: inscripcion.eventoId,
      estado: 'lista_espera',
      OR: [
        { enListaDesde: { lt: inscripcion.enListaDesde } },
        { enListaDesde: inscripcion.enListaDesde, id: { lt: inscripcion.id } },
      ],
    },
  });
  return antes + 1;
}
