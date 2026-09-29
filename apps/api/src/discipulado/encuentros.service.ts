import { Injectable } from '@nestjs/common';
import { hoyEnArgentina, type EncuentroDelDiscipulador } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import { bloquearGrupo } from './bloqueos.js';
import { exigirLiderazgoVigente } from './consultas.js';
import { aEncuentroDelDiscipulador, SELECT_ENCUENTRO_DEL_DISCIPULADOR } from './mis-discipulados.service.js';
import { asistenciasCompletas, validarEncuentro, type DatosEncuentro } from './validaciones.js';

type Tx = Prisma.TransactionClient;

function noEnCurso(): AppException {
  return new AppException('DISCIPULADO_NO_EN_CURSO', 409, 'Este discipulado ya terminó: no se pueden registrar ni editar Encuentros.');
}

/**
 * specs/004, Historia 5 (FR-009, FR-013, FR-013a, FR-041): el Discipulador
 * vigente registra y edita los Encuentros de su Grupo. No hay borrado. Con el
 * Grupo bloqueado, para que una finalización confirmada en paralelo no deje un
 * Encuentro nuevo en un Grupo cerrado.
 */
@Injectable()
export class EncuentrosService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(discipuladorId: string, grupoId: string, datos: DatosEncuentro): Promise<EncuentroDelDiscipulador> {
    return this.prisma.$transaction(async (tx) => {
      const grupo = await this.grupoPropio(tx, discipuladorId, grupoId);
      if (grupo.estado !== 'en_curso') throw noEnCurso();

      const activas = await tx.inscripcion.findMany({ where: { grupoId, estado: 'activa' }, select: { id: true } });
      const ids = activas.map((i) => i.id);
      const validado = validarEncuentro(datos, hoyEnArgentina(), new Set(ids), false);

      const creado = await tx.encuentro.create({
        data: {
          grupoId,
          fecha: new Date(`${validado.fecha}T00:00:00Z`),
          capitulos: validado.capitulos!,
          notas: validado.notas ?? null,
          registradoPorId: discipuladorId,
          asistencias: { create: asistenciasCompletas(ids, validado.asistencias) },
        },
        select: SELECT_ENCUENTRO_DEL_DISCIPULADOR,
      });
      return aEncuentroDelDiscipulador(creado);
    });
  }

  async editar(discipuladorId: string, grupoId: string, encuentroId: string, datos: DatosEncuentro): Promise<EncuentroDelDiscipulador> {
    return this.prisma.$transaction(async (tx) => {
      const grupo = await this.grupoPropio(tx, discipuladorId, grupoId);
      const encuentro = await tx.encuentro.findFirst({ where: { id: encuentroId, grupoId }, select: { id: true } });
      if (!encuentro) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos este Encuentro.');
      if (grupo.estado !== 'en_curso') throw noEnCurso();

      // Se puede corregir la asistencia de cualquier Persona que tuvo una en este
      // Encuentro, aunque después se haya dado de baja; y de las activas de hoy.
      const [conAsistencia, activas] = await Promise.all([
        tx.asistencia.findMany({ where: { encuentroId }, select: { inscripcionId: true } }),
        tx.inscripcion.findMany({ where: { grupoId, estado: 'activa' }, select: { id: true } }),
      ]);
      const permitidas = new Set([...conAsistencia.map((a) => a.inscripcionId), ...activas.map((i) => i.id)]);
      const validado = validarEncuentro(datos, hoyEnArgentina(), permitidas, true);

      for (const [inscripcionId, presente] of validado.asistencias ?? []) {
        await tx.asistencia.upsert({
          where: { encuentroId_inscripcionId: { encuentroId, inscripcionId } },
          create: { encuentroId, inscripcionId, presente },
          update: { presente },
          select: { id: true },
        });
      }
      const editado = await tx.encuentro.update({
        where: { id: encuentroId },
        data: {
          ...(validado.fecha !== undefined ? { fecha: new Date(`${validado.fecha}T00:00:00Z`) } : {}),
          ...(validado.capitulos !== undefined ? { capitulos: validado.capitulos } : {}),
          ...(validado.notas !== undefined ? { notas: validado.notas } : {}),
          // FR-041: la edición queda a la vista aunque solo haya cambiado una asistencia.
          updatedAt: new Date(),
        },
        select: SELECT_ENCUENTRO_DEL_DISCIPULADOR,
      });
      return aEncuentroDelDiscipulador(editado);
    });
  }

  /**
   * Principio V: primero "es tuyo" (404 si no), después el estado. El Grupo se
   * bloquea antes de mirar el Liderazgo: una reasignación aceptada en paralelo
   * (que también bloquea el Grupo) no puede cambiarlo entre la lectura y la escritura.
   */
  private async grupoPropio(tx: Tx, discipuladorId: string, grupoId: string) {
    const grupo = await bloquearGrupo(tx, grupoId);
    await exigirLiderazgoVigente(tx, discipuladorId, grupoId);
    return grupo;
  }
}
