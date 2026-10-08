import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  ARCHIVOS_POR_SEMANA_MAX,
  ARCHIVO_MAX_BYTES,
  ENLACES_POR_SEMANA_MAX,
  TEXTO_ALTERNATIVO_MAX,
  TEXTO_CONTENIDO_MAX,
  TEXTO_ENLACE_MAX,
  TITULO_CONTENIDO_MAX,
  estadoSemanaLider,
  hoyEnArgentina,
  materialCargado,
  type ContenidoParaLider,
  type MimeContenido,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException, type AppExceptionErrorField } from '../common/errors/app-exception.js';
import { errorDeValidacion } from '../discipulado/validaciones.js';
import { nombresDe } from '../discipulado/consultas.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { StorageService } from '../storage/storage.service.js';
import { bloquearGrupo, fechaCivil, grupoNoEnCurso } from './consultas-vs.js';
import { contenidoDe } from './mi-vida-de-servicio.service.js';

type Db = PrismaService | Prisma.TransactionClient;

export interface ArchivoSubido {
  buffer: Buffer;
  originalname: string;
  size: number;
}

export interface DatosMaterial {
  titulo?: string;
  texto?: string;
  /** JSON `[{ texto, url }]`. */
  enlaces?: string;
  /** JSON de ids de archivos a quitar. */
  archivosQuitar?: string;
  /** Uno por archivo nuevo, en su orden (vacío para un PDF). */
  textoAlternativo?: string | string[];
}

/**
 * FR-023 (research #5): el tipo por CONTENIDO (firma de los primeros bytes),
 * nunca por la extensión ni por el tipo que manda el navegador.
 */
export function tipoPorFirma(buffer: Buffer): MimeContenido | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

/** FR-020: el nombre del archivo, sin rutas ni caracteres de control, hasta 200. */
function nombreSeguro(nombreCrudo: string): string {
  // Multer (busboy) entrega el nombre como latin1: "guía" llega como "guÃ­a". Si es UTF-8 válido, se recupera.
  const utf8 = Buffer.from(nombreCrudo, 'latin1').toString('utf8');
  const nombre = utf8.includes('\uFFFD') ? nombreCrudo : utf8;
  // eslint-disable-next-line no-control-regex -- justamente se sacan los caracteres de control.
  const limpio = (nombre.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (limpio || 'archivo').slice(0, 200);
}

function parsearJson<T>(valor: string | undefined, campo: string, code: string): T | undefined {
  if (valor === undefined || valor === '') return undefined;
  try {
    return JSON.parse(valor) as T;
  } catch {
    throw errorDeValidacion([{ campo, code }]);
  }
}

/**
 * spec 008, Historia 4 — el material de cada semana (contracts/lider-api.md):
 * cargarlo y editarlo (FR-020, FR-022, FR-023), leerlo como Líder o desde el
 * backoffice, y el aviso de "contenido liberado" una sola vez (research #4).
 * La autorización por Liderazgo la hace quien llama (`grupoDelLiderOFallar`).
 */
@Injectable()
export class ContenidoService {
  private readonly logger = new Logger(ContenidoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly storage: StorageService,
  ) {}

  /** GET …/semanas/:numero → `ContenidoParaLider` (Líder y backoffice, FR-038). */
  async paraLider(grupoId: string, numero: number): Promise<ContenidoParaLider> {
    return contenidoParaLider(this.prisma, grupoId, numero);
  }

  /**
   * PUT /vida-de-servicio/mis-grupos/:grupoId/semanas/:numero (FR-020 a
   * FR-023). Valida todo junto (H-50); sube los archivos nuevos ANTES de la
   * transacción y, si la transacción falla, los borra (compensación). La
   * primera carga de una semana cuya fecha ya llegó la marca avisada y emite
   * `contenido_liberado`; editar no vuelve a avisar (FR-022).
   */
  async guardar(grupoId: string, numero: number, autorId: string, datos: DatosMaterial, archivos: ArchivoSubido[]): Promise<ContenidoParaLider> {
    const item = await this.prisma.itemCronograma.findFirst({
      where: { grupoId, numeroSemana: numero, eliminadoEn: null },
      select: { id: true, fechaLiberacion: true, contenido: { select: { id: true, archivos: { where: { eliminadoEn: null }, select: { id: true } } } } },
    });
    if (!item) throw new AppException('SEMANA_NO_ENCONTRADA', HttpStatus.NOT_FOUND, 'No existe esa semana en esta edición.');

    const errores: AppExceptionErrorField[] = [];
    const titulo = datos.titulo?.trim() ?? '';
    if (titulo === '') errores.push({ campo: 'titulo', code: 'TITULO_REQUERIDO' });
    else if (titulo.length > TITULO_CONTENIDO_MAX) errores.push({ campo: 'titulo', code: 'TITULO_DEMASIADO_LARGO' });
    const texto = datos.texto?.trim() ? datos.texto.replace(/\r\n/g, '\n').trim() : null;
    if (texto && texto.length > TEXTO_CONTENIDO_MAX) errores.push({ campo: 'texto', code: 'TEXTO_DEMASIADO_LARGO' });

    const enlacesCrudos = parsearJson<Array<{ texto?: unknown; url?: unknown }>>(datos.enlaces, 'enlaces', 'ENLACE_URL_INVALIDA') ?? [];
    if (!Array.isArray(enlacesCrudos)) throw errorDeValidacion([{ campo: 'enlaces', code: 'ENLACE_URL_INVALIDA' }]);
    const enlaces = enlacesCrudos.map((e) => ({ texto: typeof e.texto === 'string' ? e.texto.trim() : '', url: typeof e.url === 'string' ? e.url.trim() : '' }));
    if (enlaces.length > ENLACES_POR_SEMANA_MAX) errores.push({ campo: 'enlaces', code: 'DEMASIADOS_ENLACES' });
    enlaces.forEach((e, i) => {
      if (e.texto === '' || e.texto.length > TEXTO_ENLACE_MAX) errores.push({ campo: `enlaces.${i}.texto`, code: 'ENLACE_TEXTO_REQUERIDO' });
      if (!esUrlSegura(e.url)) errores.push({ campo: `enlaces.${i}.url`, code: 'ENLACE_URL_INVALIDA' });
    });

    const quitar = new Set(parsearJson<string[]>(datos.archivosQuitar, 'archivosQuitar', 'ARCHIVO_TIPO_NO_ADMITIDO') ?? []);
    const actuales = item.contenido?.archivos.map((a) => a.id) ?? [];
    const quedan = actuales.filter((id) => !quitar.has(id));
    const alternativos = Array.isArray(datos.textoAlternativo) ? datos.textoAlternativo : datos.textoAlternativo !== undefined ? [datos.textoAlternativo] : [];
    const nuevos = archivos.map((a, i) => ({ archivo: a, mime: tipoPorFirma(a.buffer), alternativo: alternativos[i]?.trim() || null, nombre: nombreSeguro(a.originalname) }));
    if (quedan.length + nuevos.length > ARCHIVOS_POR_SEMANA_MAX) errores.push({ campo: 'archivosNuevos', code: 'DEMASIADOS_ARCHIVOS' });
    nuevos.forEach((n, i) => {
      if (n.archivo.size > ARCHIVO_MAX_BYTES) errores.push({ campo: `archivosNuevos.${i}`, code: 'ARCHIVO_DEMASIADO_GRANDE' });
      else if (!n.mime) errores.push({ campo: `archivosNuevos.${i}`, code: 'ARCHIVO_TIPO_NO_ADMITIDO' });
      else if (n.mime.startsWith('image/') && (!n.alternativo || n.alternativo.length > TEXTO_ALTERNATIVO_MAX)) {
        errores.push({ campo: `textoAlternativo.${i}`, code: 'TEXTO_ALTERNATIVO_REQUERIDO' });
      }
    });
    if (titulo !== '' && !materialCargado({ titulo, texto, archivos: quedan.length + nuevos.length, enlaces: enlaces.length })) {
      errores.push({ campo: 'texto', code: 'MATERIAL_VACIO' });
    }
    if (errores.length > 0) throw errorDeValidacion(errores);

    const subidos: Array<{ ruta: string; nombre: string; mime: string; tamanio: number; alternativo: string | null }> = [];
    try {
      for (const n of nuevos) {
        const { ruta } = await this.storage.subirPrivado('contenidos', { buffer: n.archivo.buffer, nombreOriginal: n.nombre, mimeType: n.mime! });
        subidos.push({ ruta, nombre: n.nombre, mime: n.mime!, tamanio: n.archivo.size, alternativo: n.mime!.startsWith('image/') ? n.alternativo : null });
      }
      await this.prisma.$transaction(async (tx) => {
        await bloquearGrupo(tx, grupoId);
        const grupo = await tx.grupo.findUniqueOrThrow({ where: { id: grupoId }, select: { estado: true } });
        if (grupo.estado !== 'en_curso') throw grupoNoEnCurso();
        const existente = await tx.contenido.findUnique({ where: { itemCronogramaId: item.id }, select: { id: true } });
        const ahora = new Date();
        const llego = fechaCivil(item.fechaLiberacion) <= hoyEnArgentina();
        const contenido = existente
          ? await tx.contenido.update({ where: { id: existente.id }, data: { titulo, texto, editadoPorId: autorId, editadoEn: ahora }, select: { id: true } })
          : await tx.contenido.create({
              data: { grupoId, itemCronogramaId: item.id, titulo, texto, cargadoPorId: autorId, liberacionAvisadaEn: llego ? ahora : null },
              select: { id: true },
            });
        if (quitar.size > 0) {
          await tx.archivoContenido.updateMany({ where: { contenidoId: contenido.id, id: { in: [...quitar] }, eliminadoEn: null }, data: { eliminadoEn: ahora, eliminadoPorId: autorId } });
        }
        const ultimo = await tx.archivoContenido.aggregate({ where: { contenidoId: contenido.id }, _max: { orden: true } });
        if (subidos.length > 0) {
          await tx.archivoContenido.createMany({
            data: subidos.map((s, i) => ({
              contenidoId: contenido.id,
              ruta: s.ruta,
              nombreOriginal: s.nombre,
              mimeType: s.mime,
              tamanioBytes: s.tamanio,
              textoAlternativo: s.alternativo,
              orden: (ultimo._max.orden ?? 0) + i + 1,
            })),
          });
        }
        // Los enlaces se reemplazan todos (el formulario manda la lista entera).
        await tx.enlaceContenido.updateMany({ where: { contenidoId: contenido.id, eliminadoEn: null }, data: { eliminadoEn: ahora } });
        if (enlaces.length > 0) await tx.enlaceContenido.createMany({ data: enlaces.map((e, i) => ({ contenidoId: contenido.id, texto: e.texto, url: e.url, orden: i + 1 })) });
        if (!existente && llego) {
          await this.notificaciones.emitir(tx, {
            nombre: 'vida_servicio.contenido_liberado',
            a: { tipo: 'grupo', grupoId },
            datos: { grupoId, cronogramaItemId: item.id, semana: numero },
          });
        }
      });
    } catch (error) {
      // Compensación: lo subido no queda huérfano si la transacción no se confirmó.
      await Promise.all(subidos.map((s) => this.storage.eliminar(s.ruta, 'contenidos').catch(() => undefined)));
      throw error;
    }
    return contenidoParaLider(this.prisma, grupoId, numero);
  }

  /**
   * research #4: marca y avisa las semanas que se liberan hoy (o antes) y
   * todavía no se avisaron, de Grupos en curso. Idempotente y segura ante dos
   * corridas a la vez (`UPDATE … WHERE "liberacionAvisadaEn" IS NULL
   * RETURNING`): cada Contenido se avisa una sola vez. La llama el proceso
   * programado de la 012; la visibilidad NO depende de que corra.
   */
  async marcarLiberacionesDeHoy(hoy: string = hoyEnArgentina()): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const marcados = await tx.$queryRaw<Array<{ grupoId: string; itemId: string; numeroSemana: number }>>`
        UPDATE "contenidos" c SET "liberacionAvisadaEn" = NOW()
          FROM "items_cronograma" i, "grupos" g
         WHERE c."itemCronogramaId" = i."id" AND i."grupoId" = g."id"
           AND c."liberacionAvisadaEn" IS NULL AND i."eliminadoEn" IS NULL
           AND g."estado" = 'en_curso' AND i."fechaLiberacion" <= ${hoy}::date
        RETURNING c."grupoId" AS "grupoId", i."id" AS "itemId", i."numeroSemana" AS "numeroSemana"`;
      for (const m of marcados) {
        await this.notificaciones.emitir(tx, {
          nombre: 'vida_servicio.contenido_liberado',
          a: { tipo: 'grupo', grupoId: m.grupoId },
          datos: { grupoId: m.grupoId, cronogramaItemId: m.itemId, semana: m.numeroSemana },
        });
      }
      if (marcados.length > 0) this.logger.log({ evento: 'vida_servicio.liberaciones_marcadas', cantidad: marcados.length });
      return marcados.length;
    });
  }
}

/** FR-020: solo `https://` (o `http://`) con un host; nunca `javascript:` ni rutas relativas. */
function esUrlSegura(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname !== '' && url.length <= 2000;
  } catch {
    return false;
  }
}

/** `ContenidoParaLider`: el material con su estado, quién cargó y quién editó (o solo el estado si no hay). */
export async function contenidoParaLider(db: Db, grupoId: string, numero: number): Promise<ContenidoParaLider> {
  const item = await db.itemCronograma.findFirst({
    where: { grupoId, numeroSemana: numero, eliminadoEn: null },
    select: { fechaLiberacion: true, contenido: { select: { id: true, cargadoPorId: true, cargadoEn: true, editadoPorId: true, editadoEn: true } } },
  });
  if (!item) throw new AppException('SEMANA_NO_ENCONTRADA', HttpStatus.NOT_FOUND, 'No existe esa semana en esta edición.');
  const fecha = fechaCivil(item.fechaLiberacion);
  const estado = estadoSemanaLider(fecha, item.contenido !== null, hoyEnArgentina());
  if (!item.contenido || (estado !== 'liberada' && estado !== 'cargado_por_liberar')) {
    return { numero, fechaLiberacion: fecha, estado: estado === 'vencida_sin_material' ? 'vencida_sin_material' : 'sin_material' };
  }
  const c = item.contenido;
  const [base, nombres] = await Promise.all([contenidoDe(db, c.id), nombresDe(db, [c.cargadoPorId, c.editadoPorId].filter((x): x is string => x !== null))]);
  return {
    ...base,
    estado,
    cargadoPor: nombres.get(c.cargadoPorId) ?? null,
    cargadoEn: c.cargadoEn.toISOString(),
    editadoPor: c.editadoPorId ? (nombres.get(c.editadoPorId) ?? null) : null,
    editadoEn: c.editadoEn?.toISOString() ?? null,
  };
}
