import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { bloquearGrupo, bloquearInscripcion } from './bloqueos.js';
import { exigirLiderazgoVigente } from './consultas.js';
import { exigirEnCurso, retirarReasignacionPendiente } from './finalizacion.service.js';
import { normalizarMotivo } from './validaciones.js';

/**
 * specs/004, Historia 8 (FR-042, research #15): la baja de UNA Persona de un
 * Grupo. El Discipulador la propone; el Admin confirma (Inscripción →
 * `abandono`; si era la última activa, el Grupo se cierra por `abandonado`) o
 * rechaza. La Persona sigue activa en la app y puede volver a pedir.
 */
@Injectable()
export class BajaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async proponer(discipuladorId: string, grupoId: string, inscripcionId: string, motivo: string | undefined): Promise<void> {
    const motivoLimpio = normalizarMotivo(motivo);
    await this.prisma.$transaction(async (tx) => {
      const grupo = await bloquearGrupo(tx, grupoId);
      await exigirLiderazgoVigente(tx, discipuladorId, grupoId);
      const inscripcion = await bloquearInscripcion(tx, grupoId, inscripcionId);
      exigirEnCurso(grupo);
      if (inscripcion.estado !== 'activa') {
        throw new AppException('DISCIPULADO_NO_EN_CURSO', 409, 'Esta Persona ya no está cursando en este Grupo.');
      }
      if (inscripcion.bajaPropuestaEn) {
        throw new AppException('BAJA_YA_PROPUESTA', 409, 'La baja de esta Persona ya está propuesta: falta que el Admin la confirme.');
      }
      await tx.inscripcion.update({
        where: { id: inscripcionId },
        data: { bajaPropuestaEn: new Date(), bajaPropuestaPorId: discipuladorId, bajaPropuestaMotivo: motivoLimpio },
        select: { id: true },
      });
      await this.notificaciones.emitir(tx, { nombre: 'discipulado.baja_propuesta', a: { tipo: 'admin' }, datos: { grupoId, inscripcionId } });
    });
  }

  async confirmar(grupoId: string, inscripcionId: string, adminId: string): Promise<{ grupoCerrado: boolean }> {
    const { grupoCerrado } = await this.prisma.$transaction(async (tx) => {
      const grupo = await bloquearGrupo(tx, grupoId);
      const inscripcion = await bloquearInscripcion(tx, grupoId, inscripcionId);
      exigirEnCurso(grupo);
      if (inscripcion.estado !== 'activa' || !inscripcion.bajaPropuestaEn) throw bajaNoPropuesta();

      const ahora = new Date();
      await tx.inscripcion.update({ where: { id: inscripcionId }, data: { estado: 'abandono', cerradaEn: ahora }, select: { id: true } });
      const quedan = await tx.inscripcion.count({ where: { grupoId, estado: 'activa' } });
      if (quedan === 0) {
        await tx.grupo.update({
          where: { id: grupoId },
          data: { estado: 'finalizado', motivoCierre: 'abandonado', cerradoEn: ahora, cerradoPorId: adminId },
          select: { id: true },
        });
        await retirarReasignacionPendiente(tx, grupoId);
      }
      await this.notificaciones.emitir(tx, {
        nombre: 'discipulado.baja_confirmada',
        a: { tipo: 'persona', personaId: inscripcion.personaId },
        datos: { grupoId, inscripcionId },
      });
      return { grupoCerrado: quedan === 0 };
    });
    return { grupoCerrado };
  }

  async rechazar(grupoId: string, inscripcionId: string, motivo: string | undefined): Promise<void> {
    const motivoLimpio = normalizarMotivo(motivo);
    await this.prisma.$transaction(async (tx) => {
      await bloquearGrupo(tx, grupoId);
      const inscripcion = await bloquearInscripcion(tx, grupoId, inscripcionId);
      if (inscripcion.estado !== 'activa' || !inscripcion.bajaPropuestaEn) throw bajaNoPropuesta();
      await tx.inscripcion.update({
        where: { id: inscripcionId },
        data: {
          bajaPropuestaEn: null,
          bajaPropuestaPorId: null,
          bajaPropuestaMotivo: null,
          bajaRechazadaEn: new Date(),
          bajaRechazadaMotivo: motivoLimpio,
        },
        select: { id: true },
      });
    });
  }
}

function bajaNoPropuesta(): AppException {
  return new AppException('BAJA_NO_PROPUESTA', 409, 'No hay una baja propuesta para esta Persona.');
}
