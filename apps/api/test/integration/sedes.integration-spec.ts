import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { configurarApp } from '../../src/configurar-app.js';

async function mintToken(rol: string[]): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT({ email: `${rol.join('-')}-integ@example.com`, personaId: 'x', estado: 'activa', rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

const mintAdminToken = () => mintToken(['admin']);

describe('PATCH /sedes/:id (integración) — soft delete real (Principio III)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let sedeId: string;
  let sedeTestigoId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    if (sedeId) {
      await prisma.sede.delete({ where: { id: sedeId } }).catch(() => undefined);
    }
    if (sedeTestigoId) {
      await prisma.sede.delete({ where: { id: sedeTestigoId } }).catch(() => undefined);
    }
    await app.close();
  });

  it('desactiva una Sede vía activo:false sin borrarla físicamente', async () => {
    // H-30/D38: desactivar la única Sede activa está bloqueado a propósito
    // (SEDE_UNICA_ACTIVA) — este test no verifica esa regla, así que
    // necesita otra Sede activa propia para no depender de que el resto de
    // la suite (u otro archivo, en una corrida en paralelo) deje alguna.
    const testigo = await prisma.sede.create({
      data: {
        nombre: `Sede integ testigo soft-delete ${Date.now()}`,
        direccion: 'Dirección',
        horarios: 'Horario',
        contactoTelefono: '+5492210000000',
        activo: true,
      },
    });
    sedeTestigoId = testigo.id;

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

describe('DELETE /sedes/:id (integración) — D119, eliminar es distinto de inactivar', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  const idsSedeParaLimpiar: string[] = [];
  const idsPersonaParaLimpiar: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    if (idsPersonaParaLimpiar.length > 0) {
      await prisma.persona.deleteMany({ where: { id: { in: idsPersonaParaLimpiar } } });
    }
    if (idsSedeParaLimpiar.length > 0) {
      await prisma.sede.deleteMany({ where: { id: { in: idsSedeParaLimpiar } } });
    }
    await app.close();
  });

  async function crearSede(nombre: string) {
    const sede = await prisma.sede.create({
      data: { nombre, direccion: 'Dirección', horarios: 'Domingos 10 hs', contactoTelefono: '+5492210000000', activo: true },
    });
    idsSedeParaLimpiar.push(sede.id);
    return sede.id;
  }

  it('no se puede eliminar una Sede con Personas asociadas — queda bloqueada, con el motivo', async () => {
    const sedeId = await crearSede(`Sede integ con Personas ${Date.now()}`);
    const persona = await prisma.persona.create({
      data: {
        email: `integ-sede-delete-${Date.now()}@example.com`,
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
        congregaDesde: 2020,
        estado: 'activa',
      },
    });
    idsPersonaParaLimpiar.push(persona.id);

    const token = await mintAdminToken();
    const response = await request(app.getHttpServer())
      .delete(`/sedes/${sedeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('SEDE_TIENE_DATOS_RELACIONADOS');

    const enBaseDeDatos = await prisma.sede.findUnique({ where: { id: sedeId } });
    expect(enBaseDeDatos?.eliminadoEn).toBeNull();
  });

  it('elimina una Sede sin datos relacionados, y desaparece tanto de Activas como de Todas', async () => {
    // Dos Sedes: la que se elimina, y otra para no chocar con el guard de "única Sede activa".
    await crearSede(`Sede integ testigo ${Date.now()}`);
    const sedeId = await crearSede(`Sede integ a eliminar ${Date.now()}`);

    const token = await mintAdminToken();
    const eliminar = await request(app.getHttpServer())
      .delete(`/sedes/${sedeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(eliminar.status).toBe(200);

    const enBaseDeDatos = await prisma.sede.findUnique({ where: { id: sedeId } });
    expect(enBaseDeDatos).not.toBeNull(); // borrado lógico, no físico (Principio III)
    expect(enBaseDeDatos?.eliminadoEn).not.toBeNull();

    const activas = await request(app.getHttpServer()).get('/sedes');
    expect(activas.body.map((s: { id: string }) => s.id)).not.toContain(sedeId);

    const todas = await request(app.getHttpServer()).get('/sedes?estado=todas');
    expect(todas.body.map((s: { id: string }) => s.id)).not.toContain(sedeId);

    const papelera = await request(app.getHttpServer()).get('/sedes/papelera').set('Authorization', `Bearer ${token}`);
    expect(papelera.status).toBe(200);
    expect(papelera.body.map((s: { id: string }) => s.id)).toContain(sedeId);

    const detalle = await request(app.getHttpServer()).get(`/sedes/${sedeId}`);
    expect(detalle.status).toBe(404);
  });

  // H-129: la papelera es del Admin — antes `GET /sedes?estado=papelera` la
  // devolvía a cualquiera, sin sesión. El listado público sigue sin guard.
  it('la papelera exige sedes.papelera.ver: sin sesión 401, Pastor y sin cargo 403, y ?estado=papelera en el público da 400', async () => {
    const sinSesion = await request(app.getHttpServer()).get('/sedes/papelera');
    expect(sinSesion.status).toBe(401);

    for (const rol of [['pastor'], ['miembro_registrado']]) {
      const respuesta = await request(app.getHttpServer())
        .get('/sedes/papelera')
        .set('Authorization', `Bearer ${await mintToken(rol)}`);
      expect(respuesta.status).toBe(403);
      expect(respuesta.body.code).toBe('SIN_PERMISO');
    }

    const porParametro = await request(app.getHttpServer()).get('/sedes?estado=papelera');
    expect(porParametro.status).toBe(400);
    expect(porParametro.body.errors).toEqual([{ campo: 'estado', code: 'ESTADO_INVALIDO' }]);

    const publico = await request(app.getHttpServer()).get('/sedes');
    expect(publico.status).toBe(200);
  });

  it('restaura una Sede eliminada — vuelve a aparecer en Todas', async () => {
    const sedeId = await crearSede(`Sede integ a restaurar ${Date.now()}`);
    const token = await mintAdminToken();

    await request(app.getHttpServer()).delete(`/sedes/${sedeId}`).set('Authorization', `Bearer ${token}`);

    const restaurar = await request(app.getHttpServer())
      .post(`/sedes/${sedeId}/restaurar`)
      .set('Authorization', `Bearer ${token}`);
    expect(restaurar.status).toBe(201);

    const enBaseDeDatos = await prisma.sede.findUnique({ where: { id: sedeId } });
    expect(enBaseDeDatos?.eliminadoEn).toBeNull();

    const todas = await request(app.getHttpServer()).get('/sedes?estado=todas');
    expect(todas.body.map((s: { id: string }) => s.id)).toContain(sedeId);
  });
});

describe('POST /sedes (integración) — al menos un dato de contacto (H-104)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  const idsSedeParaLimpiar: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    if (idsSedeParaLimpiar.length > 0) {
      await prisma.sede.deleteMany({ where: { id: { in: idsSedeParaLimpiar } } });
    }
    await app.close();
  });

  // H-104: sin `errors` en los dos campos, el cliente no tenía forma de
  // marcar ni contactoTelefono ni contactoEmail — caía al banner genérico.
  // Se marcan los dos porque completar cualquiera de los dos resuelve el
  // error.
  it('responde 400 con errors en contactoTelefono y contactoEmail si no se completa ninguno', async () => {
    const token = await mintAdminToken();
    const response = await request(app.getHttpServer())
      .post('/sedes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `Sede integ sin contacto ${Date.now()}`, direccion: 'Dirección', horarios: 'Domingos 10 hs' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('CONTACTO_SEDE_REQUERIDO');
    expect(response.body.errors).toEqual([
      { campo: 'contactoTelefono', code: 'CONTACTO_SEDE_REQUERIDO' },
      { campo: 'contactoEmail', code: 'CONTACTO_SEDE_REQUERIDO' },
    ]);

    if (response.body.id) idsSedeParaLimpiar.push(response.body.id);
  });
});
