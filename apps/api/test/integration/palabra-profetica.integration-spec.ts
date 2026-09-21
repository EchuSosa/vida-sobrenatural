import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

// FR-004/FR-006/FR-013 (specs/003-contenido-institucional) — sólo las
// variantes de lectura en este tramo; las de escritura (US3) van en la
// misma suite cuando se implementen esos endpoints.
describe('GET /palabra-profetica (integración)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const idsCreados: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    // Ninguna Palabra Profética debe quedar vigente de una corrida anterior.
    await prisma.palabraProfetica.updateMany({ where: { vigente: true }, data: { vigente: false } });
  });

  afterAll(async () => {
    await prisma.palabraProfetica.deleteMany({ where: { id: { in: idsCreados } } });
    await app.close();
  });

  it('devuelve 204 cuando todavía no hay ninguna vigente', async () => {
    const response = await request(app.getHttpServer()).get('/palabra-profetica?vigente=true');
    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });

  it('devuelve la única vigente, incluso sin video (D121)', async () => {
    const creada = await prisma.palabraProfetica.create({
      data: { anio: 2026, titulo: `Integ ${Date.now()}`, texto: 'texto de prueba', vigente: true },
    });
    idsCreados.push(creada.id);

    const response = await request(app.getHttpServer()).get('/palabra-profetica?vigente=true');
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(creada.id);
    expect(response.body.youtubeUrl).toBeNull();
    expect(response.body.youtubeVideoId).toBeNull();
  });

  it('el historial paginado (sin filtro) incluye las no vigentes', async () => {
    const creada = await prisma.palabraProfetica.create({
      data: { anio: 2020, titulo: `Integ historial ${Date.now()}`, texto: 'texto viejo', vigente: false },
    });
    idsCreados.push(creada.id);

    const response = await request(app.getHttpServer()).get('/palabra-profetica?take=100');
    expect(response.status).toBe(200);
    expect(response.body.items.map((p: { id: string }) => p.id)).toContain(creada.id);
    expect(typeof response.body.total).toBe('number');
  });
});
