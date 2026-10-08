/**
 * spec 007 (D96, D140) — interfaz detrás de la que queda el proveedor de mail
 * (`specs/007-ingreso-codigo-email/contracts/email-codigo-ingreso.md`), igual
 * que `StorageService`. Clase abstracta para que Nest tenga un token real.
 *
 * La usan el código de ingreso (007), los mails de avisos importantes (012) y
 * "Contanos qué te parece" (013). Lote 0 global: interfaz, adaptador SMTP y el
 * falso de los tests; las plantillas las agrega cada spec en `plantillas/`.
 */
export interface MensajeEmail {
  /** Un solo destinatario. */
  para: string;
  asunto: string;
  html: string;
  /** Versión en texto plano, siempre. */
  texto: string;
}

export abstract class EmailService {
  /** Lanza si el envío falla. Nunca escribe en logs el destinatario ni el cuerpo. */
  abstract enviar(mensaje: MensajeEmail): Promise<void>;
}
