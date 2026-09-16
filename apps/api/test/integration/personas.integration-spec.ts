import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

async function mintToken(email: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT({ email, personaId: null, estado: null, rol: [] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

describe('POST /personas (integración, contra base de datos de test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sedeId: string;
  const emailsCreados: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    const sede = await prisma.sede.create({
      data: {
        nombre: `Sede de test ${Date.now()}`,
        direccion: 'Dirección de test',
        horarios: 'Horario de test',
        activo: true,
      },
    });
    sedeId = sede.id;
  });

  afterAll(async () => {
    await prisma.persona.deleteMany({ where: { email: { in: emailsCreados } } });
    await prisma.sede.delete({ where: { id: sedeId } });
    await app.close();
  });

  function bodyAdultoValido() {
    return {
      apellido: 'García',
      nombre: 'Ana',
      genero: 'femenino',
      fechaNacimiento: '1990-05-20',
      telefono: '+5492211234567',
      direccion: 'Calle 1 y 50',
      sedeId,
      estadoCivil: 'soltero_a',
      profesion: 'Diseñadora',
      tiempoCongregacion: 'menos_6_meses',
      consentimientoDatos: true,
    };
  }

  it('crea una Persona activa para un adulto y devuelve 201', async () => {
    const email = `integ-adulto-${Date.now()}@example.com`;
    emailsCreados.push(email);
    const token = await mintToken(email);

    const response = await request(app.getHttpServer())
      .post('/personas')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyAdultoValido());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ estado: 'activa' });

    const enBaseDeDatos = await prisma.persona.findUnique({ where: { email } });
    expect(enBaseDeDatos?.estado).toBe('activa');
    expect(enBaseDeDatos?.rol).toEqual(['miembro_registrado']);
  });

  it('responde 409 ante un segundo registro con el mismo email (constraint único real)', async () => {
    const email = `integ-duplicado-${Date.now()}@example.com`;
    emailsCreados.push(email);
    const token = await mintToken(email);

    const primero = await request(app.getHttpServer())
      .post('/personas')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyAdultoValido());
    expect(primero.status).toBe(201);

    const segundo = await request(app.getHttpServer())
      .post('/personas')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyAdultoValido());
    expect(segundo.status).toBe(409);
  });

  it('crea una Persona pendiente_tutor para un menor de 18 (FR-007)', async () => {
    const email = `integ-menor-${Date.now()}@example.com`;
    emailsCreados.push(email);
    const token = await mintToken(email);

    const response = await request(app.getHttpServer())
      .post('/personas')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyAdultoValido(), fechaNacimiento: '2015-01-01' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ estado: 'pendiente_tutor' });
  });
});
