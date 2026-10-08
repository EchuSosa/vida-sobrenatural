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
 * Lote 0 global: el mecanismo completo, aunque los consumidores lleguen
 * después. La 004 todavía emite por `EventosDiscipuladoService` (solo log);
 * conectarla es el lote B de la 012.
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger('Avisos');

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
    await tx.entregaNotificacion.createMany({
      data: destinatarios.map((d) => ({ notificacionId, personaId: d.id, canal: 'app' as const, estado: 'enviada' as const, enviadaEn: new Date() })),
      skipDuplicates: true,
    });
    const conEmail = entrada.prioridad === 'importante' ? destinatarios.filter((d) => d.tieneEmail) : [];
    if (conEmail.length > 0) {
      const ahora = new Date();
      await tx.entregaNotificacion.createMany({
        data: conEmail.map((d) => ({ notificacionId, personaId: d.id, canal: 'email' as const, estado: 'pendiente' as const, proximoIntentoEn: ahora })),
        skipDuplicates: true,
      });
    }
    return { hayEmails: conEmail.length > 0 };
  }
}
