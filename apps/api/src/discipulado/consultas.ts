import { bloqueoVigente, hoyEnArgentina, type Franja } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * specs/004, lote B: consultas que comparten varios servicios del
 * discipulado (Principio XI: una sola definición de cada una).
 */

/**
 * FR-008/FR-042 (data-model → Inscripcion): la Persona cursa o completó Vida
 * Nueva si tiene una Inscripción `activa` o `completada` en un Grupo de Vida
 * Nueva. `abandono` y `dada_de_baja` NO cuentan: puede volver a pedir.
 *
 * TODO(merge): el lote A la necesita para crear una Solicitud (T016). Tiene
 * que usar esta, no escribir otra.
 */
export async function cursaOCompletoVidaNueva(db: Db, personaId: string): Promise<boolean> {
  const inscripcion = await db.inscripcion.findFirst({
    where: { personaId, estado: { in: ['activa', 'completada'] }, grupo: { curso: { categoria: 'vida_nueva' } } },
    select: { id: true },
  });
  return inscripcion !== null;
}

/**
 * Principio V: el discipulado es de quien tiene el Liderazgo VIGENTE sobre el
 * Grupo. Si no, 404 — igual que si el Grupo no existiera (una propuesta
 * pendiente no alcanza, ni un Liderazgo cerrado por reasignación).
 */
export async function exigirLiderazgoVigente(db: Db, personaId: string, grupoId: string): Promise<{ id: string; desde: Date }> {
  const liderazgo = await db.liderazgo.findFirst({
    where: { personaId, grupoId, hasta: null },
    select: { id: true, desde: true },
  });
  if (!liderazgo) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos este discipulado.');
  return liderazgo;
}

export async function nombresDe(db: Db, ids: string[]): Promise<Map<string, { id: string; nombre: string; apellido: string }>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();
  const personas = await db.persona.findMany({ where: { id: { in: unicos } }, select: { id: true, nombre: true, apellido: true } });
  return new Map(personas.map((p) => [p.id, p]));
}

export async function franjasDeSolicitudes(db: Db, solicitudIds: string[]): Promise<Map<string, Franja[]>> {
  const mapa = new Map<string, Franja[]>();
  if (solicitudIds.length === 0) return mapa;
  const filas = await db.franjaSolicitud.findMany({
    where: { solicitudId: { in: [...new Set(solicitudIds)] } },
    select: { solicitudId: true, diaSemana: true, inicio: true, fin: true },
    orderBy: [{ diaSemana: 'asc' }, { inicio: 'asc' }],
  });
  for (const f of filas) {
    const lista = mapa.get(f.solicitudId) ?? [];
    lista.push({ diaSemana: f.diaSemana, inicio: f.inicio, fin: f.fin });
    mapa.set(f.solicitudId, lista);
  }
  return mapa;
}

/**
 * FR-006 para UNA Persona, con su fila ya bloqueada (D137): rol
 * `discipulador`, `activo`, toggle prendido, al menos una franja de agenda
 * viva y ningún período de no disponibilidad vigente hoy (en Argentina). Es el
 * mismo criterio que `CruceService.disponibles` aplica en lote.
 *
 * TODO(merge): el lote A lo necesita al proponer (T024). Tiene que usar esta.
 */
export async function estaDisponible(
  db: Db,
  persona: { id: string; rol: string[]; activo: boolean; disponibleDiscipulado: boolean },
): Promise<boolean> {
  if (!persona.rol.includes('discipulador') || !persona.activo || !persona.disponibleDiscipulado) return false;
  const [franja, bloqueos] = await Promise.all([
    db.franjaAgenda.findFirst({ where: { personaId: persona.id, eliminadaEn: null }, select: { id: true } }),
    db.bloqueoDisponibilidad.findMany({ where: { personaId: persona.id, eliminadoEn: null }, select: { desde: true, hasta: true } }),
  ]);
  if (!franja) return false;
  const hoy = hoyEnArgentina();
  return !bloqueos.some((b) => bloqueoVigente({ desde: comoFechaCivil(b.desde), hasta: comoFechaCivil(b.hasta) }, hoy));
}

/** Fecha civil `YYYY-MM-DD` de un `@db.Date` (llega como Date a medianoche UTC). */
export function comoFechaCivil(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}
