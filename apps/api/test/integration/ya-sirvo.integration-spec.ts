import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { DeclaracionDetalle, EstadoMiMinisterio } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 015, D243: "Ya sirvo en un ministerio" (la persona elige del listado y
 * el Admin confirma cada área, con Vida de Servicio si hace falta) y la carga
 * directa del Admin desde el Ministerio (la primera carga de los equipos).
 */
describe('"Ya sirvo en un ministerio" y carga directa (spec 015, D243)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let adminId: string;
  let pastorId: string;
  const ministerios: string[] = [];
  const area: Record<string, { ministerioId: string; celulaId: string | null }> = {};
  const ADMIN = ['miembro_registrado', 'admin'];
  const PASTOR = ['miembro_registrado', 'pastor'];
  const MIEMBRO = ['miembro_registrado'];
  let personas: string[] = [];

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }

  async function ministerio(nombre: string, celulas: Array<{ nombre: string; paralelo?: boolean }>) {
    const m = await prisma.ministerio.create({ data: { nombre: `${nombre} ${Date.now()}`, descripcion: 'Test' }, select: { id: true } });
    ministerios.push(m.id);
    if (celulas.length === 0) area[nombre] = { ministerioId: m.id, celulaId: null };
    for (const c of celulas) {
      const celula = await prisma.celula.create({ data: { ministerioId: m.id, nombre: c.nombre, ofreceRolDiscipulador: c.paralelo ?? false }, select: { id: true } });
      area[c.nombre] = { ministerioId: m.id, celulaId: celula.id };
    }
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    escenario = new Escenario(prisma, `yasirvo${Date.now()}`);
    await escenario.preparar();
    adminId = await escenario.persona('admin', { rol: ADMIN });
    pastorId = await escenario.persona('pastor', { rol: PASTOR });
    await ministerio('Adoración', [{ nombre: 'Voces' }, { nombre: 'Sonido' }]);
    await ministerio('Ceremonial', []);
    await ministerio('Multimedia', []);
    await ministerio('Enseñanza', [{ nombre: 'Discipulados Vida Nueva', paralelo: true }]);
  });

  afterAll(async () => {
    personas = (await prisma.persona.findMany({ where: { apellido: { contains: 'yasirvo' } }, select: { id: true } })).map((p) => p.id);
    await prisma.opcionDeclaracionMinisterio.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.completitudManual.deleteMany({ where: { personaId: { in: personas } } });
    await prisma.declaracionHistorial.deleteMany({ where: { personaId: { in: personas } } });
    await prisma.postulacion.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.celula.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.ministerio.deleteMany({ where: { id: { in: ministerios } } });
    await escenario.limpiar();
    await app.close();
  });

  it('⭐ declara del listado; el Admin confirma un área, descarta otra y registra Vida de Servicio', async () => {
    const id = await escenario.persona('sirve');
    const declarar = (cuerpo: object) => como(id, MIEMBRO, 'post', '/camino/me/declaraciones', { etapa: 'ministerio', ...cuerpo });

    expect((await declarar({})).body.errors).toEqual([{ campo: 'opciones', code: 'ELECCION_VACIA' }]);
    expect((await declarar({ opciones: [area.Voces], desdeAnio: 1800 })).body.errors).toEqual([{ campo: 'desdeAnio', code: 'DESDE_ANIO_INVALIDO' }]);
    expect((await declarar({ opciones: [area.Voces, area.Sonido] })).body.errors).toEqual([{ campo: 'opciones', code: 'ELECCION_UN_AREA_POR_MINISTERIO' }]);

    const creada = await declarar({ opciones: [area.Voces, area.Ceremonial, area['Discipulados Vida Nueva']], desdeAnio: 2019, comentario: 'Canto en el coro' });
    expect(creada.status).toBe(201);
    const declaracionId = creada.body.id as string;

    const detalle = (await como(adminId, ADMIN, 'get', `/historial/declaraciones/${declaracionId}`)).body as DeclaracionDetalle;
    expect(detalle.ministerio).toMatchObject({ desdeAnio: 2019, vidaDeServicioHecha: false, membresias: { principales: [], enParalelo: [] } });
    expect(detalle.ministerio!.opciones.map((o) => o.celula?.nombre ?? null)).toEqual(['Voces', null, 'Discipulados Vida Nueva']);
    const [voces, ceremonial] = detalle.ministerio!.opciones;

    // Sin ninguna marcada no se confirma.
    const nada = await como(adminId, ADMIN, 'post', `/historial/declaraciones/${declaracionId}/confirmar`, { opcionesConfirmadas: [] });
    expect(nada.body.errors).toEqual([{ campo: 'opcionesConfirmadas', code: 'ELECCION_VACIA' }]);

    const ok = await como(adminId, ADMIN, 'post', `/historial/declaraciones/${declaracionId}/confirmar`, { opcionesConfirmadas: [voces.id, ceremonial.id], tambienVidaDeServicio: true });
    expect([ok.status, ok.body.estado]).toEqual([200, 'confirmada']);
    expect(ok.body.ministerio.opciones.map((o: { resultado: string }) => o.resultado)).toEqual(['confirmada', 'confirmada', 'descartada']);

    const persona = await prisma.persona.findUniqueOrThrow({ where: { id }, select: { rol: true } });
    expect(persona.rol).toEqual(expect.arrayContaining(['apto_ministerio', 'miembro_ministerio']));
    const completitudes = await prisma.completitudManual.findMany({ where: { personaId: id }, select: { etapa: true } });
    expect(completitudes.map((c) => c.etapa).sort()).toEqual(['ministerio', 'vida_de_servicio']);
    const miCamino = (await como(id, [...MIEMBRO, 'apto_ministerio', 'miembro_ministerio'], 'get', '/ministerios/me')).body as EstadoMiMinisterio;
    expect(miCamino.estado === 'miembro' && miCamino.membresias.length).toBe(2);
  });

  it('carga directa del Admin: suma, no repite y respeta el máximo de 2 (D241); el Pastor no puede', async () => {
    const id = await escenario.persona('equipo');
    const agregar = (ministerioId: string, cuerpo: object) => como(adminId, ADMIN, 'post', `/ministerios/${ministerioId}/miembros`, { personaId: id, ...cuerpo });

    expect((await agregar(area.Voces.ministerioId, { celulaId: area.Voces.celulaId })).status).toBe(201);
    expect((await agregar(area.Voces.ministerioId, { celulaId: area.Sonido.celulaId })).body.code).toBe('YA_ES_MIEMBRO_DEL_MINISTERIO');
    const segundo = await agregar(area.Ceremonial.ministerioId, {});
    expect([segundo.status, segundo.body.code, segundo.body.puedeSumar]).toEqual([409, 'POSTULACION_REQUIERE_CONFIRMAR_CAMBIO', true]);
    expect((await agregar(area.Ceremonial.ministerioId, { sumar: true })).status).toBe(201);
    const tercero = await agregar(area.Multimedia.ministerioId, { sumar: true });
    expect([tercero.body.code, tercero.body.puedeSumar]).toEqual(['POSTULACION_REQUIERE_CONFIRMAR_CAMBIO', false]);
    expect((await agregar(area['Discipulados Vida Nueva'].ministerioId, { celulaId: area['Discipulados Vida Nueva'].celulaId })).status).toBe(201);

    const creadas = await prisma.postulacion.findMany({ where: { personaId: id, estado: 'aprobada' }, select: { creadoPorId: true } });
    expect(creadas).toHaveLength(3);
    expect(creadas.every((p) => p.creadoPorId === adminId)).toBe(true);
    expect((await como(pastorId, PASTOR, 'post', `/ministerios/${area.Multimedia.ministerioId}/miembros`, { personaId: id })).status).toBe(403);
  });
});
