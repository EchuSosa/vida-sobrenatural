import { Injectable, Logger } from '@nestjs/common';
import { alcanceDe, entradaDe, type EventoAviso } from '@vida-sobrenatural/shared-types';
import { Prisma } from '../generated/prisma/client.js';
import { resolverDestinatarios } from './destinatarios.js';

/**
 * spec 012 (D197, D198, `contracts/emision.md`) — el punto de entrada ÚNICO
 * para avisar algo. Ningún otro módulo escribe en `notificaciones` ni en
 * `entregas_notificacion`.
 *
 * `emitir` va DENTRO de la transacción del cambio de dominio: si la
 * transacción se deshace, no queda nada. El mail sale después (proceso de la
 * 012, lote C); `hayEmails` le sirve a quien llama para "empujarlo".
 *
 * Después de confirmar, quien emitió un importante puede llamar a
 * `empujarEmails()` para que el mail salga ya; si no lo hace, la tarea
 * programada lo manda en la próxima vuelta (spec 012, lote C).
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger('Avisos');
  private envioEmails: (() => void) | null = null;

  /** Lo registra `EnvioEmailsService` al arrancar (lote C): así este servicio no depende del envío. */
  registrarEnvioEmails(empujar: () => void): void {
    this.envioEmails = empujar;
  }

  /** Despierta el envío de mails pendientes, sin esperarlo ni propagar errores. Siempre DESPUÉS de confirmar. */
  empujarEmails(): void {
    try {
      this.envioEmails?.();
    } catch {
      // El envío tiene su propio reintento: nunca rompe la acción que avisó.
    }
  }

  async emitir(tx: Prisma.TransactionClient, evento: EventoAviso): Promise<{ hayEmails: boolean }> {
    const entrada = entradaDe(evento.nombre);
    // 1. Un destinatario distinto del del catálogo es un error de programación.
    if (evento.a.tipo !== entrada.destinatario) {
      throw new Error(`El evento ${evento.nombre} va a "${entrada.destinatario}", no a "${evento.a.tipo}".`);
    }
    // 2. Log estructurado sin datos personales (Principio X): nombre, tipo de destinatario e ids.
    this.logger.log({ evento: evento.nombre, destinatario: evento.a.tipo, ...evento.datos });
    // 3. D201: lo que va al Admin no genera avisos en esta tanda.
    if (entrada.destinatario === 'admin') return { hayEmails: false };

    const datos = evento.datos as never;
    const clave = entrada.clave(datos);
    const { alcance, alcanceId } = alcanceDe(evento.a);
    const params = evento.datos as Prisma.InputJsonValue;
    const entidadTipo = entrada.entidad.tipo;
    const entidadId = entrada.entidad.id(datos);

    // 4. Idempotencia (FR-014): con clave, una sola Notificación por hecho.
    let notificacionId: string;
    if (clave) {
      const filas = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO "notificaciones" ("id", "tipo", "prioridad", "alcance", "alcanceId", "evento", "params", "entidadTipo", "entidadId", "claveIdempotencia")
        VALUES (gen_random_uuid()::text, 'automatica', ${entrada.prioridad}::"PrioridadNotificacion", ${alcance}::"AlcanceNotificacion",
                ${alcanceId}, ${evento.nombre}, ${JSON.stringify(evento.datos)}::jsonb, ${entidadTipo}, ${entidadId}, ${clave})
        ON CONFLICT ("claveIdempotencia") DO NOTHING
        RETURNING "id"`;
      if (filas.length === 0) return { hayEmails: false };
      notificacionId = filas[0].id;
    } else {
      const creada = await tx.notificacion.create({
        data: { tipo: 'automatica', prioridad: entrada.prioridad, alcance, alcanceId, evento: evento.nombre, params, entidadTipo, entidadId },
        select: { id: true },
      });
      notificacionId = creada.id;
    }

    // 5. Destinatarios activos (FR-016). Sin ninguno, la Notificación queda como registro del hecho.
    const destinatarios = await resolverDestinatarios(tx, evento.a);
    if (destinatarios.length === 0) return { hayEmails: false };

    // 6. Una sentencia por canal: `app` para todos; `email` solo si es importante y tiene email (FR-017, D200).
    return this.crearEntregas(tx, notificacionId, destinatarios, entrada.prioridad === 'importante');
  }

  /**
   * Las Entregas de una Notificación, una sentencia por canal (la usan `emitir`
   * y los avisos manuales del backoffice, Principio XI): `app` para todos,
   * `email` `pendiente` solo si es importante y para quienes tienen email.
   */
  async crearEntregas(
    tx: Prisma.TransactionClient,
    notificacionId: string,
    destinatarios: { id: string; tieneEmail: boolean }[],
    importante: boolean,
  ): Promise<{ hayEmails: boolean }> {
    const ahora = new Date();
    await tx.entregaNotificacion.createMany({
      data: destinatarios.map((d) => ({ notificacionId, personaId: d.id, canal: 'app' as const, estado: 'enviada' as const, enviadaEn: ahora })),
      skipDuplicates: true,
    });
    const conEmail = importante ? destinatarios.filter((d) => d.tieneEmail) : [];
    if (conEmail.length > 0) {
      await tx.entregaNotificacion.createMany({
        data: conEmail.map((d) => ({ notificacionId, personaId: d.id, canal: 'email' as const, estado: 'pendiente' as const, proximoIntentoEn: ahora })),
        skipDuplicates: true,
      });
    }
    return { hayEmails: conEmail.length > 0 };
  }
}
