import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { AYER, EN_UN_MES, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T042 — FR-014, FR-045, FR-048. */
describe('Evento de bautismo (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let admin: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `baut${Date.now()}`);
    await esc.preparar();
    admin = await tokenDe(await esc.persona('admin', { rol: ['admin'] }), ['admin']);
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  const base = () => ({ sedeId: esc.sedeId, nombre: 'Bautismos de noviembre', descripcion: 'En el río.', inicio: EN_UN_MES().toISOString(), tipo: 'bautismo' });

  it('sin decir nada, se crea con la configuración del bautismo (FR-045)', async () => {
    const res = await http().post('/eventos').set('Authorization', `Bearer ${admin}`).send({ ...base(), cupo: 12 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      tipo: 'bautismo',
      requiereInscripcion: true,
      requiereAprobacion: false,
      costo: null,
      permiteListaEspera: false,
      diasAnticipacionRecordatorio: null,
      cupo: 12,
      estadoInscripcion: 'solo_admin',
    });
  });

  it.each([
    [{ costo: '100', instruccionesPago: 'Alias' }],
    [{ cupo: 5, permiteListaEspera: true }],
    [{ requiereAprobacion: true }],
    [{ requiereInscripcion: false }],
    [{ diasAnticipacionRecordatorio: 3 }],
  ])('con otra configuración %j → CONFIG_BAUTISMO_INVALIDA', async (extra) => {
    const res = await http().post('/eventos').set('Authorization', `Bearer ${admin}`).send({ ...base(), ...extra });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(expect.arrayContaining([{ campo: 'tipo', code: 'CONFIG_BAUTISMO_INVALIDA' }]));
  });

  it('GET /eventos/bautismo/proximos trae solo bautismos publicados que no empezaron (FR-048)', async () => {
    const futuro = await esc.evento({ tipo: 'bautismo', nombre: 'Bautismo futuro' });
    const pasado = await esc.evento({ tipo: 'bautismo', inicio: AYER() });
    const cancelado = await esc.evento({ tipo: 'bautismo', estado: 'cancelado' });
    const general = await esc.evento();
    const res = await http().get('/eventos/bautismo/proximos').set('Authorization', `Bearer ${admin}`);
    const ids = res.body.map((e: { id: string }) => e.id);
    expect(ids).toContain(futuro.id);
    expect(ids).not.toContain(pasado.id);
    expect(ids).not.toContain(cancelado.id);
    expect(ids).not.toContain(general.id);
  });

  it('cambiar el tipo de un Evento con Inscripciones → EVENTO_CON_INSCRIPCIONES (FR-014)', async () => {
    const ev = await esc.evento({ tipo: 'bautismo' });
    await esc.inscripcion(ev.id, await esc.persona('b1'));
    const res = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ tipo: 'general' });
    expect(res.body.code).toBe('EVENTO_CON_INSCRIPCIONES');
  });
});
