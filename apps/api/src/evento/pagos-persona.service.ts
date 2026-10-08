import { Injectable } from '@nestjs/common';
import type { PagoResumen } from '@vida-sobrenatural/shared-types';
import type { Readable } from 'node:stream';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { StorageService } from '../storage/storage.service.js';
import { conBloqueoDeEvento } from './motor-cupo.js';
import { prepararComprobante, EXTENSION_COMPROBANTE, type MimeComprobante } from './comprobante.js';
import { validarDatosPago } from './datos-pago.js';
import { aPagoResumen, PAGO_SELECT } from './pago-resumen.js';
import { esViolacionDeUnico } from './inscripcion-propia.service.js';

/**
 * spec 011, lote C (US5, Persona) — registrar el propio Pago con su
 * comprobante (FR-030, FR-031) y verlo (FR-032). La Inscripción sigue
 * confirmada mientras el Pago está en revisión (D148).
 */
@Injectable()
export class PagosPersonaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly storage: StorageService,
  ) {}

  /** POST /inscripciones-evento/:id/pagos */
  async registrar(
    inscripcionId: string,
    personaId: string,
    campos: { monto?: string; medio?: string; fechaPago?: string },
    archivo?: Buffer,
  ): Promise<PagoResumen> {
    const propia = await this.prisma.inscripcionEvento.findFirst({ where: { id: inscripcionId, personaId }, select: { eventoId: true } });
    if (!propia) throw new AppException('NO_ENCONTRADO', 404, 'Inscripción no encontrada.');
    const datos = validarDatosPago(campos, Boolean(archivo?.length), true);
    const comprobante = await prepararComprobante(archivo!);
    // Primero las reglas, después el archivo: no se guarda nada si el Pago no corresponde.
    await this.chequearQueSePuedePagar(inscripcionId);
    const { ruta } = await this.storage.subirPrivado('comprobantes', { buffer: comprobante.buffer, mimeType: comprobante.mimeType, nombreOriginal: 'comprobante' });
    try {
      return await conBloqueoDeEvento(this.prisma, propia.eventoId, async (tx) => {
        await this.chequearQueSePuedePagar(inscripcionId, tx);
        const pago = await tx.pago.create({
          data: { inscripcionEventoId: inscripcionId, ...datos, estado: 'pendiente_verificacion', comprobanteRuta: ruta, comprobanteMime: comprobante.mimeType },
          select: PAGO_SELECT,
        });
        await this.notificaciones.emitir(tx, {
          nombre: 'evento.pago_registrado',
          a: { tipo: 'admin' },
          datos: { pagoId: pago.id, inscripcionId, eventoId: propia.eventoId },
        });
        return aPagoResumen(pago, new Map());
      });
    } catch (e) {
      await this.storage.eliminar(ruta, 'comprobantes');
      if (esViolacionDeUnico(e)) throw new AppException('PAGO_PENDIENTE_EXISTENTE', 409, 'Ya tenés un pago en revisión.');
      throw e;
    }
  }

  private async chequearQueSePuedePagar(inscripcionId: string, db: Prisma.TransactionClient = this.prisma) {
    const insc = await db.inscripcionEvento.findUniqueOrThrow({ where: { id: inscripcionId }, select: { estado: true, evento: { select: { costo: true } } } });
    if (insc.evento.costo === null) throw new AppException('EVENTO_SIN_COSTO', 409, 'Este Evento no tiene costo.');
    if (insc.estado !== 'confirmada') throw new AppException('INSCRIPCION_NO_CONFIRMADA', 409, 'Tu inscripción todavía no está confirmada.');
    const pendientes = await db.pago.count({ where: { inscripcionEventoId: inscripcionId, estado: 'pendiente_verificacion' } });
    if (pendientes > 0) throw new AppException('PAGO_PENDIENTE_EXISTENTE', 409, 'Ya tenés un pago en revisión.');
  }

  /**
   * GET /pagos/:id/comprobante — autoriza en cada pedido: la dueña o quien
   * tiene `pagos.verificar`. Cualquier otro caso, 404 (FR-032, SC-005).
   */
  async comprobante(pagoId: string, quien: { personaId: string | null; puedeVerificar: boolean }): Promise<{ stream: Readable; mime: string; nombre: string }> {
    const pago = await this.prisma.pago.findUnique({
      where: { id: pagoId },
      select: { comprobanteRuta: true, comprobanteMime: true, inscripcionEvento: { select: { personaId: true } } },
    });
    const autorizado = pago && (quien.puedeVerificar || (quien.personaId !== null && pago.inscripcionEvento.personaId === quien.personaId));
    if (!pago || !autorizado || !pago.comprobanteRuta) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos ese comprobante.');
    const mime = pago.comprobanteMime ?? 'application/octet-stream';
    return {
      stream: await this.storage.leer('comprobantes', pago.comprobanteRuta),
      mime,
      nombre: `comprobante.${EXTENSION_COMPROBANTE[mime as MimeComprobante] ?? 'bin'}`,
    };
  }
}
