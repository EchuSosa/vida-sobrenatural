import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { SmtpEmailService } from './smtp-email.service.js';

/**
 * spec 007 — `EmailService` con su adaptador SMTP (patrón de `storage/`).
 * Global: lo inyectan 007, 012 y 013 sin importar el módulo. Los tests lo
 * reemplazan con `EmailServiceFalso` (test/email-service-falso.ts).
 */
@Global()
@Module({
  providers: [{ provide: EmailService, useClass: SmtpEmailService }],
  exports: [EmailService],
})
export class EmailModule {}
