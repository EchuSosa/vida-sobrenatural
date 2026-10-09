import { Injectable } from '@nestjs/common';
import {
  EVENTO_DESCRIPCION_IMAGEN_MAX,
  FLYER_TAMANO_MAXIMO_BYTES,
  MIME_TIPOS_FLYER_PERMITIDOS,
  type EventoDetalle,
  type EventoResumen,
  type FiltroEventos,
  type GeneroDestinatario,
  type Pagina,
  type TipoEvento,
  type TotalesEvento,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { BautismoService } from '../bautismo/bautismo.service.js';
import { StorageService } from '../storage/storage.service.js';
import { ImagenPublicaService, PERFIL_FLYER } from '../storage/imagen-publica.service.js';
import type { DatosEventoDto } from './dto/datos-evento.dto.js';
import { conBloqueoDeEvento, contarOcupados, promoverDesdeLista } from './motor-cupo.js';
import { slugDeEvento } from './slug.js';
import { validarConfigEvento, type ConfigEvento } from './validacion-evento.js';
import { aEventoPublico, EVENTO_SELECT, inicioDeHoyEnArgentina, totalesDeEventos } from './representacion.js';

export interface FiltrosListadoEventos {
  filtro: FiltroEventos;
  tipo?: TipoEvento;
  buscar?: string;
  orden: 'inicio' | 'nombre';
  dir?: 'asc' | 'desc';
  skip: number;
  take: number;
}

const RESUMEN_SELECT = {
  id: true,
  slug: true,
  nombre: true,
  tipo: true,
  inicio: true,
  fin: true,
  estado: true,
  requiereInscripcion: true,
  cupo: true,
  eliminadoEn: true,
  sede: { select: { id: true, nombre: true } },
} as const satisfies Prisma.EventoSelect;

/** Lo que identifica a quien actúa (D119: fecha y responsable). */
export type Actor = string;

/**
 * spec 011, lote A — gestión de Eventos desde el backoffice (US2, US7, US8):
 * FR-009 a FR-014, FR-040 a FR-043, FR-045, FR-048. Lo que mueve cupo corre
 * con `conBloqueoDeEvento` y termina con `promoverDesdeLista` (motor-cupo.ts);
 * los avisos se emiten dentro de la transacción (D197).
 */
@Injectable()
export class EventosGestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly bautismo: BautismoService,
    private readonly storage: StorageService,
    private readonly imagenes: ImagenPublicaService,
  ) {}

  /** GET /eventos — FR-009: filtros, búsqueda por nombre, orden y totales. */
  async listar(f: FiltrosListadoEventos): Promise<Pagina<EventoResumen>> {
    const hoy = inicioDeHoyEnArgentina();
    const where: Prisma.EventoWhereInput = { eliminadoEn: null };
    if (f.filtro === 'proximos') Object.assign(where, { estado: 'publicado', inicio: { gte: hoy } });
    if (f.filtro === 'pasados') Object.assign(where, { estado: 'publicado', inicio: { lt: hoy } });
    if (f.filtro === 'cancelados') Object.assign(where, { estado: 'cancelado' });
    if (f.tipo) where.tipo = f.tipo;
    const buscar = f.buscar?.trim();
    if (buscar) where.nombre = { contains: buscar, mode: 'insensitive' };
    // Próximos: el más cercano primero; el resto, el más reciente primero.
    const dir = f.dir ?? (f.orden === 'nombre' || f.filtro === 'proximos' ? 'asc' : 'desc');
    const orderBy: Prisma.EventoOrderByWithRelationInput[] =
      f.orden === 'nombre' ? [{ nombre: dir }, { inicio: 'asc' }] : [{ inicio: dir }, { nombre: 'asc' }];
    const [filas, total] = await Promise.all([
      this.prisma.evento.findMany({ where, orderBy, skip: f.skip, take: f.take, select: RESUMEN_SELECT }),
      this.prisma.evento.count({ where }),
    ]);
    const totales = await totalesDeEventos(this.prisma, filas.map((e) => e.id));
    return { items: filas.map((e) => this.aResumen(e, totales.get(e.id)!)), total };
  }

  /** GET /eventos/papelera — D119. */
  async papelera(skip: number, take: number): Promise<Pagina<EventoResumen>> {
    const where: Prisma.EventoWhereInput = { eliminadoEn: { not: null } };
    const [filas, total] = await Promise.all([
      this.prisma.evento.findMany({ where, orderBy: { eliminadoEn: 'desc' }, skip, take, select: RESUMEN_SELECT }),
      this.prisma.evento.count({ where }),
    ]);
    const totales = await totalesDeEventos(this.prisma, filas.map((e) => e.id));
    return { items: filas.map((e) => this.aResumen(e, totales.get(e.id)!)), total };
  }

  /** GET /eventos/bautismo/proximos — FR-048, para la 010: bautismos publicados que no empezaron. */
  async bautismoProximos(): Promise<EventoResumen[]> {
    const filas = await this.prisma.evento.findMany({
      where: { tipo: 'bautismo', estado: 'publicado', eliminadoEn: null, inicio: { gt: new Date() } },
      orderBy: { inicio: 'asc' },
      select: RESUMEN_SELECT,
    });
    const totales = await totalesDeEventos(this.prisma, filas.map((e) => e.id));
    return filas.map((e) => this.aResumen(e, totales.get(e.id)!));
  }

  /** GET /eventos/:id — `EventoDetalle`. Eliminado → 404 (FR-043). */
  async detalle(id: string, db: Prisma.TransactionClient = this.prisma): Promise<EventoDetalle> {
    const evento = await db.evento.findFirst({
      where: { id, eliminadoEn: null },
      select: { ...EVENTO_SELECT, creadoPorId: true, createdAt: true, canceladoEn: true, eliminadoEn: true },
    });
    if (!evento) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
    const [totales, inscripcionesTotal, pagosTotal, creadoPor, respuestasPorPregunta] = await Promise.all([
      totalesDeEventos(db, [id]),
      db.inscripcionEvento.count({ where: { eventoId: id } }),
      db.pago.count({ where: { inscripcionEvento: { eventoId: id } } }),
      db.persona.findUnique({ where: { id: evento.creadoPorId }, select: { id: true, nombre: true, apellido: true } }),
      db.respuestaPreguntaEvento.groupBy({ by: ['preguntaId'], where: { pregunta: { eventoId: id } }, _count: { _all: true } }),
    ]);
    const t = totales.get(id)!;
    const cuantas = new Map(respuestasPorPregunta.map((r) => [r.preguntaId, r._count._all]));
    const publico = aEventoPublico(evento, t.ocupados);
    return {
      ...publico,
      preguntas: publico.preguntas.map((p) => ({ ...p, respuestas: cuantas.get(p.id) ?? 0 })),
      ...t,
      lugarPropio: evento.lugar,
      diasAnticipacionRecordatorio: evento.diasAnticipacionRecordatorio,
      inscripcionesTotal,
      pagosTotal,
      creadoPor,
      createdAt: evento.createdAt.toISOString(),
      canceladoEn: evento.canceladoEn?.toISOString() ?? null,
      eliminadoEn: evento.eliminadoEn?.toISOString() ?? null,
    };
  }

  /** POST /eventos — FR-010, FR-011, FR-045. */
  async crear(dto: DatosEventoDto, actor: Actor): Promise<EventoDetalle> {
    const tipo = dto.tipo ?? 'general';
    const esBautismo = tipo === 'bautismo';
    const config = this.configDesde(dto, {
      nombre: '',
      descripcion: '',
      tipo,
      inicio: null,
      fin: null,
      lugar: null,
      publicoObjetivo: null,
      // FR-045: lo que el bautismo no admite se fuerza si no viene en el cuerpo.
      requiereInscripcion: esBautismo,
      requiereAprobacion: false,
      cupo: null,
      permiteListaEspera: false,
      costo: null,
      instruccionesPago: null,
      diasAnticipacionRecordatorio: null,
      destinatariosGenero: 'todas',
      edadMinima: null,
      edadMaxima: null,
    });
    const errores = validarConfigEvento(config);
    const sedeValida = await this.sedeActiva(dto.sedeId);
    if (!sedeValida) errores.push({ campo: 'sedeId', code: 'SEDE_INVALIDA' });
    if (errores.length) throw new AppException('VALIDACION', 400, 'Revisá los datos del Evento.', errores);

    const slug = await slugDeEvento(config.nombre.trim(), async (s) => (await this.prisma.evento.count({ where: { slug: s } })) > 0);
    const creado = await this.prisma.evento.create({
      data: { ...this.paraGuardar(config), sedeId: dto.sedeId!, slug, creadoPorId: actor },
      select: { id: true },
    });
    return this.detalle(creado.id);
  }

  /** PATCH /eventos/:id — FR-010, FR-014, FR-018, FR-050 (`evento.modificado`). */
  async editar(id: string, dto: DatosEventoDto): Promise<EventoDetalle> {
    return conBloqueoDeEvento(this.prisma, id, async (tx) => {
      const actual = await tx.evento.findFirst({ where: { id, eliminadoEn: null } });
      if (!actual) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
      const anterior: ConfigEvento = {
        nombre: actual.nombre,
        descripcion: actual.descripcion,
        tipo: actual.tipo,
        inicio: actual.inicio,
        fin: actual.fin,
        lugar: actual.lugar,
        publicoObjetivo: actual.publicoObjetivo,
        requiereInscripcion: actual.requiereInscripcion,
        requiereAprobacion: actual.requiereAprobacion,
        cupo: actual.cupo,
        permiteListaEspera: actual.permiteListaEspera,
        costo: actual.costo === null ? null : Number(actual.costo),
        instruccionesPago: actual.instruccionesPago,
        diasAnticipacionRecordatorio: actual.diasAnticipacionRecordatorio,
        destinatariosGenero: actual.destinatariosGenero,
        edadMinima: actual.edadMinima,
        edadMaxima: actual.edadMaxima,
      };
      const nueva = this.configDesde(dto, anterior);
      const errores = validarConfigEvento(nueva);
      const sedeId = dto.sedeId ?? actual.sedeId;
      if (dto.sedeId !== undefined && dto.sedeId !== actual.sedeId && !(await this.sedeActiva(dto.sedeId, tx))) {
        errores.push({ campo: 'sedeId', code: 'SEDE_INVALIDA' });
      }
      if (errores.length) throw new AppException('VALIDACION', 400, 'Revisá los datos del Evento.', errores);

      // FR-014: lo que ya pasó con el Evento manda sobre la configuración.
      const cambiaCupoOInscripcion =
        nueva.cupo !== anterior.cupo ||
        nueva.requiereInscripcion !== anterior.requiereInscripcion ||
        nueva.permiteListaEspera !== anterior.permiteListaEspera ||
        nueva.requiereAprobacion !== anterior.requiereAprobacion;
      if (actual.estado === 'cancelado' && cambiaCupoOInscripcion) {
        throw new AppException('EVENTO_CANCELADO', 409, 'El Evento está cancelado: reactivalo antes de cambiar la inscripción o el cupo.');
      }
      const [ocupados, enLista, abiertas, inscripcionesTotal, pagos] = await Promise.all([
        contarOcupados(tx, id),
        tx.inscripcionEvento.count({ where: { eventoId: id, estado: 'lista_espera' } }),
        tx.inscripcionEvento.count({ where: { eventoId: id, estado: { in: ['confirmada', 'pendiente', 'lista_espera'] } } }),
        tx.inscripcionEvento.count({ where: { eventoId: id } }),
        tx.pago.count({ where: { inscripcionEvento: { eventoId: id } } }),
      ]);
      if (nueva.tipo !== anterior.tipo && inscripcionesTotal > 0) {
        throw new AppException('EVENTO_CON_INSCRIPCIONES', 409, 'No se puede cambiar el tipo de un Evento que ya tiene Inscripciones.');
      }
      if (!nueva.requiereInscripcion && anterior.requiereInscripcion && abiertas > 0) {
        throw new AppException('EVENTO_CON_INSCRIPCIONES', 409, `No se puede quitar la inscripción: hay ${abiertas} Inscripción(es) abiertas.`);
      }
      if (nueva.cupo !== null && nueva.cupo < ocupados) {
        throw new AppException('CUPO_MENOR_A_OCUPADOS', 409, `El cupo no puede ser menor que los ${ocupados} lugares ocupados.`, undefined, {
          ocupados,
        });
      }
      // Quitar el cupo promueve a toda la lista; apagar la lista con cupo, no.
      if (!nueva.permiteListaEspera && nueva.cupo !== null && enLista > 0) {
        throw new AppException('LISTA_ESPERA_CON_PERSONAS', 409, `Hay ${enLista} Persona(s) en la lista de espera: resolvela antes de apagarla.`);
      }
      if (nueva.costo !== anterior.costo && pagos > 0) {
        throw new AppException('EVENTO_CON_PAGOS', 409, 'No se puede cambiar el costo: el Evento ya tiene Pagos registrados.');
      }

      await tx.evento.update({ where: { id }, data: { ...this.paraGuardar(nueva), sedeId } });
      await promoverDesdeLista(tx, id, (t, e) => this.notificaciones.emitir(t, e));

      const cambioCuandoODonde =
        nueva.inicio!.getTime() !== anterior.inicio!.getTime() ||
        (nueva.fin?.getTime() ?? null) !== (anterior.fin?.getTime() ?? null) ||
        nueva.lugar !== anterior.lugar ||
        (nueva.lugar === null && sedeId !== actual.sedeId);
      if (cambioCuandoODonde && abiertas > 0 && actual.estado === 'publicado') {
        await this.notificaciones.emitir(tx, {
          nombre: 'evento.modificado',
          a: { tipo: 'evento_inscriptos', eventoId: id },
          datos: { eventoId: id, evento: nueva.nombre.trim(), slug: actual.slug },
        });
      }
      return this.detalle(id, tx);
    });
  }

  /** PUT /eventos/:id/flyer — FR-012: sube o reemplaza; sin archivo, cambia solo el texto alternativo. */
  async subirFlyer(
    id: string,
    args: { archivo?: { buffer: Buffer; mimeType: string }; descripcionImagen?: string },
  ): Promise<EventoDetalle> {
    const actual = await this.prisma.evento.findFirst({ where: { id, eliminadoEn: null }, select: { imagenUrl: true, imagenRuta: true } });
    if (!actual) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
    const descripcion = args.descripcionImagen?.trim() ?? '';
    if (descripcion === '') {
      throw new AppException('VALIDACION', 400, 'Describí el flyer.', [{ campo: 'descripcionImagen', code: 'DESCRIPCION_IMAGEN_REQUERIDA' }]);
    }
    if (descripcion.length > EVENTO_DESCRIPCION_IMAGEN_MAX) {
      throw new AppException('VALIDACION', 400, 'El texto alternativo es demasiado largo.', [
        { campo: 'descripcionImagen', code: 'DESCRIPCION_IMAGEN_DEMASIADO_LARGA' },
      ]);
    }
    if (!args.archivo) {
      if (!actual.imagenUrl) {
        throw new AppException('VALIDACION', 400, 'Elegí el archivo del flyer.', [{ campo: 'archivo', code: 'ARCHIVO_REQUERIDO' }]);
      }
      await this.prisma.evento.update({ where: { id }, data: { descripcionImagen: descripcion } });
      return this.detalle(id);
    }
    if (!MIME_TIPOS_FLYER_PERMITIDOS.includes(args.archivo.mimeType as (typeof MIME_TIPOS_FLYER_PERMITIDOS)[number])) {
      throw new AppException('FLYER_TIPO_INVALIDO', 400, 'El flyer tiene que ser JPG, PNG o WebP.');
    }
    if (args.archivo.buffer.length > FLYER_TAMANO_MAXIMO_BYTES) {
      throw new AppException('FLYER_TAMANO_EXCEDIDO', 400, 'El flyer pesa más de 5 MB.');
    }
    const procesada = await this.imagenes.procesar(args.archivo.buffer, PERFIL_FLYER);
    const subida = await this.storage.subir({ buffer: procesada.buffer, mimeType: procesada.mimeType, nombreOriginal: 'flyer', area: 'flyers' });
    await this.prisma.evento.update({ where: { id }, data: { imagenUrl: subida.url, imagenRuta: subida.ruta, descripcionImagen: descripcion } });
    if (actual.imagenRuta) await this.storage.eliminar(actual.imagenRuta, 'flyers');
    return this.detalle(id);
  }

  /** DELETE /eventos/:id/flyer — FR-012: borra el archivo y limpia los dos campos. */
  async quitarFlyer(id: string): Promise<EventoDetalle> {
    const actual = await this.prisma.evento.findFirst({ where: { id, eliminadoEn: null }, select: { imagenRuta: true } });
    if (!actual) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
    await this.prisma.evento.update({ where: { id }, data: { imagenUrl: null, imagenRuta: null, descripcionImagen: null } });
    if (actual.imagenRuta) await this.storage.eliminar(actual.imagenRuta, 'flyers');
    return this.detalle(id);
  }

  /** POST /eventos/:id/cancelar — FR-040: conserva las Inscripciones; libera los bautismos asignados (E7). */
  async cancelar(id: string, actor: Actor): Promise<EventoDetalle> {
    return conBloqueoDeEvento(this.prisma, id, async (tx) => {
      const actual = await tx.evento.findFirst({ where: { id, eliminadoEn: null }, select: { estado: true, nombre: true, slug: true } });
      if (!actual) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
      if (actual.estado === 'cancelado') throw new AppException('EVENTO_CANCELADO', 409, 'El Evento ya está cancelado.');
      await tx.evento.update({ where: { id }, data: { estado: 'cancelado', canceladoEn: new Date(), canceladoPorId: actor } });
      await this.bautismo.liberarAsignacionesDeEvento(tx, id);
      const abiertas = await tx.inscripcionEvento.count({
        where: { eventoId: id, estado: { in: ['confirmada', 'pendiente', 'lista_espera'] } },
      });
      if (abiertas > 0) {
        await this.notificaciones.emitir(tx, {
          nombre: 'evento.cancelado',
          a: { tipo: 'evento_inscriptos', eventoId: id },
          datos: { eventoId: id, evento: actual.nombre, slug: actual.slug },
        });
      }
      return this.detalle(id, tx);
    });
  }

  /** POST /eventos/:id/reactivar — FR-041: solo si no pasó. Si mientras tanto se liberó lugar, promueve. */
  async reactivar(id: string): Promise<EventoDetalle> {
    return conBloqueoDeEvento(this.prisma, id, async (tx) => {
      const actual = await tx.evento.findFirst({ where: { id, eliminadoEn: null }, select: { estado: true, inicio: true } });
      if (!actual) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
      if (actual.estado !== 'cancelado') throw new AppException('EVENTO_NO_CANCELADO', 409, 'El Evento no está cancelado.');
      if (actual.inicio <= new Date()) throw new AppException('EVENTO_YA_PASO', 409, 'El Evento ya pasó: no se puede reactivar.');
      await tx.evento.update({ where: { id }, data: { estado: 'publicado', canceladoEn: null, canceladoPorId: null } });
      await promoverDesdeLista(tx, id, (t, e) => this.notificaciones.emitir(t, e));
      return this.detalle(id, tx);
    });
  }

  /** POST /eventos/:id/eliminar — FR-042, D119: borrado lógico, solo sin ninguna Inscripción. */
  async eliminar(id: string, actor: Actor): Promise<void> {
    await conBloqueoDeEvento(this.prisma, id, async (tx) => {
      const actual = await tx.evento.findFirst({ where: { id, eliminadoEn: null }, select: { id: true } });
      if (!actual) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado.');
      const inscripciones = await tx.inscripcionEvento.count({ where: { eventoId: id } });
      if (inscripciones > 0) {
        throw new AppException(
          'EVENTO_CON_INSCRIPCIONES',
          409,
          `No se puede eliminar: tiene ${inscripciones} Inscripción(es). Cancelalo en su lugar.`,
        );
      }
      await tx.evento.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPorId: actor } });
    });
  }

  /** POST /eventos/:id/restaurar — D119. */
  async restaurar(id: string): Promise<EventoDetalle> {
    const actual = await this.prisma.evento.findFirst({ where: { id, eliminadoEn: { not: null } }, select: { id: true } });
    if (!actual) throw new AppException('NO_ENCONTRADO', 404, 'Evento no encontrado en la papelera.');
    await this.prisma.evento.update({ where: { id }, data: { eliminadoEn: null, eliminadoPorId: null } });
    return this.detalle(id);
  }

  // --------------------------------------------------------------------------

  private aResumen(e: Prisma.EventoGetPayload<{ select: typeof RESUMEN_SELECT }>, t: TotalesEvento): EventoResumen {
    return {
      ...e,
      inicio: e.inicio.toISOString(),
      fin: e.fin?.toISOString() ?? null,
      eliminadoEn: e.eliminadoEn?.toISOString() ?? null,
      ...t,
    };
  }

  private async sedeActiva(sedeId: string | undefined, db: Prisma.TransactionClient = this.prisma): Promise<boolean> {
    if (!sedeId) return false;
    return (await db.sede.count({ where: { id: sedeId, activo: true, eliminadoEn: null } })) > 0;
  }

  /** La configuración que resulta de aplicar el cuerpo sobre la base (lo que no viene, queda). */
  private configDesde(dto: DatosEventoDto, base: ConfigEvento): ConfigEvento {
    const texto = (v: string | null | undefined, previo: string | null) => (v === undefined ? previo : v === null || v.trim() === '' ? null : v.trim());
    const numero = (v: number | string | null | undefined, previo: number | null) => {
      if (v === undefined) return previo;
      if (v === null || (typeof v === 'string' && v.trim() === '')) return null;
      return Number(v);
    };
    const fecha = (v: string | null | undefined, previo: Date | null) => (v === undefined ? previo : v === null ? null : new Date(v));
    const costo = numero(dto.costo, base.costo);
    return {
      nombre: dto.nombre ?? base.nombre,
      descripcion: dto.descripcion ?? base.descripcion,
      tipo: dto.tipo ?? base.tipo,
      inicio: fecha(dto.inicio, base.inicio),
      fin: fecha(dto.fin, base.fin),
      lugar: texto(dto.lugar, base.lugar),
      publicoObjetivo: texto(dto.publicoObjetivo, base.publicoObjetivo),
      requiereInscripcion: dto.requiereInscripcion ?? base.requiereInscripcion,
      requiereAprobacion: dto.requiereAprobacion ?? base.requiereAprobacion,
      cupo: numero(dto.cupo, base.cupo),
      permiteListaEspera: dto.permiteListaEspera ?? base.permiteListaEspera,
      costo,
      // Sin costo no hay instrucciones (CHECK de la base): se descartan.
      instruccionesPago: costo === null ? null : texto(dto.instruccionesPago, base.instruccionesPago),
      diasAnticipacionRecordatorio: numero(dto.diasAnticipacionRecordatorio, base.diasAnticipacionRecordatorio),
      destinatariosGenero: (dto.destinatariosGenero ?? base.destinatariosGenero) as GeneroDestinatario,
      edadMinima: numero(dto.edadMinima, base.edadMinima),
      edadMaxima: numero(dto.edadMaxima, base.edadMaxima),
    };
  }

  private paraGuardar(c: ConfigEvento) {
    return {
      nombre: c.nombre.trim(),
      descripcion: c.descripcion.trim(),
      tipo: c.tipo,
      inicio: c.inicio!,
      fin: c.fin,
      lugar: c.lugar,
      publicoObjetivo: c.publicoObjetivo,
      requiereInscripcion: c.requiereInscripcion,
      requiereAprobacion: c.requiereAprobacion,
      cupo: c.cupo,
      permiteListaEspera: c.permiteListaEspera,
      costo: c.costo === null ? null : c.costo.toFixed(2),
      instruccionesPago: c.instruccionesPago,
      diasAnticipacionRecordatorio: c.diasAnticipacionRecordatorio,
      destinatariosGenero: c.destinatariosGenero,
      edadMinima: c.edadMinima,
      edadMaxima: c.edadMaxima,
    };
  }
}
