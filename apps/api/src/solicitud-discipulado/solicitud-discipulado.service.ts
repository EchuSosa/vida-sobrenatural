import { Injectable } from '@nestjs/common';
import type {
  Cruce,
  EstadoMiDiscipulado,
  EstadoSolicitud,
  EventoDiscipulado,
  Franja,
  Pagina,
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
import { EventosDiscipuladoService } from '../discipulado/eventos.js';
import { cursaOCompletoVidaNueva } from './cursa-o-completo.js';
import { erroresDeFranjas, estadoMiDiscipulado, puedePedirSola } from './reglas-solicitud.js';

type Tx = Prisma.TransactionClient;

export type OrdenBandeja = 'fecha' | 'persona' | 'espera';

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
 * su evento DESPUÉS de confirmar (contracts/eventos.md).
 */
@Injectable()
export class SolicitudDiscipuladoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cruceService: CruceService,
    private readonly eventos: EventosDiscipuladoService,
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
        const persona = await tx.persona.findUnique({
          where: { id: personaId },
          select: { id: true, activo: true, estado: true, fechaNacimiento: true },
        });
        if (!persona || !persona.activo || persona.estado !== 'activa') {
          throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona activa con ese id.');
        }
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
    const propuestaRetiradaId = await this.prisma.$transaction(async (tx) => {
      const solicitud = await bloquearAbiertaDe(tx, personaId);
      await tx.franjaSolicitud.deleteMany({ where: { solicitudId: solicitud.id } });
      await tx.franjaSolicitud.createMany({ data: franjas.map((f) => ({ ...soloFranja(f), solicitudId: solicitud.id })) });
      const retirada = await retirarPropuestaPendiente(tx, solicitud.id, 'persona');
      await tx.solicitudDiscipulado.update({ where: { id: solicitud.id }, data: { estado: 'pendiente' } });
      return retirada;
    });
    if (propuestaRetiradaId) this.emitirRetirada(propuestaRetiradaId, 'persona');
    return this.estadoPropio(personaId);
  }

  /** DELETE /discipulado/solicitudes/me — la Persona retira su pedido; puede volver a pedir. */
  async retirar(personaId: string): Promise<void> {
    const propuestaRetiradaId = await this.prisma.$transaction(async (tx) => {
      const solicitud = await bloquearAbiertaDe(tx, personaId);
      const retirada = await retirarPropuestaPendiente(tx, solicitud.id, 'persona');
      await tx.solicitudDiscipulado.update({ where: { id: solicitud.id }, data: { estado: 'retirada' } });
      return retirada;
    });
    if (propuestaRetiradaId) this.emitirRetirada(propuestaRetiradaId, 'persona');
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

  // ─── La bandeja y el detalle (FR-025, FR-038) ──────────────────────────

  /**
   * GET /solicitudes — la bandeja genérica (FR-025). Sin relación Prisma a
   * Persona (referencia lógica), así que el orden por persona y por espera
   * se resuelve en SQL con un JOIN; los datos de cada fila, en lote.
   * `espera` = desde cuándo espera algo: la propuesta vigente o, si no hay,
   * el pedido. `buscar` filtra por nombre y apellido de la Persona, en la base.
   */
  async listar(
    estados: EstadoSolicitud[],
    orden: OrdenBandeja,
    dir: 'asc' | 'desc',
    skip: number,
    take: number,
    buscar?: string,
  ): Promise<Pagina<SolicitudResumen>> {
    const termino = buscar?.trim();
    const porNombre = termino
      ? Prisma.sql`AND (p."nombre" ILIKE ${`%${termino}%`} OR p."apellido" ILIKE ${`%${termino}%`} OR (p."nombre" || ' ' || p."apellido") ILIKE ${`%${termino}%`})`
      : Prisma.empty;
    const filtro = Prisma.sql`s."estado"::text IN (${Prisma.join(estados)}) ${porNombre}`;
    const direccion = dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const criterio =
      orden === 'persona'
        ? Prisma.sql`p."apellido" ${direccion}, p."nombre" ${direccion}`
        : orden === 'espera'
          ? Prisma.sql`COALESCE(pr."propuestaEn", s."createdAt") ${direccion}`
          : Prisma.sql`s."createdAt" ${direccion}`;

    const [filas, totales] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT s."id" FROM "solicitudes_discipulado" s
        JOIN "personas" p ON p."id" = s."personaId"
        LEFT JOIN "propuestas_discipulado" pr ON pr."solicitudId" = s."id" AND pr."estado" = 'pendiente'
        WHERE ${filtro}
        ORDER BY ${criterio}, s."id" ASC
        OFFSET ${skip} LIMIT ${take}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*)::bigint AS "total" FROM "solicitudes_discipulado" s
        JOIN "personas" p ON p."id" = s."personaId"
        WHERE ${filtro}`,
    ]);
    const ids = filas.map((f) => f.id);
    const porId = new Map((await this.resumenes(ids)).map((r) => [r.id, r]));
    return { items: ids.map((id) => porId.get(id)!).filter(Boolean), total: Number(totales[0]?.total ?? 0) };
  }

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
        return propuesta.id;
      });
    } catch (error) {
      // `propuestas_una_pendiente_por_solicitud`: la garantía si algo se
      // saltea el bloqueo de la Solicitud.
      if (esViolacionDeUnicidad(error)) throw solicitudNoPendiente();
      throw error;
    }
    this.emitir({ nombre: 'propuesta_nueva', a: { tipo: 'discipulador', personaId: discipuladorId }, datos: { propuestaId, solicitudId: id } });
    return { propuestaId };
  }

  /** POST /discipulado/solicitudes/:id/retirar-propuesta — la Solicitud vuelve a `pendiente`; no hay plazo automático. */
  async retirarPropuesta(id: string) {
    const propuestaId = await this.prisma.$transaction(async (tx) => {
      const solicitud = await bloquearSolicitud(tx, id);
      if (solicitud.estado !== 'propuesta') {
        throw new AppException('SOLICITUD_NO_PROPUESTA', 409, 'Esta Solicitud no tiene una propuesta esperando respuesta.');
      }
      const retirada = await retirarPropuestaPendiente(tx, id, 'admin');
      await tx.solicitudDiscipulado.update({ where: { id }, data: { estado: 'pendiente' } });
      return retirada;
    });
    if (propuestaId) this.emitirRetirada(propuestaId, 'admin');
    return { estado: 'pendiente' as const };
  }

  /** POST /discipulado/solicitudes/:id/rechazar (FR-008): no crea nada; la Persona puede volver a pedir. */
  async rechazar(id: string, adminId: string) {
    const personaId = await this.prisma.$transaction(async (tx) => {
      const solicitud = await bloquearSolicitud(tx, id);
      if (solicitud.estado !== 'pendiente') throw solicitudNoPendiente();
      await tx.solicitudDiscipulado.update({
        where: { id },
        data: { estado: 'rechazada', revisadoPorId: adminId, revisadaEn: new Date() },
      });
      return solicitud.personaId;
    });
    this.emitir({ nombre: 'solicitud_rechazada', a: { tipo: 'persona', personaId }, datos: { solicitudId: id } });
    return { estado: 'rechazada' as const };
  }

  // ─── Auxiliares ─────────────────────────────────────────────────────────

  /** Las filas de la bandeja, en lote: una consulta por relación, no una por fila (H-42). */
  private async resumenes(ids: string[]): Promise<SolicitudResumen[]> {
    if (ids.length === 0) return [];
    const [solicitudes, propuestas] = await Promise.all([
      this.prisma.solicitudDiscipulado.findMany({
        where: { id: { in: ids } },
        select: { id: true, personaId: true, estado: true, createdAt: true, creadoPorId: true, revisadoPorId: true },
      }),
      this.prisma.propuestaDiscipulado.findMany({
        where: { solicitudId: { in: ids }, estado: 'pendiente' },
        select: { solicitudId: true, discipuladorId: true, propuestaEn: true },
      }),
    ]);
    const nombres = await nombresDe(this.prisma, [
      ...solicitudes.flatMap((s) => [s.personaId, s.creadoPorId, s.revisadoPorId]),
      ...propuestas.map((p) => p.discipuladorId),
    ]);
    const vigentePorSolicitud = new Map(propuestas.map((p) => [p.solicitudId, p]));
    return solicitudes.map((s) => {
      const vigente = s.estado === 'propuesta' ? vigentePorSolicitud.get(s.id) : undefined;
      return {
        id: s.id,
        tipo: 'discipulado',
        persona: nombres.get(s.personaId) ?? personaDesconocida(s.personaId),
        estado: s.estado,
        createdAt: s.createdAt.toISOString(),
        revisadoPor: (s.revisadoPorId && nombres.get(s.revisadoPorId)) || null,
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

  private emitirRetirada(propuestaId: string, retiradaPor: 'admin' | 'persona') {
    this.emitir({ nombre: 'propuesta_retirada', a: { tipo: 'admin' }, datos: { propuestaId, retiradaPor } });
  }

  private emitir(evento: EventoDiscipulado) {
    this.eventos.emitir(evento);
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

async function exigirSinSolicitudAbierta(tx: Tx, personaId: string) {
  const abierta = await tx.solicitudDiscipulado.findFirst({
    where: { personaId, estado: { in: ['pendiente', 'propuesta'] } },
    select: { id: true },
  });
  if (abierta) throw yaTieneSolicitudAbierta();
}

async function bloquearSolicitud(tx: Tx, id: string): Promise<SolicitudBloqueada> {
  const filas = await tx.$queryRaw<SolicitudBloqueada[]>`
    SELECT "id", "personaId", "estado"::text AS "estado" FROM "solicitudes_discipulado" WHERE "id" = ${id} FOR UPDATE`;
  if (filas.length === 0) throw noEncontrada();
  return filas[0];
}

/** La Solicitud abierta (`pendiente` o `propuesta`) de la Persona, bloqueada. 404 si no tiene. */
async function bloquearAbiertaDe(tx: Tx, personaId: string): Promise<SolicitudBloqueada> {
  const filas = await tx.$queryRaw<SolicitudBloqueada[]>`
    SELECT "id", "personaId", "estado"::text AS "estado" FROM "solicitudes_discipulado"
    WHERE "personaId" = ${personaId} AND "estado" IN ('pendiente', 'propuesta') FOR UPDATE`;
  if (filas.length === 0) {
    throw new AppException('NO_ENCONTRADO', 404, 'No tenés un pedido de Vida Nueva abierto.');
  }
  return filas[0];
}

/** Si hay una Propuesta `pendiente` de la Solicitud, la pasa a `retirada`. Devuelve su id, o null. */
async function retirarPropuestaPendiente(tx: Tx, solicitudId: string, retiradaPor: 'admin' | 'persona'): Promise<string | null> {
  const pendiente = await tx.propuestaDiscipulado.findFirst({
    where: { solicitudId, estado: 'pendiente' },
    select: { id: true },
  });
  if (!pendiente) return null;
  await tx.propuestaDiscipulado.update({
    where: { id: pendiente.id },
    data: { estado: 'retirada', retiradaPor, respondidaEn: new Date() },
  });
  return pendiente.id;
}

async function nombresDe(db: PrismaService, ids: Array<string | null>): Promise<Map<string, PersonaBreve>> {
  const unicos = [...new Set(ids.filter((id): id is string => !!id))];
  if (unicos.length === 0) return new Map();
  const personas = await db.persona.findMany({ where: { id: { in: unicos } }, select: { id: true, nombre: true, apellido: true } });
  return new Map(personas.map((p) => [p.id, p]));
}

function personaDesconocida(id: string): PersonaBreve {
  return { id, nombre: '', apellido: '' };
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
