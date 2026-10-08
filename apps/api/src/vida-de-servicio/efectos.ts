import type { EtapaCamino } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { RolesDeEstadoService } from '../persona/roles-de-estado.service.js';

/**
 * spec 008, FR-036 y FR-042 (research #9): lo que pasa cuando una Persona
 * completa una etapa. Si es Vida de Servicio, recibe el rol de estado
 * `apto_ministerio` por el ÚNICO lugar que escribe roles de estado
 * (`RolesDeEstadoService`, H-139: agrega, nunca reemplaza; idempotente). Para
 * las demás etapas no hace nada (FR-022 de la 004: Vida Nueva no da rol).
 *
 * La llaman la confirmación de la finalización de una edición (FR-036) y la
 * Completitud Manual de la 006 (confirmar un "Ya lo hice" o registrar la
 * etapa hecha, FR-042), dentro de su transacción.
 */
export async function alCompletarCategoria(tx: Prisma.TransactionClient, personaId: string, etapa: EtapaCamino): Promise<void> {
  if (etapa !== 'vida_de_servicio') return;
  // `otorgarRolDeEstado` escribe con el cliente que recibe: la transacción.
  await new RolesDeEstadoService(tx as unknown as PrismaService).otorgarRolDeEstado(personaId, 'apto_ministerio', tx);
}
