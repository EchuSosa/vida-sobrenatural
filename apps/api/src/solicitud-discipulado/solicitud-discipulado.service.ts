import { Injectable } from '@nestjs/common';
import type {
  Cruce,
  EstadoMiDiscipulado,
  EstadoSolicitud,
  Franja,
  PersonaBreve,
  PropuestaHistorial,
  SolicitudDetalle,
  SolicitudResumen,
} from '@vida-sobrenatural/shared-types';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { CruceService } from '../discipulado/cruce.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { cursaOCompletoVidaNueva } from '../discipulado/consultas.js';
import { bloquearPersona, completitudVigente } from '../camino/consultas.js';
import { erroresDeFranjas, estadoMiDiscipulado, puedePedirSola } from './reglas-solicitud.js';

type Tx = Prisma.TransactionClient;

interface SolicitudBloqueada {
  id: string;
  personaId: string;
  estado: EstadoSolicitud;
}

const FRANJA_SELECT = { diaSemana: true, inicio: true, fin: true } as const;

/**
 * specs/004, Historias 1, 2 y 3 (contracts/solicitudes-api.md): el pedido de
 * Vida Nueva — crear (propio o en nombre de otra Persona), editar y retirar el
 * propio, la bandeja del Admin, el detalle, el cruce, proponer, retirar la
 * propuesta y rechazar. Aceptar y declinar son del Discipulador (módulo
 * `discipulado`). Cada transición bloquea la Solicitud (`FOR UPDATE`) y emite
 * su aviso DENTRO de la transacción (spec 012, D197).
 */
@Injectable()
export class SolicitudDiscipuladoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cruceService: CruceService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  // ─── Pedir (FR-001, FR-002, FR-032, FR-044) ────────────────────────────

  /** POST /discipulado/solicitudes/me — la Persona pide para sí. Menor de 12 no puede (FR-044). */
  crearPropia(personaId: string, franjas: Franja[]) {
    return this.crear(personaId, franjas, null);
  }

  /** POST /discipulado/solicitudes — el Admin o un Discipulador, en nombre de otra Persona (FR-002). Sin regla de edad. */
  crearEnNombreDe(personaId: string, franjas: Franja[], autorId: string) {
    return this.crear(personaId, franjas, autorId);
  }

  private async crear(personaId: string, franjas: Franja[], creadoPorId: string | null) {
    validarFranjasOFallar(franjas);
    try {
      return await this.prisma.$transaction(async (tx) => {
        // spec 006 (research #5): serializa pedir y declarar "Ya lo hice" de la misma Persona.
        await bloquearPersona(tx, personaId);
        const persona = await tx.persona.findUnique({
          where: { id: personaId },
          select: { id: true, activo: true, estado: true, fechaNacimiento: true },
        });
        if (!persona || !persona.activo || persona.estado !== 'activa') {
          throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona activa con ese id.');
        }
        await exigirSinHistorialDeVidaNueva(tx, personaId);
        if (creadoPorId === null && !puedePedirSola(calcularEdad(persona.fechaNacimiento))) {
          throw new AppException(
            'EDAD_INSUFICIENTE_PARA_PEDIR_SOLO',
            409,
            'Una Persona menor de 12 años no pide Vida Nueva sola: el pedido lo hace su mamá, papá o tutor hablando con el equipo.',
          );
        }
        await exigirSinSolicitudAbierta(tx, personaId);
        if (await cursaOCompletoVidaNueva(tx, personaId)) {
          throw vidaNuevaEnCursoOCompletada();
        }
        const creada = await tx.solicitudDiscipulado.create({
          data: { personaId, creadoPorId, franjas: { create: franjas.map(soloFranja) } },
          select: { id: true, estado: true, createdAt: true },
        });
        return { id: creada.id, estado: creada.estado, createdAt: creada.createdAt.toISOString() };
      });
    } catch (error) {
      // Dos pedidos simultáneos: el segundo choca con el índice único parcial
      // `solicitudes_discipulado_una_abierta` (FR-001). Es la garantía; el
      // chequeo de arriba solo da el mensaje en el caso común.
      if (esViolacionDeUnicidad(error)) throw yaTieneSolicitudAbierta();
      throw error;
    }
  }

  // ─── Editar y retirar el propio (FR-039) ───────────────────────────────

  /** PUT /discipulado/solicitudes/me/franjas — reemplaza las franjas; si había una propuesta en curso, la retira (por la Persona). */
  async editarFranjas(personaId: string, franjas: Franja[]): Promise<EstadoMiDiscipulado> {
    validarFranjasOFallar(franjas);
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await bloquearAbiertaDe(tx, personaId);
      await tx.franjaSolicitud.deleteMany({ where: { solicitudId: solicitud.id } });
      await tx.franjaSolicitud.createMany({ data: franjas.map((f) => ({ ...soloFranja(f), solicitudId: solicitud.id })) });
      const retirada = await retirarPropuestaPendiente(tx, solicitud.id, 'persona');
      await tx.solicitudDiscipulado.update({ where: { id: solicitud.id }, data: { estado: 'pendiente' } });
      if (retirada) await this.emitirRetirada(tx, retirada, 'persona');
    });
    return this.estadoPropio(personaId);
  }

  /** DELETE /discipulado/solicitudes/me — la Persona retira su pedido; puede volver a pedir. */
  async retirar(personaId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await bloquearAbiertaDe(tx, personaId);
      const retirada = await retirarPropuestaPendiente(tx, solicitud.id, 'persona');
      await tx.solicitudDiscipulado.update({ where: { id: solicitud.id }, data: { estado: 'retirada' } });
      if (retirada) await this.emitirRetirada(tx, retirada, 'persona');
    });
  }

  // ─── Mi camino (FR-026 a FR-029) ───────────────────────────────────────

  /** GET /discipulado/me. El `select` no toca Encuentro ni PropuestaDiscipulado (FR-029, FR-026). */
  async estadoPropio(personaId: string): Promise<EstadoMiDiscipulado> {
    const persona = await this.prisma.persona.findUnique({ where: { id: personaId }, select: { fechaNacimiento: true } });
    if (!persona) throw new AppException('NO_ENCONTRADO', 404, 'Esta sesión todavía no tiene una Persona asociada.');

    const [inscripciones, ultimaSolicitud] = await Promise.all([
      this.prisma.inscripcion.findMany({
        where: { personaId, grupo: { curso: { categoria: 'vida_nueva' } } },
        select: { grupoId: true, solicitudId: true, estado: true, createdAt: true, cerradaEn: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.solicitudDiscipulado.findFirst({
        where: { personaId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, estado: true, createdAt: true, franjas: { select: FRANJA_SELECT } },
      }),
    ]);

    const activa = inscripciones.find((i) => i.estado === 'activa') ?? null;
    let discipulador: { nombre: string; apellido: string; telefono: string } | null = null;
    if (activa) {
      // FR-027 y FR-030: el Discipulador del Liderazgo VIGENTE (tras una reasignación, el nuevo).
      const liderazgo = await this.prisma.liderazgo.findFirst({
        where: { grupoId: activa.grupoId, hasta: null },
        select: { personaId: true },
      });
      if (liderazgo) {
        discipulador = await this.prisma.persona.findUnique({
          where: { id: liderazgo.personaId },
          select: { nombre: true, apellido: true, telefono: true },
        });
      }
    }
    const completada = inscripciones.find((i) => i.estado === 'completada') ?? null;
    const deLaUltima = ultimaSolicitud ? inscripciones.find((i) => i.solicitudId === ultimaSolicitud.id) : undefined;

    return estadoMiDiscipulado({
      edad: calcularEdad(persona.fechaNacimiento),
      inscripcionActiva: activa ? { grupoId: activa.grupoId, desde: activa.createdAt, discipulador } : null,
      inscripcionCompletada: completada ? { cerradaEn: completada.cerradaEn, createdAt: completada.createdAt } : null,
      ultimaSolicitud: ultimaSolicitud
        ? {
            id: ultimaSolicitud.id,
            estado: ultimaSolicitud.estado,
            createdAt: ultimaSolicitud.createdAt,
            franjas: ultimaSolicitud.franjas,
            inscripcion: deLaUltima ? { estado: deLaUltima.estado, cerradaEn: deLaUltima.cerradaEn } : null,
          }
        : null,
    });
  }

  // ─── El detalle (FR-038). La bandeja es de la spec 013 (`bandeja/`) ─────

  /** GET /discipulado/solicitudes/:id — el historial solo para quien tiene `solicitudes.aprobar` (el Pastor no ve motivos). */
  async detalle(id: string, conHistorial: boolean): Promise<SolicitudDetalle> {
    const [resumen] = await this.resumenes([id]);
    if (!resumen) throw noEncontrada();
    const [franjas, persona, propuestas] = await Promise.all([
      this.prisma.franjaSolicitud.findMany({ where: { solicitudId: id }, select: FRANJA_SELECT, orderBy: [{ diaSemana: 'asc' }, { inicio: 'asc' }] }),
      this.prisma.persona.findUnique({ where: { id: resumen.persona.id }, select: { fechaNacimiento: true, genero: true } }),
      conHistorial
        ? this.prisma.propuestaDiscipulado.findMany({
            where: { solicitudId: id },
            orderBy: { propuestaEn: 'desc' },
            select: {
              id: true,
              discipuladorId: true,
              propuestaPorId: true,
              propuestaEn: true,
              estado: true,
              respondidaEn: true,
              motivoDeclinacion: true,
              retiradaPor: true,
              grupoDestinoId: true,
            },
          })
        : Promise.resolve([]),
    ]);
    const nombres = await nombresDe(this.prisma, propuestas.flatMap((p) => [p.discipuladorId, p.propuestaPorId]));
    const historial: PropuestaHistorial[] = propuestas.map((p) => ({
      id: p.id,
      discipulador: nombres.get(p.discipuladorId) ?? personaDesconocida(p.discipuladorId),
      propuestaPor: nombres.get(p.propuestaPorId) ?? null,
      propuestaEn: p.propuestaEn.toISOString(),
      estado: p.estado,
      respondidaEn: p.respondidaEn?.toISOString() ?? null,
      motivoDeclinacion: p.motivoDeclinacion,
      retiradaPor: p.retiradaPor,
      grupoDestinoId: p.grupoDestinoId,
    }));
    return {
      ...resumen,
      franjas,
      personaEdad: persona ? calcularEdad(persona.fechaNacimiento) : 0,
      personaGenero: persona?.genero ?? '',
      historial,
    };
  }

  /** GET /discipulado/solicitudes/:id/cruce (FR-034, FR-035, FR-045). Nunca incluye a la propia Persona. */
  async cruce(id: string): Promise<Cruce> {
    const solicitud = await this.prisma.solicitudDiscipulado.findUnique({
      where: { id },
      select: { personaId: true, franjas: { select: FRANJA_SELECT } },
    });
    if (!solicitud) throw noEncontrada();
    const persona = await this.prisma.persona.findUnique({ where: { id: solicitud.personaId }, select: { genero: true } });
    return this.cruceService.cruce(solicitud.franjas, persona?.genero ?? '', solicitud.personaId);
  }

  // ─── Proponer, retirar la propuesta, rechazar (FR-003, FR-008, FR-036) ─

  /**
   * POST /discipulado/solicitudes/:id/proponer — exactamente los pasos del
   * contrato: bloquear la Solicitud y exigir `pendiente` → bloquear la fila
   * del Discipulador (D137, contra quitarle el rol a la vez) y exigir FR-006
   * con la MISMA consulta del cruce → verificar el Grupo destino → crear la
   * Propuesta y pasar la Solicitud a `propuesta`. No crea Grupo ni Liderazgo:
   * eso es aceptar (FR-037). Elegir a uno que no coincide no es error (D25).
   */
  async proponer(id: string, discipuladorId: string, grupoDestinoId: string | undefined, adminId: string) {
    let propuestaId: string;
    try {
      propuestaId = await this.prisma.$transaction(async (tx) => {
        const solicitud = await bloquearSolicitud(tx, id);
        if (solicitud.estado !== 'pendiente') throw solicitudNoPendiente();

        // Orden de bloqueo del discipulado: Solicitud → Grupo → Propuesta → Persona
        // (propuestas.service.ts). Acá: Solicitud (arriba) → Persona. El Grupo
        // destino no se bloquea: aceptar lo vuelve a contar con su fila bloqueada.
        const filas = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "personas" WHERE "id" = ${discipuladorId} FOR UPDATE`;
        const franjas = await tx.franjaSolicitud.findMany({ where: { solicitudId: id }, select: FRANJA_SELECT });
        const candidato =
          filas.length > 0 && discipuladorId !== solicitud.personaId
            ? (await this.cruceService.disponibles(franjas, tx)).find((c) => c.id === discipuladorId)
            : undefined;
        if (!candidato) {
          throw new AppException(
            'DISCIPULADOR_NO_DISPONIBLE',
            409,
            'Esa Persona ya no está disponible para nuevos discipulados (sin agenda, con la disponibilidad apagada, con un período de no disponibilidad o sin el rol).',
          );
        }
        if (grupoDestinoId && !candidato.gruposConLugar.some((g) => g.grupoId === grupoDestinoId)) {
          throw new AppException('GRUPO_SIN_LUGAR', 409, 'Ese Grupo ya no tiene lugar o no es de ese Discipulador.');
        }
        if (await cursaOCompletoVidaNueva(tx, solicitud.personaId)) throw vidaNuevaEnCursoOCompletada();

        const propuesta = await tx.propuestaDiscipulado.create({
          data: {
            tipo: 'nueva',
            solicitudId: id,
            discipuladorId,
            grupoDestinoId: grupoDestinoId ?? null,
            propuestaPorId: adminId,
          },
          select: { id: true },
        });
        await tx.solicitudDiscipulado.update({
          where: { id },
          data: { estado: 'propuesta', revisadoPorId: adminId, revisadaEn: new Date() },
        });
        await this.notificaciones.emitir(tx, {
          nombre: 'discipulado.propuesta_nueva',
          a: { tipo: 'discipulador', personaId: discipuladorId },
          datos: { propuestaId: propuesta.id, solicitudId: id },
        });
        return propuesta.id;
      });
    } catch (error) {
      // `propuestas_una_pendiente_por_solicitud`: la garantía si algo se
      // saltea el bloqueo de la Solicitud.
      if (esViolacionDeUnicidad(error)) throw solicitudNoPendiente();
      throw error;
    }
    this.notificaciones.empujarEmails();
    return { propuestaId };
  }

  /** POST /discipulado/solicitudes/:id/retirar-propuesta — la Solicitud vuelve a `pendiente`; no hay plazo automático. */
  async retirarPropuesta(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await bloquearSolicitud(tx, id);
      if (solicitud.estado !== 'propuesta') {
        throw new AppException('SOLICITUD_NO_PROPUESTA', 409, 'Esta Solicitud no tiene una propuesta esperando respuesta.');
      }
      const retirada = await retirarPropuestaPendiente(tx, id, 'admin');
      await tx.solicitudDiscipulado.update({ where: { id }, data: { estado: 'pendiente' } });
      if (retirada) await this.emitirRetirada(tx, retirada, 'admin');
    });
    return { estado: 'pendiente' as const };
  }

  /** POST /discipulado/solicitudes/:id/rechazar (FR-008): no crea nada; la Persona puede volver a pedir. */
  async rechazar(id: string, adminId: string) {
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await bloquearSolicitud(tx, id);
      if (solicitud.estado !== 'pendiente') throw solicitudNoPendiente();
      await tx.solicitudDiscipulado.update({
        where: { id },
        data: { estado: 'rechazada', revisadoPorId: adminId, revisadaEn: new Date() },
      });
      // FR-013: sin el motivo — solo el id de la Solicitud.
      await this.notificaciones.emitir(tx, { nombre: 'discipulado.solicitud_rechazada', a: { tipo: 'persona', personaId: solicitud.personaId }, datos: { solicitudId: id } });
    });
    this.notificaciones.empujarEmails();
    return { estado: 'rechazada' as const };
  }

  // ─── Auxiliares ─────────────────────────────────────────────────────────

  /**
   * Las Solicitudes resumidas, en lote: una consulta por relación, no una por
   * fila (H-42). Las usa el detalle y la fuente de la bandeja unificada
   * (`fuente-bandeja.ts`, spec 013). Devuelve en el orden de `ids`.
   */
  async resumenes(ids: readonly string[]): Promise<SolicitudResumen[]> {
    if (ids.length === 0) return [];
    const [solicitudes, propuestas] = await Promise.all([
      this.prisma.solicitudDiscipulado.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, personaId: true, estado: true, createdAt: true, creadoPorId: true, revisadoPorId: true, revisadaEn: true },
      }),
      this.prisma.propuestaDiscipulado.findMany({
        where: { solicitudId: { in: [...ids] }, estado: 'pendiente' },
        select: { solicitudId: true, discipuladorId: true, propuestaEn: true },
      }),
    ]);
    const nombres = await nombresDe(this.prisma, [
      ...solicitudes.flatMap((s) => [s.personaId, s.creadoPorId, s.revisadoPorId]),
      ...propuestas.map((p) => p.discipuladorId),
    ]);
    const vigentePorSolicitud = new Map(propuestas.map((p) => [p.solicitudId, p]));
    const porId = new Map(solicitudes.map((s) => [s.id, s]));
    const enOrden = ids.map((id) => porId.get(id)).filter((s): s is (typeof solicitudes)[number] => s !== undefined);
    return enOrden.map((s) => {
      const vigente = s.estado === 'propuesta' ? vigentePorSolicitud.get(s.id) : undefined;
      return {
        id: s.id,
        tipo: 'discipulado',
        persona: nombres.get(s.personaId) ?? personaDesconocida(s.personaId),
        estado: s.estado,
        createdAt: s.createdAt.toISOString(),
        revisadoPor: (s.revisadoPorId && nombres.get(s.revisadoPorId)) || null,
        revisadaEn: s.revisadaEn?.toISOString() ?? null,
        creadoPor: (s.creadoPorId && nombres.get(s.creadoPorId)) || null,
        propuestaVigente: vigente
          ? {
              discipulador: nombres.get(vigente.discipuladorId) ?? personaDesconocida(vigente.discipuladorId),
              propuestaEn: vigente.propuestaEn.toISOString(),
            }
          : null,
      };
    });
  }

  /** Al Admin (solo log, D201) y al Discipulador que la tenía: ya no hace falta que la responda (D219). */
  private async emitirRetirada(tx: Tx, propuesta: PropuestaRetirada, retiradaPor: 'admin' | 'persona') {
    await this.notificaciones.emitir(tx, { nombre: 'discipulado.propuesta_retirada', a: { tipo: 'admin' }, datos: { propuestaId: propuesta.id, retiradaPor } });
    await this.notificaciones.emitir(tx, {
      nombre: 'discipulado.propuesta_nueva_retirada',
      a: { tipo: 'discipulador', personaId: propuesta.discipuladorId },
      datos: { propuestaId: propuesta.id, solicitudId: propuesta.solicitudId },
    });
  }
}

function validarFranjasOFallar(franjas: unknown) {
  const errores = erroresDeFranjas(franjas);
  if (errores.length > 0) {
    throw new AppException('VALIDACION', 400, 'Revisá los horarios que cargaste.', errores);
  }
}

function soloFranja(f: Franja): Franja {
  return { diaSemana: f.diaSemana, inicio: f.inicio, fin: f.fin };
}

/**
 * spec 006, FR-017: el pedido de Vida Nueva (propio o en nombre de) se rechaza
 * si la Persona contó que ya la hizo y la iglesia lo está revisando, o si ya
 * figura hecha por historial. Con la fila de la Persona bloqueada.
 */
async function exigirSinHistorialDeVidaNueva(tx: Tx, personaId: string) {
  const pendiente = await tx.declaracionHistorial.findFirst({ where: { personaId, etapa: 'vida_nueva', estado: 'pendiente' }, select: { id: true } });
  if (pendiente) {
    throw new AppException('HISTORIAL_VIDA_NUEVA_EN_REVISION', 409, 'La Persona contó que ya hizo Vida Nueva y el equipo lo está revisando.');
  }
  if (await completitudVigente(tx, personaId, 'vida_nueva')) {
    throw new AppException('VIDA_NUEVA_COMPLETADA_POR_HISTORIAL', 409, 'Vida Nueva ya figura como hecha, registrada por la iglesia.');
  }
}

async function exigirSinSolicitudAbierta(tx: Tx, personaId: string) {
  const abierta = await tx.solicitudDiscipulado.findFirst({
    where: { personaId, estado: { in: ['pendiente', 'propuesta'] } },
    select: { id: true },
  });
  if (abierta) throw yaTieneSolicitudAbierta();
}

/**
 * Orden de bloqueo del discipulado: Solicitud → Grupo → Propuesta → Persona
 * (propuestas.service.ts). Toda transición de Solicitudes bloquea la Solicitud
 * PRIMERO; la Propuesta se toca después (el UPDATE de `retirarPropuestaPendiente`
 * toma su fila) y la Persona al final (proponer).
 */
async function bloquearSolicitud(tx: Tx, id: string): Promise<SolicitudBloqueada> {
  const filas = await tx.$queryRaw<SolicitudBloqueada[]>`
    SELECT "id", "personaId", "estado"::text AS "estado" FROM "solicitudes_discipulado" WHERE "id" = ${id} FOR UPDATE`;
  if (filas.length === 0) throw noEncontrada();
  return filas[0];
}

/** La Solicitud abierta (`pendiente` o `propuesta`) de la Persona, bloqueada. 404 si no tiene. Mismo orden que `bloquearSolicitud`: primero la Solicitud. */
async function bloquearAbiertaDe(tx: Tx, personaId: string): Promise<SolicitudBloqueada> {
  const filas = await tx.$queryRaw<SolicitudBloqueada[]>`
    SELECT "id", "personaId", "estado"::text AS "estado" FROM "solicitudes_discipulado"
    WHERE "personaId" = ${personaId} AND "estado" IN ('pendiente', 'propuesta') FOR UPDATE`;
  if (filas.length === 0) {
    throw new AppException('NO_ENCONTRADO', 404, 'No tenés un pedido de Vida Nueva abierto.');
  }
  return filas[0];
}

interface PropuestaRetirada {
  id: string;
  solicitudId: string;
  discipuladorId: string;
}

/** Si hay una Propuesta `pendiente` de la Solicitud, la pasa a `retirada`. La devuelve, o null. */
async function retirarPropuestaPendiente(tx: Tx, solicitudId: string, retiradaPor: 'admin' | 'persona'): Promise<PropuestaRetirada | null> {
  const pendiente = await tx.propuestaDiscipulado.findFirst({
    where: { solicitudId, estado: 'pendiente' },
    select: { id: true, discipuladorId: true },
  });
  if (!pendiente) return null;
  await tx.propuestaDiscipulado.update({
    where: { id: pendiente.id },
    data: { estado: 'retirada', retiradaPor, respondidaEn: new Date() },
  });
  return { id: pendiente.id, solicitudId, discipuladorId: pendiente.discipuladorId };
}

async function nombresDe(db: PrismaService, ids: Array<string | null>): Promise<Map<string, PersonaBreve>> {
  const unicos = [...new Set(ids.filter((id): id is string => !!id))];
  if (unicos.length === 0) return new Map();
  const personas = await db.persona.findMany({ where: { id: { in: unicos } }, select: { id: true, nombre: true, apellido: true, fotoUrl: true } });
  return new Map(personas.map((p) => [p.id, p]));
}

function personaDesconocida(id: string): PersonaBreve {
  return { id, nombre: '', apellido: '', fotoUrl: null };
}

/** P2002: violación de un índice único (acá, los parciales de Solicitud y Propuesta). */
function esViolacionDeUnicidad(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

function noEncontrada() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe una Solicitud con ese id.');
}

function yaTieneSolicitudAbierta() {
  return new AppException(
    'SOLICITUD_DISCIPULADO_YA_PENDIENTE',
    409,
    'Ya hay un pedido de Vida Nueva abierto para esta Persona: se puede editar o retirar, pero no pedir otro.',
  );
}

function vidaNuevaEnCursoOCompletada() {
  return new AppException('VIDA_NUEVA_EN_CURSO_O_COMPLETADA', 409, 'Esta Persona ya está haciendo Vida Nueva o ya lo terminó.');
}

function solicitudNoPendiente() {
  return new AppException('SOLICITUD_NO_PENDIENTE', 409, 'Esta Solicitud ya no está pendiente: alguien la resolvió o ya tiene una propuesta.');
}
