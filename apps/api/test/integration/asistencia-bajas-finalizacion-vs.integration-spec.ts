import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { hoyEnArgentina, sumarDias, type AsistenciaDelDia, type EdicionAdminDetalle, type MiGrupoDetalle } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { levantarApp, tokenDe } from './discipulado-fixtures.js';
import { registrarAvisos } from './camino-fixtures.js';
import { EscenarioVS } from './vida-de-servicio-fixtures.js';

/**
 * spec 008, T051 + T057 + T064 (Historias 6, 7 y 8; FR-027 a FR-037; SC-005):
 * tomar asistencia (un Encuentro por fecha, faltas y alerta), proponer y
 * resolver bajas, y cerrar la edición dando Apto para Ministerio solo a las
 * activas. Después del cierre no se cambia nada y el material se sigue viendo.
 */
describe('Vida de Servicio — asistencia, bajas y finalización (spec 008, T051/T057/T064)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let vs: EscenarioVS;
  let avisos: ReturnType<typeof registrarAvisos>;
  let lider1: string;
  let lider2: string;
  let adminId: string;
  const LIDER = ['miembro_registrado', 'lider_curso'];
  const ADMIN = ['miembro_registrado', 'admin'];
  const MIEMBRO = ['miembro_registrado'];
  const hoy = hoyEnArgentina();

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post' | 'put', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }
  const lider = (metodo: 'get' | 'post' | 'put', ruta: string, cuerpo?: object) => como(lider1, LIDER, metodo, `/vida-de-servicio/mis-grupos${ruta}`, cuerpo);
  const admin = (metodo: 'get' | 'post' | 'put', ruta: string, cuerpo?: object) => como(adminId, ADMIN, metodo, `/grupos/vida-de-servicio${ruta}`, cuerpo);

  /** Una edición que empezó hace 14 días, con 3 semanas (la última hoy) e inscriptas desde hace 20 días. */
  async function edicionConInscriptas(cantidad: number, opciones: { ultimaEn?: number } = {}) {
    const inicio = sumarDias(hoy, -14);
    const fechas = [inicio, sumarDias(inicio, 7), sumarDias(hoy, opciones.ultimaEn ?? 0)];
    const g = await vs.edicion({ inicio, fechas, lideres: [lider1, lider2] });
    const personas: string[] = [];
    const inscripciones: string[] = [];
    for (let i = 0; i < cantidad; i++) {
      const p = await vs.apta(`ins-${g.slice(0, 6)}-${i}`);
      const id = await vs.inscribir(p, g);
      await prisma.inscripcion.update({ where: { id }, data: { createdAt: new Date(`${sumarDias(hoy, -20)}T15:00:00Z`) } });
      personas.push(p);
      inscripciones.push(id);
    }
    return { g, personas, inscripciones };
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    vs = new EscenarioVS(prisma, `abf-${Date.now()}`);
    await vs.preparar();
    lider1 = await vs.lider('lider1');
    lider2 = await vs.lider('lider2');
    adminId = await vs.persona('admin', { rol: ADMIN });
  });

  afterAll(async () => {
    avisos.restaurar();
    await vs.limpiar();
    await app.close();
  });

  beforeEach(() => {
    avisos.emitidos.length = 0;
  });

  describe('asistencia (T051)', () => {
    it('todos presentes por defecto; los ausentes marcados; dos Líderes la misma fecha → un solo Encuentro y el segundo corrige (escenarios 1, 2)', async () => {
      const { g, inscripciones } = await edicionConInscriptas(3);
      const antes = (await lider('get', `/${g}/asistencia/${hoy}`)).body as AsistenciaDelDia;
      expect(antes).toMatchObject({ fecha: hoy, guardada: false });
      expect(antes.inscriptos.every((i) => i.presente)).toBe(true);

      const r1 = await lider('put', `/${g}/asistencia/${hoy}`, { ausentes: [inscripciones[0]] });
      expect(r1.status).toBe(200);
      const r2 = await como(lider2, LIDER, 'put', `/vida-de-servicio/mis-grupos/${g}/asistencia/${hoy}`, { ausentes: [inscripciones[1]] });
      const d = r2.body as AsistenciaDelDia;
      expect(d.guardada).toBe(true);
      expect(d.inscriptos.filter((i) => !i.presente).map((i) => i.inscripcionId)).toEqual([inscripciones[1]]);
      expect(await prisma.encuentro.count({ where: { grupoId: g } })).toBe(1);
      expect(await prisma.asistencia.count({ where: { encuentro: { grupoId: g } } })).toBe(3);
      // FR-030: tomar asistencia no libera material.
      expect(await prisma.contenido.count({ where: { grupoId: g } })).toBe(0);
    });

    it('faltas y alerta desde 2; quien se inscribió después no suma faltas de antes; fechas inválidas y ausentes ajenos (escenario 3, edge case)', async () => {
      const { g, inscripciones } = await edicionConInscriptas(2);
      await lider('put', `/${g}/asistencia/${sumarDias(hoy, -14)}`, { ausentes: [inscripciones[0]] });
      await lider('put', `/${g}/asistencia/${sumarDias(hoy, -7)}`, { ausentes: [inscripciones[0]] });
      const tarde = await vs.apta('tarde');
      const iTarde = await vs.inscribir(tarde, g);
      const d = (await lider('put', `/${g}/asistencia/${hoy}`, { ausentes: [] })).body as AsistenciaDelDia;
      expect(d.inscriptos.find((i) => i.inscripcionId === inscripciones[0])).toMatchObject({ faltas: 2, alertaFaltas: true });
      expect(d.inscriptos.find((i) => i.inscripcionId === iTarde)).toMatchObject({ faltas: 0, alertaFaltas: false, presente: true });
      const detalle = (await lider('get', `/${g}`)).body as MiGrupoDetalle;
      expect(detalle.inscriptos.find((i) => i.inscripcionId === inscripciones[0])).toMatchObject({ faltas: 2, alertaFaltas: true });
      expect(await prisma.inscripcion.findUniqueOrThrow({ where: { id: inscripciones[0] }, select: { estado: true } })).toEqual({ estado: 'activa' }); // D42

      expect((await lider('put', `/${g}/asistencia/${sumarDias(hoy, 1)}`, { ausentes: [] })).body.errors).toEqual([{ campo: 'fecha', code: 'FECHA_FUTURA' }]);
      expect((await lider('put', `/${g}/asistencia/${sumarDias(hoy, -15)}`, { ausentes: [] })).body.errors).toEqual([{ campo: 'fecha', code: 'FECHA_ANTERIOR_AL_INICIO' }]);
      expect((await lider('put', `/${g}/asistencia/${hoy}`, { ausentes: ['otra-cosa'] })).body.errors).toEqual([{ campo: 'ausentes', code: 'INSCRIPCION_AJENA' }]);
      // El Admin también puede (FR-027).
      expect((await admin('put', `/${g}/asistencia/${hoy}`, { ausentes: [iTarde] })).status).toBe(200);
      // La Persona ve solo la suya (FR-031).
      const mia = await como(tarde, MIEMBRO, 'get', '/vida-de-servicio/me');
      expect(mia.body).toMatchObject({ estado: 'en_curso', asistencia: { encuentros: 1, presentes: 0, faltas: [hoy] } });
    });
  });

  describe('bajas (T057)', () => {
    it('proponer no cambia el estado y avisa al Admin; no dos veces; confirmar con el tipo propuesto y con el corregido (escenarios 1 a 3)', async () => {
      const { g, personas, inscripciones } = await edicionConInscriptas(3);
      const largo = await lider('post', `/${g}/inscripciones/${inscripciones[0]}/baja/proponer`, { tipo: 'abandono', comentario: 'x'.repeat(501) });
      expect(largo.body.errors).toEqual([{ campo: 'comentario', code: 'MOTIVO_DEMASIADO_LARGO' }]);
      const p = await lider('post', `/${g}/inscripciones/${inscripciones[0]}/baja/proponer`, { tipo: 'abandono', comentario: 'Dejó de venir' });
      expect(p.status).toBe(200);
      expect((p.body as MiGrupoDetalle).inscriptos.find((i) => i.inscripcionId === inscripciones[0])).toMatchObject({ estado: 'activa', bajaPropuesta: { tipo: 'abandono', comentario: 'Dejó de venir' } });
      expect(avisos.emitidos).toEqual([{ nombre: 'vida_servicio.baja_propuesta', a: { tipo: 'admin' }, datos: { grupoId: g, inscripcionId: inscripciones[0] } }]);
      expect((await lider('post', `/${g}/inscripciones/${inscripciones[0]}/baja/proponer`, { tipo: 'abandono' })).body.code).toBe('BAJA_YA_PROPUESTA');
      await lider('post', `/${g}/inscripciones/${inscripciones[1]}/baja/proponer`, { tipo: 'abandono' });

      const pendientes = (await admin('get', `/${g}`)).body as EdicionAdminDetalle;
      expect(pendientes.bajasPropuestas.map((b) => [b.inscripcionId, b.tipo, b.propuestaPor?.id])).toEqual([[inscripciones[0], 'abandono', lider1], [inscripciones[1], 'abandono', lider1]]);

      avisos.emitidos.length = 0;
      await admin('post', `/${g}/inscripciones/${inscripciones[0]}/baja/confirmar`, {});
      await admin('post', `/${g}/inscripciones/${inscripciones[1]}/baja/confirmar`, { tipo: 'dada_de_baja' });
      const estados = await prisma.inscripcion.findMany({ where: { id: { in: inscripciones.slice(0, 2) } }, select: { id: true, estado: true, cerradaEn: true } });
      expect(estados.find((e) => e.id === inscripciones[0])).toMatchObject({ estado: 'abandono', cerradaEn: expect.any(Date) });
      expect(estados.find((e) => e.id === inscripciones[1])).toMatchObject({ estado: 'dada_de_baja' });
      expect(avisos.emitidos.map((e) => [e.nombre, (e.a as { personaId: string }).personaId])).toEqual([
        ['vida_servicio.inscripcion_dada_de_baja', personas[0]],
        ['vida_servicio.inscripcion_dada_de_baja', personas[1]],
      ]);
      expect((await admin('post', `/${g}/inscripciones/${inscripciones[2]}/baja/confirmar`, {})).body.code).toBe('BAJA_NO_PROPUESTA');
      expect((await lider('post', `/${g}/inscripciones/${inscripciones[0]}/baja/proponer`, { tipo: 'abandono' })).body.code).toBe('INSCRIPCION_NO_ACTIVA');
    });

    it('rechazar vuelve a la normalidad con el motivo para los Líderes; baja directa del Admin; después de la baja, la semana nueva no se ve (escenarios 4, 5)', async () => {
      const { g, personas, inscripciones } = await edicionConInscriptas(2, { ultimaEn: 3 });
      await lider('post', `/${g}/inscripciones/${inscripciones[0]}/baja/proponer`, { tipo: 'dada_de_baja' });
      avisos.emitidos.length = 0;
      const r = await admin('post', `/${g}/inscripciones/${inscripciones[0]}/baja/rechazar`, { motivo: 'Habló con el pastor' });
      expect((r.body as EdicionAdminDetalle).inscriptos.find((i) => i.inscripcionId === inscripciones[0])).toMatchObject({ estado: 'activa', bajaPropuesta: null, bajaRechazada: { motivo: 'Habló con el pastor' } });
      expect(avisos.emitidos).toEqual([{ nombre: 'vida_servicio.baja_rechazada', a: { tipo: 'lideres_grupo', grupoId: g }, datos: { grupoId: g, inscripcionId: inscripciones[0] } }]);

      await vs.material(g, 1, lider1);
      const directa = await admin('post', `/${g}/inscripciones/${inscripciones[1]}/baja`, { tipo: 'abandono' });
      expect(directa.status).toBe(200);
      expect((await admin('post', `/${g}/inscripciones/${inscripciones[1]}/baja`, { tipo: 'abandono' })).body.code).toBe('INSCRIPCION_NO_ACTIVA');
      // La semana 3 se libera dentro de 3 días: ya dada de baja, no la va a ver; la 1 sí.
      await vs.material(g, 3, lider1);
      await prisma.itemCronograma.updateMany({ where: { grupoId: g, numeroSemana: 3 }, data: { fechaLiberacion: new Date(`${sumarDias(hoy, 3)}T00:00:00Z`) } });
      expect((await como(personas[1], MIEMBRO, 'get', '/vida-de-servicio/me/semanas/1')).status).toBe(200);
      expect((await como(personas[1], MIEMBRO, 'get', '/vida-de-servicio/me/semanas/3')).status).toBe(404);
    });
  });

  describe('finalización (T064, SC-005)', () => {
    it('proponer antes de la última fecha → 409 con desde; ya propuesta → 409 (escenario 1)', async () => {
      const { g } = await edicionConInscriptas(1, { ultimaEn: 5 });
      const antes = await lider('post', `/${g}/finalizacion/proponer`);
      expect(antes.status).toBe(409);
      expect(antes.body).toMatchObject({ code: 'FINALIZACION_ANTES_DE_TIEMPO', desde: sumarDias(hoy, 5) });
      expect((await admin('post', `/${g}/finalizacion/confirmar`)).body.code).toBe('FINALIZACION_NO_PROPUESTA');
    });

    it('bajas propuestas bloquean; rechazar y volver a proponer; confirmar: solo las activas completan y reciben Apto para Ministerio, sin perder otros roles (escenarios 2 a 5, H-139)', async () => {
      const { g, personas, inscripciones } = await edicionConInscriptas(4);
      await prisma.persona.update({ where: { id: personas[0] }, data: { rol: ['miembro_registrado', 'apto_ministerio', 'lider_curso'] } });
      await admin('post', `/${g}/inscripciones/${inscripciones[2]}/baja`, { tipo: 'dada_de_baja' });
      await admin('post', `/${g}/inscripciones/${inscripciones[3]}/baja`, { tipo: 'abandono' });
      await lider('post', `/${g}/inscripciones/${inscripciones[1]}/baja/proponer`, { tipo: 'abandono' });

      avisos.emitidos.length = 0;
      expect((await lider('post', `/${g}/finalizacion/proponer`)).status).toBe(200);
      expect(avisos.emitidos).toEqual([{ nombre: 'vida_servicio.finalizacion_propuesta', a: { tipo: 'admin' }, datos: { grupoId: g } }]);
      expect((await lider('post', `/${g}/finalizacion/proponer`)).body.code).toBe('FINALIZACION_YA_PROPUESTA');

      const bloqueada = await admin('post', `/${g}/finalizacion/confirmar`);
      expect(bloqueada.status).toBe(409);
      expect(bloqueada.body).toMatchObject({ code: 'BAJAS_PROPUESTAS_SIN_RESOLVER', bajas: [{ inscripcionId: inscripciones[1], persona: { id: personas[1] } }] });

      avisos.emitidos.length = 0;
      const rechazo = await admin('post', `/${g}/finalizacion/rechazar`, { motivo: 'Falta la última clase' });
      expect((rechazo.body as EdicionAdminDetalle).finalizacion).toMatchObject({ propuestaEn: null, motivoRechazo: 'Falta la última clase' });
      expect(avisos.emitidos).toEqual([{ nombre: 'vida_servicio.finalizacion_rechazada', a: { tipo: 'lideres_grupo', grupoId: g }, datos: { grupoId: g } }]);
      await admin('post', `/${g}/inscripciones/${inscripciones[1]}/baja/rechazar`, {});
      await lider('post', `/${g}/finalizacion/proponer`);

      avisos.emitidos.length = 0;
      const fin = await admin('post', `/${g}/finalizacion/confirmar`);
      expect(fin.status).toBe(200);
      expect((fin.body as EdicionAdminDetalle).estado).toBe('finalizado');
      const roles = await prisma.persona.findMany({ where: { id: { in: personas } }, select: { id: true, rol: true } });
      const rolDe = (id: string) => roles.find((r) => r.id === id)!.rol;
      expect(rolDe(personas[0])).toEqual(['miembro_registrado', 'apto_ministerio', 'lider_curso']);
      expect(rolDe(personas[1])).toEqual(['miembro_registrado', 'apto_ministerio']);
      expect(rolDe(personas[2])).toEqual(['miembro_registrado']);
      expect(rolDe(personas[3])).toEqual(['miembro_registrado']);
      const estados = await prisma.inscripcion.findMany({ where: { grupoId: g }, orderBy: { createdAt: 'asc' }, select: { id: true, estado: true } });
      expect(Object.fromEntries(estados.map((e) => [e.id, e.estado]))).toEqual({
        [inscripciones[0]]: 'completada',
        [inscripciones[1]]: 'completada',
        [inscripciones[2]]: 'dada_de_baja',
        [inscripciones[3]]: 'abandono',
      });
      expect(avisos.emitidos.map((e) => [e.nombre, (e.a as { personaId: string }).personaId])).toEqual([
        ['vida_servicio.completada', personas[0]],
        ['vida_servicio.completada', personas[1]],
      ]);
      expect((await como(personas[1], MIEMBRO, 'get', '/vida-de-servicio/me')).body).toMatchObject({ estado: 'completada', via: 'inscripcion' });
    });

    it('en una edición finalizada: asistencia, material, bajas, cronograma y Líderes → GRUPO_NO_EN_CURSO; el material se sigue viendo (escenario 6, FR-037)', async () => {
      const { g, personas, inscripciones } = await edicionConInscriptas(1);
      await vs.material(g, 1, lider1);
      await prisma.inscripcion.update({ where: { id: inscripciones[0] }, data: { estado: 'completada', cerradaEn: new Date() } });
      await prisma.grupo.update({ where: { id: g }, data: { estado: 'finalizado', motivoCierre: 'completado', cerradoEn: new Date() } });
      const pedidos = [
        lider('put', `/${g}/asistencia/${hoy}`, { ausentes: [] }),
        request(app.getHttpServer()).put(`/vida-de-servicio/mis-grupos/${g}/semanas/2`).set('Authorization', `Bearer ${await tokenDe(lider1, LIDER)}`).field('titulo', 'T').field('texto', 'x'),
        lider('post', `/${g}/inscripciones/${inscripciones[0]}/baja/proponer`, { tipo: 'abandono' }),
        lider('post', `/${g}/finalizacion/proponer`),
        admin('put', `/${g}/cronograma`, { semanas: [{ numero: 1, fechaLiberacion: sumarDias(hoy, -14) }] }),
        admin('post', `/${g}/lideres`, { personaId: lider2 }),
      ];
      for (const r of await Promise.all(pedidos)) expect(r.body.code).toBe('GRUPO_NO_EN_CURSO');
      expect((await como(personas[0], MIEMBRO, 'get', '/vida-de-servicio/me/semanas/1')).status).toBe(200);
      // El Líder de una edición finalizada la sigue viendo en Mis grupos (los últimos 12 meses).
      expect(((await lider('get', '')).body as Array<{ grupoId: string; estado: string }>).find((x) => x.grupoId === g)).toMatchObject({ estado: 'finalizado' });
    });
  });
});
