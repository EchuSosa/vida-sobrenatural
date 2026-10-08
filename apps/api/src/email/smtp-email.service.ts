import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { EmailService, type MensajeEmail } from './email.service.js';

/**
 * Adaptador SMTP (nodemailer) de `EmailService`. Local y e2e: Mailpit
 * (`localhost:1025`, docker-compose.yml). Producción: el proveedor que se elija
 * (D140, candidato Resend), por variables de entorno.
 *
 * Si falta `SMTP_HOST`, la API no arranca (mismo criterio que
 * `INTERNAL_API_SECRET`): un servicio de email sin configurar no puede fallar
 * recién cuando alguien quiere entrar.
 */
@Injectable()
export class SmtpEmailService extends EmailService implements OnModuleInit {
  private readonly logger = new Logger('SmtpEmailService');
  private transporte!: Transporter;
  private remitente!: string;

  onModuleInit(): void {
    const host = process.env.SMTP_HOST;
    if (!host) {
      throw new Error('Falta SMTP_HOST: la API no arranca sin un servicio de email configurado (D140). En local, Mailpit: SMTP_HOST=localhost, SMTP_PORT=1025.');
    }
    this.remitente = process.env.EMAIL_REMITENTE ?? 'Vida Sobrenatural <no-responder@localhost>';
    const usuario = process.env.SMTP_USER;
    this.transporte = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: process.env.SMTP_SEGURO === 'true',
      ...(usuario ? { auth: { user: usuario, pass: process.env.SMTP_PASS ?? '' } } : {}),
    });
  }

  async enviar(mensaje: MensajeEmail): Promise<void> {
    try {
      await this.transporte.sendMail({
        from: this.remitente,
        to: mensaje.para,
        subject: mensaje.asunto,
        html: mensaje.html,
        text: mensaje.texto,
      });
    } catch (error) {
      // Principio X: solo el TIPO de error; nunca destinatario, asunto ni cuerpo.
      this.logger.error({ evento: 'envio_email_fallido', tipo: error instanceof Error ? error.name : 'desconocido' });
      throw error;
    }
  }
}
