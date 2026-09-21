import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { AllExceptionsFilter } from '../../src/common/errors/all-exceptions.filter.js';

// FR-007/FR-008 (specs/003-contenido-institucional) — sólo las variantes de
// lectura en este tramo; las de escritura y portada (US4) van en la misma
// suite cuando se implementen esos endpoints.
describe('GET /libros (integración)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const idsCreados: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.libro.deleteMany({ where: { id: { in: idsCreados } } });
    await app.close();
  });

  it('estado=activas (default) excluye inactivos y eliminados', async () => {
    const activo = await prisma.libro.create({
      data: { titulo: `Integ activo ${Date.now()}`, autor: 'Autor', anio: 2020, activo: true },
    });
    const inactivo = await prisma.libro.create({
      data: { titulo: `Integ inactivo ${Date.now()}`, autor: 'Autor', anio: 2020, activo: false },
    });
    const eliminado = await prisma.libro.create({
      data: {
        titulo: `Integ eliminado ${Date.now()}`,
        autor: 'Autor',
        anio: 2020,
        activo: true,
        eliminadoEn: new Date(),
        eliminadoPor: 'admin-integ',
      },
    });
    idsCreados.push(activo.id, inactivo.id, eliminado.id);

    const response = await request(app.getHttpServer()).get('/libros?take=200');
    expect(response.status).toBe(200);
    const ids = response.body.items.map((l: { id: string }) => l.id);
    expect(ids).toContain(activo.id);
    expect(ids).not.toContain(inactivo.id);
    expect(ids).not.toContain(eliminado.id);
  });

  it('estado=todas incluye inactivos pero no eliminados (D117/D119)', async () => {
    const inactivo = await prisma.libro.create({
      data: { titulo: `Integ todas ${Date.now()}`, autor: 'Autor', anio: 2020, activo: false },
    });
    idsCreados.push(inactivo.id);

    const response = await request(app.getHttpServer()).get('/libros?estado=todas&take=200');
    expect(response.status).toBe(200);
    expect(response.body.items.map((l: { id: string }) => l.id)).toContain(inactivo.id);
  });

  it('estado=papelera devuelve solo los eliminados', async () => {
    const eliminado = await prisma.libro.create({
      data: {
        titulo: `Integ papelera ${Date.now()}`,
        autor: 'Autor',
        anio: 2020,
        eliminadoEn: new Date(),
        eliminadoPor: 'admin-integ',
      },
    });
    idsCreados.push(eliminado.id);

    const response = await request(app.getHttpServer()).get('/libros?estado=papelera&take=200');
    expect(response.status).toBe(200);
    expect(response.body.items.map((l: { id: string }) => l.id)).toContain(eliminado.id);
  });

  it('GET /libros/:id devuelve 404 para uno eliminado (D119)', async () => {
    const eliminado = await prisma.libro.create({
      data: {
        titulo: `Integ detalle eliminado ${Date.now()}`,
        autor: 'Autor',
        anio: 2020,
        eliminadoEn: new Date(),
        eliminadoPor: 'admin-integ',
      },
    });
    idsCreados.push(eliminado.id);

    const response = await request(app.getHttpServer()).get(`/libros/${eliminado.id}`);
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NO_ENCONTRADO');
  });
});
