import { Injectable } from '@nestjs/common';
import type { RolDeEstado } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** El PrismaService o el cliente de una transacción en curso. */
type ClienteDb = PrismaService | Prisma.TransactionClient;

/**
 * specs/005, T054 (FR-019): el ÚNICO lugar donde el sistema escribe un rol de
 * ESTADO del proceso (`miembro_registrado`, y los que sumen las features
 * futuras — FR-021). Distinto de los roles de CARGO (RolesService), que son
 * siempre una acción manual del Admin y quedan auditados.
 *
 * AGREGA, nunca reemplaza el arreglo — y es idempotente (si ya lo tiene, no
 * hace nada), igual que otorgarRol con su `includes`. H-139: `activar`
 * escribía `rol = ['miembro_registrado']` y borraba en silencio un rol de
 * cargo otorgado mientras la Persona esperaba al tutor. Un solo UPDATE
 * atómico (`array_append` condicionado) en vez de leer-modificar-escribir:
 * tampoco una escritura concurrente de otro rol puede perderse entre la
 * lectura y la escritura.
 *
 * Sin condición de negocio propia: siempre se otorga, nunca se quita
 * (FR-019). Sitios de llamada hoy: el autorregistro de un adulto
 * (`PersonaService.create`) y la activación de un menor
 * (`PersonaService.activar`). El alta por Admin, cuando exista, es el tercero.
 */
@Injectable()
export class RolesDeEstadoService {
  constructor(private readonly prisma: PrismaService) {}

  async otorgarRolDeEstado(personaId: string, rol: RolDeEstado, db: ClienteDb = this.prisma): Promise<void> {
    await db.$executeRaw`UPDATE "personas" SET "rol" = array_append("rol", ${rol}::text) WHERE "id" = ${personaId} AND NOT (${rol}::text = ANY("rol"))`;
  }
}
