import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { CaminoDeLaPersona, EtapaCamino } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { levantarApp, tokenDe } from './discipulado-fixtures.js';
import { EscenarioVS } from './vida-de-servicio-fixtures.js';
import { EscenarioBautismo } from './bautismo-fixtures.js';

/**
 * Encabezados de las cards de Mi camino (rama final-demo-manual): en Vida de
 * Servicio y Bautismo el encabezado no contradice lo de abajo. Ministerio ya
 * lo cubre `postulaciones-persona` (Ajustes 2) y Vida Nueva `camino-me`.
 */
describe('GET /camino/me — el encabezado de Vida de Servicio y Bautismo refleja su estado propio', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  const sufijo = `enc${Date.now().toString(36)}`;
  let vs: EscenarioVS;
  let bau: EscenarioBautismo;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    vs = new EscenarioVS(prisma, sufijo);
    await vs.preparar();
    bau = new EscenarioBautismo(prisma, sufijo);
    await bau.preparar();
  });

  afterAll(async () => {
    await bau.limpiar();
    await vs.limpiar();
    await app.close();
  });

  async function etapa(personaId: string, cual: EtapaCamino) {
    const res = await request(app.getHttpServer())
      .get('/camino/me')
      .set('Authorization', `Bearer ${await tokenDe(personaId, ['miembro_registrado'])}`)
      .expect(200);
    return (res.body as CaminoDeLaPersona).etapas.find((e) => e.etapa === cual);
  }

  it('Vida de Servicio: con el pedido pendiente dice "En revisión"; inscripta en una edición, "en curso" y sin "Ya lo hice" (ni por la API)', async () => {
    const id = await vs.apta('vs-camino');
    expect(await etapa(id, 'vida_de_servicio')).toMatchObject({ estado: 'disponible', puedeDeclarar: true });

    const pedido = await prisma.solicitudVidaServicio.create({ data: { personaId: id }, select: { id: true, createdAt: true } });
    expect(await etapa(id, 'vida_de_servicio')).toMatchObject({ estado: 'solicitud_en_revision', desde: pedido.createdAt.toISOString() });

    await prisma.solicitudVidaServicio.update({ where: { id: pedido.id }, data: { estado: 'retirada' } });
    const edicion = await vs.edicion();
    await vs.inscribir(id, edicion);
    expect(await etapa(id, 'vida_de_servicio')).toEqual({ etapa: 'vida_de_servicio', estado: 'en_curso' });

    const declarar = await request(app.getHttpServer())
      .post('/camino/me/declaraciones')
      .set('Authorization', `Bearer ${await tokenDe(id, ['miembro_registrado'])}`)
      .send({ etapa: 'vida_de_servicio' });
    expect([declarar.status, declarar.body.code]).toEqual([409, 'ETAPA_EN_CURSO']);
  });

  it('Bautismo: en revisión, aceptado sin fecha y con fecha (la del Evento), sin "Ya lo hice" mientras está aceptado', async () => {
    const id = await bau.persona('bau-camino', { vidaNueva: 'completada' });
    expect(await etapa(id, 'bautismo')).toMatchObject({ estado: 'disponible', puedeDeclarar: true });

    const pedido = await bau.solicitud(id, 'pendiente');
    const enRevision = await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: pedido.id }, select: { createdAt: true } });
    expect(await etapa(id, 'bautismo')).toMatchObject({ estado: 'solicitud_en_revision', desde: enRevision.createdAt.toISOString() });

    await prisma.solicitudBautismo.update({ where: { id: pedido.id }, data: { estado: 'aprobada', revisadaEn: new Date() } });
    expect(await etapa(id, 'bautismo')).toEqual({ etapa: 'bautismo', estado: 'solicitud_aceptada', fecha: null, yaPaso: false });

    const evento = await bau.eventoBautismo();
    const inscripcion = await prisma.inscripcionEvento.create({ data: { eventoId: evento.id, personaId: id, estado: 'confirmada' }, select: { id: true } });
    await prisma.solicitudBautismo.update({ where: { id: pedido.id }, data: { inscripcionEventoId: inscripcion.id } });
    const { inicio } = await prisma.evento.findUniqueOrThrow({ where: { id: evento.id }, select: { inicio: true } });
    expect(await etapa(id, 'bautismo')).toEqual({ etapa: 'bautismo', estado: 'solicitud_aceptada', fecha: inicio.toISOString(), yaPaso: false });

    // El día del bautismo ya pasó y falta confirmar: "estamos confirmando", como la card.
    await prisma.evento.update({ where: { id: evento.id }, data: { inicio: new Date(Date.now() - 86_400_000) } });
    expect(await etapa(id, 'bautismo')).toMatchObject({ estado: 'solicitud_aceptada', yaPaso: true });
  });

  it('Bautismo: sin Vida Nueva no se habilita; habilitada por el Admin, la puede pedir', async () => {
    const id = await bau.persona('bau-habilitada', { vidaNueva: 'ninguna' });
    expect((await etapa(id, 'bautismo'))?.estado).toBe('bloqueada');
    const { adminId } = { adminId: (await prisma.persona.findFirstOrThrow({ where: { apellido: `Testbau${sufijo}`, rol: { has: 'admin' } } })).id };
    await prisma.persona.update({ where: { id }, data: { bautismoHabilitadoEn: new Date(), bautismoHabilitadoPorId: adminId } });
    expect(await etapa(id, 'bautismo')).toMatchObject({ estado: 'disponible', puedeDeclarar: true });
  });
});
