import { Injectable } from '@nestjs/common';
import {
  EDAD_MINIMA_ROL_DE_CARGO,
  maxMembresiasDelCarril,
  sinAccesoALaApp,
  type AprobarPostulacion,
  type MinisterioDePersona,
  type PostulacionDetalle,
  type PostulacionEnNombreDe,
  type PostulacionHistorial,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { RolesDeEstadoService } from '../persona/roles-de-estado.service.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { nombresDe } from '../discipulado/consultas.js';
import { normalizarMotivo } from '../discipulado/validaciones.js';
import { bloquearPersona } from '../camino/consultas.js';
import { crearPostulacion, esViolacionDeUnico } from './crear-postulacion.js';
import { crearMembresiaDirecta, decidirMembresia, inactivarPorCambio, membresiasDelCarril, otorgarDiscipulador } from './membresia.js';

type Db = PrismaService | Prisma.TransactionClient;

const SELECT_HISTORIAL = {
  id: true,
  estado: true,
  motivoInactivacion: true,
  createdAt: true,
  revisadaEn: true,
  retiradaEn: true,
  inactivadaEn: true,
  motivoRechazo: true,
  motivoBaja: true,
  ministerio: { select: { id: true, nombre: true } },
  celula: { select: { id: true, nombre: true } },
} as const;

type FilaHistorial = Prisma.PostulacionGetPayload<{
  select: typeof SELECT_HISTORIAL;
}>;

/** Una fila del historial; los motivos internos solo con `solicitudes.aprobar` (FR-014, FR-023). */
export function aHistorial(
  p: FilaHistorial,
  verMotivos: boolean,
): PostulacionHistorial {
  const motivo =
    p.estado === 'rechazada'
      ? p.motivoRechazo
      : p.motivoInactivacion === 'baja'
        ? p.motivoBaja
        : null;
  return {
    id: p.id,
    ministerio: p.ministerio,
    celula: p.celula,
    estado: p.estado,
    motivoInactivacion: p.motivoInactivacion,
    createdAt: p.createdAt.toISOString(),
    resueltaEn:
      (p.inactivadaEn ?? p.retiradaEn ?? p.revisadaEn)?.toISOString() ?? null,
    ...(verMotivos ? { motivo } : {}),
  };
}

export async function historialDe(
  db: Db,
  personaId: string,
  verMotivos: boolean,
  excepto?: string,
): Promise<PostulacionHistorial[]> {
  const filas = await db.postulacion.findMany({
    where: { personaId, ...(excepto ? { id: { not: excepto } } : {}) },
    orderBy: { createdAt: 'desc' },
    select: SELECT_HISTORIAL,
  });
  return filas.map((p) => aHistorial(p, verMotivos));
}

/**
 * spec 009, Historias 2, 5 y 6 — lo del Admin sobre una Postulación
 * (contracts/postulaciones-api.md): detalle, aprobar (con la confirmación de
 * cambio que exige la API, D173, y el rol `discipulador` opcional de docs/22),
 * rechazar, crear en nombre de una Persona y dar de baja. Cada transición
 * bloquea primero la fila de la Persona (research #5) y emite su aviso DENTRO
 * de la transacción (D197).
 */
@Injectable()
export class PostulacionAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly rolesDeEstado: RolesDeEstadoService,
  ) {}

  /** GET /postulaciones/:id (FR-016). */
  async detalle(id: string, verMotivos: boolean): Promise<PostulacionDetalle> {
    const p = await this.prisma.postulacion.findUnique({
      where: { id },
      select: {
        id: true,
        personaId: true,
        estado: true,
        createdAt: true,
        motivacion: true,
        disponibilidad: true,
        requiereFormacion: true,
        enParalelo: true,
        creadoPorId: true,
        revisadoPorId: true,
        revisadaEn: true,
        motivoRechazo: true,
        ministerio: {
          select: { id: true, nombre: true, activo: true, eliminadoEn: true },
        },
        celula: {
          select: {
            id: true,
            nombre: true,
            activo: true,
            eliminadoEn: true,
            ofreceRolDiscipulador: true,
          },
        },
      },
    });
    if (!p) throw noEncontrada();
    const [persona, otrasAprobadas, historial, nombres] = await Promise.all([
      this.prisma.persona.findUniqueOrThrow({
        where: { id: p.personaId },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          fotoUrl: true,
          fechaNacimiento: true,
          telefono: true,
          email: true,
          rol: true,
        },
      }),
      // D217 + D241: las del mismo carril (lo que aprobar sumaría o reemplazaría).
      membresiasDelCarril(this.prisma, p.personaId, p.enParalelo, p.id),
      historialDe(this.prisma, p.personaId, verMotivos, p.id),
      nombresDe(
        this.prisma,
        [p.creadoPorId, p.revisadoPorId].filter((x): x is string => x !== null),
      ),
    ]);
    const edad = calcularEdad(persona.fechaNacimiento);
    const esDiscipulador = persona.rol.includes('discipulador');
    const celula = p.celula
      ? {
          id: p.celula.id,
          nombre: p.celula.nombre,
          activo: p.celula.activo && p.celula.eliminadoEn === null,
          ofreceRolDiscipulador: p.celula.ofreceRolDiscipulador,
        }
      : null;
    return {
      id: p.id,
      estado: p.estado,
      createdAt: p.createdAt.toISOString(),
      persona: {
        id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        fotoUrl: persona.fotoUrl,
        edad,
        telefono: persona.telefono,
        email: persona.email,
        sinAccesoALaApp: sinAccesoALaApp(persona),
        esDiscipulador,
      },
      ministerio: {
        id: p.ministerio.id,
        nombre: p.ministerio.nombre,
        activo: p.ministerio.activo && p.ministerio.eliminadoEn === null,
      },
      celula,
      requiereFormacion: p.requiereFormacion,
      motivacion: p.motivacion,
      disponibilidad: p.disponibilidad,
      creadoPor: p.creadoPorId ? (nombres.get(p.creadoPorId) ?? null) : null,
      revisadoPor: p.revisadoPorId
        ? (nombres.get(p.revisadoPorId) ?? null)
        : null,
      revisadaEn: p.revisadaEn?.toISOString() ?? null,
      ...(verMotivos ? { motivoRechazo: p.motivoRechazo } : {}),
      ministerioActual: otrasAprobadas[0]?.ministerio ?? null,
      ministeriosActuales: otrasAprobadas,
      puedeSumar:
        otrasAprobadas.length < maxMembresiasDelCarril(p.enParalelo),
      ofrecerRolDiscipulador:
        !!celula?.ofreceRolDiscipulador &&
        !esDiscipulador &&
        edad >= EDAD_MINIMA_ROL_DE_CARGO,
      historial,
    };
  }

  /**
   * POST /postulaciones/:id/aprobar (FR-017, FR-018, FR-020 a FR-022, D173).
   * docs/22: con `otorgarRolDiscipulador`, en la MISMA transacción otorga el
   * rol `discipulador` con las reglas de la 005 (nunca a un menor) y su
   * registro de auditoría (FR-022 de la 005).
   */
  async aprobar(
    id: string,
    dto: AprobarPostulacion,
    autorId: string,
  ): Promise<PostulacionDetalle> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const p = await bloquearPendiente(tx, id);
        const [ministerio, celula] = await Promise.all([
          tx.ministerio.findUniqueOrThrow({
            where: { id: p.ministerioId },
            select: { activo: true, eliminadoEn: true },
          }),
          p.celulaId
            ? tx.celula.findUniqueOrThrow({
                where: { id: p.celulaId },
                select: {
                  activo: true,
                  eliminadoEn: true,
                  ofreceRolDiscipulador: true,
                },
              })
            : Promise.resolve(null),
        ]);
        // FR-021: no se aprueba hacia un Ministerio o Célula que ya no están disponibles.
        if (!ministerio.activo || ministerio.eliminadoEn) {
          throw new AppException(
            'MINISTERIO_NO_DISPONIBLE',
            409,
            'El Ministerio de esta postulación no está disponible: reactivalo antes de aprobar.',
          );
        }
        if (celula && (!celula.activo || celula.eliminadoEn)) {
          throw new AppException(
            'VALIDACION',
            400,
            'La Célula de esta postulación no está disponible: reactivala antes de aprobar.',
            [{ campo: 'celulaId', code: 'CELULA_NO_DISPONIBLE' }],
          );
        }
        if (dto.otorgarRolDiscipulador && !celula?.ofreceRolDiscipulador) {
          throw new AppException(
            'VALIDACION',
            400,
            'Esta área no ofrece el rol de Discipulador.',
            [
              {
                campo: 'otorgarRolDiscipulador',
                code: 'OTORGARROLDISCIPULADOR_INVALIDO',
              },
            ],
          );
        }

        // D241: hasta 2 Ministerios (más el paralelo); con el carril ocupado, el
        // Admin elige sumar o reemplazar — la decisión la exige la API (D173).
        const anterior = await decidirMembresia(tx, {
          personaId: p.personaId,
          ministerioId: p.ministerioId,
          enParalelo: p.enParalelo,
          decision: dto,
          excluirId: id,
        });
        const ahora = new Date();
        let reemplazaA: string | null = null;
        if (anterior) {
          await inactivarPorCambio(tx, anterior.postulacionId, id, autorId, ahora);
          reemplazaA = anterior.postulacionId;
        }
        await tx.postulacion.update({
          where: { id },
          data: {
            estado: 'aprobada',
            revisadoPorId: autorId,
            revisadaEn: ahora,
          },
        });
        // FR-018 (D170): el rol de estado, por el lugar único de roles de estado.
        await this.rolesDeEstado.otorgarRolDeEstado(
          p.personaId,
          'miembro_ministerio',
          tx,
        );
        if (dto.otorgarRolDiscipulador)
          await otorgarDiscipulador(tx, p.personaId, autorId);

        const nombreMinisterio = await tx.ministerio.findUniqueOrThrow({
          where: { id: p.ministerioId },
          select: { nombre: true },
        });
        await this.notificaciones.emitir(tx, {
          nombre: 'ministerio.postulacion_aprobada',
          a: { tipo: 'persona', personaId: p.personaId },
          datos: {
            postulacionId: id,
            ministerioId: p.ministerioId,
            ministerio: nombreMinisterio.nombre,
            celulaId: p.celulaId,
            reemplazaA,
          },
        });
      });
    } catch (error) {
      // D241: `postulaciones_aprobada_por_ministerio` y el de la en paralelo son la garantía final ante una carrera.
      if (esViolacionDeUnico(error))
        throw new AppException(
          'POSTULACION_NO_PENDIENTE',
          409,
          'Otra aprobación ganó la carrera: recargá para ver el estado actual.',
        );
      throw error;
    }
    return this.detalle(id, true);
  }

  /**
   * spec 015 (D243): POST /ministerios/:id/miembros — la primera carga de los
   * equipos actuales: el Admin agrega a alguien que ya sirve, sin postulación
   * (`creadoPorId`, D97). Mismo límite y misma decisión que aprobar (D241).
   */
  async agregarMiembro(
    ministerioId: string,
    dto: { personaId: string; celulaId?: string | null; sumar?: boolean; reemplazaId?: string },
    autorId: string,
  ): Promise<{ postulacionId: string }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const persona = await tx.persona.findUnique({ where: { id: dto.personaId }, select: { estado: true, activo: true } });
        if (!persona || !persona.activo || persona.estado !== 'activa') {
          throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona activa con ese id.');
        }
        const { postulacionId } = await crearMembresiaDirecta(
          tx,
          { rolesDeEstado: this.rolesDeEstado, notificaciones: this.notificaciones },
          { personaId: dto.personaId, ministerioId, celulaId: dto.celulaId ?? null, autorId, decision: { sumar: dto.sumar, reemplazaId: dto.reemplazaId } },
        );
        return { postulacionId };
      });
    } catch (error) {
      if (esViolacionDeUnico(error)) throw new AppException('YA_ES_MIEMBRO_DEL_MINISTERIO', 409, 'Esta persona ya sirve en este Ministerio.');
      throw error;
    }
  }

  /** POST /postulaciones/:id/rechazar (FR-019): motivo opcional, interno. */
  async rechazar(
    id: string,
    motivoCrudo: string | undefined,
    autorId: string,
  ): Promise<PostulacionDetalle> {
    const motivo = normalizarMotivo(motivoCrudo);
    await this.prisma.$transaction(async (tx) => {
      const p = await bloquearPendiente(tx, id);
      await tx.postulacion.update({
        where: { id },
        data: {
          estado: 'rechazada',
          revisadoPorId: autorId,
          revisadaEn: new Date(),
          motivoRechazo: motivo,
        },
      });
      await this.notificaciones.emitir(tx, {
        nombre: 'ministerio.postulacion_rechazada',
        a: { tipo: 'persona', personaId: p.personaId },
        datos: { postulacionId: id },
      });
    });
    return this.detalle(id, true);
  }

  /** POST /postulaciones (FR-024): las mismas reglas que la Persona, con `creadoPorId`. */
  async crearEnNombreDe(
    dto: PostulacionEnNombreDe,
    autorId: string,
  ): Promise<PostulacionDetalle> {
    const id = await crearPostulacion(
      this.prisma,
      this.notificaciones,
      dto.personaId,
      dto.ministerioId,
      dto,
      autorId,
    );
    return this.detalle(id, true);
  }

  /** POST /postulaciones/:id/dar-de-baja (FR-025): la membresía pasa a `inactiva (baja)`; el rol queda (D170). */
  async darDeBaja(
    id: string,
    motivoCrudo: string | undefined,
    autorId: string,
  ): Promise<{ id: string; estado: 'inactiva' }> {
    const motivo = normalizarMotivo(motivoCrudo);
    await this.prisma.$transaction(async (tx) => {
      const previa = await tx.postulacion.findUnique({
        where: { id },
        select: { personaId: true },
      });
      if (!previa) throw noEncontrada();
      await bloquearPersona(tx, previa.personaId);
      const p = await tx.postulacion.findUniqueOrThrow({
        where: { id },
        select: { estado: true, ministerioId: true },
      });
      if (p.estado !== 'aprobada')
        throw new AppException(
          'POSTULACION_NO_APROBADA',
          409,
          'Esta persona ya no figura como miembro de este Ministerio.',
        );
      await tx.postulacion.update({
        where: { id },
        data: {
          estado: 'inactiva',
          motivoInactivacion: 'baja',
          inactivadaEn: new Date(),
          inactivadaPorId: autorId,
          motivoBaja: motivo,
        },
      });
      await this.notificaciones.emitir(tx, {
        nombre: 'ministerio.miembro_dado_de_baja',
        a: { tipo: 'persona', personaId: previa.personaId },
        datos: { postulacionId: id, ministerioId: p.ministerioId },
      });
    });
    return { id, estado: 'inactiva' };
  }

  /** GET /personas/:id/ministerio — la sección del Perfil de Persona. */
  async deLaPersona(
    personaId: string,
    verMotivos: boolean,
  ): Promise<MinisterioDePersona> {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: { id: true, nombre: true, apellido: true, fotoUrl: true },
    });
    if (!persona)
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'No existe una Persona con ese id.',
      );
    const [aprobadas, pendiente, historial] = await Promise.all([
      // D217 + D241: todas las membresías, la del Ministerio primero.
      this.prisma.postulacion.findMany({
        where: { personaId, estado: 'aprobada' },
        orderBy: [{ enParalelo: 'asc' }, { revisadaEn: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          revisadaEn: true,
          createdAt: true,
          enParalelo: true,
          ministerio: { select: { id: true, nombre: true } },
          celula: { select: { id: true, nombre: true } },
        },
      }),
      this.prisma.postulacion.findFirst({
        where: { personaId, estado: 'pendiente' },
        select: {
          id: true,
          createdAt: true,
          ministerio: { select: { id: true, nombre: true } },
        },
      }),
      historialDe(this.prisma, personaId, verMotivos),
    ]);
    const actuales = aprobadas.map((a) => ({
      postulacionId: a.id,
      ministerio: a.ministerio,
      celula: a.celula,
      desde: (a.revisadaEn ?? a.createdAt).toISOString(),
      enParalelo: a.enParalelo,
    }));
    return {
      persona,
      actual: actuales[0] ?? null,
      actuales,
      pendiente: pendiente
        ? {
            postulacionId: pendiente.id,
            ministerio: pendiente.ministerio,
            createdAt: pendiente.createdAt.toISOString(),
          }
        : null,
      historial,
    };
  }
}

/** Bloquea la Persona de la Postulación y exige que siga pendiente (otro Admin pudo resolverla). */
async function bloquearPendiente(tx: Prisma.TransactionClient, id: string) {
  const previa = await tx.postulacion.findUnique({
    where: { id },
    select: { personaId: true },
  });
  if (!previa) throw noEncontrada();
  await bloquearPersona(tx, previa.personaId);
  const p = await tx.postulacion.findUniqueOrThrow({
    where: { id },
    select: {
      personaId: true,
      estado: true,
      ministerioId: true,
      celulaId: true,
      enParalelo: true,
    },
  });
  if (p.estado !== 'pendiente') {
    throw new AppException(
      'POSTULACION_NO_PENDIENTE',
      409,
      'Esta postulación ya no está pendiente.',
      undefined,
      { estadoActual: p.estado },
    );
  }
  return p;
}

function noEncontrada() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe esa postulación.');
}
