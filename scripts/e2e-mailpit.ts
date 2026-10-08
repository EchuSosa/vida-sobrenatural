import { expect, type Page } from '@playwright/test';

/**
 * spec 007 (T025, T038): leer los mails del código en Mailpit (el SMTP de los e2e,
 * `docker-compose.yml` y el servicio `mailpit` del job e2e del CI). Cada test
 * usa un email propio (`e2e-…-${Date.now()}`), así que se busca por
 * destinatario y no hace falta vaciar Mailpit (las dos suites pueden correr a
 * la vez contra el mismo Mailpit sin borrarse los mails entre sí).
 */
const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

interface ResumenMensaje {
  ID: string;
  Subject: string;
  Created: string;
}

export interface MensajeMailpit {
  ID: string;
  Subject: string;
  HTML: string;
  Text: string;
  To: Array<{ Address: string }>;
}

export async function mensajesPara(email: string): Promise<ResumenMensaje[]> {
  const respuesta = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  if (!respuesta.ok) throw new Error(`Mailpit respondió ${respuesta.status}: ¿está levantado en ${MAILPIT}?`);
  const { messages } = (await respuesta.json()) as { messages: ResumenMensaje[] };
  return [...messages].sort((a, b) => Date.parse(b.Created) - Date.parse(a.Created));
}

/** Espera a que llegue el mail número `cantidad` para ese email y devuelve el más nuevo. */
export async function esperarMensaje(email: string, cantidad = 1): Promise<MensajeMailpit> {
  let ultimo: ResumenMensaje | undefined;
  await expect
    .poll(
      async () => {
        const mensajes = await mensajesPara(email);
        ultimo = mensajes[0];
        return mensajes.length;
      },
      { message: `mail ${cantidad} para ${email} en Mailpit`, timeout: 15_000 },
    )
    .toBeGreaterThanOrEqual(cantidad);
  const respuesta = await fetch(`${MAILPIT}/api/v1/message/${ultimo!.ID}`);
  return (await respuesta.json()) as MensajeMailpit;
}

/** El código del último mail (`cantidad` = cuántos mails tiene que haber recibido ese email). */
export async function leerCodigoDeMailpit(email: string, cantidad = 1): Promise<string> {
  const mensaje = await esperarMensaje(email, cantidad);
  const coincidencia = /(\d{6})/.exec(mensaje.Subject);
  if (!coincidencia) throw new Error(`El asunto no tiene un código: ${mensaje.Subject}`);
  return coincidencia[1];
}

/**
 * El límite de 30 pedidos por hora es por origen (la IP), y en los e2e todos
 * los pedidos salen de la misma máquina: cada test se presenta con su propio
 * `X-Forwarded-For` (Next lo respeta si ya viene) para no gastar el cupo de
 * los demás.
 */
let contadorOrigen = 0;
export async function usarOrigenPropio(page: Page): Promise<void> {
  contadorOrigen += 1;
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.${process.pid % 250}.${contadorOrigen % 250}` });
}
