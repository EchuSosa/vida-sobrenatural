import { Injectable } from '@nestjs/common';
import {
  EDAD_MINIMA_ROL_DE_CARGO,
  esAptaParaMinisterio,
  validarEleccionMinisterio,
  type ConfirmarOpcionEleccion,
  type DetalleEleccionAdmin,
  type DetalleEleccionLider,
  type EleccionesDeMiGrupo,
  type EleccionVistaPersona,
  type GuardarEleccionLider,
  type GuardarMiEleccion,
  type MiEleccionMinisterio,
  type OpcionElegida,
  type ResumenMiEleccion,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { RolesDeEstadoService } from '../persona/roles-de-estado.service.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { bloquearPersona } from '../camino/consultas.js';
import { nombresDe } from '../discipulado/consultas.js';
import { normalizarMotivo } from '../discipulado/validaciones.js';
import { grupoDelLiderOFallar, grupoNoEnCurso } from '../vida-de-servicio/consultas-vs.js';
import { crearMembresiaDirecta, membresiasDelCarril } from '../ministerio/membresia.js';
import {
  SELECT_OPCION,
  catalogoParaElegir,
  datosConocidos,
  edicionEnCursoDe,
  ministeriosParaValidar,
  opcionVista,
  ordenarOpciones,
  type OpcionCargada,
} from './consultas.js';

type Tx = Prisma.TransactionClient;

const SELECT_ELECCION = {
  id: true,
  personaId: true,
  grupoId: true,
  estado: true,
  comentario: true,
  notas: true,
  notasPorId: true,
  notasEn: true,
  charlaPorId: true,
  charlaEn: true,
  cargadaPorId: true,
  createdAt: true,
  updatedAt: true,
  opciones: { select: SELECT_OPCION },
} as const satisfies Prisma.EleccionMinisterioSelect;

type EleccionCargada = Prisma.EleccionMinisterioGetPayload<{ select: typeof SELECT_ELECCION }>;

/**
 * spec 015 — la elección de ministerio de punta a punta (D239–D242): la
 * persona elige, el líder de Vida de Servicio hace la charla y deja notas
 * privadas (D240), y el Admin confirma cada área (D242), que crea la
 * membresía con `crearMembresiaDirecta` (D241).
 */
@Injectable()
export class EleccionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly rolesDeEstado: RolesDeEstadoService,
  ) {}

  // --- Persona ---

  /** GET /elecciones-ministerio/me. */
  async miEleccion(personaId: string): Promise<MiEleccionMinisterio> {
    const edicion = await edicionEnCursoDe(this.prisma, personaId);
    if (!edicion) return { disponible: false };
    const eleccion = await this.cargar({ personaId_grupoId: { personaId, grupoId: edicion.id } });
    if (!eleccion && !edicion.eleccionAbierta) return { disponible: false };
    const [conocido, catalogo] = await Promise.all([datosConocidos(this.prisma, personaId), catalogoParaElegir(this.prisma)]);
    return {
      disponible: true,
      edicion: { id: edicion.id, nombre: edicion.nombre },
      abierta: edicion.eleccionAbierta,
      editable: edicion.eleccionAbierta && (!eleccion || eleccion.estado === 'borrador'),
      conocido,
      catalogo,
      eleccion: eleccion ? vistaPersona(eleccion) : null,
    };
  }

  /** GET /elecciones-ministerio/me/resumen — lo que muestra la card de Ministerio de Mi camino. */
  async resumen(personaId: string): Promise<ResumenMiEleccion> {
    const edicion = await edicionEnCursoDe(this.prisma, personaId);
    if (!edicion) return null;
    const eleccion = await this.cargar({ personaId_grupoId: { personaId, grupoId: edicion.id } });
    if (eleccion && (eleccion.estado === 'borrador' || eleccion.estado === 'charla_hecha')) {
      return {
        estado: eleccion.estado,
        editable: edicion.eleccionAbierta && eleccion.estado === 'borrador',
        opciones: ordenarOpciones(eleccion.opciones).map((o) => ({ ministerio: o.ministerio.nombre, celula: o.celula?.nombre ?? null })),
      };
    }
    if (!eleccion && edicion.eleccionAbierta) return { estado: 'puede_elegir', edicion: { nombre: edicion.nombre } };
    return null;
  }

  /** PUT /elecciones-ministerio/me: elegir o cambiar, hasta la charla (D239). */
  async guardarMia(personaId: string, cuerpo: GuardarMiEleccion): Promise<MiEleccionMinisterio> {
    const opciones = normalizarOpciones(cuerpo.opciones);
    const comentario = textoOpcional(cuerpo.comentario);
    await this.prisma.$transaction(async (tx) => {
      await bloquearPersona(tx, personaId);
      const edicion = await edicionEnCursoDe(tx, personaId);
      if (!edicion || !edicion.eleccionAbierta) {
        throw new AppException('ELECCION_NO_DISPONIBLE', 409, 'La elección de ministerio de tu edición no está abierta.');
      }
      const previa = await tx.eleccionMinisterio.findUnique({
        where: { personaId_grupoId: { personaId, grupoId: edicion.id } },
        select: { id: true, estado: true },
      });
      if (previa && previa.estado !== 'borrador') {
        throw new AppException('ELECCION_YA_CHARLADA', 409, 'Ya lo charlaste con tu líder: para cambiarlo, hablá con tu líder de Vida de Servicio.');
      }
      await validar(tx, opciones, { comentario });
      const id = previa
        ? previa.id
        : (await tx.eleccionMinisterio.create({ data: { personaId, grupoId: edicion.id }, select: { id: true } })).id;
      await reemplazarOpciones(tx, id, opciones);
      await tx.eleccionMinisterio.update({ where: { id }, data: { comentario, editadaPorId: personaId } });
    });
    return this.miEleccion(personaId);
  }

  // --- Líder de Vida de Servicio (D240) ---

  /** GET /vida-de-servicio/mis-grupos/:grupoId/elecciones. */
  async deMiGrupo(grupoId: string, liderId: string): Promise<EleccionesDeMiGrupo> {
    const grupo = await grupoDelLiderOFallar(this.prisma, grupoId, liderId);
    const [inscripciones, elecciones] = await Promise.all([
      this.prisma.inscripcion.findMany({ where: { grupoId, estado: { in: ['activa', 'completada'] } }, select: { personaId: true } }),
      this.prisma.eleccionMinisterio.findMany({ where: { grupoId }, select: SELECT_ELECCION }),
    ]);
    const nombres = await nombresDe(this.prisma, inscripciones.map((i) => i.personaId));
    const porPersona = new Map(elecciones.map((e) => [e.personaId, e]));
    const personas = [...nombres.values()]
      .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
      .map((persona) => {
        const e = porPersona.get(persona.id);
        return {
          persona,
          eleccion: e
            ? { id: e.id, estado: e.estado, opciones: ordenarOpciones(e.opciones).map((o) => ({ ministerio: o.ministerio.nombre, celula: o.celula?.nombre ?? null })) }
            : null,
        };
      });
    return { grupo: { id: grupo.id, nombre: grupo.nombre ?? '' }, eleccionAbierta: grupo.eleccionAbierta, personas };
  }

  /** GET /vida-de-servicio/mis-grupos/:grupoId/elecciones/:personaId. */
  async detalleLider(grupoId: string, personaId: string, liderId: string): Promise<DetalleEleccionLider> {
    const grupo = await grupoDelLiderOFallar(this.prisma, grupoId, liderId);
    const inscripcion = await this.prisma.inscripcion.findFirst({ where: { grupoId, personaId, estado: { in: ['activa', 'completada'] } }, select: { id: true } });
    if (!inscripcion) throw personaNoEncontrada();
    const [persona, conocido, catalogo, eleccion] = await Promise.all([
      this.prisma.persona.findUniqueOrThrow({ where: { id: personaId }, select: { id: true, nombre: true, apellido: true, telefono: true } }),
      datosConocidos(this.prisma, personaId),
      catalogoParaElegir(this.prisma),
      this.cargar({ personaId_grupoId: { personaId, grupoId } }),
    ]);
    const nombres = await nombresDe(
      this.prisma,
      eleccion ? [eleccion.notasPorId, eleccion.charlaPorId, eleccion.cargadaPorId].filter((x): x is string => x !== null) : [],
    );
    const abierta = grupo.estado === 'en_curso' && (!eleccion || eleccion.estado === 'borrador' || eleccion.estado === 'charla_hecha');
    return {
      grupo: { id: grupo.id, nombre: grupo.nombre ?? '' },
      persona,
      conocido,
      catalogo,
      eleccion: eleccion
        ? {
            ...vistaPersona(eleccion),
            notas: eleccion.notas,
            notasPor: eleccion.notasPorId ? (nombres.get(eleccion.notasPorId) ?? null) : null,
            notasEn: eleccion.notasEn?.toISOString() ?? null,
            charlaPor: eleccion.charlaPorId ? (nombres.get(eleccion.charlaPorId) ?? null) : null,
            charlaEn: eleccion.charlaEn?.toISOString() ?? null,
            cargadaPor: eleccion.cargadaPorId ? (nombres.get(eleccion.cargadaPorId) ?? null) : null,
            version: eleccion.updatedAt.toISOString(),
          }
        : null,
      opcionesEditables: abierta && (!eleccion || eleccion.opciones.every((o) => o.resultado === 'pendiente')),
      notasEditables: abierta,
    };
  }

  /**
   * PUT /vida-de-servicio/mis-grupos/:grupoId/elecciones/:personaId: el líder
   * carga o ajusta la elección en la charla, escribe notas y, si quiere, marca
   * "Charla hecha" en el mismo paso (D240).
   */
  async guardarLider(grupoId: string, personaId: string, liderId: string, cuerpo: GuardarEleccionLider): Promise<DetalleEleccionLider> {
    const opciones = normalizarOpciones(cuerpo.opciones);
    const notas = cuerpo.notas === undefined ? undefined : textoOpcional(cuerpo.notas);
    await this.prisma.$transaction(async (tx) => {
      const grupo = await grupoDelLiderOFallar(tx, grupoId, liderId);
      if (grupo.estado !== 'en_curso') throw grupoNoEnCurso();
      const inscripcion = await tx.inscripcion.findFirst({ where: { grupoId, personaId, estado: 'activa' }, select: { id: true } });
      if (!inscripcion) throw personaNoEncontrada();
      await bloquearPersona(tx, personaId);
      const previa = await tx.eleccionMinisterio.findUnique({ where: { personaId_grupoId: { personaId, grupoId } }, select: SELECT_ELECCION });
      if (previa && (previa.estado === 'resuelta' || previa.estado === 'cancelada')) {
        throw new AppException('ELECCION_CERRADA', 409, 'Esta elección ya está cerrada.');
      }
      if (previa && cuerpo.version && previa.updatedAt.toISOString() !== cuerpo.version) {
        throw new AppException('ELECCION_DESACTUALIZADA', 409, 'Alguien cambió esta elección mientras la tenías abierta: recargá para ver lo último.');
      }
      const cambianOpciones = !previa || !mismasOpciones(previa.opciones, opciones);
      if (previa && cambianOpciones && previa.opciones.some((o) => o.resultado !== 'pendiente')) {
        throw new AppException('ELECCION_OPCIONES_RESUELTAS', 409, 'El equipo ya confirmó parte de esta elección: las áreas no se pueden cambiar.');
      }
      // Sin marcar la charla, el líder puede guardar solo las notas (todavía sin áreas).
      await validar(tx, opciones, { notas: notas ?? null }, cuerpo.charlaHecha !== true);
      const id = previa
        ? previa.id
        : (await tx.eleccionMinisterio.create({ data: { personaId, grupoId, cargadaPorId: liderId }, select: { id: true } })).id;
      if (cambianOpciones) await reemplazarOpciones(tx, id, opciones);
      const ahora = new Date();
      const marcarCharla = cuerpo.charlaHecha === true && (!previa || previa.estado === 'borrador');
      await tx.eleccionMinisterio.update({
        where: { id },
        data: {
          ...(cambianOpciones ? { editadaPorId: liderId } : {}),
          ...(notas !== undefined && notas !== (previa?.notas ?? null) ? { notas, notasPorId: liderId, notasEn: ahora } : {}),
          ...(marcarCharla ? { estado: 'charla_hecha' as const, charlaPorId: liderId, charlaEn: ahora } : {}),
        },
      });
      if (marcarCharla) {
        await this.notificaciones.emitir(tx, { nombre: 'ministerio.eleccion_lista', a: { tipo: 'admin' }, datos: { eleccionId: id } });
      }
    });
    return this.detalleLider(grupoId, personaId, liderId);
  }

  // --- Admin (D242) ---

  /** GET /elecciones-ministerio/:id — las notas, solo con `solicitudes.aprobar` (D240). */
  async detalleAdmin(id: string, verNotas: boolean): Promise<DetalleEleccionAdmin> {
    const eleccion = await this.cargar({ id });
    if (!eleccion) throw eleccionNoEncontrada();
    const [persona, grupo, conocido, principales, enParalelo] = await Promise.all([
      this.prisma.persona.findUniqueOrThrow({
        where: { id: eleccion.personaId },
        select: { id: true, nombre: true, apellido: true, fechaNacimiento: true, telefono: true, email: true, rol: true },
      }),
      this.prisma.grupo.findUniqueOrThrow({ where: { id: eleccion.grupoId }, select: { id: true, nombre: true } }),
      datosConocidos(this.prisma, eleccion.personaId),
      membresiasDelCarril(this.prisma, eleccion.personaId, false),
      membresiasDelCarril(this.prisma, eleccion.personaId, true),
    ]);
    const nombres = await nombresDe(
      this.prisma,
      [eleccion.charlaPorId, eleccion.cargadaPorId, ...eleccion.opciones.map((o) => o.resueltaPorId)].filter((x): x is string => x !== null),
    );
    const esDiscipulador = persona.rol.includes('discipulador');
    const edad = calcularEdad(persona.fechaNacimiento);
    return {
      id: eleccion.id,
      estado: eleccion.estado,
      createdAt: eleccion.createdAt.toISOString(),
      persona: { id: persona.id, nombre: persona.nombre, apellido: persona.apellido, edad, telefono: persona.telefono, email: persona.email },
      edicion: { id: grupo.id, nombre: grupo.nombre ?? '' },
      conocido,
      comentario: eleccion.comentario,
      ...(verNotas ? { notas: eleccion.notas } : {}),
      charlaPor: eleccion.charlaPorId ? (nombres.get(eleccion.charlaPorId) ?? null) : null,
      charlaEn: eleccion.charlaEn?.toISOString() ?? null,
      cargadaPor: eleccion.cargadaPorId ? (nombres.get(eleccion.cargadaPorId) ?? null) : null,
      apta: esAptaParaMinisterio(persona.rol),
      membresias: { principales, enParalelo },
      opciones: ordenarOpciones(eleccion.opciones).map((o) => ({
        ...opcionVista(o),
        ...(verNotas ? { motivoDescarte: o.motivoDescarte } : {}),
        resueltaPor: o.resueltaPorId ? (nombres.get(o.resueltaPorId) ?? null) : null,
        resueltaEn: o.resueltaEn?.toISOString() ?? null,
        ofrecerRolDiscipulador: !!o.celula?.ofreceRolDiscipulador && !esDiscipulador && edad >= EDAD_MINIMA_ROL_DE_CARGO,
      })),
    };
  }

  /** POST /elecciones-ministerio/:id/opciones/:opcionId/confirmar (D242): crea la membresía. */
  async confirmar(id: string, opcionId: string, dto: ConfirmarOpcionEleccion, autorId: string): Promise<DetalleEleccionAdmin> {
    await this.prisma.$transaction(async (tx) => {
      const { eleccion, opcion } = await opcionParaResolver(tx, id, opcionId);
      const persona = await tx.persona.findUniqueOrThrow({ where: { id: eleccion.personaId }, select: { rol: true } });
      if (!esAptaParaMinisterio(persona.rol)) {
        throw new AppException('NO_APTA_PARA_MINISTERIO', 409, 'Se confirma cuando termine Vida de Servicio.');
      }
      const { postulacionId } = await crearMembresiaDirecta(
        tx,
        { rolesDeEstado: this.rolesDeEstado, notificaciones: this.notificaciones },
        {
          personaId: eleccion.personaId,
          ministerioId: opcion.ministerioId,
          celulaId: opcion.celulaId,
          autorId,
          decision: dto,
          otorgarRolDiscipulador: dto.otorgarRolDiscipulador,
          motivacion: eleccion.comentario,
        },
      );
      await tx.opcionEleccionMinisterio.update({
        where: { id: opcionId },
        data: { resultado: 'confirmada', postulacionId, resueltaPorId: autorId, resueltaEn: new Date() },
      });
      await cerrarSiResuelta(tx, id, autorId);
    });
    return this.detalleAdmin(id, true);
  }

  /** POST /elecciones-ministerio/:id/opciones/:opcionId/descartar (D242): "No por ahora", motivo interno opcional. */
  async descartar(id: string, opcionId: string, motivoCrudo: string | undefined, autorId: string): Promise<DetalleEleccionAdmin> {
    const motivo = normalizarMotivo(motivoCrudo);
    await this.prisma.$transaction(async (tx) => {
      await opcionParaResolver(tx, id, opcionId);
      await tx.opcionEleccionMinisterio.update({
        where: { id: opcionId },
        data: { resultado: 'descartada', motivoDescarte: motivo, resueltaPorId: autorId, resueltaEn: new Date() },
      });
      await cerrarSiResuelta(tx, id, autorId);
    });
    return this.detalleAdmin(id, true);
  }

  private cargar(where: Prisma.EleccionMinisterioWhereUniqueInput): Promise<EleccionCargada | null> {
    return this.prisma.eleccionMinisterio.findUnique({ where, select: SELECT_ELECCION });
  }
}

function vistaPersona(e: EleccionCargada): EleccionVistaPersona {
  return { id: e.id, estado: e.estado, comentario: e.comentario, opciones: ordenarOpciones(e.opciones).map(opcionVista) };
}

/** Las opciones como llegan (DTO sin validar): pares { ministerioId, celulaId | null }, un renglón por Ministerio. */
function normalizarOpciones(crudas: unknown): OpcionElegida[] {
  if (!Array.isArray(crudas)) return [];
  const opciones: OpcionElegida[] = [];
  for (const o of crudas as unknown[]) {
    const { ministerioId, celulaId } = (o ?? {}) as Record<string, unknown>;
    if (typeof ministerioId !== 'string' || (celulaId !== null && celulaId !== undefined && typeof celulaId !== 'string')) continue;
    const celula = typeof celulaId === 'string' ? celulaId : null;
    if (opciones.some((x) => x.ministerioId === ministerioId && x.celulaId === celula)) continue;
    opciones.push({ ministerioId, celulaId: celula });
  }
  return opciones;
}

function textoOpcional(texto: string | null | undefined): string | null {
  const limpio = typeof texto === 'string' ? texto.trim() : '';
  return limpio === '' ? null : limpio;
}

async function validar(tx: Tx, opciones: OpcionElegida[], textos: { comentario?: string | null; notas?: string | null }, permitirVacia = false): Promise<void> {
  const ministerios = await ministeriosParaValidar(tx, opciones.map((o) => o.ministerioId));
  const errores = validarEleccionMinisterio(opciones, ministerios, textos).filter((e) => !(permitirVacia && e.code === 'ELECCION_VACIA'));
  if (errores.length > 0) throw new AppException('VALIDACION', 400, 'Revisá la elección.', errores);
}

/** Las opciones de un borrador se reemplazan enteras (todavía no son una decisión de nadie más que la persona y su líder). */
async function reemplazarOpciones(tx: Tx, eleccionId: string, opciones: OpcionElegida[]): Promise<void> {
  const ministerios = await ministeriosParaValidar(tx, opciones.map((o) => o.ministerioId));
  await tx.opcionEleccionMinisterio.deleteMany({ where: { eleccionId } });
  await tx.opcionEleccionMinisterio.createMany({
    data: opciones.map((o) => ({
      eleccionId,
      ministerioId: o.ministerioId,
      celulaId: o.celulaId,
      enParalelo: o.celulaId ? (ministerios.get(o.ministerioId)?.areas.get(o.celulaId)?.enParalelo ?? false) : false,
    })),
  });
}

function mismasOpciones(actuales: readonly OpcionCargada[], nuevas: readonly OpcionElegida[]): boolean {
  const clave = (m: string, c: string | null) => `${m}:${c ?? ''}`;
  const a = new Set(actuales.map((o) => clave(o.ministerio.id, o.celula?.id ?? null)));
  return a.size === nuevas.length && nuevas.every((o) => a.has(clave(o.ministerioId, o.celulaId)));
}

/** Bloquea la elección y exige que espere al Admin (con la charla hecha) y que la opción siga pendiente. */
async function opcionParaResolver(tx: Tx, id: string, opcionId: string) {
  await tx.$queryRaw`SELECT "id" FROM "elecciones_ministerio" WHERE "id" = ${id} FOR UPDATE`;
  const eleccion = await tx.eleccionMinisterio.findUnique({ where: { id }, select: { personaId: true, estado: true, comentario: true } });
  if (!eleccion) throw eleccionNoEncontrada();
  if (eleccion.estado === 'borrador') throw new AppException('ELECCION_SIN_CHARLA', 409, 'Falta la charla con su líder de Vida de Servicio.');
  if (eleccion.estado !== 'charla_hecha') throw new AppException('ELECCION_CERRADA', 409, 'Esta elección ya está cerrada.');
  const opcion = await tx.opcionEleccionMinisterio.findFirst({ where: { id: opcionId, eleccionId: id }, select: { ministerioId: true, celulaId: true, resultado: true } });
  if (!opcion) throw eleccionNoEncontrada();
  if (opcion.resultado !== 'pendiente') throw new AppException('OPCION_YA_RESUELTA', 409, 'Esta área ya se resolvió: recargá para ver el estado actual.');
  return { eleccion, opcion };
}

async function cerrarSiResuelta(tx: Tx, id: string, autorId: string): Promise<void> {
  const quedan = await tx.opcionEleccionMinisterio.count({ where: { eleccionId: id, resultado: 'pendiente' } });
  if (quedan === 0) {
    await tx.eleccionMinisterio.update({ where: { id }, data: { estado: 'resuelta', resueltaPorId: autorId, resueltaEn: new Date() } });
  }
}

function eleccionNoEncontrada() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe esa elección.');
}

function personaNoEncontrada() {
  return new AppException('NO_ENCONTRADO', 404, 'Esa persona no está en esta edición.');
}
