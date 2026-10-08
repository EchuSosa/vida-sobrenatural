import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { cronogramaPropuesto, hoyEnArgentina, sumarDias, type EstadoMiVidaDeServicio } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { levantarApp, tokenDe } from './discipulado-fixtures.js';
import { EscenarioVS } from './vida-de-servicio-fixtures.js';

/**
 * spec 008, T045 (FR-021, FR-025, FR-031, FR-034; Historia 5, escenarios 1 a
 * 5): la Persona ve sus semanas con su estado, su asistencia (solo la suya),
 * el material de las liberadas, y después de una baja solo lo de antes.
 * También T065: una Completitud Manual de Vida de Servicio da Apto para
 * Ministerio y la card la muestra completada (FR-042).
 */
describe('Vida de Servicio — seguir mi Vida de Servicio (spec 008, T045/T065)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let vs: EscenarioVS;
  let lider: string;
  let adminId: string;
  const MIEMBRO = ['miembro_registrado'];
  const ADMIN = ['miembro_registrado', 'admin'];
  const hoy = hoyEnArgentina();

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }
  const estado = async (id: string) => (await como(id, MIEMBRO, 'get', '/vida-de-servicio/me')).body as EstadoMiVidaDeServicio;

  /** 4 semanas: hace 14 días (con material), hace 7 (sin), hoy (con), en 7 (con). */
  async function edicionAMedias(): Promise<string> {
    const g = await vs.edicion({ inicio: sumarDias(hoy, -14), fechas: cronogramaPropuesto(sumarDias(hoy, -14), 4), lideres: [lider] });
    await vs.material(g, 1, lider);
    await vs.material(g, 3, lider);
    await vs.material(g, 4, lider);
    return g;
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    vs = new EscenarioVS(prisma, `mvs-${Date.now()}`);
    await vs.preparar();
    lider = await vs.lider('lider');
    adminId = await vs.persona('admin', { rol: ADMIN });
  });

  afterAll(async () => {
    await vs.limpiar();
    await app.close();
  });

  it('en curso: las semanas en orden con su estado; de la futura no dice si hay material (escenario 1)', async () => {
    const g = await edicionAMedias();
    const a = await vs.apta('curso');
    await vs.inscribir(a, g);
    const e = await estado(a);
    expect(e.estado).toBe('en_curso');
    if (e.estado !== 'en_curso') return;
    expect(e.semanas.map((s) => [s.numero, s.estado])).toEqual([[1, 'liberada'], [2, 'sin_material'], [3, 'liberada'], [4, 'proxima']]);
    expect(e.semanas[0]).toMatchObject({ titulo: 'Semana 1', contenidoId: expect.any(String) });
    expect(e.semanas[3]).not.toHaveProperty('contenidoId');

    const semana1 = await como(a, MIEMBRO, 'get', '/vida-de-servicio/me/semanas/1');
    expect(semana1.status).toBe(200);
    expect(semana1.body).toMatchObject({ numero: 1, titulo: 'Semana 1', texto: 'Leer el capítulo', archivos: [], enlaces: [] });
    for (const n of [2, 4, 9]) {
      const res = await como(a, MIEMBRO, 'get', `/vida-de-servicio/me/semanas/${n}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('CONTENIDO_NO_DISPONIBLE');
    }
  });

  it('asistencia: solo la propia, con las fechas de falta (escenario 2, FR-031)', async () => {
    const g = await edicionAMedias();
    const a = await vs.apta('asist-a');
    const b = await vs.apta('asist-b');
    const ia = await vs.inscribir(a, g);
    const ib = await vs.inscribir(b, g);
    for (const [dias, presenteA] of [[-14, true], [-7, false]] as const) {
      const enc = await prisma.encuentro.create({ data: { grupoId: g, fecha: new Date(`${sumarDias(hoy, dias)}T00:00:00Z`), registradoPorId: lider } });
      await prisma.asistencia.createMany({ data: [{ encuentroId: enc.id, inscripcionId: ia, presente: presenteA }, { encuentroId: enc.id, inscripcionId: ib, presente: false }] });
    }
    const e = await estado(a);
    expect(e).toMatchObject({ estado: 'en_curso', asistencia: { encuentros: 2, presentes: 1, faltas: [sumarDias(hoy, -7)] } });
    expect(JSON.stringify(e)).not.toContain(b);
  });

  it('completada: sigue viendo todo (escenario 3); un no inscripto no ve nada', async () => {
    const g = await edicionAMedias();
    const a = await vs.apta('completo');
    await vs.inscribir(a, g, 'completada');
    expect(await estado(a)).toMatchObject({ estado: 'completada', via: 'inscripcion', edicion: { grupoId: g } });
    expect((await como(a, MIEMBRO, 'get', '/vida-de-servicio/me/semanas/3')).status).toBe(200);
    const nadie = await vs.apta('nadie');
    expect((await como(nadie, MIEMBRO, 'get', '/vida-de-servicio/me/semanas/1')).status).toBe(404);
  });

  it('dada de baja: ve lo liberado hasta el cierre y no lo posterior (escenario 4, FR-034)', async () => {
    const g = await edicionAMedias();
    const a = await vs.apta('baja');
    // Se dio de baja hace 10 días: entre la semana 1 (hace 14) y la 3 (hoy).
    const cierre = new Date(`${sumarDias(hoy, -10)}T15:00:00Z`);
    await vs.inscribir(a, g, 'dada_de_baja', cierre);
    const e = await estado(a);
    expect(e).toMatchObject({ estado: 'puede_pedir', anterior: { tipo: 'dada_de_baja', edicion: { grupoId: g } } });
    if (e.estado === 'puede_pedir' && e.anterior && e.anterior.tipo !== 'rechazada') {
      expect(e.anterior.semanas.map((s) => s.numero)).toEqual([1]);
    }
    expect((await como(a, MIEMBRO, 'get', '/vida-de-servicio/me/semanas/1')).status).toBe(200);
    expect((await como(a, MIEMBRO, 'get', '/vida-de-servicio/me/semanas/3')).status).toBe(404);
  });

  it('una Persona sin app (pedida por el Admin) tiene su estado y lo ve cuando entra (escenario 5)', async () => {
    const g = await edicionAMedias();
    const a = await vs.apta('sinapp');
    await prisma.persona.update({ where: { id: a }, data: { email: null } });
    await vs.inscribir(a, g);
    expect((await estado(a)).estado).toBe('en_curso');
  });

  it('T065/FR-042: confirmar un "Ya lo hice" de Vida de Servicio da Apto para Ministerio y la card queda completada; el de Vida Nueva no', async () => {
    const a = await vs.apta('yalohice');
    const decl = await prisma.declaracionHistorial.create({ data: { personaId: a, etapa: 'vida_de_servicio' }, select: { id: true } });
    expect((await como(adminId, ADMIN, 'post', `/historial/declaraciones/${decl.id}/confirmar`)).status).toBe(200);
    expect((await prisma.persona.findUniqueOrThrow({ where: { id: a }, select: { rol: true } })).rol).toEqual(['miembro_registrado', 'apto_ministerio']);
    expect(await estado(a)).toEqual({ estado: 'completada', via: 'completitud_manual' });

    const b = await vs.persona('registrada', { rol: ['miembro_registrado', 'lider_curso'] });
    expect((await como(adminId, ADMIN, 'post', `/personas/${b}/completitudes`, { etapa: 'vida_nueva' })).status).toBe(201);
    expect((await prisma.persona.findUniqueOrThrow({ where: { id: b }, select: { rol: true } })).rol).toEqual(['miembro_registrado', 'lider_curso']);
    expect((await como(adminId, ADMIN, 'post', `/personas/${b}/completitudes`, { etapa: 'vida_de_servicio' })).status).toBe(201);
    // H-139: agrega sin quitar el rol de cargo.
    expect((await prisma.persona.findUniqueOrThrow({ where: { id: b }, select: { rol: true } })).rol).toEqual(['miembro_registrado', 'lider_curso', 'apto_ministerio']);
  });
});
