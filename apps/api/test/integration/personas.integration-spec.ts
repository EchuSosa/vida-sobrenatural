import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { AllExceptionsFilter } from '../../src/common/errors/all-exceptions.filter.js';

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
    // H-104: faltaba acá (a diferencia de sedes/libros/palabra-profetica) —
    // sin el filtro, `response.body` no trae `code`/`errors`, así que un
    // test que los verificara habría fallado por un motivo ajeno a lo que
    // prueba. Mismo registro que las otras suites de integración.
    app.useGlobalFilters(new AllExceptionsFilter());
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
      profesion: 'arte_diseno',
      tiempoCongregacion: 'menos_6_meses',
      consentimientoDatos: true,
      fotoUrl: 'https://lh3.googleusercontent.com/a/foto-de-test',
    };
  }

  it('crea una Persona activa para un adulto y devuelve 201, guardando fotoUrl', async () => {
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
    expect(enBaseDeDatos?.fotoUrl).toBe('https://lh3.googleusercontent.com/a/foto-de-test');
  });

  // H-104: sin `errors: [{campo, code}]` el cliente no tiene forma de
  // marcar la casilla de consentimiento ni de sumarla al resumen — cae al
  // banner genérico de arriba, invisible sin scrollear (H-104 lo encontró
  // así).
  it('responde 400 con errors:[{campo:"consentimientoDatos"}] si un adulto no tilda el consentimiento (FR-013/H-104)', async () => {
    const email = `integ-sin-consentimiento-${Date.now()}@example.com`;
    emailsCreados.push(email);
    const token = await mintToken(email);

    const response = await request(app.getHttpServer())
      .post('/personas')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyAdultoValido(), consentimientoDatos: false });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('CONSENTIMIENTO_REQUERIDO');
    expect(response.body.errors).toEqual([{ campo: 'consentimientoDatos', code: 'CONSENTIMIENTO_REQUERIDO' }]);
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

  it('responde 400 si profesion=otro sin profesionDetalle', async () => {
    const email = `integ-otro-sin-detalle-${Date.now()}@example.com`;
    const token = await mintToken(email);

    const response = await request(app.getHttpServer())
      .post('/personas')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyAdultoValido(), profesion: 'otro' });

    expect(response.status).toBe(400);
  });

  it('crea la Persona guardando profesionDetalle cuando profesion=otro', async () => {
    const email = `integ-otro-con-detalle-${Date.now()}@example.com`;
    emailsCreados.push(email);
    const token = await mintToken(email);

    const response = await request(app.getHttpServer())
      .post('/personas')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...bodyAdultoValido(), profesion: 'otro', profesionDetalle: 'Apicultora' });

    expect(response.status).toBe(201);

    const enBaseDeDatos = await prisma.persona.findUnique({ where: { email } });
    expect(enBaseDeDatos?.profesion).toBe('otro');
    expect(enBaseDeDatos?.profesionDetalle).toBe('Apicultora');
  });
});
