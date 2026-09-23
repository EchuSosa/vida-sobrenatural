import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { configurarApp } from '../../src/configurar-app.js';

async function mintToken(claims: {
  email: string;
  personaId: string | null;
  estado: string | null;
  rol: string[];
}): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

describe('GET/PATCH /personas/me (integración, Historia 5)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sedeId: string;
  let personaId: string;
  const email = `integ-me-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    const sede = await prisma.sede.create({
      data: {
        nombre: `Sede de test me ${Date.now()}`,
        direccion: 'Dirección de test',
        horarios: 'Horario de test',
        activo: true,
      },
    });
    sedeId = sede.id;

    const persona = await prisma.persona.create({
      data: {
        email,
        nombre: 'Ana',
        apellido: 'García',
        genero: 'femenino',
        fechaNacimiento: new Date('1990-05-20'),
        telefono: '+5492211234567',
        direccion: 'Calle 1 y 50',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        profesionDetalle: 'Apicultora',
        tiempoCongregacion: 'menos_6_meses',
        estado: 'activa',
        consentimientoDatos: true,
        rol: ['miembro_registrado'],
      },
    });
    personaId = persona.id;
  });

  afterAll(async () => {
    await prisma.persona.delete({ where: { id: personaId } });
    await prisma.sede.delete({ where: { id: sedeId } });
    await app.close();
  });

  it('GET /personas/me devuelve el perfil propio, con temaPreferido por default "claro" (H-22, D106)', async () => {
    const token = await mintToken({ email, personaId, estado: 'activa', rol: ['miembro_registrado'] });

    const response = await request(app.getHttpServer())
      .get('/personas/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: personaId,
      email,
      temaPreferido: 'claro',
      idiomaPreferido: 'es',
    });
  });

  it('GET /personas/me responde 404 si el token no tiene personaId (login sin registro completado)', async () => {
    const token = await mintToken({ email: 'sin-registrar@example.com', personaId: null, estado: null, rol: [] });

    const response = await request(app.getHttpServer())
      .get('/personas/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NO_ENCONTRADO');
  });

  it('PATCH /personas/me/preferencias actualiza temaPreferido de la propia Persona', async () => {
    const token = await mintToken({ email, personaId, estado: 'activa', rol: ['miembro_registrado'] });

    const response = await request(app.getHttpServer())
      .patch('/personas/me/preferencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ temaPreferido: 'oscuro' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: personaId, temaPreferido: 'oscuro' });

    const enBaseDeDatos = await prisma.persona.findUnique({ where: { id: personaId } });
    expect(enBaseDeDatos?.temaPreferido).toBe('oscuro');
  });

  it('PATCH /personas/me/preferencias responde 400 (VALIDACION) con un valor fuera del enum', async () => {
    const token = await mintToken({ email, personaId, estado: 'activa', rol: ['miembro_registrado'] });

    const response = await request(app.getHttpServer())
      .patch('/personas/me/preferencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ temaPreferido: 'fucsia' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDACION');
  });
});
