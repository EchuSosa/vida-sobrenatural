import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';
import { crearAvisoAutomatico, crearAvisoManual, limpiarAvisos } from './notificaciones-fixtures.js';

/** spec 012, T018 — FR-001, FR-003, FR-004, FR-007, FR-008, US1-8. */
describe('API de Avisos (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  const personas: string[] = [];
  let yo: string;
  let otra: string;
  let autor: string;
  let token: string;
  const http = () => request(app.getHttpServer());
  const conToken = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `av${Date.now()}`);
    await esc.preparar();
    yo = await esc.persona('yo');
    otra = await esc.persona('otra');
    autor = await esc.persona('autor', { rol: ['miembro_registrado', 'admin'] });
    personas.push(yo, otra, autor);
    token = await tokenDe(yo, ['miembro_registrado']);
  });

  afterAll(async () => {
    await limpiarAvisos(prisma, personas);
    await esc.limpiar();
    await app.close();
  });

  beforeEach(async () => {
    await limpiarAvisos(prisma, personas);
  });

  it('GET /avisos: solo las Entregas app propias, más nuevas primero, con destino, params y extracto (FR-001, FR-007)', async () => {
    const t0 = Date.now() - 60_000;
    const vieja = await crearAvisoAutomatico(prisma, yo, {
      evento: 'evento.cancelado',
      params: { eventoId: 'e', evento: 'Retiro', slug: 'retiro' },
      fecha: new Date(t0),
      importante: true,
    });
    const mensaje = `${'palabra '.repeat(30)}final`;
    const nueva = await crearAvisoManual(prisma, yo, { autorId: autor, titulo: 'Culto especial', mensaje, fecha: new Date(t0 + 1000), leida: true });
    await crearAvisoManual(prisma, otra, { autorId: autor });

    const r = await http().get('/avisos').set(conToken(token)).expect(200);
    expect(r.body.total).toBe(2);
    expect(r.body.pagina).toBe(1);
    expect(r.body.items.map((i: { id: string }) => i.id)).toEqual([nueva, vieja]);
    const [manual, auto] = r.body.items;
    expect(manual).toMatchObject({ tipo: 'manual', titulo: 'Culto especial', evento: null, params: null, leido: true, importante: false, destino: `/avisos/${nueva}` });
    expect(manual.extracto.endsWith('…')).toBe(true);
    expect(manual.extracto.length).toBeLessThanOrEqual(141);
    expect(manual).not.toHaveProperty('mensaje');
    expect(auto).toMatchObject({ tipo: 'automatica', evento: 'evento.cancelado', params: { slug: 'retiro' }, titulo: null, extracto: null, leido: false, importante: true, destino: '/eventos/retiro' });
  });

  it('pagina de a 20 y recorta una página fuera de rango a la última (FR-001)', async () => {
    for (let i = 0; i < 25; i++) await crearAvisoAutomatico(prisma, yo, { fecha: new Date(Date.now() - i * 1000) });
    const p2 = await http().get('/avisos?pagina=2').set(conToken(token)).expect(200);
    expect(p2.body).toMatchObject({ total: 25, pagina: 2 });
    expect(p2.body.items).toHaveLength(5);
    const p99 = await http().get('/avisos?pagina=99').set(conToken(token)).expect(200);
    expect(p99.body.pagina).toBe(2);
    const p0 = await http().get('/avisos?pagina=abc').set(conToken(token)).expect(200);
    expect(p0.body.pagina).toBe(1);
    expect(p0.body.items).toHaveLength(20);
  });

  it('GET /avisos/sin-leer cuenta solo las propias sin leer (FR-005)', async () => {
    await crearAvisoAutomatico(prisma, yo);
    await crearAvisoAutomatico(prisma, yo);
    await crearAvisoAutomatico(prisma, yo, { leida: true });
    await crearAvisoAutomatico(prisma, otra);
    const r = await http().get('/avisos/sin-leer').set(conToken(token)).expect(200);
    expect(r.body).toEqual({ cantidad: 2 });
  });

  it('GET /avisos/:id trae el mensaje completo; el de otra Persona es 404 (FR-006, US1-8)', async () => {
    const mensaje = 'Primera línea.\n\nSegunda línea con https://ejemplo.com';
    const mio = await crearAvisoManual(prisma, yo, { autorId: autor, mensaje });
    const ajeno = await crearAvisoManual(prisma, otra, { autorId: autor });
    const r = await http().get(`/avisos/${mio}`).set(conToken(token)).expect(200);
    expect(r.body).toMatchObject({ id: mio, mensaje, tipo: 'manual' });
    const no = await http().get(`/avisos/${ajeno}`).set(conToken(token)).expect(404);
    expect(no.body.code).toBe('NO_ENCONTRADO');
    await http().get('/avisos/no-existe').set(conToken(token)).expect(404);
  });

  it('PATCH /avisos/:id/leido devuelve el destino y no pisa la primera fecha (FR-003, FR-008)', async () => {
    const id = await crearAvisoAutomatico(prisma, yo, { evento: 'discipulado.propuesta_aceptada', params: { solicitudId: 's', grupoId: 'g', discipuladorId: 'd' } });
    const r = await http().patch(`/avisos/${id}/leido`).set(conToken(token)).expect(200);
    expect(r.body).toEqual({ destino: '/mi-camino' });
    const primera = (await prisma.entregaNotificacion.findUniqueOrThrow({ where: { id }, select: { leidaEn: true } })).leidaEn;
    expect(primera).not.toBeNull();
    await new Promise((resolver) => setTimeout(resolver, 20));
    await http().patch(`/avisos/${id}/leido`).set(conToken(token)).expect(200);
    const segunda = (await prisma.entregaNotificacion.findUniqueOrThrow({ where: { id }, select: { leidaEn: true } })).leidaEn;
    expect(segunda).toEqual(primera);
  });

  it('PATCH de un aviso de otra Persona es 404 y no lo marca (US1-8)', async () => {
    const ajeno = await crearAvisoAutomatico(prisma, otra);
    const r = await http().patch(`/avisos/${ajeno}/leido`).set(conToken(token)).expect(404);
    expect(r.body.code).toBe('NO_ENCONTRADO');
    expect((await prisma.entregaNotificacion.findUniqueOrThrow({ where: { id: ajeno }, select: { leidaEn: true } })).leidaEn).toBeNull();
  });

  it('POST /avisos/leer-todos marca solo las propias (FR-004)', async () => {
    await crearAvisoAutomatico(prisma, yo);
    await crearAvisoAutomatico(prisma, yo);
    await crearAvisoAutomatico(prisma, yo, { leida: true });
    const ajeno = await crearAvisoAutomatico(prisma, otra);
    const r = await http().post('/avisos/leer-todos').set(conToken(token)).expect(200);
    expect(r.body).toEqual({ marcados: 2 });
    expect((await http().get('/avisos/sin-leer').set(conToken(token))).body).toEqual({ cantidad: 0 });
    expect((await prisma.entregaNotificacion.findUniqueOrThrow({ where: { id: ajeno }, select: { leidaEn: true } })).leidaEn).toBeNull();
  });

  it('sin sesión → 401', async () => {
    await http().get('/avisos').expect(401);
    await http().get('/avisos/sin-leer').expect(401);
    await http().post('/avisos/leer-todos').expect(401);
  });
});
