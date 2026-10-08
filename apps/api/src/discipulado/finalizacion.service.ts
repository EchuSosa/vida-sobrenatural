import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { bloquearGrupo, type GrupoBloqueado } from './bloqueos.js';
import { exigirLiderazgoVigente } from './consultas.js';
import { normalizarMotivo } from './validaciones.js';

type Tx = Prisma.TransactionClient;

export function exigirEnCurso(grupo: GrupoBloqueado): void {
  if (grupo.estado !== 'en_curso') {
    throw new AppException('DISCIPULADO_NO_EN_CURSO', 409, 'Este discipulado ya no está en curso.');
  }
}

/**
 * Al cerrarse un Grupo (por completado o porque se fue la última Persona), una
 * reasignación que estaba propuesta ya no tiene sobre qué aplicarse: se retira
 * como si la hubiera retirado el Admin, en la misma transacción. Si no, el
 * Discipulador la seguiría viendo para aceptar algo que va a fallar.
 */
export async function retirarReasignacionPendiente(tx: Tx, grupoId: string): Promise<string | null> {
  const pendiente = await tx.propuestaDiscipulado.findFirst({
    where: { grupoId, tipo: 'reasignacion', estado: 'pendiente' },
    select: { id: true },
  });
  if (!pendiente) return null;
  await tx.propuestaDiscipulado.update({ where: { id: pendiente.id }, data: { estado: 'retirada', retiradaPor: 'admin' }, select: { id: true } });
  return pendiente.id;
}

/**
 * specs/004, Historia 6 (FR-019 a FR-022, contracts/discipulado-api.md): el
 * Discipulador propone terminar; el Admin confirma o rechaza. Confirmar pasa
 * TODAS las Inscripciones activas a `completada` y cierra el Grupo por
 * `completado`. No toca ninguna columna de `personas` (FR-022: `apto_ministerio`
 * es otra decisión).
 */
@Injectable()
export class FinalizacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async proponer(discipuladorId: string, grupoId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const grupo = await bloquearGrupo(tx, grupoId);
      await exigirLiderazgoVigente(tx, discipuladorId, grupoId);
      exigirEnCurso(grupo);
      if (grupo.propuestaFinalizacionEn) {
        throw new AppException('FINALIZACION_YA_PROPUESTA', 409, 'La finalización ya está propuesta: falta que el Admin la confirme.');
      }
      await tx.grupo.update({
        where: { id: grupoId },
        data: { propuestaFinalizacionEn: new Date(), propuestaFinalizacionPorId: discipuladorId },
        select: { id: true },
      });
      await this.notificaciones.emitir(tx, { nombre: 'discipulado.finalizacion_propuesta', a: { tipo: 'admin' }, datos: { grupoId } });
    });
  }

  async confirmar(grupoId: string, adminId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const grupo = await bloquearGrupo(tx, grupoId);
      exigirEnCurso(grupo);
      if (!grupo.propuestaFinalizacionEn) throw finalizacionNoPropuesta();

      const ahora = new Date();
      const activas = await tx.inscripcion.findMany({ where: { grupoId, estado: 'activa' }, select: { id: true, personaId: true } });
      await tx.inscripcion.updateMany({ where: { grupoId, estado: 'activa' }, data: { estado: 'completada', cerradaEn: ahora } });
      await tx.grupo.update({
        where: { id: grupoId },
        data: { estado: 'finalizado', motivoCierre: 'completado', cerradoEn: ahora, cerradoPorId: adminId },
        select: { id: true },
      });
      await retirarReasignacionPendiente(tx, grupoId);
      for (const i of activas) {
        await this.notificaciones.emitir(tx, {
          nombre: 'discipulado.finalizacion_confirmada',
          a: { tipo: 'persona', personaId: i.personaId },
          datos: { grupoId, inscripcionId: i.id },
        });
      }
    });
  }

  /** FR-019a: limpia la propuesta y guarda el rechazo con su motivo; el Grupo sigue en curso. */
  async rechazar(grupoId: string, motivo: string | undefined): Promise<void> {
    const motivoLimpio = normalizarMotivo(motivo);
    await this.prisma.$transaction(async (tx) => {
      const grupo = await bloquearGrupo(tx, grupoId);
      exigirEnCurso(grupo);
      if (!grupo.propuestaFinalizacionEn) throw finalizacionNoPropuesta();
      await tx.grupo.update({
        where: { id: grupoId },
        data: {
          propuestaFinalizacionEn: null,
          propuestaFinalizacionPorId: null,
          finalizacionRechazadaEn: new Date(),
          finalizacionRechazadaMotivo: motivoLimpio,
        },
        select: { id: true },
      });
    });
  }
}

function finalizacionNoPropuesta(): AppException {
  return new AppException('FINALIZACION_NO_PROPUESTA', 409, 'No hay una finalización propuesta para este discipulado.');
}
