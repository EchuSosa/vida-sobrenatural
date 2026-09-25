import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  registrarCambioDeRol,
  type CambioDeRolARegistrar,
} from './registrar-cambio-de-rol.js';

/**
 * specs/005, Historia 6 (FR-022/FR-023, contracts/auditoria-api.md): el
 * historial de cambios de rol de cargo. Expone solo `registrar` (INSERT) y
 * `listar` — ningún método actualiza ni borra una fila, a propósito.
 */
@Injectable()
export class CambioDeRolService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dentro de la transacción del cambio de rol (RolesService), para que el cambio y su registro sean uno solo. */
  registrar(
    cambio: CambioDeRolARegistrar,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    return registrarCambioDeRol(db, cambio);
  }

  /**
   * GET /cambios-de-rol — paginado (H-42), el más reciente primero, filtrable
   * por `personaId`. Resuelve el nombre de quien lo hizo con una segunda
   * consulta (realizadoPorId es una referencia lógica, sin relación de
   * Prisma, D97); `realizadoPor: null` solo en filas de `recuperacion_cli`
   * (garantizado por CHECK en la base).
   */
  async listar(personaId: string | undefined, skip: number, take: number) {
    const where = personaId ? { personaId } : {};
    const [filas, total] = await Promise.all([
      this.prisma.cambioDeRol.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          personaId: true,
          rol: true,
          accion: true,
          origen: true,
          realizadoPorId: true,
          createdAt: true,
        },
      }),
      this.prisma.cambioDeRol.count({ where }),
    ]);
    const idsAutores = [
      ...new Set(
        filas
          .map((f) => f.realizadoPorId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const autores = idsAutores.length
      ? await this.prisma.persona.findMany({
          where: { id: { in: idsAutores } },
          select: { id: true, nombre: true, apellido: true },
        })
      : [];
    const autorPorId = new Map(autores.map((a) => [a.id, a]));
    const items = filas.map(({ realizadoPorId, ...fila }) => ({
      ...fila,
      realizadoPor: realizadoPorId
        ? (autorPorId.get(realizadoPorId) ?? {
            id: realizadoPorId,
            nombre: null,
            apellido: null,
          })
        : null,
    }));
    return { items, total };
  }
}
