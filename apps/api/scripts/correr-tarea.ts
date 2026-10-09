import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SmtpEmailService } from '../src/email/smtp-email.service.js';
import { NotificacionesService } from '../src/notificaciones/notificaciones.service.js';
import { EnvioEmailsService } from '../src/notificaciones/envio-emails.service.js';
import { RecordatoriosEventosService } from '../src/tareas-programadas/recordatorios-eventos.service.js';
import { BorradoRespuestasSensiblesService } from '../src/evento/borrado-respuestas-sensibles.service.js';

/**
 * spec 012, T043/T056 (FR-038, quickstart) — corre una tarea programada a mano,
 * contra la base de DATABASE_URL:
 *
 *   pnpm --filter api run tareas:correr emails         # manda los mails pendientes vencidos
 *   pnpm --filter api run tareas:correr recordatorios  # recordatorios de Eventos de hoy
 *   pnpm --filter api run tareas:correr respuestas-sensibles  # borra las respuestas sensibles vencidas (FR-069 de la 011)
 *
 * Arma los servicios a mano (tsx no emite la metadata de decoradores que usa
 * la inyección de Nest); son los mismos que usa la API.
 */
async function main() {
  const tarea = process.argv[2];
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const notificaciones = new NotificacionesService();
    if (tarea === 'emails') {
      const email = new SmtpEmailService();
      email.onModuleInit();
      const envio = new EnvioEmailsService(prisma, email, notificaciones);
      let total = { enviados: 0, reintentos: 0, fallidos: 0 };
      for (;;) {
        const r = await envio.procesarPendientes();
        total = { enviados: total.enviados + r.enviados, reintentos: total.reintentos + r.reintentos, fallidos: total.fallidos + r.fallidos };
        if (r.enviados + r.reintentos + r.fallidos === 0) break;
      }
      console.log(`emails: ${total.enviados} enviados, ${total.reintentos} para reintentar, ${total.fallidos} fallidos.`);
    } else if (tarea === 'recordatorios') {
      const r = await new RecordatoriosEventosService(prisma, notificaciones).correr();
      console.log(`recordatorios: ${r.proximos} Eventos con "es muy pronto", ${r.inscripcion} con "quedan días para anotarte"; ${r.fallidos} con error.`);
      console.log('Los mails de lo que sea importante los manda `tareas:correr emails` (o la API, si está levantada).');
    } else if (tarea === 'respuestas-sensibles') {
      const r = await new BorradoRespuestasSensiblesService(prisma).correr();
      console.log(`respuestas sensibles: ${r.respuestas} borradas de ${r.eventos} Eventos terminados hace más de 30 días.`);
    } else {
      console.error('Uso: pnpm --filter api run tareas:correr <emails|recordatorios|respuestas-sensibles>');
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
