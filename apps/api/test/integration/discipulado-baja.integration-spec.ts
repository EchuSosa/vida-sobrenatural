import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { discipuladosActivosDe } from '../../src/discipulado/discipulados-activos.js';
import { cursaOCompletoVidaNueva } from '../../src/discipulado/consultas.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/** specs/004, T054b (FR-042, research #15) y los pendientes del Admin (T054f, FR-048), contra la base real. */
describe('Baja de una Persona (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let admin: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `baja-${Date.now()}`);
    await esc.preparar();
    admin = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    tokenAdmin = await tokenDe(admin, ['miembro_registrado', 'admin']);
  });

  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('baja de una de dos deja el Grupo en curso; baja de la última lo cierra por abandonado', async () => {
    const disc = await esc.discipulador('disc', { max: 2 });
    const ana = await esc.persona('ana');
    const beto = await esc.persona('beto');
    const { grupoId, inscripciones } = await esc.grupo(disc, [ana, beto], admin);
    const tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
    const proponer = (i: string) =>
      http().post(`/discipulado/mis-discipulados/${grupoId}/inscripciones/${i}/baja/proponer`).set('Authorization', `Bearer ${tokenDisc}`).send({ motivo: 'Dejó de venir' });
    const confirmar = (i: string) => http().post(`/grupos/discipulados/${grupoId}/inscripciones/${i}/baja/confirmar`).set('Authorization', `Bearer ${tokenAdmin}`);

    expect((await proponer(inscripciones[0])).status).toBe(200);
    expect((await proponer(inscripciones[0])).body.code).toBe('BAJA_YA_PROPUESTA');

    const pendientes = await http().get('/discipulado/pendientes-admin').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(pendientes.status).toBe(200);
    expect(pendientes.body.bajasPropuestas.cantidad).toBeGreaterThanOrEqual(1);
    const filtrado = await http().get('/grupos/discipulados?pendiente=baja').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(filtrado.body.items.map((i: { grupoId: string }) => i.grupoId)).toContain(grupoId);

    expect((await confirmar(inscripciones[0])).body).toEqual({ grupoCerrado: false });
    expect((await prisma.grupo.findUnique({ where: { id: grupoId }, select: { estado: true } }))?.estado).toBe('en_curso');
    expect((await prisma.inscripcion.findUnique({ where: { id: inscripciones[0] }, select: { estado: true } }))?.estado).toBe('abandono');
    // La Persona dada de baja puede volver a pedir (FR-042).
    expect(await cursaOCompletoVidaNueva(prisma, ana)).toBe(false);

    await proponer(inscripciones[1]);
    expect((await confirmar(inscripciones[1])).body).toEqual({ grupoCerrado: true });
    expect(await prisma.grupo.findUnique({ where: { id: grupoId }, select: { estado: true, motivoCierre: true } })).toEqual({
      estado: 'finalizado',
      motivoCierre: 'abandonado',
    });
    expect(await discipuladosActivosDe(prisma, disc)).toEqual([]);
  });

  it('rechazar la baja la limpia y el Discipulador ve el motivo', async () => {
    const disc = await esc.discipulador('disc2');
    const { grupoId, inscripciones } = await esc.grupo(disc, [await esc.persona('caro')], admin);
    const tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
    await http().post(`/discipulado/mis-discipulados/${grupoId}/inscripciones/${inscripciones[0]}/baja/proponer`).set('Authorization', `Bearer ${tokenDisc}`).send({});
    const rechazo = await http()
      .post(`/grupos/discipulados/${grupoId}/inscripciones/${inscripciones[0]}/baja/rechazar`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ motivo: 'Hablé con ella: sigue' });
    expect(rechazo.status).toBe(200);
    const detalle = await http().get(`/discipulado/mis-discipulados/${grupoId}`).set('Authorization', `Bearer ${tokenDisc}`);
    expect(detalle.body.personas[0].bajaPropuesta).toBeNull();
    expect(detalle.body.personas[0].bajaRechazada.motivo).toBe('Hablé con ella: sigue');
    const sinPropuesta = await http().post(`/grupos/discipulados/${grupoId}/inscripciones/${inscripciones[0]}/baja/confirmar`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(sinPropuesta.body.code).toBe('BAJA_NO_PROPUESTA');
  });

  it('una Inscripción de otro Grupo → 404', async () => {
    const disc = await esc.discipulador('disc3');
    const g1 = await esc.grupo(disc, [await esc.persona('dani')], admin);
    const g2 = await esc.grupo(await esc.discipulador('disc4'), [await esc.persona('eli')], admin);
    const tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
    const res = await http().post(`/discipulado/mis-discipulados/${g1.grupoId}/inscripciones/${g2.inscripciones[0]}/baja/proponer`).set('Authorization', `Bearer ${tokenDisc}`).send({});
    expect(res.status).toBe(404);
  });

  it('pendientes-admin: el Pastor no puede (403); el Admin sí', async () => {
    const pastor = await esc.persona('pastor', { rol: ['miembro_registrado', 'pastor'] });
    const res = await http().get('/discipulado/pendientes-admin').set('Authorization', `Bearer ${await tokenDe(pastor, ['miembro_registrado', 'pastor'])}`);
    expect(res.status).toBe(403);
  });

  // TODO(merge): con el lote A, "la Persona dada de baja puede volver a pedir"
  // se prueba por HTTP (`POST /discipulado/solicitudes/me` → 201). Hoy se
  // prueba la regla que ese endpoint usa (`cursaOCompletoVidaNueva`), arriba.
  it.todo('la Persona dada de baja vuelve a pedir por POST /discipulado/solicitudes/me → 201 (lote A)');
});
