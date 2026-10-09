import { Inject, Injectable } from '@nestjs/common';
import {
  DIRECCION_BUSQUEDA_MAX,
  MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX,
  distanciaKm,
  esCompatible,
  hoyEnArgentina,
  ordenarPorDistancia,
  type Coordenadas,
  type DiaSemana,
  type EstadoMiGrupoExtension,
  type GrupoExtensionEncontrado,
  type GrupoLiderado,
  type SolicitudGrupoExtensionDetalle,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { bloquearPersona } from '../camino/consultas.js';
import { GEOCODIFICADOR, type Geocodificador } from './geocodificador.js';
import {
  INCLUDE_GRUPO,
  SELECT_CONTACTO,
  bloquearGrupo,
  contactoDe,
  contarIntegrantes,
  diasDe,
  direccionDe,
  edadDe,
  esViolacionDeUnico,
  generoDe,
  grupoCompleto,
  hayLugar,
  pendientesEIntegrantes,
  solicitudNoEncontrada,

} from './consultas.js';

/** Quién resuelve un pedido: un líder del Grupo (web app, D226) o el Admin (backoffice, D227). */
export type ActorGex = { tipo: 'lider'; personaId: string } | { tipo: 'admin'; personaId: string };

export interface BusquedaGex {
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  dias?: DiaSemana[];
}

/**
 * spec 014 — el pedido para sumarse a un Grupo de Extensión, de punta a punta
 * (D224–D228): buscar, pedir, retirar, aceptar, rechazar, agregar y quitar.
 * La pertenencia ES la Solicitud `aceptada` (D225). Cada cambio que avisa
 * emite DENTRO de su transacción (D197) y empuja los mails después.
 */
@Injectable()
export class SolicitudesGexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    @Inject(GEOCODIFICADOR) private readonly geocodificador: Geocodificador,
  ) {}

  // --- Persona ---

  /** GET /grupos-extension/me: en qué está la persona, y cuántos Grupos lidera (para enlazar "Mi grupo"). */
  async estado(personaId: string): Promise<EstadoMiGrupoExtension> {
    const [abiertas, ultima, lidera] = await Promise.all([
      this.prisma.solicitudGrupoExtension.findMany({
        where: { personaId, estado: { in: ['pendiente', 'aceptada'] } },
        include: { grupo: { include: INCLUDE_GRUPO } },
      }),
      this.prisma.solicitudGrupoExtension.findFirst({
        where: { personaId, estado: { in: ['rechazada', 'retirada', 'finalizada'] } },
        orderBy: { updatedAt: 'desc' },
        select: { estado: true, mensaje: true, updatedAt: true, grupo: { select: { nombre: true } } },
      }),
      this.prisma.liderGrupoExtension.count({ where: { personaId, hasta: null, grupo: { activo: true } } }),
    ]);
    const aceptada = abiertas.find((s) => s.estado === 'aceptada');
    if (aceptada) {
      const g = aceptada.grupo;
      return {
        estado: 'integrante',
        solicitudId: aceptada.id,
        desde: (aceptada.revisadaEn ?? aceptada.createdAt).toISOString(),
        grupo: {
          id: g.id,
          nombre: g.nombre,
          dias: diasDe(g),
          horaInicio: g.horaInicio,
          zona: g.zona,
          enLaIglesia: g.enLaIglesia,
          sede: g.sede?.nombre ?? null,
          direccion: direccionDe(g),
          lideres: g.lideres.map((l) => contactoDe(l.persona)),
        },
        lidera,
      };
    }
    const pendiente = abiertas.find((s) => s.estado === 'pendiente');
    if (pendiente) {
      const g = pendiente.grupo;
      return {
        estado: 'pendiente',
        solicitudId: pendiente.id,
        desde: pendiente.createdAt.toISOString(),
        grupo: { id: g.id, nombre: g.nombre, lideres: g.lideres.map((l) => l.persona.nombre), dias: diasDe(g), horaInicio: g.horaInicio, zona: g.zona },
        lidera,
      };
    }
    return {
      estado: 'sin_grupo',
      ultima: ultima
        ? {
            estado: ultima.estado as 'rechazada' | 'retirada' | 'finalizada',
            grupo: ultima.grupo.nombre,
            mensaje: ultima.estado === 'rechazada' ? ultima.mensaje : null,
            fecha: ultima.updatedAt.toISOString(),
          }
        : null,
      lidera,
    };
  }

  /**
   * POST /grupos-extension/buscar (D224). La dirección o la ubicación de la
   * persona se usa en memoria para calcular distancias y se descarta: no se
   * guarda ni se loguea (FR-006). La respuesta no trae la dirección exacta ni
   * el contacto de nadie (FR-007).
   */
  async buscar(personaId: string, busqueda: BusquedaGex): Promise<GrupoExtensionEncontrado[]> {
    const origen = await this.origenDe(busqueda);
    const persona = await this.prisma.persona.findUniqueOrThrow({ where: { id: personaId }, select: { genero: true, fechaNacimiento: true } });
    const edad = edadDe(persona);
    const grupos = await this.prisma.grupoExtension.findMany({ where: { activo: true }, include: INCLUDE_GRUPO });
    const integrantes = await contarIntegrantes(this.prisma, grupos.map((g) => g.id));
    const dias = busqueda.dias?.length ? busqueda.dias : null;
    const encontrados = grupos
      .filter((g) => !g.lideres.some((l) => l.persona.id === personaId))
      .filter((g) => esCompatible({ genero: generoDe(g), edadMinima: g.edadMinima, edadMaxima: g.edadMaxima }, { genero: persona.genero, edad }))
      .filter((g) => !dias || g.dias.some((d) => dias.includes(d as DiaSemana)))
      .map((g): GrupoExtensionEncontrado => ({
        id: g.id,
        nombre: g.nombre,
        lideres: g.lideres.map((l) => l.persona.nombre),
        genero: generoDe(g)!,
        dias: diasDe(g),
        horaInicio: g.horaInicio,
        zona: g.enLaIglesia ? null : g.zona,
        enLaIglesia: g.enLaIglesia,
        distanciaKm: g.latitud !== null && g.longitud !== null ? distanciaKm(origen, { latitud: g.latitud, longitud: g.longitud }) : null,
        completo: g.cupo !== null && (integrantes.get(g.id) ?? 0) >= g.cupo,
      }));
    return ordenarPorDistancia(encontrados);
  }

  private async origenDe(b: BusquedaGex): Promise<Coordenadas> {
    if (b.latitud != null && b.longitud != null) {
      if (!Number.isFinite(b.latitud) || !Number.isFinite(b.longitud) || Math.abs(b.latitud) > 90 || Math.abs(b.longitud) > 180) {
        throw new AppException('VALIDACION', 400, 'La ubicación no es válida.', [{ campo: 'direccion', code: 'DIRECCION_REQUERIDA' }]);
      }
      return { latitud: b.latitud, longitud: b.longitud };
    }
    const direccion = (b.direccion ?? '').trim();
    if (!direccion || direccion.length > DIRECCION_BUSQUEDA_MAX) {
      throw new AppException('VALIDACION', 400, 'Falta la dirección.', [{ campo: 'direccion', code: 'DIRECCION_REQUERIDA' }]);
    }
    let coordenadas: Coordenadas | null;
    try {
      coordenadas = await this.geocodificador.ubicar(direccion);
    } catch {
      throw new AppException('UBICACION_NO_DISPONIBLE', 503, 'El servicio de mapas no respondió.');
    }
    if (!coordenadas) {
      throw new AppException('DIRECCION_NO_UBICADA', 400, 'No encontramos esa dirección.', [{ campo: 'direccion', code: 'DIRECCION_NO_UBICADA' }]);
    }
    return coordenadas;
  }

  /** POST /grupos-extension/:id/solicitudes/me (D225): un pedido pendiente; avisa a cada líder. */
  async pedir(personaId: string, grupoId: string): Promise<{ id: string }> {
    const resultado = await this.prisma.$transaction(async (tx) => {
      await bloquearPersona(tx, personaId);
      const grupo = await tx.grupoExtension.findUnique({ where: { id: grupoId }, include: INCLUDE_GRUPO });
      if (!grupo || !grupo.activo || grupo.lideres.some((l) => l.persona.id === personaId)) {
        throw new AppException('GRUPO_EXTENSION_NO_DISPONIBLE', 409, 'Este grupo no está disponible.');
      }
      const persona = await tx.persona.findUniqueOrThrow({ where: { id: personaId }, select: { genero: true, fechaNacimiento: true } });
      if (!esCompatible({ genero: generoDe(grupo), edadMinima: grupo.edadMinima, edadMaxima: grupo.edadMaxima }, { genero: persona.genero, edad: edadDe(persona) })) {
        throw new AppException('GRUPO_EXTENSION_NO_COMPATIBLE', 409, 'Este grupo es para otro género o para otra edad.');
      }
      await this.verificarSinOtroGrupo(tx, personaId);
      if (!(await hayLugar(tx, grupo))) throw grupoCompleto();
      const creada = await this.crear(tx, { personaId, grupoId, estado: 'pendiente' });
      for (const lider of grupo.lideres) {
        await this.notificaciones.emitir(tx, {
          nombre: 'grupo_extension.solicitud_nueva',
          a: { tipo: 'persona', personaId: lider.persona.id },
          datos: { solicitudId: creada.id, grupoId, grupo: grupo.nombre },
        });
      }
      return creada;
    });
    this.notificaciones.empujarEmails();
    return resultado;
  }

  /** POST /solicitudes-grupo-extension/me/:id/retirar: la propia pendiente; una ajena es 404. */
  async retirar(personaId: string, solicitudId: string): Promise<{ id: string }> {
    const solicitud = await this.prisma.solicitudGrupoExtension.findUnique({ where: { id: solicitudId }, select: { personaId: true } });
    if (!solicitud || solicitud.personaId !== personaId) throw solicitudNoEncontrada();
    const { count } = await this.prisma.solicitudGrupoExtension.updateMany({
      where: { id: solicitudId, estado: 'pendiente' },
      data: { estado: 'retirada', retiradaEn: new Date() },
    });
    if (count === 0) throw noPendiente();
    return { id: solicitudId };
  }

  // --- Líder (web app, D226) ---

  /** GET /grupos-extension/liderados: los Grupos activos que lidera, con pedidos e integrantes y su contacto. */
  async liderados(personaId: string): Promise<GrupoLiderado[]> {
    const grupos = await this.prisma.grupoExtension.findMany({
      where: { activo: true, lideres: { some: { personaId, hasta: null } } },
      include: INCLUDE_GRUPO,
      orderBy: { nombre: 'asc' },
    });
    return Promise.all(
      grupos.map(async (g) => ({
        id: g.id,
        nombre: g.nombre,
        dias: diasDe(g),
        horaInicio: g.horaInicio,
        cupo: g.cupo,
        direccion: direccionDe(g),
        zona: g.zona,
        ...(await pendientesEIntegrantes(this.prisma, g.id)),
      })),
    );
  }

  // --- Resolver (líder o Admin) ---

  async aceptar(solicitudId: string, actor: ActorGex): Promise<{ id: string }> {
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await this.cargarParaResolver(tx, solicitudId, actor);
      const grupo = await bloquearGrupo(tx, solicitud.grupoId);
      if (!grupo.activo) throw new AppException('GRUPO_EXTENSION_NO_DISPONIBLE', 409, 'El grupo está inactivo.');
      if (!(await hayLugar(tx, grupo))) throw grupoCompleto();
      try {
        const { count } = await tx.solicitudGrupoExtension.updateMany({
          where: { id: solicitudId, estado: 'pendiente' },
          data: { estado: 'aceptada', revisadoPorId: actor.personaId, revisadaEn: new Date() },
        });
        if (count === 0) throw noPendiente();
      } catch (error) {
        if (esViolacionDeUnico(error)) throw yaIntegrante();
        throw error;
      }
      await this.notificaciones.emitir(tx, {
        nombre: 'grupo_extension.solicitud_aceptada',
        a: { tipo: 'persona', personaId: solicitud.personaId },
        datos: { solicitudId, grupoId: solicitud.grupoId, grupo: solicitud.grupo.nombre },
      });
    });
    this.notificaciones.empujarEmails();
    return { id: solicitudId };
  }

  async rechazar(solicitudId: string, actor: ActorGex, mensaje?: string | null): Promise<{ id: string }> {
    const texto = mensaje?.trim() ? mensaje.trim() : null;
    if (texto && texto.length > MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX) {
      throw new AppException('VALIDACION', 400, 'El mensaje es demasiado largo.', [{ campo: 'mensaje', code: 'MENSAJE_DEMASIADO_LARGO' }]);
    }
    await this.prisma.$transaction(async (tx) => {
      const solicitud = await this.cargarParaResolver(tx, solicitudId, actor);
      const { count } = await tx.solicitudGrupoExtension.updateMany({
        where: { id: solicitudId, estado: 'pendiente' },
        data: { estado: 'rechazada', revisadoPorId: actor.personaId, revisadaEn: new Date(), mensaje: texto },
      });
      if (count === 0) throw noPendiente();
      await this.notificaciones.emitir(tx, {
        nombre: 'grupo_extension.solicitud_rechazada',
        a: { tipo: 'persona', personaId: solicitud.personaId },
        datos: { solicitudId, grupoId: solicitud.grupoId, grupo: solicitud.grupo.nombre },
      });
    });
    this.notificaciones.empujarEmails();
    return { id: solicitudId };
  }

  // --- Admin (D227) ---

  /** POST /grupos-extension/:id/integrantes: el Admin suma a una Persona directamente (sin chequeo de género/edad: es su criterio). */
  async agregar(grupoId: string, personaId: string, adminId: string): Promise<{ id: string }> {
    const resultado = await this.prisma.$transaction(async (tx) => {
      await bloquearPersona(tx, personaId);
      const persona = await tx.persona.findUnique({ where: { id: personaId }, select: { estado: true, activo: true } });
      if (!persona || !persona.activo || persona.estado !== 'activa') {
        throw new AppException('VALIDACION', 400, 'Esa persona no está activa.', [{ campo: 'personaId', code: 'PERSONA_REQUERIDA' }]);
      }
      const grupo = await bloquearGrupo(tx, grupoId);
      if (!grupo.activo) throw new AppException('GRUPO_EXTENSION_NO_DISPONIBLE', 409, 'El grupo está inactivo.');
      const nombre = (await tx.grupoExtension.findUniqueOrThrow({ where: { id: grupoId }, select: { nombre: true } })).nombre;
      if (await tx.liderGrupoExtension.count({ where: { grupoId, personaId, hasta: null } })) {
        throw new AppException('GRUPO_EXTENSION_NO_DISPONIBLE', 409, 'Esa persona lidera este grupo.');
      }
      // Un pedido pendiente a ESTE Grupo se acepta; uno a otro Grupo traba (que se resuelva primero).
      const pendiente = await tx.solicitudGrupoExtension.findFirst({ where: { personaId, estado: 'pendiente' }, select: { id: true, grupoId: true } });
      if (pendiente && pendiente.grupoId !== grupoId) throw pedidoPendiente();
      if (await tx.solicitudGrupoExtension.count({ where: { personaId, estado: 'aceptada' } })) throw yaIntegrante();
      if (!(await hayLugar(tx, grupo))) throw grupoCompleto();
      const ahora = new Date();
      let id: string;
      try {
        if (pendiente) {
          await tx.solicitudGrupoExtension.update({ where: { id: pendiente.id }, data: { estado: 'aceptada', revisadoPorId: adminId, revisadaEn: ahora } });
          id = pendiente.id;
        } else {
          id = (await this.crear(tx, { personaId, grupoId, estado: 'aceptada', creadoPorId: adminId, revisadoPorId: adminId, revisadaEn: ahora })).id;
        }
      } catch (error) {
        if (esViolacionDeUnico(error)) throw yaIntegrante();
        throw error;
      }
      await this.notificaciones.emitir(tx, {
        nombre: 'grupo_extension.agregada_por_admin',
        a: { tipo: 'persona', personaId },
        datos: { solicitudId: id, grupoId, grupo: nombre },
      });
      return { id };
    });
    this.notificaciones.empujarEmails();
    return resultado;
  }

  /** POST /grupos-extension/:id/integrantes/:solicitudId/quitar: la pertenencia pasa a `finalizada` (no se borra). */
  async quitar(grupoId: string, solicitudId: string, adminId: string): Promise<{ id: string }> {
    const { count } = await this.prisma.solicitudGrupoExtension.updateMany({
      where: { id: solicitudId, grupoId, estado: 'aceptada' },
      data: { estado: 'finalizada', finalizadaEn: new Date(), finalizadaPorId: adminId },
    });
    if (count === 0) {
      const existe = await this.prisma.solicitudGrupoExtension.count({ where: { id: solicitudId, grupoId } });
      if (!existe) throw solicitudNoEncontrada();
      throw new AppException('GRUPO_EXTENSION_NO_INTEGRANTE', 409, 'Esa persona ya no forma parte del grupo.');
    }
    return { id: solicitudId };
  }

  /** GET /solicitudes-grupo-extension/:id (bandeja, D227). */
  async detalle(solicitudId: string): Promise<SolicitudGrupoExtensionDetalle> {
    const s = await this.prisma.solicitudGrupoExtension.findUnique({
      where: { id: solicitudId },
      include: { persona: { select: SELECT_CONTACTO }, grupo: { select: { id: true, nombre: true, activo: true, cupo: true, zona: true } } },
    });
    if (!s) throw solicitudNoEncontrada();
    const [integrantes, personas] = await Promise.all([
      contarIntegrantes(this.prisma, [s.grupoId]),
      this.prisma.persona.findMany({
        where: { id: { in: [s.creadoPorId, s.revisadoPorId].filter((x): x is string => !!x) } },
        select: { id: true, nombre: true, apellido: true },
      }),
    ]);
    const nombre = (id: string | null) => {
      const p = personas.find((x) => x.id === id);
      return p ? `${p.nombre} ${p.apellido}` : null;
    };
    return {
      id: s.id,
      estado: s.estado,
      persona: { ...contactoDe(s.persona), edad: edadDe(s.persona, hoyEnArgentina()), genero: s.persona.genero },
      grupo: { ...s.grupo, integrantes: integrantes.get(s.grupoId) ?? 0 },
      createdAt: s.createdAt.toISOString(),
      creadoPor: nombre(s.creadoPorId),
      revisadoPor: nombre(s.revisadoPorId),
      revisadaEn: s.revisadaEn?.toISOString() ?? null,
      mensaje: s.mensaje,
    };
  }

  // --- Internos ---

  private async verificarSinOtroGrupo(tx: Prisma.TransactionClient, personaId: string): Promise<void> {
    const abiertas = await tx.solicitudGrupoExtension.findMany({ where: { personaId, estado: { in: ['pendiente', 'aceptada'] } }, select: { estado: true } });
    if (abiertas.some((s) => s.estado === 'aceptada')) throw yaIntegrante();
    if (abiertas.some((s) => s.estado === 'pendiente')) throw pedidoPendiente();
  }

  private async crear(
    tx: Prisma.TransactionClient,
    data: Prisma.SolicitudGrupoExtensionUncheckedCreateInput,
  ): Promise<{ id: string }> {
    try {
      return await tx.solicitudGrupoExtension.create({ data, select: { id: true } });
    } catch (error) {
      if (esViolacionDeUnico(error)) throw data.estado === 'aceptada' ? yaIntegrante() : pedidoPendiente();
      throw error;
    }
  }

  /** La Solicitud a resolver; un líder solo resuelve las de SUS Grupos (si no, 404: no revela que existe). */
  private async cargarParaResolver(tx: Prisma.TransactionClient, solicitudId: string, actor: ActorGex) {
    const solicitud = await tx.solicitudGrupoExtension.findUnique({
      where: { id: solicitudId },
      select: { id: true, personaId: true, grupoId: true, estado: true, grupo: { select: { nombre: true } } },
    });
    if (!solicitud) throw solicitudNoEncontrada();
    if (actor.tipo === 'lider') {
      const esLider = await tx.liderGrupoExtension.count({ where: { grupoId: solicitud.grupoId, personaId: actor.personaId, hasta: null } });
      if (!esLider) throw solicitudNoEncontrada();
    }
    if (solicitud.estado !== 'pendiente') throw noPendiente();
    return solicitud;
  }
}

function noPendiente() {
  return new AppException('GRUPO_EXTENSION_SOLICITUD_NO_PENDIENTE', 409, 'Este pedido ya fue respondido.');
}

function pedidoPendiente() {
  return new AppException('GRUPO_EXTENSION_PEDIDO_PENDIENTE', 409, 'Ya hay un pedido esperando respuesta.');
}

function yaIntegrante() {
  return new AppException('GRUPO_EXTENSION_YA_INTEGRANTE', 409, 'Ya forma parte de un grupo de extensión.');
}

