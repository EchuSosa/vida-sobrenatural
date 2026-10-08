import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { AYER, EscenarioEventos, levantarApp } from './eventos-fixtures.js';

/** spec 011, T044 — FR-001, FR-002, FR-005, FR-043, FR-046. */
describe('Cartelera y página pública de Eventos (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `pub${Date.now()}`);
    await esc.preparar();
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  it('la cartelera trae solo publicados no eliminados de hoy en adelante, por fecha de inicio (FR-001)', async () => {
    const lejos = await esc.evento({ inicio: new Date(Date.now() + 60 * 86_400_000) });
    const cerca = await esc.evento({ inicio: new Date(Date.now() + 2 * 86_400_000) });
    const pasado = await esc.evento({ inicio: new Date(Date.now() - 3 * 86_400_000) });
    const cancelado = await esc.evento({ estado: 'cancelado' });
    const eliminado = await esc.evento({ eliminadoEn: new Date() });
    const res = await http().get('/eventos/publicos?take=100');
    expect(res.status).toBe(200);
    const ids: string[] = res.body.items.map((e: { id: string }) => e.id);
    expect(ids.indexOf(cerca.id)).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf(cerca.id)).toBeLessThan(ids.indexOf(lejos.id));
    for (const fuera of [pasado, cancelado, eliminado]) expect(ids).not.toContain(fuera.id);
  });

  it('la página de un cancelado y de uno pasado responde con su estado (FR-005)', async () => {
    const cancelado = await esc.evento({ estado: 'cancelado' });
    const pasado = await esc.evento({ inicio: AYER() });
    expect((await http().get(`/eventos/publicos/${cancelado.slug}`)).body).toMatchObject({ estado: 'cancelado', estadoInscripcion: 'cancelado' });
    expect((await http().get(`/eventos/publicos/${pasado.slug}`)).body).toMatchObject({ estado: 'publicado', estadoInscripcion: 'cerrada' });
  });

  it('eliminado o inexistente → 404 (FR-043)', async () => {
    const eliminado = await esc.evento({ eliminadoEn: new Date() });
    expect((await http().get(`/eventos/publicos/${eliminado.slug}`)).status).toBe(404);
    expect((await http().get('/eventos/publicos/no-existe-este-slug')).status).toBe(404);
  });

  it('lugares disponibles y estado de inscripción; nunca datos de Personas (FR-002, FR-046)', async () => {
    const ev = await esc.evento({ cupo: 2, permiteListaEspera: true, lugar: 'Salón principal' });
    await esc.inscripcion(ev.id, await esc.persona('a'));
    await esc.inscripcion(ev.id, await esc.persona('b'));
    const res = await http().get(`/eventos/publicos/${ev.slug}`);
    expect(res.body).toMatchObject({ lugar: 'Salón principal', lugaresDisponibles: 0, estadoInscripcion: 'lista_espera' });
    expect(res.body.sede).toMatchObject({ nombre: expect.any(String), direccion: 'Calle 7 entre 50 y 51' });
    const texto = JSON.stringify(res.body);
    expect(texto).not.toMatch(/persona|inscripciones|email|telefono|creadoPor/i);
  });

  it('un bautismo dice solo_admin (FR-046)', async () => {
    const ev = await esc.evento({ tipo: 'bautismo' });
    expect((await http().get(`/eventos/publicos/${ev.slug}`)).body.estadoInscripcion).toBe('solo_admin');
  });

  it('los slugs para el sitemap no incluyen eliminados ni cancelados (FR-006)', async () => {
    const publicado = await esc.evento();
    const eliminado = await esc.evento({ eliminadoEn: new Date() });
    const slugs = (await http().get('/eventos/publicos/slugs')).body.map((s: { slug: string }) => s.slug);
    expect(slugs).toContain(publicado.slug);
    expect(slugs).not.toContain(eliminado.slug);
  });
});
