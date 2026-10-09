import { Injectable } from '@nestjs/common';
import type { Cruce } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { CruceService } from './cruce.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { bloquearGrupo, bloquearPersona, bloquearReasignacionPendiente } from './bloqueos.js';
import { estaDisponible, franjasDe, franjasDeSolicitudes } from './consultas.js';
import { avisarReasignacionRetirada, exigirEnCurso } from './finalizacion.service.js';
import { interseccionDeFranjas } from './validaciones.js';

function yaPropuesta(): AppException {
  return new AppException('REASIGNACION_YA_PROPUESTA', 409, 'Ya hay una reasignación propuesta para este discipulado: retirala antes de proponer otra.');
}

/**
 * specs/004, T028 (FR-030, contracts/discipulado-api.md): la reasignación es
 * una PROPUESTA, no una asignación. El Admin elige en el cruce (el mismo
 * `CruceService` que al proponer una Solicitud, Principio XI) y el nuevo
 * Discipulador acepta desde Mis discipulados (`PropuestasService.aceptar`,
 * que cierra el Liderazgo vigente y abre el suyo). Hasta entonces, el
 * Liderazgo actual no se toca.
 */
@Injectable()
export class ReasignacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cruce: CruceService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * El cruce contra las franjas de la Solicitud de CADA Persona activa del
   * Grupo: coincide quien coincide con todas (su intersección), excluyendo al
   * Discipulador vigente. Sin "sumar a otro Grupo": una reasignación mueve el
   * Grupo entero, no lo junta con otro — por eso `gruposConLugar` va vacío.
   */
  async cruceDeReasignacion(grupoId: string): Promise<Cruce> {
    const grupo = await this.prisma.grupo.findUnique({ where: { id: grupoId }, select: { id: true, estado: true } });
    if (!grupo) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos este discipulado.');
    if (grupo.estado !== 'en_curso') throw new AppException('DISCIPULADO_NO_EN_CURSO', 409, 'Este discipulado ya no está en curso.');

    const [vigente, inscripciones] = await Promise.all([
      this.prisma.liderazgo.findFirst({ where: { grupoId, hasta: null }, select: { personaId: true } }),
      this.prisma.inscripcion.findMany({ where: { grupoId, estado: 'activa' }, select: { personaId: true, solicitudId: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    const franjas = await franjasDeSolicitudes(this.prisma, inscripciones.map((i) => i.solicitudId));
    const objetivo = interseccionDeFranjas(inscripciones.map((i) => franjasDe(franjas, i.solicitudId)));
    // Género: el de la primera Persona. Un Grupo se arma con la regla de
    // género (D138); si el Admin juntó géneros distintos (D25), la regla se
    // evalúa contra la primera y el Admin igual ve a todos con la razón.
    const primera = inscripciones[0]
      ? await this.prisma.persona.findUnique({ where: { id: inscripciones[0].personaId }, select: { genero: true } })
      : null;

    const cruce = await this.cruce.cruce(objetivo, primera?.genero ?? '', vigente?.personaId);
    return {
      ...cruce,
      franjas: cruce.franjas.map((f) => ({ ...f, coinciden: f.coinciden.map((d) => ({ ...d, gruposConLugar: [] })) })),
      noCoinciden: cruce.noCoinciden.map((d) => ({ ...d, gruposConLugar: [] })),
    };
  }

  async proponer(grupoId: string, discipuladorId: string, adminId: string): Promise<{ propuestaId: string }> {
    const propuestaId = await this.prisma
      .$transaction(async (tx) => {
        // Grupo → Propuesta → Persona (el orden de todo el discipulado).
        const grupo = await bloquearGrupo(tx, grupoId);
        exigirEnCurso(grupo);
        if (await bloquearReasignacionPendiente(tx, grupoId)) throw yaPropuesta();
        const vigente = await tx.liderazgo.findFirst({ where: { grupoId, hasta: null }, select: { personaId: true } });
        if (vigente?.personaId === discipuladorId) {
          throw new AppException('REASIGNACION_AL_MISMO_DISCIPULADOR', 409, 'Esa Persona ya es quien acompaña este discipulado.');
        }
        // D137: con la fila del nuevo bloqueada, quitarle el rol espera a que esto termine.
        const nuevo = await bloquearPersona(tx, discipuladorId);
        if (!(await estaDisponible(tx, nuevo))) {
          throw new AppException('DISCIPULADOR_NO_DISPONIBLE', 409, 'Ese Discipulador ya no está disponible para recibir una propuesta.');
        }
        const propuesta = await tx.propuestaDiscipulado.create({
          data: { tipo: 'reasignacion', grupoId, discipuladorId, propuestaPorId: adminId, estado: 'pendiente' },
          select: { id: true },
        });
        await this.notificaciones.emitir(tx, {
          nombre: 'discipulado.propuesta_nueva',
          a: { tipo: 'discipulador', personaId: discipuladorId },
          datos: { propuestaId: propuesta.id, grupoId },
        });
        return propuesta.id;
      })
      .catch((e: unknown) => {
        // El índice único parcial (una pendiente por Grupo) es la última
        // palabra si dos pedidos pasaron a la vez: nunca un 500.
        if (typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002') throw yaPropuesta();
        throw e;
      });
    this.notificaciones.empujarEmails();
    return { propuestaId };
  }

  async retirar(grupoId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await bloquearGrupo(tx, grupoId);
      const pendiente = await bloquearReasignacionPendiente(tx, grupoId);
      if (!pendiente) throw new AppException('PROPUESTA_NO_VIGENTE', 409, 'No hay una reasignación propuesta: ya se respondió o ya se retiró.');
      await tx.propuestaDiscipulado.update({ where: { id: pendiente.id }, data: { estado: 'retirada', retiradaPor: 'admin' }, select: { id: true } });
      // El catálogo (D201) manda `propuesta_retirada` al Admin: solo log, sin
      // aviso. Y al Discipulador que la tenía, que ya no hace falta responderla (D219).
      await this.notificaciones.emitir(tx, {
        nombre: 'discipulado.propuesta_retirada',
        a: { tipo: 'admin' },
        datos: { propuestaId: pendiente.id, retiradaPor: 'admin' },
      });
      await avisarReasignacionRetirada(tx, this.notificaciones, pendiente.id, pendiente.discipuladorId, grupoId);
    });
  }
}
