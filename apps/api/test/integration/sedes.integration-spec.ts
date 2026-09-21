import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

async function mintAdminToken(): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT({ email: 'admin-integ@example.com', personaId: 'x', estado: 'activa', rol: ['admin'] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

describe('PATCH /sedes/:id (integración) — soft delete real (Principio III)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sedeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    if (sedeId) {
      await prisma.sede.delete({ where: { id: sedeId } }).catch(() => undefined);
    }
    await app.close();
  });

  it('desactiva una Sede vía activo:false sin borrarla físicamente', async () => {
    const sede = await prisma.sede.create({
      data: {
        nombre: `Sede integ soft-delete ${Date.now()}`,
        direccion: 'Dirección',
        horarios: 'Horario',
        contactoTelefono: '+5492210000000',
        activo: true,
      },
    });
    sedeId = sede.id;

    const token = await mintAdminToken();
    const response = await request(app.getHttpServer())
      .patch(`/sedes/${sedeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: false });

    expect(response.status).toBe(200);

    // El registro sigue existiendo en la base — no hubo un DELETE físico.
    const enBaseDeDatos = await prisma.sede.findUnique({ where: { id: sedeId } });
    expect(enBaseDeDatos).not.toBeNull();
    expect(enBaseDeDatos?.activo).toBe(false);

    // Ya no aparece en el listado público de Historia 1 (default activas)...
    const listadoPublico = await request(app.getHttpServer()).get('/sedes');
    expect(listadoPublico.body.map((s: { id: string }) => s.id)).not.toContain(sedeId);

    // ...pero H-51 (D117, revisión manual ronda 4): el detalle sigue
    // abriéndose igual — antes de H-51 esto daba 404 y no había forma de
    // reactivarla desde el backoffice (apps/backoffice/sedes/[id]).
    const getDetalle = await request(app.getHttpServer()).get(`/sedes/${sedeId}`);
    expect(getDetalle.status).toBe(200);
    expect(getDetalle.body.activo).toBe(false);

    // Y sigue apareciendo con estado=todas — lo que usa el listado del backoffice.
    const listadoTodas = await request(app.getHttpServer()).get('/sedes?estado=todas');
    expect(listadoTodas.body.map((s: { id: string }) => s.id)).toContain(sedeId);
  });

  it('responde 403 si quien intenta desactivar no tiene rol Admin', async () => {
    const sede = await prisma.sede.create({
      data: { nombre: `Sede integ 403 ${Date.now()}`, direccion: 'D', horarios: 'H', contactoTelefono: '+54', activo: true },
    });

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const tokenSinRol = await new SignJWT({ email: 'x@example.com', personaId: 'x', estado: 'activa', rol: ['miembro_registrado'] })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    const response = await request(app.getHttpServer())
      .patch(`/sedes/${sede.id}`)
      .set('Authorization', `Bearer ${tokenSinRol}`)
      .send({ activo: false });

    expect(response.status).toBe(403);
    await prisma.sede.delete({ where: { id: sede.id } });
  });
});
