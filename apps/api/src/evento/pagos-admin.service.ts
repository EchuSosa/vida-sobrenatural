import { Injectable } from '@nestjs/common';
import { MOTIVO_RECHAZO_PAGO_MAX, type EstadoPago, type PagoEnBandeja, type PagoResumen, type Pagina } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { StorageService } from '../storage/storage.service.js';
import { conBloqueoDeEvento, promoverDesdeLista } from './motor-cupo.js';
import { prepararComprobante } from './comprobante.js';
import { validarDatosPago } from './datos-pago.js';
import { aPagoResumen, aPagosEnBandeja, PAGO_SELECT } from './pago-resumen.js';

/**
 * spec 011, lote D (US5, Admin) — verificar y rechazar Pagos, y registrar uno
 * en nombre de la Persona (FR-033 a FR-036). Rechazar cancela la Inscripción
 * con motivo propio y promueve desde la lista, en una sola transacción con el
 * Evento bloqueado (research #5, D148).
 */
@Injectable()
export class PagosAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly storage: StorageService,
  ) {}

  async listar(f: { estado: EstadoPago; eventoId?: string; skip: number; take: number }): Promise<Pagina<PagoEnBandeja>> {
    const where: Prisma.PagoWhereInput = {
      estado: f.estado,
      inscripcionEvento: { evento: { eliminadoEn: null }, ...(f.eventoId ? { eventoId: f.eventoId } : {}) },
    };
    const [pagos, total] = await Promise.all([
      this.prisma.pago.findMany({ where, orderBy: { createdAt: 'asc' }, skip: f.skip, take: f.take, select: PAGO_SELECT }),
      this.prisma.pago.count({ where }),
    ]);
    return { items: await aPagosEnBandeja(this.prisma, pagos), total };
  }

  async detalle(id: string): Promise<PagoEnBandeja> {
    const pago = await this.prisma.pago.findUnique({ where: { id }, select: PAGO_SELECT });
    if (!pago) throw new AppException('NO_ENCONTRADO', 404, 'Pago no encontrado.');
    const [enBandeja] = await aPagosEnBandeja(this.prisma, [pago]);
    return enBandeja;
  }

  /** POST /pagos/:id/verificar — FR-033: quién y cuándo. */
  async verificar(id: string, adminId: string): Promise<PagoEnBandeja> {
    const eventoId = await this.eventoDelPago(id);
    await conBloqueoDeEvento(this.prisma, eventoId, async (tx) => {
      const pago = await this.pendiente(tx, id);
      await tx.pago.update({ where: { id }, data: { estado: 'verificado', verificadoPorId: adminId, revisadoEn: new Date() } });
      await this.notificaciones.emitir(tx, {
        nombre: 'evento.pago_verificado',
        a: { tipo: 'persona', personaId: pago.inscripcionEvento.personaId },
        datos: { pagoId: id, inscripcionId: pago.inscripcionEventoId, eventoId, evento: pago.inscripcionEvento.evento.nombre },
      });
    });
    return this.detalle(id);
  }

  /** POST /pagos/:id/rechazar — FR-035: motivo obligatorio; libera el lugar y promueve. */
  async rechazar(id: string, adminId: string, motivo: string | undefined): Promise<PagoEnBandeja> {
    const texto = motivo?.trim() ?? '';
    if (texto === '') throw new AppException('VALIDACION', 400, 'Escribí el motivo.', [{ campo: 'motivo', code: 'MOTIVO_REQUERIDO' }]);
    if (texto.length > MOTIVO_RECHAZO_PAGO_MAX) throw new AppException('VALIDACION', 400, 'El motivo es demasiado largo.', [{ campo: 'motivo', code: 'MOTIVO_DEMASIADO_LARGO' }]);
    const eventoId = await this.eventoDelPago(id);
    await conBloqueoDeEvento(this.prisma, eventoId, async (tx) => {
      const pago = await this.pendiente(tx, id);
      const ahora = new Date();
      await tx.pago.update({ where: { id }, data: { estado: 'rechazado', motivoRechazo: texto, verificadoPorId: adminId, revisadoEn: ahora } });
      const insc = await tx.inscripcionEvento.findUniqueOrThrow({ where: { id: pago.inscripcionEventoId }, select: { estado: true } });
      if (insc.estado === 'confirmada' || insc.estado === 'pendiente') {
        await tx.inscripcionEvento.update({
          where: { id: pago.inscripcionEventoId },
          data: { estado: 'cancelada', canceladaEn: ahora, canceladaPorId: adminId, motivoCancelacion: 'pago_rechazado' },
        });
      }
      await this.notificaciones.emitir(tx, {
        nombre: 'evento.pago_rechazado',
        a: { tipo: 'persona', personaId: pago.inscripcionEvento.personaId },
        datos: { pagoId: id, inscripcionId: pago.inscripcionEventoId, eventoId, evento: pago.inscripcionEvento.evento.nombre },
      });
      await promoverDesdeLista(tx, eventoId, (t, e) => this.notificaciones.emitir(t, e));
    });
    return this.detalle(id);
  }

  /** POST /inscripciones-evento/:id/pagos/en-nombre — FR-036: nace verificado; comprobante opcional. */
  async registrarEnNombre(
    inscripcionId: string,
    adminId: string,
    campos: { monto?: string; medio?: string; fechaPago?: string },
    archivo?: Buffer,
  ): Promise<PagoResumen> {
    const insc = await this.prisma.inscripcionEvento.findUnique({ where: { id: inscripcionId }, select: { eventoId: true, estado: true, evento: { select: { costo: true } } } });
    if (!insc) throw new AppException('NO_ENCONTRADO', 404, 'Inscripción no encontrada.');
    const datos = validarDatosPago(campos, Boolean(archivo?.length), false);
    if (insc.evento.costo === null) throw new AppException('EVENTO_SIN_COSTO', 409, 'Este Evento no tiene costo.');
    if (insc.estado !== 'confirmada') throw new AppException('INSCRIPCION_NO_CONFIRMADA', 409, 'La inscripción no está confirmada.');
    const comprobante = archivo?.length ? await prepararComprobante(archivo) : null;
    const ruta = comprobante
      ? (await this.storage.subirPrivado('comprobantes', { buffer: comprobante.buffer, mimeType: comprobante.mimeType, nombreOriginal: 'comprobante' })).ruta
      : null;
    const ahora = new Date();
    const pago = await this.prisma.pago.create({
      data: {
        inscripcionEventoId: inscripcionId,
        ...datos,
        estado: 'verificado',
        comprobanteRuta: ruta,
        comprobanteMime: comprobante?.mimeType ?? null,
        creadoPorId: adminId,
        verificadoPorId: adminId,
        revisadoEn: ahora,
      },
      select: PAGO_SELECT,
    });
    const admin = await this.prisma.persona.findUnique({ where: { id: adminId }, select: { id: true, nombre: true, apellido: true } });
    return aPagoResumen(pago, new Map(admin ? [[admin.id, admin]] : []));
  }

  private async eventoDelPago(id: string): Promise<string> {
    const pago = await this.prisma.pago.findUnique({ where: { id }, select: { inscripcionEvento: { select: { eventoId: true } } } });
    if (!pago) throw new AppException('NO_ENCONTRADO', 404, 'Pago no encontrado.');
    return pago.inscripcionEvento.eventoId;
  }

  private async pendiente(tx: Prisma.TransactionClient, id: string) {
    const pago = await tx.pago.findUniqueOrThrow({
      where: { id },
      select: { estado: true, inscripcionEventoId: true, inscripcionEvento: { select: { personaId: true, evento: { select: { nombre: true } } } } },
    });
    if (pago.estado !== 'pendiente_verificacion') throw new AppException('PAGO_NO_PENDIENTE', 409, 'El pago ya se revisó.');
    return pago;
  }
}
