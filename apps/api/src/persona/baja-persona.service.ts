import { Injectable, Logger } from '@nestjs/common';
import {
  FECHA_NACIMIENTO_ANONIMA,
  MOTIVO_BAJA_MAX,
  NOMBRE_ANONIMO,
  ROLES_DE_CARGO,
  confirmacionBajaValida,
  type ResultadoBaja,
  type RolDeCargo,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { StorageService } from '../storage/storage.service.js';
import { bloquearPersona } from '../camino/consultas.js';
import { registrarCambioDeRol } from '../cambio-de-rol/registrar-cambio-de-rol.js';
import { liberarTurnosFuturos } from '../turnos/liberar-turnos.js';

/**
 * spec 018 (D261–D264): la baja de la app. Todo en UNA transacción (FR-008): se cierran los cargos
 * vigentes, se borran los textos libres y lo que la identifica, y la Persona queda anonimizada
 * ("Persona dada de baja", D261). La fila queda: sostiene registros de otros (turnos pasados,
 * grupos, pagos). Los archivos privados se borran después del commit; si uno falla, queda en
 * `archivos_pendientes_de_borrar` para la tarea diaria (FR-004). El log lleva solo ids y conteos
 * (FR-009, Principio X).
 */
@Injectable()
export class BajaPersonaService {
  private readonly logger = new Logger('BajaPersona');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly storage: StorageService,
  ) {}

  async darDeBaja(personaId: string, autorId: string, cuerpo: { confirmacion?: unknown; motivo?: unknown }): Promise<ResultadoBaja> {
    if (!confirmacionBajaValida(cuerpo.confirmacion)) {
      throw new AppException('VALIDACION', 400, 'Para confirmar, escribí BAJA.', [{ campo: 'confirmacion', code: 'CONFIRMACION_BAJA_INVALIDA' }]);
    }
    const motivo = typeof cuerpo.motivo === 'string' && cuerpo.motivo.trim() ? cuerpo.motivo.trim() : null;
    if (motivo && motivo.length > MOTIVO_BAJA_MAX) {
      throw new AppException('VALIDACION', 400, `El motivo puede tener hasta ${MOTIVO_BAJA_MAX} caracteres.`, [{ campo: 'motivo', code: 'MOTIVO_BAJA_LARGO' }]);
    }

    const { resultado, archivos } = await this.prisma.$transaction(async (tx) => {
      if (!(await bloquearPersona(tx, personaId))) throw noEncontrada();
      const persona = await tx.persona.findUniqueOrThrow({ where: { id: personaId }, select: { email: true, rol: true, dadaDeBajaEn: true } });
      if (persona.dadaDeBajaEn) throw noEncontrada();
      if (persona.rol.includes('admin')) {
        const otros = await tx.persona.count({ where: { id: { not: personaId }, activo: true, dadaDeBajaEn: null, rol: { has: 'admin' } } });
        if (otros === 0) throw new AppException('ULTIMO_ADMIN', 409, 'Es el único Admin: primero tiene que haber otro.');
      }
      const ahora = new Date();
      const cerrados = await this.cerrarCargos(tx, personaId, autorId, ahora);
      const archivos = await this.borrarTextosYDatos(tx, personaId, persona.email);

      for (const rol of persona.rol.filter((r): r is RolDeCargo => (ROLES_DE_CARGO as readonly string[]).includes(r))) {
        await registrarCambioDeRol(tx, { personaId, rol, accion: 'quitado', actor: { origen: 'backoffice', realizadoPorId: autorId } });
      }
      await tx.persona.update({
        where: { id: personaId },
        data: {
          ...NOMBRE_ANONIMO,
          email: null,
          dni: null,
          fotoUrl: null,
          profesionDetalle: null,
          telefono: '',
          direccion: '',
          fechaNacimiento: new Date(`${FECHA_NACIMIENTO_ANONIMA}T00:00:00.000Z`),
          rol: [],
          activo: false,
          dadaDeBajaEn: ahora,
          dadaDeBajaPorId: autorId,
          motivoBajaInterno: autorId === personaId ? null : motivo,
        },
      });
      return { resultado: { personaId, cerrados }, archivos };
    });

    await this.borrarArchivos(archivos);
    this.logger.log({ tipo: 'PERSONA_DADA_DE_BAJA', personaId, autorId, cerrados: resultado.cerrados });
    return resultado;
  }

  /** D264: los cargos y lo que está en curso se cierran, con los avisos que ya existen (turnos). */
  private async cerrarCargos(tx: Prisma.TransactionClient, personaId: string, autorId: string, ahora: Date): Promise<ResultadoBaja['cerrados']> {
    const liderazgosMinisterio = (await tx.liderMinisterio.updateMany({ where: { personaId, hasta: null }, data: { hasta: ahora, quitadoPorId: autorId } })).count;
    const liderazgosGrupoExtension = (await tx.liderGrupoExtension.updateMany({ where: { personaId, hasta: null }, data: { hasta: ahora } })).count;
    const liderazgosGrupo = (await tx.liderazgo.updateMany({ where: { personaId, hasta: null }, data: { hasta: ahora, cerradoPorId: autorId } })).count;
    const inscripciones = (await tx.inscripcion.updateMany({ where: { personaId, estado: 'activa' }, data: { estado: 'dada_de_baja', cerradaEn: ahora } })).count;

    // Membresías (D170): sus turnos de hoy en adelante quedan para cubrir, con aviso a los líderes.
    let turnos = 0;
    const membresias = await tx.postulacion.findMany({ where: { personaId, estado: 'aprobada' }, select: { id: true, ministerioId: true } });
    for (const m of membresias) turnos += await liberarTurnosFuturos(tx, this.notificaciones, { personaId, ministerioId: m.ministerioId, autorId });
    await tx.postulacion.updateMany({ where: { personaId, estado: 'aprobada' }, data: { estado: 'inactiva', motivoInactivacion: 'baja', inactivadaEn: ahora, inactivadaPorId: autorId } });
    await tx.postulacion.updateMany({ where: { personaId, estado: 'pendiente' }, data: { estado: 'retirada' } });

    const solicitudes = (await tx.solicitudDiscipulado.findMany({ where: { personaId }, select: { id: true } })).map((s) => s.id);
    const propuestas = (
      await tx.propuestaDiscipulado.updateMany({
        where: { estado: 'pendiente', OR: [{ discipuladorId: personaId }, { solicitudId: { in: solicitudes } }] },
        data: { estado: 'retirada', retiradaPor: 'admin', respondidaEn: ahora },
      })
    ).count;

    const abierta = { in: ['pendiente', 'propuesta'] as ('pendiente' | 'propuesta')[] };
    let pedidos = 0;
    pedidos += (await tx.solicitudDiscipulado.updateMany({ where: { personaId, estado: abierta }, data: { estado: 'retirada' } })).count;
    pedidos += (await tx.solicitudVidaServicio.updateMany({ where: { personaId, estado: abierta }, data: { estado: 'retirada' } })).count;
    pedidos += (await tx.solicitudBautismo.updateMany({ where: { personaId, estado: { in: ['pendiente', 'aprobada'] } }, data: { estado: 'retirada' } })).count;
    pedidos += (await tx.declaracionHistorial.updateMany({ where: { personaId, estado: 'pendiente' }, data: { estado: 'retirada' } })).count;
    pedidos += (await tx.solicitudGrupoExtension.updateMany({ where: { personaId, estado: 'pendiente' }, data: { estado: 'retirada' } })).count;
    pedidos += (await tx.solicitudGrupoExtension.updateMany({ where: { personaId, estado: 'aceptada' }, data: { estado: 'finalizada', finalizadaPorId: autorId } })).count;
    pedidos += (await tx.eleccionMinisterio.updateMany({ where: { personaId, estado: { in: ['borrador', 'charla_hecha'] } }, data: { estado: 'cancelada' } })).count;
    pedidos += (
      await tx.inscripcionEvento.updateMany({
        where: { personaId, estado: { in: ['confirmada', 'pendiente', 'lista_espera'] } },
        data: { estado: 'cancelada', motivoCancelacion: 'persona', canceladaPorId: autorId },
      })
    ).count;

    return { liderazgosMinisterio, liderazgosGrupoExtension, liderazgosGrupo, inscripciones, membresias: membresias.length, turnos, propuestas, pedidos };
  }

  /**
   * FR-003: lo que la identifica o habla de ella, borrado. Lo que ella escribió sobre otros (notas
   * de Encuentros, motivos que puso como Admin) queda: es del registro del otro. Devuelve las rutas
   * de sus comprobantes, para borrarlas después del commit (FR-004).
   */
  private async borrarTextosYDatos(tx: Prisma.TransactionClient, personaId: string, email: string | null): Promise<string[]> {
    await tx.relacionFamiliar.deleteMany({ where: { OR: [{ personaId }, { familiarId: personaId }] } });
    await tx.franjaAgenda.deleteMany({ where: { personaId } });
    await tx.bloqueoDisponibilidad.deleteMany({ where: { personaId } });
    await this.notificaciones.borrarEntregasDe(tx, personaId);
    if (email) await tx.codigoIngreso.deleteMany({ where: { email } });

    // Sus comentarios de la app son suyos: se borran (con sesión no tienen contacto, CHECK de la 013).
    await tx.comentarioApp.deleteMany({ where: { personaId } });
    await tx.inscripcion.updateMany({ where: { personaId }, data: { bajaPropuestaMotivo: null, bajaRechazadaMotivo: null } });
    await tx.postulacion.updateMany({ where: { personaId }, data: { motivoRechazo: null, motivoBaja: null } });
    await tx.solicitudVidaServicio.updateMany({ where: { personaId }, data: { motivoRechazo: null } });
    await tx.solicitudBautismo.updateMany({ where: { personaId }, data: { comentario: null, motivoRechazo: null } });
    await tx.declaracionHistorial.updateMany({ where: { personaId }, data: { comentario: null, motivoRechazo: null } });
    await tx.solicitudGrupoExtension.updateMany({ where: { personaId }, data: { mensaje: null } });
    await tx.eleccionMinisterio.updateMany({ where: { personaId }, data: { comentario: null, notas: null } });
    await tx.completitudManual.updateMany({ where: { personaId }, data: { nota: null } });
    await tx.turno.updateMany({ where: { personaId }, data: { motivoCancelacion: null } });

    // Eventos: las respuestas (incluidas las sensibles, spec 011) se borran ya; los comprobantes, después.
    const inscripcionesEvento = (await tx.inscripcionEvento.findMany({ where: { personaId }, select: { id: true } })).map((i) => i.id);
    await tx.respuestaPreguntaEvento.deleteMany({ where: { inscripcionId: { in: inscripcionesEvento } } });
    await tx.inscripcionEvento.updateMany({ where: { personaId }, data: { motivoRechazo: null } });
    const pagos = await tx.pago.findMany({ where: { inscripcionEventoId: { in: inscripcionesEvento }, comprobanteRuta: { not: null } }, select: { comprobanteRuta: true } });
    await tx.pago.updateMany({ where: { inscripcionEventoId: { in: inscripcionesEvento } }, data: { comprobanteRuta: null, comprobanteMime: null, motivoRechazo: null } });
    return pagos.map((p) => p.comprobanteRuta!).filter(Boolean);
  }

  private async borrarArchivos(rutas: string[]): Promise<void> {
    for (const ruta of rutas) {
      try {
        await this.storage.eliminar(ruta, 'comprobantes');
      } catch {
        await this.prisma.archivoPendienteDeBorrar.create({ data: { ruta } });
        this.logger.warn({ tipo: 'ARCHIVO_DE_BAJA_PENDIENTE' });
      }
    }
  }

  /** FR-004: la tarea diaria reintenta los que no se pudieron borrar. */
  async reintentarArchivos(): Promise<{ borrados: number; siguen: number }> {
    const pendientes = await this.prisma.archivoPendienteDeBorrar.findMany({ take: 100, orderBy: { creadoEn: 'asc' } });
    let borrados = 0;
    for (const p of pendientes) {
      try {
        await this.storage.eliminar(p.ruta, 'comprobantes');
        await this.prisma.archivoPendienteDeBorrar.delete({ where: { id: p.id } });
        borrados += 1;
      } catch {
        await this.prisma.archivoPendienteDeBorrar.update({ where: { id: p.id }, data: { intentos: { increment: 1 } } });
      }
    }
    return { borrados, siguen: pendientes.length - borrados };
  }
}

function noEncontrada(): AppException {
  return new AppException('NO_ENCONTRADO', 404, 'No existe una Persona activa con ese id.');
}
