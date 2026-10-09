import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import {
  COMENTARIO_EXTRACTO_LARGO,
  type ComentarioDetalle,
  type ComentarioResumen,
  type FiltroRevisado,
  type Pagina,
  type TipoComentario,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { EmailService } from '../email/email.service.js';
import { plantillaComentario } from '../email/plantillas/comentario.js';
import { huella } from '../codigo-ingreso/huella.js';
import { VENTANA_LIMITE_MS, extracto, limiteDeComentarios, reintentarEnSegundos, validarComentario } from './comentario-reglas.js';

const PERSONA = { select: { id: true, nombre: true, apellido: true, fotoUrl: true, activo: true } } as const;
const REVISOR = { select: { id: true, nombre: true, apellido: true, fotoUrl: true } } as const;
const SELECT_RESUMEN = {
  id: true,
  tipo: true,
  texto: true,
  createdAt: true,
  paginaOrigen: true,
  app: true,
  aceptaContacto: true,
  revisadoEn: true,
  persona: PERSONA,
  revisadoPor: REVISOR,
} as const;

type FilaResumen = {
  id: string;
  tipo: TipoComentario;
  texto: string;
  createdAt: Date;
  paginaOrigen: string;
  app: 'web' | 'backoffice';
  aceptaContacto: boolean;
  revisadoEn: Date | null;
  persona: { id: string; nombre: string; apellido: string; fotoUrl: string | null; activo: boolean } | null;
  revisadoPor: { id: string; nombre: string; apellido: string; fotoUrl: string | null } | null;
};

/**
 * spec 013, Historia 5 (T060, T061; FR-040–FR-047): "Contanos qué te parece".
 * El envío guarda la huella del origen (mecanismo de la 007), nunca la IP, y
 * respeta un límite por hora (por origen sin sesión, por Persona con sesión).
 * El email a la desarrolladora sale después de guardar y su falla no pierde
 * el comentario. El Admin y el Pastor lo leen; solo el Admin lo marca.
 */
@Injectable()
export class ComentarioService {
  private readonly logger = new Logger(ComentarioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async crear(cuerpo: Record<string, unknown>, origen: string, personaId: string | null, ahora: Date = new Date()): Promise<{ id: string }> {
    const conSesion = personaId !== null;
    const validacion = validarComentario(cuerpo, conSesion);
    if (!validacion.ok) {
      throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', validacion.errores);
    }
    const origenHuella = huella(origen);

    const desde = new Date(ahora.getTime() - VENTANA_LIMITE_MS);
    const ventana = { createdAt: { gt: desde }, ...(conSesion ? { personaId } : { origenHuella, personaId: null }) };
    const cantidad = await this.prisma.comentarioApp.count({ where: ventana });
    if (cantidad >= limiteDeComentarios(conSesion)) {
      const masViejo = await this.prisma.comentarioApp.findFirst({ where: ventana, orderBy: { createdAt: 'asc' }, select: { createdAt: true } });
      throw new AppException(
        'DEMASIADOS_PEDIDOS',
        429,
        'Se mandaron varios comentarios seguidos.',
        undefined,
        { reintentarEn: reintentarEnSegundos(masViejo?.createdAt ?? ahora, ahora) },
      );
    }

    const { datos } = validacion;
    const creado = await this.prisma.comentarioApp.create({
      data: { ...datos, origenHuella, personaId },
      select: { id: true },
    });
    await this.avisar(creado.id, datos);
    return creado;
  }

  /** H5.6: después de guardar; si falla, el comentario ya quedó. Nada del texto ni del contacto va a logs ni a Sentry. */
  private async avisar(id: string, datos: { tipo: TipoComentario; texto: string; app: 'web' | 'backoffice'; paginaOrigen: string }): Promise<void> {
    const para = process.env.EMAIL_COMENTARIOS_DESTINO?.trim();
    if (!para) {
      this.logger.log(`Comentario ${id} guardado; EMAIL_COMENTARIOS_DESTINO vacío: no se manda email.`);
      return;
    }
    const base = process.env.BACKOFFICE_URL?.trim().replace(/\/+$/, '');
    try {
      await this.email.enviar({ para, ...plantillaComentario({ ...datos, enlace: base ? `${base}/comentarios/${id}` : null }) });
    } catch (error) {
      const tipoDeError = error instanceof Error ? error.name : 'desconocido';
      this.logger.warn(`No se pudo enviar el email del comentario ${id} (${tipoDeError}).`);
      Sentry.captureException(new Error(`No se pudo enviar el email de un comentario (${tipoDeError})`), { tags: { comentarioId: id } });
    }
  }

  async listar(q: { revisado?: FiltroRevisado; tipo?: TipoComentario; skip?: number; take?: number }): Promise<Pagina<ComentarioResumen>> {
    const revisado = q.revisado ?? 'no';
    const where = {
      ...(revisado === 'no' ? { revisadoEn: null } : revisado === 'si' ? { revisadoEn: { not: null } } : {}),
      ...(q.tipo ? { tipo: q.tipo } : {}),
    };
    const [filas, total] = await Promise.all([
      this.prisma.comentarioApp.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: q.skip ?? 0, take: q.take ?? 20, select: SELECT_RESUMEN }),
      this.prisma.comentarioApp.count({ where }),
    ]);
    return { items: filas.map(resumen), total };
  }

  async sinRevisar(): Promise<{ total: number }> {
    return { total: await this.prisma.comentarioApp.count({ where: { revisadoEn: null } }) };
  }

  async detalle(id: string): Promise<ComentarioDetalle> {
    const fila = await this.prisma.comentarioApp.findUnique({
      where: { id },
      select: {
        ...SELECT_RESUMEN,
        navegador: true,
        ultimoRequestId: true,
        contactoEmail: true,
        contactoTelefono: true,
        persona: { select: { ...PERSONA.select, email: true, telefono: true } },
      },
    });
    if (!fila) throw noEncontrado();
    const contacto = !fila.aceptaContacto
      ? null
      : fila.persona
        ? { email: fila.persona.email, telefono: fila.persona.telefono || null }
        : { email: fila.contactoEmail, telefono: fila.contactoTelefono };
    return { ...resumen(fila), texto: fila.texto, navegador: fila.navegador, ultimoRequestId: fila.ultimoRequestId, contacto };
  }

  /** H5.7: idempotente — marcar uno ya revisado no cambia quién ni cuándo. */
  async marcarRevisado(id: string, autorId: string, ahora: Date = new Date()): Promise<ComentarioResumen> {
    await this.existe(id);
    await this.prisma.comentarioApp.updateMany({ where: { id, revisadoEn: null }, data: { revisadoEn: ahora, revisadoPorId: autorId } });
    return this.resumenDe(id);
  }

  async desmarcarRevisado(id: string): Promise<ComentarioResumen> {
    await this.existe(id);
    await this.prisma.comentarioApp.update({ where: { id }, data: { revisadoEn: null, revisadoPorId: null } });
    return this.resumenDe(id);
  }

  private async existe(id: string): Promise<void> {
    const fila = await this.prisma.comentarioApp.findUnique({ where: { id }, select: { id: true } });
    if (!fila) throw noEncontrado();
  }

  private async resumenDe(id: string): Promise<ComentarioResumen> {
    return resumen(await this.prisma.comentarioApp.findUniqueOrThrow({ where: { id }, select: SELECT_RESUMEN }));
  }
}

function resumen(f: FilaResumen): ComentarioResumen {
  return {
    id: f.id,
    tipo: f.tipo,
    extracto: extracto(f.texto, COMENTARIO_EXTRACTO_LARGO),
    createdAt: f.createdAt.toISOString(),
    paginaOrigen: f.paginaOrigen,
    app: f.app,
    persona: f.persona ? { id: f.persona.id, nombre: f.persona.nombre, apellido: f.persona.apellido, fotoUrl: f.persona.fotoUrl, activo: f.persona.activo } : null,
    aceptaContacto: f.aceptaContacto,
    revisado:
      f.revisadoEn && f.revisadoPor
        ? { en: f.revisadoEn.toISOString(), por: { id: f.revisadoPor.id, nombre: f.revisadoPor.nombre, apellido: f.revisadoPor.apellido, fotoUrl: f.revisadoPor.fotoUrl } }
        : null,
  };
}

function noEncontrado() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe un comentario con ese id.');
}
