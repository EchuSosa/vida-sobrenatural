import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { configurarApp } from '../../src/configurar-app.js';
import { limpiarAvisos } from './notificaciones-fixtures.js';

async function mintToken(claims: { email: string; personaId: string | null; estado: string | null; rol: string[] }): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(secret);
}

const MARTES = { diaSemana: 2, inicio: 19 * 60, fin: 21 * 60 };
const SABADO = { diaSemana: 6, inicio: 10 * 60, fin: 13 * 60 };

/**
 * specs/004, T018 (contracts/solicitudes-api.md): lo que solo la base puede
 * garantizar — el índice único parcial ante dos pedidos simultáneos — y las
 * transiciones de FR-039 de punta a punta. La carrera de proponer contra
 * quitar el rol es de T029 (lote B).
 */
describe('Solicitudes de Discipulado (integración, T018)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let sedeId: string;
  const sufijo = Date.now();
  const ids: Record<'ana' | 'beto' | 'carla' | 'pastor' | 'disc', string> = { ana: '', beto: '', carla: '', pastor: '', disc: '' };

  async function crearPersona(clave: keyof typeof ids, rol: string[]) {
    const persona = await prisma.persona.create({
      data: {
        email: `integ-solicitud-${clave}-${sufijo}@example.com`,
        nombre: clave,
        apellido: 'Integración',
        genero: 'femenino',
        fechaNacimiento: new Date('1990-05-20'),
        telefono: '+5492211234567',
        direccion: 'Calle 1 y 50',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        profesionDetalle: 'Test',
        congregaDesde: 2020,
        estado: 'activa',
        consentimientoDatos: true,
        rol,
      },
      select: { id: true },
    });
    ids[clave] = persona.id;
  }

  function tokenDe(clave: keyof typeof ids, rol: string[] = ['miembro_registrado']) {
    return mintToken({ email: `integ-solicitud-${clave}-${sufijo}@example.com`, personaId: ids[clave], estado: 'activa', rol });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    const sede = await prisma.sede.create({
      data: { nombre: `Sede solicitudes ${sufijo}`, direccion: 'Dirección', horarios: 'Horario', activo: true },
    });
    sedeId = sede.id;
    await crearPersona('ana', ['miembro_registrado']);
    await crearPersona('beto', ['miembro_registrado']);
    await crearPersona('carla', ['miembro_registrado']);
    await crearPersona('pastor', ['miembro_registrado', 'pastor']);
    await crearPersona('disc', ['miembro_registrado', 'discipulador']);
  });

  afterAll(async () => {
    const personaIds = Object.values(ids).filter(Boolean);
    const solicitudes = await prisma.solicitudDiscipulado.findMany({ where: { personaId: { in: personaIds } }, select: { id: true } });
    const solicitudIds = solicitudes.map((s) => s.id);
    await prisma.propuestaDiscipulado.deleteMany({ where: { solicitudId: { in: solicitudIds } } });
    await prisma.franjaSolicitud.deleteMany({ where: { solicitudId: { in: solicitudIds } } });
    await prisma.solicitudDiscipulado.deleteMany({ where: { id: { in: solicitudIds } } });
    await prisma.franjaAgenda.deleteMany({ where: { personaId: { in: personaIds } } });
    await limpiarAvisos(prisma, personaIds); // spec 012
    await prisma.persona.deleteMany({ where: { id: { in: personaIds } } });
    await prisma.sede.delete({ where: { id: sedeId } });
    await app.close();
  });

  it('dos POST /me en paralelo dejan UNA Solicitud y el otro recibe 409 (índice único parcial, no un 500)', async () => {
    const token = await tokenDe('ana');
    const pedir = () => request(app.getHttpServer()).post('/discipulado/solicitudes/me').set('Authorization', `Bearer ${token}`).send({ franjas: [MARTES] });

    const respuestas = await Promise.all([pedir(), pedir(), pedir()]);

    expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409, 409]);
    for (const r of respuestas.filter((x) => x.status === 409)) expect(r.body.code).toBe('SOLICITUD_DISCIPULADO_YA_PENDIENTE');
    expect(await prisma.solicitudDiscipulado.count({ where: { personaId: ids.ana } })).toBe(1);
  });

  it('sin franjas → 400 VALIDACION con el error en el campo franjas', async () => {
    const response = await request(app.getHttpServer())
      .post('/discipulado/solicitudes/me')
      .set('Authorization', `Bearer ${await tokenDe('carla')}`)
      .send({ franjas: [] });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'franjas', code: 'FRANJAS_REQUERIDAS' }] });
  });

  it('un Pastor recibe 403 al pedir en nombre de otra Persona; un Discipulador puede, y queda creadoPorId', async () => {
    const pastor = await request(app.getHttpServer())
      .post('/discipulado/solicitudes')
      .set('Authorization', `Bearer ${await tokenDe('pastor', ['miembro_registrado', 'pastor'])}`)
      .send({ personaId: ids.beto, franjas: [MARTES] });
    expect(pastor.status).toBe(403);

    const disc = await request(app.getHttpServer())
      .post('/discipulado/solicitudes')
      .set('Authorization', `Bearer ${await tokenDe('disc', ['miembro_registrado', 'discipulador'])}`)
      .send({ personaId: ids.beto, franjas: [MARTES] });
    expect(disc.status).toBe(201);
    const creada = await prisma.solicitudDiscipulado.findUniqueOrThrow({ where: { id: disc.body.id }, select: { creadoPorId: true, personaId: true } });
    expect(creada).toEqual({ creadoPorId: ids.disc, personaId: ids.beto });

    // Beto la ve en Mi camino como propia (FR-026).
    const me = await request(app.getHttpServer()).get('/discipulado/me').set('Authorization', `Bearer ${await tokenDe('beto')}`);
    expect(me.body).toMatchObject({ estado: 'buscando', franjas: [MARTES] });
  });

  it('editar franjas con una Propuesta pendiente la deja retirada por persona y la Solicitud en pendiente', async () => {
    const solicitud = await prisma.solicitudDiscipulado.findFirstOrThrow({ where: { personaId: ids.ana, estado: 'pendiente' }, select: { id: true } });
    // La propuesta se arma por Prisma: proponer por API (disponibilidad del Discipulador) lo cubre T029.
    const propuesta = await prisma.propuestaDiscipulado.create({
      data: { tipo: 'nueva', solicitudId: solicitud.id, discipuladorId: ids.disc, propuestaPorId: ids.pastor },
      select: { id: true },
    });
    await prisma.solicitudDiscipulado.update({ where: { id: solicitud.id }, data: { estado: 'propuesta' } });

    // Mientras tanto, la Persona ve lo mismo que con pendiente (FR-026).
    const token = await tokenDe('ana');
    const antes = await request(app.getHttpServer()).get('/discipulado/me').set('Authorization', `Bearer ${token}`);
    expect(antes.body).toEqual({ estado: 'buscando', solicitudId: solicitud.id, franjas: [MARTES], createdAt: expect.any(String) });

    const response = await request(app.getHttpServer())
      .put('/discipulado/solicitudes/me/franjas')
      .set('Authorization', `Bearer ${token}`)
      .send({ franjas: [SABADO] });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ estado: 'buscando', franjas: [SABADO] });
    expect(await prisma.propuestaDiscipulado.findUniqueOrThrow({ where: { id: propuesta.id }, select: { estado: true, retiradaPor: true } })).toEqual({
      estado: 'retirada',
      retiradaPor: 'persona',
    });
    expect((await prisma.solicitudDiscipulado.findUniqueOrThrow({ where: { id: solicitud.id } })).estado).toBe('pendiente');
  });

  it('retirar deja la Solicitud retirada y permite pedir de nuevo', async () => {
    const token = await tokenDe('ana');

    const retiro = await request(app.getHttpServer()).delete('/discipulado/solicitudes/me').set('Authorization', `Bearer ${token}`);
    expect(retiro.status).toBe(204);
    const me = await request(app.getHttpServer()).get('/discipulado/me').set('Authorization', `Bearer ${token}`);
    expect(me.body).toEqual({ estado: 'puede_pedir', ultimo: 'retirada' });

    const otra = await request(app.getHttpServer()).post('/discipulado/solicitudes/me').set('Authorization', `Bearer ${token}`).send({ franjas: [MARTES] });
    expect(otra.status).toBe(201);
    expect(await prisma.solicitudDiscipulado.count({ where: { personaId: ids.ana } })).toBe(2);

    const retiroSinAbierta = await request(app.getHttpServer()).delete('/discipulado/solicitudes/me').set('Authorization', `Bearer ${token}`);
    expect(retiroSinAbierta.status).toBe(204);
    const segundoRetiro = await request(app.getHttpServer()).delete('/discipulado/solicitudes/me').set('Authorization', `Bearer ${token}`);
    expect(segundoRetiro.status).toBe(404);
  });

  it('la bandeja lista las abiertas por defecto, y el Pastor ve el detalle sin historial', async () => {
    const admin = await mintToken({ email: 'x', personaId: ids.pastor, estado: 'activa', rol: ['admin'] });
    const bandeja = await request(app.getHttpServer()).get('/solicitudes?take=100').set('Authorization', `Bearer ${admin}`);
    expect(bandeja.status).toBe(200);
    const deBeto = bandeja.body.items.find((s: { persona: { id: string } }) => s.persona.id === ids.beto);
    expect(deBeto).toMatchObject({ estado: 'pendiente', tipo: 'discipulado', creadoPor: { id: ids.disc } });
    // spec 011: la bandeja también trae Inscripciones a Evento y Pagos (otros estados abiertos, D178):
    // lo que se afirma es que solo vienen las abiertas, no los estados de Discipulado.
    expect(bandeja.body.items.every((s: { abierta: boolean }) => s.abierta)).toBe(true);

    // `buscar` filtra por nombre en la base, con el total de lo filtrado.
    const buscada = await request(app.getHttpServer()).get(`/solicitudes?buscar=beto%20Integraci`).set('Authorization', `Bearer ${admin}`);
    expect(buscada.body).toMatchObject({ total: 1, items: [{ persona: { id: ids.beto } }] });

    const pastor = await request(app.getHttpServer())
      .get(`/discipulado/solicitudes/${deBeto.id}`)
      .set('Authorization', `Bearer ${await tokenDe('pastor', ['miembro_registrado', 'pastor'])}`);
    expect(pastor.status).toBe(200);
    expect(pastor.body).toMatchObject({ id: deBeto.id, franjas: [MARTES], historial: [] });
  });
  it('proponer, retirar la propuesta y rechazar, por API con un Discipulador disponible (FR-006)', async () => {
    await prisma.franjaAgenda.create({ data: { personaId: ids.disc, ...MARTES } });
    await prisma.persona.update({ where: { id: ids.disc }, data: { disponibleDiscipulado: true } });
    const admin = await mintToken({ email: 'x', personaId: ids.pastor, estado: 'activa', rol: ['admin'] });
    const solicitud = await prisma.solicitudDiscipulado.findFirstOrThrow({ where: { personaId: ids.beto, estado: 'pendiente' }, select: { id: true } });
    const api = request(app.getHttpServer());

    const cruce = await api.get(`/discipulado/solicitudes/${solicitud.id}/cruce`).set('Authorization', `Bearer ${admin}`);
    expect(cruce.status).toBe(200);
    expect(cruce.body.franjas[0].coinciden.map((d: { id: string }) => d.id)).toContain(ids.disc);

    const propuesta = await api.post(`/discipulado/solicitudes/${solicitud.id}/proponer`).set('Authorization', `Bearer ${admin}`).send({ discipuladorId: ids.disc });
    expect(propuesta.status).toBe(200);
    expect(await prisma.grupo.count({ where: { inscripciones: { some: { personaId: ids.beto } } } })).toBe(0);

    const otraVez = await api.post(`/discipulado/solicitudes/${solicitud.id}/proponer`).set('Authorization', `Bearer ${admin}`).send({ discipuladorId: ids.disc });
    expect(otraVez.body.code).toBe('SOLICITUD_NO_PENDIENTE');

    const bandeja = await api.get('/solicitudes?estado=propuesta&orden=espera&take=100').set('Authorization', `Bearer ${admin}`);
    expect(bandeja.body.items.find((s: { id: string }) => s.id === solicitud.id)).toMatchObject({
      estado: 'propuesta',
      revisadoPor: { id: ids.pastor },
      // spec 013 (bandeja unificada): lo propio de cada tipo viaja en `extra`.
      extra: { propuestaVigente: { discipulador: { id: ids.disc } } },
    });
    const detalle = await api.get(`/discipulado/solicitudes/${solicitud.id}`).set('Authorization', `Bearer ${admin}`);
    expect(detalle.body.historial).toEqual([expect.objectContaining({ estado: 'pendiente', discipulador: expect.objectContaining({ id: ids.disc }) })]);

    const retiro = await api.post(`/discipulado/solicitudes/${solicitud.id}/retirar-propuesta`).set('Authorization', `Bearer ${admin}`);
    expect(retiro.status).toBe(200);
    const rechazo = await api.post(`/discipulado/solicitudes/${solicitud.id}/rechazar`).set('Authorization', `Bearer ${admin}`);
    expect(rechazo.status).toBe(200);
    expect(await prisma.solicitudDiscipulado.findUniqueOrThrow({ where: { id: solicitud.id }, select: { estado: true } })).toEqual({ estado: 'rechazada' });

    const me = await api.get('/discipulado/me').set('Authorization', `Bearer ${await tokenDe('beto')}`);
    expect(me.body).toEqual({ estado: 'puede_pedir', ultimo: 'rechazada' });
  });

  it('proponer a alguien sin la disponibilidad prendida → 409 DISCIPULADOR_NO_DISPONIBLE', async () => {
    const admin = await mintToken({ email: 'x', personaId: ids.pastor, estado: 'activa', rol: ['admin'] });
    const carla = await request(app.getHttpServer()).post('/discipulado/solicitudes/me').set('Authorization', `Bearer ${await tokenDe('carla')}`).send({ franjas: [MARTES] });
    await prisma.persona.update({ where: { id: ids.disc }, data: { disponibleDiscipulado: false } });

    const response = await request(app.getHttpServer())
      .post(`/discipulado/solicitudes/${carla.body.id}/proponer`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ discipuladorId: ids.disc });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('DISCIPULADOR_NO_DISPONIBLE');
  });
});
