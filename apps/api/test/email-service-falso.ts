import { EmailService, type MensajeEmail } from '../src/email/email.service.js';

/**
 * spec 007 (T008): `EmailService` de los tests de la API. Guarda los mensajes
 * en memoria y puede simular un fallo de envío. Uso:
 *
 *   const email = new EmailServiceFalso();
 *   Test.createTestingModule({ imports: [AppModule] })
 *     .overrideProvider(EmailService).useValue(email)
 */
export class EmailServiceFalso extends EmailService {
  readonly enviados: MensajeEmail[] = [];
  private fallarProximos = 0;

  /** Los próximos `n` envíos lanzan un error. */
  fallarLosProximos(n = 1): void {
    this.fallarProximos = n;
  }

  async enviar(mensaje: MensajeEmail): Promise<void> {
    if (this.fallarProximos > 0) {
      this.fallarProximos -= 1;
      throw new Error('Envío simulado fallido');
    }
    this.enviados.push(mensaje);
  }

  limpiar(): void {
    this.enviados.length = 0;
    this.fallarProximos = 0;
  }
}
