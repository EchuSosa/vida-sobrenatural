import type { PrismaService } from '../../src/prisma/prisma.service.js';
import type { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import type { EventoAviso } from '@vida-sobrenatural/shared-types';

/**
 * spec 006 — lo que los tests de integración de Mi camino agregan al
 * `Escenario` de la 004: borrar las declaraciones y Completitudes de sus
 * Personas ANTES de `escenario.limpiar()` (que no conoce esas tablas), y
 * registrar los avisos emitidos sin tocar `NotificacionesService`.
 */
export async function limpiarCamino(prisma: PrismaService, apellidoPrefijo: string): Promise<void> {
  const personas = (await prisma.persona.findMany({ where: { apellido: { startsWith: apellidoPrefijo } }, select: { id: true } })).map((p) => p.id);
  await prisma.completitudManual.deleteMany({ where: { personaId: { in: personas } } });
  await prisma.declaracionHistorial.deleteMany({ where: { personaId: { in: personas } } });
  await prisma.entregaNotificacion.deleteMany({ where: { personaId: { in: personas } } });
}

/**
 * Envuelve `emitir` para anotar cada evento que se emite y en qué estado
 * quedó la transacción que lo emitió (`confirmada` cuando el $transaction
 * terminó bien). Devuelve la lista y una función para restaurar.
 */
export function registrarAvisos(avisos: NotificacionesService): { emitidos: EventoAviso[]; restaurar: () => void } {
  const original = avisos.emitir.bind(avisos);
  const emitidos: EventoAviso[] = [];
  avisos.emitir = async (tx, evento) => {
    const resultado = await original(tx, evento);
    emitidos.push(evento);
    return resultado;
  };
  return { emitidos, restaurar: () => (avisos.emitir = original) };
}

/** Fecha de nacimiento de alguien que cumplió `anios` ayer. */
export function nacidoHace(anios: number): Date {
  const fecha = new Date();
  fecha.setUTCFullYear(fecha.getUTCFullYear() - anios);
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  fecha.setUTCHours(0, 0, 0, 0);
  return fecha;
}
