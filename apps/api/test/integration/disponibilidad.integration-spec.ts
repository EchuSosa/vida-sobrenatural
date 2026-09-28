import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { Server } from 'node:http';
import { hoyEnArgentina, type Franja, type MiDisponibilidad } from '@vida-sobrenatural/shared-types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { configurarApp } from '../../src/configurar-app.js';
import { CruceService } from '../../src/discipulado/cruce.service.js';

async function mintToken(claims: { email: string; personaId: string | null; estado: string | null; rol: string[] }): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(secret);
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * specs/004, T038 (Historia 4, contracts/disponibilidad-api.md): los endpoints
 * contra la base real, los CHECK como red de seguridad, y que cada cambio se
 * refleje en el cruce (FR-006) — `CruceService.disponibles` es lo que usa el
 * Admin al proponer.
 */
describe('Disponibilidad del Discipulador (integración, Historia 4)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let cruce: CruceService;
  let sedeId: string;
  let discipuladorId: string;
  let otroId: string;
  let token: string;
  let tokenMiembro: string;
  const sufijo = Date.now();
  const martes: Franja = { diaSemana: 2, inicio: 19 * 60, fin: 21 * 60 };

  const http = () => request(app.getHttpServer());
  const aparece = async () => (await cruce.disponibles([martes])).some((c) => c.id === discipuladorId);

  async function crearPersona(email: string, rol: string[]) {
    const persona = await prisma.persona.create({
      data: {
        email,
        nombre: 'Disci',
        apellido: `Plinador ${sufijo}`,
        genero: 'femenino',
        fechaNacimiento: new Date('1985-03-10'),
        telefono: '+5492211234567',
        direccion: 'Calle 1',
        sedeId,
        estadoCivil: 'casado_a',
        profesion: 'otro',
        profesionDetalle: 'Docente',
        tiempoCongregacion: 'mas_5_anios',
        estado: 'activa',
        consentimientoDatos: true,
        rol,
      },
      select: { id: true },
    });
    return persona.id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    cruce = moduleFixture.get(CruceService);

    const sede = await prisma.sede.create({
      data: { nombre: `Sede disponibilidad ${sufijo}`, direccion: 'Dir', horarios: 'Domingos 10 hs', activo: true },
    });
    sedeId = sede.id;
    const email = `integ-disponibilidad-${sufijo}@example.com`;
    discipuladorId = await crearPersona(email, ['miembro_registrado', 'discipulador']);
    otroId = await crearPersona(`integ-disponibilidad-otro-${sufijo}@example.com`, ['miembro_registrado', 'discipulador']);
    token = await mintToken({ email, personaId: discipuladorId, estado: 'activa', rol: ['miembro_registrado', 'discipulador'] });
    tokenMiembro = await mintToken({ email, personaId: discipuladorId, estado: 'activa', rol: ['miembro_registrado'] });
  });

  afterAll(async () => {
    const ids = [discipuladorId, otroId];
    await prisma.franjaAgenda.deleteMany({ where: { personaId: { in: ids } } });
    await prisma.bloqueoDisponibilidad.deleteMany({ where: { personaId: { in: ids } } });
    await prisma.persona.deleteMany({ where: { id: { in: ids } } });
    await prisma.sede.delete({ where: { id: sedeId } });
    await app.close();
  });

  it('GET sin agenda: toggle apagado por defecto, máximo 1, porQueNo sin_agenda (FR-015, FR-047)', async () => {
    const res = await http().get('/disponibilidad/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      disponible: false,
      maxPersonasPorGrupo: 1,
      franjas: [],
      bloqueos: [],
      apareceEnElCruce: false,
      porQueNo: 'sin_agenda',
    } satisfies MiDisponibilidad);
  });

  it('sin el rol discipulador → 403', async () => {
    const res = await http().get('/disponibilidad/me').set('Authorization', `Bearer ${tokenMiembro}`);
    expect(res.status).toBe(403);
  });

  it('la agenda, el toggle y el cruce: agregar no prende, prender hace aparecer, borrar la franja lo saca', async () => {
    const alta = await http().post('/disponibilidad/me/franjas').set('Authorization', `Bearer ${token}`).send(martes);
    expect(alta.status).toBe(201);
    expect(alta.body).toMatchObject({ disponible: false, porQueNo: 'toggle_apagado' });
    expect(alta.body.franjas).toEqual([{ id: expect.any(String), ...martes }]);
    expect(await aparece()).toBe(false);

    const prender = await http().put('/disponibilidad/me').set('Authorization', `Bearer ${token}`).send({ disponible: true });
    expect(prender.status).toBe(200);
    expect(prender.body).toMatchObject({ disponible: true, apareceEnElCruce: true, porQueNo: null });
    expect(await aparece()).toBe(true);

    // Idempotente.
    const otraVez = await http().put('/disponibilidad/me').set('Authorization', `Bearer ${token}`).send({ disponible: true });
    expect(otraVez.body).toMatchObject({ disponible: true, apareceEnElCruce: true });

    const franjaId = alta.body.franjas[0].id as string;
    const baja = await http().delete(`/disponibilidad/me/franjas/${franjaId}`).set('Authorization', `Bearer ${token}`);
    expect(baja.status).toBe(200);
    // Borrado lógico: la fila queda, pero no vuelve en GET ni cuenta para FR-006.
    expect(baja.body).toMatchObject({ disponible: true, franjas: [], porQueNo: 'sin_agenda' });
    expect(await prisma.franjaAgenda.findUnique({ where: { id: franjaId }, select: { eliminadaEn: true } })).toEqual({
      eliminadaEn: expect.any(Date),
    });
    expect(await aparece()).toBe(false);

    const otraBaja = await http().delete(`/disponibilidad/me/franjas/${franjaId}`).set('Authorization', `Bearer ${token}`);
    expect(otraBaja.status).toBe(404);
  });

  it('franja con fin anterior al inicio → 400 VALIDACION con el campo fin', async () => {
    const res = await http()
      .post('/disponibilidad/me/franjas')
      .set('Authorization', `Bearer ${token}`)
      .send({ diaSemana: 2, inicio: 21 * 60, fin: 19 * 60 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDACION');
    expect(res.body.errors).toEqual([{ campo: 'fin', code: 'FRANJA_FIN_ANTERIOR_AL_INICIO' }]);
  });

  it('no se puede borrar una franja ajena (404)', async () => {
    const ajena = await prisma.franjaAgenda.create({ data: { personaId: otroId, ...martes }, select: { id: true } });
    const res = await http().delete(`/disponibilidad/me/franjas/${ajena.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(await prisma.franjaAgenda.findUnique({ where: { id: ajena.id }, select: { eliminadaEn: true } })).toEqual({ eliminadaEn: null });
  });

  it('un bloqueo vigente lo saca del cruce y borrarlo lo devuelve en el acto; los vencidos no se muestran', async () => {
    await http().post('/disponibilidad/me/franjas').set('Authorization', `Bearer ${token}`).send(martes);
    await http().put('/disponibilidad/me').set('Authorization', `Bearer ${token}`).send({ disponible: true });
    expect(await aparece()).toBe(true);

    const hoy = hoyEnArgentina();
    // Un vencido cargado por fuera (el servicio no lo acepta): no se muestra ni afecta.
    await prisma.bloqueoDisponibilidad.create({
      data: { personaId: discipuladorId, desde: new Date(`${sumarDias(hoy, -10)}T00:00:00Z`), hasta: new Date(`${sumarDias(hoy, -1)}T00:00:00Z`) },
    });

    const alta = await http()
      .post('/disponibilidad/me/bloqueos')
      .set('Authorization', `Bearer ${token}`)
      .send({ desde: hoy, hasta: sumarDias(hoy, 3) });
    expect(alta.status).toBe(201);
    expect(alta.body.bloqueos).toEqual([{ id: expect.any(String), desde: hoy, hasta: sumarDias(hoy, 3), vigente: true }]);
    expect(alta.body).toMatchObject({ apareceEnElCruce: false, porQueNo: 'bloqueo_vigente' });
    expect(await aparece()).toBe(false);

    const baja = await http().delete(`/disponibilidad/me/bloqueos/${alta.body.bloqueos[0].id}`).set('Authorization', `Bearer ${token}`);
    expect(baja.status).toBe(200);
    expect(baja.body).toMatchObject({ bloqueos: [], apareceEnElCruce: true, porQueNo: null });
    expect(await aparece()).toBe(true);
  });

  it('bloqueos: hasta < desde y hasta ya pasado → 400 con su código en hasta', async () => {
    const hoy = hoyEnArgentina();
    const invertido = await http()
      .post('/disponibilidad/me/bloqueos')
      .set('Authorization', `Bearer ${token}`)
      .send({ desde: sumarDias(hoy, 5), hasta: sumarDias(hoy, 2) });
    expect(invertido.status).toBe(400);
    expect(invertido.body.errors).toEqual([{ campo: 'hasta', code: 'BLOQUEO_FIN_ANTERIOR_AL_INICIO' }]);

    const vencido = await http()
      .post('/disponibilidad/me/bloqueos')
      .set('Authorization', `Bearer ${token}`)
      .send({ desde: sumarDias(hoy, -5), hasta: sumarDias(hoy, -1) });
    expect(vencido.status).toBe(400);
    expect(vencido.body.errors).toEqual([{ campo: 'hasta', code: 'BLOQUEO_YA_VENCIDO' }]);

    const malFormado = await http()
      .post('/disponibilidad/me/bloqueos')
      .set('Authorization', `Bearer ${token}`)
      .send({ desde: '10/10/2026' });
    expect(malFormado.status).toBe(400);
    expect(malFormado.body.errors.map((e: { campo: string }) => e.campo).sort()).toEqual(['desde', 'hasta']);
  });

  it('máximo por Grupo: 3 se guarda; 7 → MAXIMO_POR_GRUPO_FUERA_DE_RANGO', async () => {
    const ok = await http().put('/disponibilidad/me').set('Authorization', `Bearer ${token}`).send({ maxPersonasPorGrupo: 3 });
    expect(ok.status).toBe(200);
    expect(ok.body.maxPersonasPorGrupo).toBe(3);

    const fuera = await http().put('/disponibilidad/me').set('Authorization', `Bearer ${token}`).send({ maxPersonasPorGrupo: 7 });
    expect(fuera.status).toBe(400);
    expect(fuera.body.errors).toEqual([{ campo: 'maxPersonasPorGrupo', code: 'MAXIMO_POR_GRUPO_FUERA_DE_RANGO' }]);
  });

  it('los CHECK de la base rechazan fin <= inicio, hasta < desde y máximo 7 aunque se saltee el servicio', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO "franjas_agenda" ("id", "personaId", "diaSemana", "inicio", "fin") VALUES (gen_random_uuid()::text, ${discipuladorId}, 2, 600, 600)`,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`INSERT INTO "bloqueos_disponibilidad" ("id", "personaId", "desde", "hasta") VALUES (gen_random_uuid()::text, ${discipuladorId}, '2030-01-10', '2030-01-05')`,
    ).rejects.toThrow();
    await expect(prisma.$executeRaw`UPDATE "personas" SET "maxPersonasPorGrupo" = 7 WHERE "id" = ${discipuladorId}`).rejects.toThrow();
  });
});
