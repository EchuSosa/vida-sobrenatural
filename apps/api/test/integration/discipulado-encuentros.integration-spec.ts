import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * specs/004, T045 (FR-009, FR-011, FR-013a, FR-029, FR-041, FR-044, D134):
 * los Encuentros contra la base real, y lo que ve cada uno.
 */
describe('Encuentros y vistas del discipulado (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let admin: string;
  let disc: string;
  let tokenDisc: string;
  let tokenAdmin: string;
  let tokenPastor: string;
  let grupoId: string;
  let inscripciones: string[];
  const NOTA = 'Nota privadísima del discipulado 8f3a';

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `enc-${Date.now()}`);
    await esc.preparar();
    admin = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    const pastor = await esc.persona('pastor', { rol: ['miembro_registrado', 'pastor'] });
    disc = await esc.discipulador('disc', { max: 2 });
    const ana = await esc.persona('ana');
    const beto = await esc.persona('beto');
    ({ grupoId, inscripciones } = await esc.grupo(disc, [ana, beto], admin));
    tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
    tokenAdmin = await tokenDe(admin, ['miembro_registrado', 'admin']);
    tokenPastor = await tokenDe(pastor, ['miembro_registrado', 'pastor']);
  });

  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('crear un Encuentro en un Grupo de dos crea exactamente dos Asistencias, una en false si vino así', async () => {
    const res = await http()
      .post(`/discipulado/mis-discipulados/${grupoId}/encuentros`)
      .set('Authorization', `Bearer ${tokenDisc}`)
      .send({ fecha: '2026-09-01', capitulos: '1 y 2', notas: NOTA, asistencias: [{ inscripcionId: inscripciones[1], presente: false }] });
    expect(res.status).toBe(201);
    const asistencias = await prisma.asistencia.findMany({ where: { encuentroId: res.body.id }, select: { inscripcionId: true, presente: true } });
    expect(asistencias).toHaveLength(2);
    expect(asistencias.find((a) => a.inscripcionId === inscripciones[0])?.presente).toBe(true);
    expect(asistencias.find((a) => a.inscripcionId === inscripciones[1])?.presente).toBe(false);
    expect(res.body.notas).toBe(NOTA);
  });

  it('editar un Encuentro cambia lo que se manda y su updatedAt (FR-041)', async () => {
    const creado = await http()
      .post(`/discipulado/mis-discipulados/${grupoId}/encuentros`)
      .set('Authorization', `Bearer ${tokenDisc}`)
      .send({ fecha: '2026-09-08', capitulos: '3' });
    const res = await http()
      .patch(`/discipulado/mis-discipulados/${grupoId}/encuentros/${creado.body.id}`)
      .set('Authorization', `Bearer ${tokenDisc}`)
      .send({ capitulos: '3 y 4' });
    expect(res.status).toBe(200);
    expect(res.body.capitulos).toBe('3 y 4');
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(creado.body.updatedAt).getTime());
  });

  it('una fecha futura → 400 con FECHA_FUTURA en el campo', async () => {
    const res = await http()
      .post(`/discipulado/mis-discipulados/${grupoId}/encuentros`)
      .set('Authorization', `Bearer ${tokenDisc}`)
      .send({ fecha: '2999-01-01', capitulos: '1' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ campo: 'fecha', code: 'FECHA_FUTURA' }]);
  });

  it('las dos rutas de /grupos/discipulados NO contienen el texto de una nota (D134)', async () => {
    for (const token of [tokenAdmin, tokenPastor]) {
      const lista = await http().get('/grupos/discipulados').set('Authorization', `Bearer ${token}`);
      const detalle = await http().get(`/grupos/discipulados/${grupoId}`).set('Authorization', `Bearer ${token}`);
      expect(lista.status).toBe(200);
      expect(detalle.status).toBe(200);
      expect(JSON.stringify(lista.body)).not.toContain(NOTA);
      expect(JSON.stringify(detalle.body)).not.toContain(NOTA);
      expect(detalle.body.encuentros.length).toBeGreaterThan(0);
      expect(detalle.body.franjasDelGrupo).toEqual([{ diaSemana: 2, inicio: 1140, fin: 1260 }]);
    }
  });

  it('otro Discipulador recibe 404 en el detalle, en POST y en PATCH', async () => {
    const otro = await esc.discipulador('otro');
    const token = await tokenDe(otro, ['miembro_registrado', 'discipulador']);
    const encuentro = await prisma.encuentro.findFirst({ where: { grupoId }, select: { id: true } });
    const detalle = await http().get(`/discipulado/mis-discipulados/${grupoId}`).set('Authorization', `Bearer ${token}`);
    const crear = await http().post(`/discipulado/mis-discipulados/${grupoId}/encuentros`).set('Authorization', `Bearer ${token}`).send({ fecha: '2026-09-01', capitulos: '1' });
    const editar = await http().patch(`/discipulado/mis-discipulados/${grupoId}/encuentros/${encuentro!.id}`).set('Authorization', `Bearer ${token}`).send({ capitulos: '9' });
    expect([detalle.status, crear.status, editar.status]).toEqual([404, 404, 404]);
  });

  it('el detalle de un menor con Relación Familiar `tutor` trae el teléfono del tutor (FR-044)', async () => {
    const hace10 = new Date();
    hace10.setUTCFullYear(hace10.getUTCFullYear() - 10);
    const menor = await esc.persona('nico', { fechaNacimiento: hace10 });
    const tutor = await esc.persona('tutora', { telefono: '+5492215550000' });
    await prisma.relacionFamiliar.create({ data: { personaId: menor, familiarId: tutor, tipoRelacion: 'tutor' } });
    const discMenor = await esc.discipulador('discmenor');
    const g = await esc.grupo(discMenor, [menor], admin);
    const token = await tokenDe(discMenor, ['miembro_registrado', 'discipulador']);

    const res = await http().get(`/discipulado/mis-discipulados/${g.grupoId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.personas[0].contacto.tutor).toEqual({ nombre: expect.stringContaining('tutora'), telefono: '+5492215550000' });
  });

  it('editar un Encuentro de un Grupo finalizado → 409 DISCIPULADO_NO_EN_CURSO', async () => {
    const discF = await esc.discipulador('discf');
    const p = await esc.persona('olga');
    const g = await esc.grupo(discF, [p], admin);
    const token = await tokenDe(discF, ['miembro_registrado', 'discipulador']);
    const creado = await http().post(`/discipulado/mis-discipulados/${g.grupoId}/encuentros`).set('Authorization', `Bearer ${token}`).send({ fecha: '2026-09-01', capitulos: '1' });
    await prisma.grupo.update({ where: { id: g.grupoId }, data: { estado: 'finalizado', motivoCierre: 'completado' } });
    const res = await http().patch(`/discipulado/mis-discipulados/${g.grupoId}/encuentros/${creado.body.id}`).set('Authorization', `Bearer ${token}`).send({ capitulos: '2' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DISCIPULADO_NO_EN_CURSO');
  });

  it('el Pastor ve pero no gestiona (403 al confirmar)', async () => {
    const res = await http().post(`/grupos/discipulados/${grupoId}/finalizacion/confirmar`).set('Authorization', `Bearer ${tokenPastor}`);
    expect(res.status).toBe(403);
  });
});
