import { Logger, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { ESPERAS_REINTENTO_EMAIL_MS, MAX_INTENTOS_EMAIL } from '@vida-sobrenatural/shared-types';
import { AppModule } from '../../src/app.module.js';
import { configurarApp } from '../../src/configurar-app.js';
import { EmailService, type MensajeEmail } from '../../src/email/email.service.js';
import { EnvioEmailsService } from '../../src/notificaciones/envio-emails.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { EmailServiceFalso } from '../email-service-falso.js';
import { Escenario, MARTES_19_A_21, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 012, T039 — el envío de los mails de avisos importantes contra la base
 * real (FR-020, FR-022–FR-025, SC-002, US3-4 a US3-6). Las Entregas de este
 * archivo nacen con `proximoIntentoEn` en 2100 y se procesan con el reloj en
 * 2100: los otros archivos, que corren en paralelo con el reloj real, nunca
 * las toman. Las de ellos sí pueden pasar por acá: por eso todo se mira solo
 * sobre las Entregas y los emails propios.
 */
class FalsoSelectivo extends EmailServiceFalso {
  readonly fallanPara = new Set<string>();
  readonly lentosPara = new Set<string>();
  override async enviar(mensaje: MensajeEmail): Promise<void> {
    if (this.lentosPara.has(mensaje.para)) await new Promise((r) => setTimeout(r, 2500));
    if (this.fallanPara.has(mensaje.para)) throw new Error('Envío simulado fallido');
    return super.enviar(mensaje);
  }
}

const EN_2100 = new Date('2100-01-01T12:00:00Z');
const despues = (ms: number) => new Date(EN_2100.getTime() + ms);

describe('Envío de mails de avisos (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let envio: EnvioEmailsService;
  let esc: Escenario;
  const email = new FalsoSelectivo();
  const ids: string[] = [];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(EmailService).useValue(email).compile();
    app = moduleFixture.createNestApplication<INestApplication<Server>>();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    envio = moduleFixture.get(EnvioEmailsService);
    esc = new Escenario(prisma, `env${Date.now()}`);
    await esc.preparar();
  });

  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  async function persona(clave: string) {
    const id = await esc.persona(clave);
    ids.push(id);
    const { email: e } = await prisma.persona.findUniqueOrThrow({ where: { id }, select: { email: true } });
    return { id, email: e! };
  }

  /** Un aviso importante con su Entrega email pendiente "para 2100". */
  async function pendiente(personaId: string, tipo: 'automatica' | 'manual' = 'automatica', autorId?: string) {
    const n = await prisma.notificacion.create({
      data:
        tipo === 'manual'
          ? { tipo: 'manual', prioridad: 'importante', alcance: 'todos', titulo: 'Cambio de horario', mensaje: 'Uno.\n\nDos.', creadoPorId: autorId ?? personaId }
          : {
              tipo: 'automatica',
              prioridad: 'importante',
              alcance: 'persona',
              alcanceId: personaId,
              evento: 'discipulado.solicitud_rechazada',
              params: { solicitudId: 'sol-x' },
            },
      select: { id: true },
    });
    const enApp = await prisma.entregaNotificacion.create({ data: { notificacionId: n.id, personaId, canal: 'app', estado: 'enviada' }, select: { id: true } });
    const mail = await prisma.entregaNotificacion.create({
      data: { notificacionId: n.id, personaId, canal: 'email', estado: 'pendiente', proximoIntentoEn: EN_2100 },
      select: { id: true },
    });
    return { notificacionId: n.id, appId: enApp.id, id: mail.id };
  }

  const estadoDe = (id: string) =>
    prisma.entregaNotificacion.findUniqueOrThrow({ where: { id }, select: { estado: true, intentos: true, proximoIntentoEn: true, ultimoError: true, enviadaEn: true } });
  const mensajesA = (direccion: string) => email.enviados.filter((m) => m.para === direccion);

  it('(a) pendiente → enviada, al email VIGENTE de la Persona, con el botón a WEB_URL + destino (FR-020, FR-025, US3-6)', async () => {
    const p = await persona('a');
    const e = await pendiente(p.id);
    const nuevo = `nuevo-${p.email}`;
    await prisma.persona.update({ where: { id: p.id }, data: { email: nuevo } });
    await envio.procesarPendientes(100, despues(1));
    expect(await estadoDe(e.id)).toMatchObject({ estado: 'enviada', intentos: 1, proximoIntentoEn: null, ultimoError: null, enviadaEn: expect.any(Date) });
    expect(mensajesA(p.email)).toHaveLength(0);
    const [m] = mensajesA(nuevo);
    expect(m.asunto).toBe('Hay novedades sobre tu pedido');
    expect(m.html).toContain(`href="${process.env.WEB_URL}/mi-camino"`);
    expect(m.texto).toContain(`${process.env.WEB_URL}/mi-camino`);
  });

  it('un aviso manual lleva al aviso completo, con su título de asunto', async () => {
    const p = await persona('manual');
    const e = await pendiente(p.id, 'manual');
    await envio.procesarPendientes(100, despues(1));
    expect((await estadoDe(e.id)).estado).toBe('enviada');
    const [m] = mensajesA(p.email);
    expect(m.asunto).toBe('Cambio de horario');
    expect(m.html).toContain(`href="${process.env.WEB_URL}/avisos/${e.appId}"`);
  });

  it('(b) si el envío falla: reintento en 1 min con ENVIO_FALLIDO; al quinto, fallida (FR-022, US3-4)', async () => {
    const p = await persona('b');
    const e = await pendiente(p.id);
    email.fallanPara.add(p.email);
    await envio.procesarPendientes(100, despues(1));
    const primero = await estadoDe(e.id);
    expect(primero).toMatchObject({ estado: 'pendiente', intentos: 1, ultimoError: 'ENVIO_FALLIDO' });
    expect(primero.proximoIntentoEn!.getTime()).toBe(despues(1).getTime() + ESPERAS_REINTENTO_EMAIL_MS[0]);

    let reloj = despues(1).getTime();
    for (let i = 1; i < MAX_INTENTOS_EMAIL; i++) {
      reloj += ESPERAS_REINTENTO_EMAIL_MS[i - 1] + 1;
      await envio.procesarPendientes(100, new Date(reloj));
    }
    expect(await estadoDe(e.id)).toMatchObject({ estado: 'fallida', intentos: MAX_INTENTOS_EMAIL, proximoIntentoEn: null, ultimoError: 'ENVIO_FALLIDO' });
    expect(mensajesA(p.email)).toHaveLength(0);
  });

  it('(c) sin email o inactiva al momento de mandar → fallida, sin llamar al servicio (FR-025)', async () => {
    const sin = await persona('sinmail');
    const eSin = await pendiente(sin.id);
    await prisma.persona.update({ where: { id: sin.id }, data: { email: null } });
    const inactiva = await persona('inactiva');
    const eInactiva = await pendiente(inactiva.id);
    await prisma.persona.update({ where: { id: inactiva.id }, data: { activo: false } });
    await envio.procesarPendientes(100, despues(1));
    expect(await estadoDe(eSin.id)).toMatchObject({ estado: 'fallida', ultimoError: 'SIN_EMAIL' });
    expect(await estadoDe(eInactiva.id)).toMatchObject({ estado: 'fallida', ultimoError: 'PERSONA_INACTIVA' });
    expect(mensajesA(inactiva.email)).toHaveLength(0);
  });

  it('(d) dos vueltas a la vez sobre las mismas 10 Entregas mandan 10 mails, no 20 (FR-023)', async () => {
    const personas = await Promise.all(Array.from({ length: 10 }, (_, i) => persona(`conc${i}`)));
    const entregas = [];
    for (const p of personas) entregas.push(await pendiente(p.id));
    await Promise.all([envio.procesarPendientes(100, despues(1)), envio.procesarPendientes(100, despues(1))]);
    const mios = new Set(personas.map((p) => p.email));
    expect(email.enviados.filter((m) => mios.has(m.para))).toHaveLength(10);
    for (const e of entregas) expect((await estadoDe(e.id)).estado).toBe('enviada');
  });

  it('(g) el log de un fallo tiene solo entregaId, intento y tipo (FR-024)', async () => {
    const p = await persona('log');
    const e = await pendiente(p.id);
    email.fallanPara.add(p.email);
    // Sin `jest.spyOn` (los tests de integración corren como ESM): se reemplaza `warn` a mano.
    const llamadas: unknown[] = [];
    // oxlint-disable-next-line typescript/unbound-method -- se restaura tal cual en el finally
    const warnOriginal = Logger.prototype.warn;
    Logger.prototype.warn = function (mensaje: unknown) {
      llamadas.push(mensaje);
    };
    try {
      await envio.procesarPendientes(100, despues(1));
      const propios = llamadas.filter((x) => (x as { entregaId?: string } | null)?.entregaId === e.id);
      expect(propios).toEqual([{ entregaId: e.id, intento: 1, tipo: 'ENVIO_FALLIDO' }]);
      expect(JSON.stringify(llamadas)).not.toContain(p.email);
    } finally {
      Logger.prototype.warn = warnOriginal;
    }
  });

  it('(h) con el reloj más allá de la última espera, toda Entrega termina enviada o fallida (SC-002)', async () => {
    const ok = await persona('h-ok');
    const mal = await persona('h-mal');
    const eOk = await pendiente(ok.id);
    const eMal = await pendiente(mal.id);
    email.fallanPara.add(mal.email);
    let reloj = despues(1).getTime();
    for (let i = 0; i < MAX_INTENTOS_EMAIL; i++) {
      await envio.procesarPendientes(100, new Date(reloj));
      reloj += Math.max(...ESPERAS_REINTENTO_EMAIL_MS) + 1;
    }
    expect((await estadoDe(eOk.id)).estado).toBe('enviada');
    expect((await estadoDe(eMal.id)).estado).toBe('fallida');
  });

  it('la acción que avisa responde sin esperar al mail, aunque el servidor de mail sea lento (US3-5)', async () => {
    const admin = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    const p = await persona('lenta');
    email.lentosPara.add(p.email);
    const solicitud = await prisma.solicitudDiscipulado.create({ data: { personaId: p.id, franjas: { create: [MARTES_19_A_21] } }, select: { id: true } });
    const inicio = Date.now();
    await request(app.getHttpServer())
      .post(`/discipulado/solicitudes/${solicitud.id}/rechazar`)
      .set('Authorization', `Bearer ${await tokenDe(admin, ['miembro_registrado', 'admin'])}`)
      .expect(200);
    expect(Date.now() - inicio).toBeLessThan(1000);
    // El aviso salió igual: la Entrega email quedó creada para el proceso.
    expect(await prisma.entregaNotificacion.count({ where: { personaId: p.id, canal: 'email' } })).toBe(1);
  });

  it('nunca escribe el email en el texto guardado del error', async () => {
    const filas = await prisma.entregaNotificacion.findMany({ where: { personaId: { in: ids }, ultimoError: { not: null } }, select: { ultimoError: true } });
    for (const f of filas) expect(f.ultimoError).toMatch(/^(SIN_EMAIL|PERSONA_INACTIVA|ENVIO_FALLIDO)$/);
  });
});
