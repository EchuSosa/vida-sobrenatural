import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { AllExceptionsFilter } from '../../src/common/errors/all-exceptions.filter.js';

async function mintToken(rol: string[]): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT({ email: 'integ-pp@example.com', personaId: 'x', estado: 'activa', rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

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

describe('POST/PATCH /palabra-profetica (integración) — Historia 3', () => {
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
    await prisma.palabraProfetica.deleteMany({ where: { id: { in: idsCreados } } });
    await app.close();
  });

  it('Admin crea una Palabra Profética sin video (D121) y la marca vigente — la anterior se desmarca sola', async () => {
    const token = await mintToken(['admin']);

    const anterior = await prisma.palabraProfetica.create({
      data: { anio: 2025, titulo: `Integ anterior ${Date.now()}`, texto: 'texto', vigente: true },
    });
    idsCreados.push(anterior.id);

    const crear = await request(app.getHttpServer())
      .post('/palabra-profetica')
      .set('Authorization', `Bearer ${token}`)
      .send({ anio: 2026, titulo: `Integ nueva ${Date.now()}`, texto: 'texto nuevo' });
    expect(crear.status).toBe(201);
    expect(crear.body.youtubeUrl).toBeNull();
    idsCreados.push(crear.body.id);

    const marcar = await request(app.getHttpServer())
      .patch(`/palabra-profetica/${crear.body.id}/marcar-vigente`)
      .set('Authorization', `Bearer ${token}`);
    expect(marcar.status).toBe(200);
    expect(marcar.body.vigente).toBe(true);

    const anteriorEnBase = await prisma.palabraProfetica.findUnique({ where: { id: anterior.id } });
    expect(anteriorEnBase?.vigente).toBe(false);

    // Marcarla vigente de nuevo no rompe nada (Edge Case del spec) — idempotente.
    const marcarDeNuevo = await request(app.getHttpServer())
      .patch(`/palabra-profetica/${crear.body.id}/marcar-vigente`)
      .set('Authorization', `Bearer ${token}`);
    expect(marcarDeNuevo.status).toBe(200);
  });

  it('rechaza una URL de YouTube inválida sin guardar nada', async () => {
    const token = await mintToken(['admin']);
    const response = await request(app.getHttpServer())
      .post('/palabra-profetica')
      .set('Authorization', `Bearer ${token}`)
      .send({ anio: 2026, titulo: 'Integ inválida', texto: 'texto', youtubeUrl: 'https://vimeo.com/123' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('YOUTUBE_URL_INVALIDA');

    const enBase = await prisma.palabraProfetica.findFirst({ where: { titulo: 'Integ inválida' } });
    expect(enBase).toBeNull();
  });

  it('acepta una URL de YouTube válida y guarda el id derivado', async () => {
    const token = await mintToken(['admin']);
    const response = await request(app.getHttpServer())
      .post('/palabra-profetica')
      .set('Authorization', `Bearer ${token}`)
      .send({
        anio: 2026,
        titulo: `Integ con video ${Date.now()}`,
        texto: 'texto',
        youtubeUrl: 'https://www.youtube.com/watch?v=oVLmI6_IoC8',
      });
    expect(response.status).toBe(201);
    expect(response.body.youtubeVideoId).toBe('oVLmI6_IoC8');
    idsCreados.push(response.body.id);
  });

  it('Pastor recibe 403 al intentar crear', async () => {
    const token = await mintToken(['pastor']);
    const response = await request(app.getHttpServer())
      .post('/palabra-profetica')
      .set('Authorization', `Bearer ${token}`)
      .send({ anio: 2026, titulo: 'No debería crearse', texto: 'texto' });
    expect(response.status).toBe(403);
  });

  it('otro rol recibe 403 al intentar crear', async () => {
    const token = await mintToken(['discipulador']);
    const response = await request(app.getHttpServer())
      .post('/palabra-profetica')
      .set('Authorization', `Bearer ${token}`)
      .send({ anio: 2026, titulo: 'No debería crearse', texto: 'texto' });
    expect(response.status).toBe(403);
  });
});
