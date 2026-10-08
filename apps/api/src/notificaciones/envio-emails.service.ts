import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ESPERAS_REINTENTO_EMAIL_MS, MAX_INTENTOS_EMAIL, type NombreEventoAviso } from '@vida-sobrenatural/shared-types';
import mensajesEs from '../email/mensajes/es.json' with { type: 'json' };
import { EmailService, type MensajeEmail } from '../email/email.service.js';
import { plantillaAviso, type Idioma } from '../email/plantillas/aviso.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { destinoDeAviso } from './avisos.service.js';
import { NotificacionesService } from './notificaciones.service.js';

/** Tipos de error que se guardan en `ultimoError` (nunca el texto del servidor de mail). */
export type ErrorEnvio = 'SIN_EMAIL' | 'PERSONA_INACTIVA' | 'ENVIO_FALLIDO';

/** Mientras una vuelta manda una Entrega, nadie más la toma (si el proceso muere, se reintenta después). */
const RESERVA_MS = 10 * 60_000;

interface TextosMail {
  asunto: string;
  titulo: string;
  parrafos: string[];
  boton: string;
}

const MENSAJES: Record<Idioma, typeof mensajesEs> = { es: mensajesEs };

function rellenar(texto: string, valores: Record<string, unknown>): string {
  return texto.replace(/\{(\w+)\}/g, (entero, clave: string) => {
    const v = valores[clave];
    return typeof v === 'string' || typeof v === 'number' ? String(v) : entero;
  });
}

/** Textos del mail de un evento del catálogo en ese idioma, con fallback a `es` (D84). `null` si el evento no tiene mail. */
export function textosMailDeEvento(evento: string, params: Record<string, unknown>, idioma: Idioma): TextosMail | null {
  const [dominio, nombre] = evento.split('.');
  const buscar = (m: typeof mensajesEs) =>
    (m.avisos.eventos as Record<string, Record<string, TextosMail> | undefined>)[dominio]?.[nombre];
  const t = buscar(MENSAJES[idioma] ?? mensajesEs) ?? buscar(mensajesEs);
  if (!t) return null;
  return { asunto: rellenar(t.asunto, params), titulo: rellenar(t.titulo, params), parrafos: t.parrafos.map((x) => rellenar(x, params)), boton: t.boton };
}

/** Destino del catálogo; si no lo hay, la lista de Avisos. */
function rutaDe(n: { tipo: 'manual' | 'automatica'; evento: string | null; params: unknown }): string {
  const d = destinoDeAviso('-', n);
  return d === '/avisos/-' ? '/avisos' : d;
}

/** Un mensaje manual partido en párrafos por las líneas en blanco. */
export function parrafosDe(mensaje: string): string[] {
  return mensaje
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * spec 012, lote C (T042; FR-020, FR-022–FR-025; research #5) — manda los
 * mails de los avisos importantes. Las Entregas `email` nacen `pendiente` en
 * la transacción del aviso; esto las toma con `FOR UPDATE SKIP LOCKED` (dos
 * vueltas a la vez, en uno o varios procesos, nunca mandan la misma), lee el
 * email y el estado VIGENTES de la Persona y manda. Si falla, reintenta con
 * las esperas de D204 hasta `MAX_INTENTOS_EMAIL`; después queda `fallida`.
 * El log lleva solo `{ entregaId, intento, tipo }` (FR-024).
 */
@Injectable()
export class EnvioEmailsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('EnvioEmails');
  private readonly enCurso = new Set<Promise<unknown>>();
  private cerrando = false;
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly notificaciones: NotificacionesService,
  ) {
    // T002: sin WEB_URL los enlaces de los mails no sirven — la API no arranca (mismo criterio que SMTP_HOST).
    const webUrl = process.env.WEB_URL;
    if (!webUrl) throw new Error('Falta WEB_URL: la API no arranca sin la URL de la web app para los enlaces de los mails (spec 012).');
    this.webUrl = webUrl.replace(/\/$/, '');
  }

  onModuleInit(): void {
    this.notificaciones.registrarEnvioEmails(() => this.empujar());
  }

  /** Al apagar la API (o un test), espera a las vueltas en curso: nada queda escribiendo con la base cerrada. */
  async onModuleDestroy(): Promise<void> {
    this.cerrando = true;
    await Promise.allSettled(this.enCurso);
  }

  /** Despierta una vuelta sin esperarla ni propagar errores (la tarea programada es la red de seguridad). */
  empujar(): void {
    if (this.cerrando) return;
    const vuelta = new Promise<void>((resolver) => setImmediate(resolver))
      .then(() => (this.cerrando ? undefined : this.procesarPendientes()))
      .catch(() => this.logger.warn({ tipo: 'VUELTA_FALLIDA' }));
    this.enCurso.add(vuelta);
    void vuelta.finally(() => this.enCurso.delete(vuelta));
  }

  /** Una vuelta: hasta `lote` Entregas vencidas a `ahora` (inyectable para los tests). */
  async procesarPendientes(lote = 20, ahora: Date = new Date()): Promise<{ enviados: number; reintentos: number; fallidos: number }> {
    const vuelta = this.vuelta(lote, ahora);
    this.enCurso.add(vuelta);
    try {
      return await vuelta;
    } finally {
      this.enCurso.delete(vuelta);
    }
  }

  private async vuelta(lote: number, ahora: Date) {
    const resultado = { enviados: 0, reintentos: 0, fallidos: 0 };
    // Reserva atómica: una sola sentencia; la Entrega queda "corrida" 10 min hacia adelante.
    const reservadas = await this.prisma.$queryRaw<{ id: string; personaId: string; notificacionId: string; intentos: number }[]>`
      UPDATE "entregas_notificacion" SET "proximoIntentoEn" = ${new Date(ahora.getTime() + RESERVA_MS)}
       WHERE "id" IN (
         SELECT "id" FROM "entregas_notificacion"
          WHERE "canal" = 'email' AND "estado" = 'pendiente' AND "proximoIntentoEn" <= ${ahora}
          ORDER BY "proximoIntentoEn" ASC
          LIMIT ${lote}
          FOR UPDATE SKIP LOCKED)
      RETURNING "id", "personaId", "notificacionId", "intentos"`;

    for (const entrega of reservadas) {
      const r = await this.mandarUna(entrega, ahora);
      if (r === 'enviada') resultado.enviados += 1;
      else if (r === 'reintento') resultado.reintentos += 1;
      else resultado.fallidos += 1;
    }
    return resultado;
  }

  private async mandarUna(e: { id: string; personaId: string; notificacionId: string; intentos: number }, ahora: Date): Promise<'enviada' | 'reintento' | 'fallida'> {
    const intento = e.intentos + 1;
    const [persona, notificacion] = await Promise.all([
      this.prisma.persona.findUnique({ where: { id: e.personaId }, select: { email: true, estado: true, activo: true, idiomaPreferido: true } }),
      this.prisma.notificacion.findUnique({ where: { id: e.notificacionId }, select: { tipo: true, evento: true, params: true, titulo: true, mensaje: true } }),
    ]);
    // FR-025: el estado y el email de AHORA, no los de cuando se creó el aviso.
    if (!persona || !persona.activo || persona.estado !== 'activa') return this.fallar(e.id, intento, 'PERSONA_INACTIVA');
    if (!persona.email) return this.fallar(e.id, intento, 'SIN_EMAIL');
    if (!notificacion) return this.fallar(e.id, intento, 'ENVIO_FALLIDO');

    const mensaje = await this.armar(e, persona.idiomaPreferido as Idioma, notificacion);
    if (!mensaje) return this.fallar(e.id, intento, 'ENVIO_FALLIDO');

    try {
      await this.email.enviar({ ...mensaje, para: persona.email });
    } catch {
      this.logger.warn({ entregaId: e.id, intento, tipo: 'ENVIO_FALLIDO' });
      if (intento >= MAX_INTENTOS_EMAIL) return this.fallar(e.id, intento, 'ENVIO_FALLIDO', false);
      const espera = ESPERAS_REINTENTO_EMAIL_MS[Math.min(intento - 1, ESPERAS_REINTENTO_EMAIL_MS.length - 1)];
      await this.prisma.entregaNotificacion.updateMany({
        where: { id: e.id, estado: 'pendiente' },
        data: { intentos: intento, proximoIntentoEn: new Date(ahora.getTime() + espera), ultimoError: 'ENVIO_FALLIDO' },
      });
      return 'reintento';
    }
    await this.prisma.entregaNotificacion.updateMany({
      where: { id: e.id, estado: 'pendiente' },
      data: { estado: 'enviada', intentos: intento, enviadaEn: new Date(), proximoIntentoEn: null, ultimoError: null },
    });
    return 'enviada';
  }

  private async armar(
    e: { personaId: string; notificacionId: string },
    idioma: Idioma,
    n: { tipo: 'manual' | 'automatica'; evento: string | null; params: unknown; titulo: string | null; mensaje: string | null },
  ): Promise<Omit<MensajeEmail, 'para'> | null> {
    const webUrl = this.webUrl;
    const textos = MENSAJES[idioma] ?? mensajesEs;
    if (n.tipo === 'manual') {
      if (!n.titulo || !n.mensaje) return null;
      // El enlace lleva al aviso completo: el id es el de la Entrega `app` de esta Persona.
      const app = await this.prisma.entregaNotificacion.findFirst({ where: { notificacionId: e.notificacionId, personaId: e.personaId, canal: 'app' }, select: { id: true } });
      return plantillaAviso({
        asunto: n.titulo,
        titulo: n.titulo,
        parrafos: parrafosDe(n.mensaje),
        textoBoton: textos.avisos.manual.boton,
        url: `${webUrl}${app ? `/avisos/${app.id}` : '/avisos'}`,
        webUrl,
        idioma,
      });
    }
    if (!n.evento) return null;
    const params = (n.params ?? {}) as Record<string, unknown>;
    const t = textosMailDeEvento(n.evento as NombreEventoAviso, params, idioma);
    if (!t) return null;
    return plantillaAviso({ asunto: t.asunto, titulo: t.titulo, parrafos: t.parrafos, textoBoton: t.boton, url: `${webUrl}${rutaDe(n)}`, webUrl, idioma });
  }

  private async fallar(id: string, intento: number, tipo: ErrorEnvio, loguear = true): Promise<'fallida'> {
    if (loguear) this.logger.warn({ entregaId: id, intento, tipo });
    await this.prisma.entregaNotificacion.updateMany({
      where: { id, estado: 'pendiente' },
      data: { estado: 'fallida', intentos: intento, proximoIntentoEn: null, ultimoError: tipo },
    });
    return 'fallida';
  }
}
