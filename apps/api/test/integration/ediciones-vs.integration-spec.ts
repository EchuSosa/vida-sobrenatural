import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { cronogramaPropuesto, hoyEnArgentina, sumarDias, type EdicionAdminDetalle, type EdicionAdminResumen } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { RegistroPendientesAdmin } from '../../src/bandeja/registro-pendientes.js';
import { discipuladosActivosDe } from '../../src/discipulado/discipulados-activos.js';
import { levantarApp, tokenDe } from './discipulado-fixtures.js';
import { registrarAvisos } from './camino-fixtures.js';
import { EscenarioVS } from './vida-de-servicio-fixtures.js';
import { ESPERA_CANDADO_CURSOS } from './candado-cursos.js';

/**
 * spec 008, T018 + T068 + T061/T067 (FR-002 a FR-007, FR-038 a FR-040;
 * Historia 1, escenarios 1 a 6; Historia 9): el Admin abre una edición,
 * corrige el cronograma, suma y saca Líderes, abre y cierra la inscripción;
 * el Pastor solo lee; los Pendientes del Inicio; quitar `lider_curso`.
 */
describe('Vida de Servicio — ediciones del Admin (spec 008, T018/T068)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let vs: EscenarioVS;
  let avisos: ReturnType<typeof registrarAvisos>;
  let adminId: string;
  let pastorId: string;
  let lider1: string;
  let lider2: string;
  const ADMIN = ['miembro_registrado', 'admin'];
  const PASTOR = ['miembro_registrado', 'pastor'];
  const hoy = hoyEnArgentina();

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post' | 'put' | 'delete', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }
  const admin = (metodo: 'get' | 'post' | 'put' | 'delete', ruta: string, cuerpo?: object) => como(adminId, ADMIN, metodo, ruta, cuerpo);

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    vs = new EscenarioVS(prisma, `evs-${Date.now()}`);
    await vs.preparar();
    adminId = await vs.persona('admin', { rol: ADMIN });
    pastorId = await vs.persona('pastor', { rol: PASTOR });
    lider1 = await vs.lider('lider1');
    lider2 = await vs.lider('lider2');
  }, ESPERA_CANDADO_CURSOS);

  afterAll(async () => {
    avisos.restaurar();
    await vs.limpiar();
    await app.close();
  });

  beforeEach(() => {
    avisos.emitidos.length = 0;
  });

  it('crear: con el cronograma propuesto y una fecha corregida; inscripción abierta; Liderazgos y aviso a cada Líder (escenario 1)', async () => {
    const inicio = sumarDias(hoy, 7);
    const semanas = cronogramaPropuesto(inicio, 8);
    semanas[3] = sumarDias(semanas[3], 1);
    const disponibles = (await admin('get', '/grupos/vida-de-servicio/lideres-disponibles')).body as Array<{ id: string }>;
    expect(disponibles.map((p) => p.id)).toEqual(expect.arrayContaining([lider1, lider2]));
    expect(disponibles.map((p) => p.id)).not.toContain(adminId);
    const res = await admin('post', '/grupos/vida-de-servicio', { nombre: `  Primavera ${vs.sufijo} `, sedeId: vs.sedeId, fechaInicio: inicio, semanas, lideres: [lider1, lider2] });
    expect(res.status).toBe(201);
    const { grupoId } = res.body as { grupoId: string };
    const d = (await como(pastorId, PASTOR, 'get', `/grupos/vida-de-servicio/${grupoId}`)).body as EdicionAdminDetalle;
    expect(d).toMatchObject({ nombre: `Primavera ${vs.sufijo}`, estado: 'en_curso', inscripcionAbierta: true, fechaInicio: inicio });
    expect(d.semanas.map((s) => s.fechaLiberacion)).toEqual(semanas);
    expect(d.semanas.every((s) => s.estado === 'sin_material')).toBe(true);
    expect(d.lideres.map((l) => l.personaId).sort((x, y) => x.localeCompare(y))).toEqual([lider1, lider2].sort((x, y) => x.localeCompare(y)));
    expect(avisos.emitidos.map((a) => [a.nombre, (a.a as { personaId: string }).personaId])).toEqual(
      expect.arrayContaining([['vida_servicio.lider_asignado', lider1], ['vida_servicio.lider_asignado', lider2]]),
    );
    expect(avisos.emitidos).toHaveLength(2);
  });

  it('crear con errores: todos juntos, por campo (escenarios 2 y 6)', async () => {
    const sinRol = await vs.persona('sin-rol');
    const res = await admin('post', '/grupos/vida-de-servicio', { nombre: '', sedeId: 'no-existe', fechaInicio: '2026-10-28', semanas: ['2026-10-27', '2026-10-27'], lideres: [] });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { campo: 'nombre', code: 'NOMBRE_REQUERIDO' },
      { campo: 'sedeId', code: 'SEDE_INACTIVA' },
      { campo: 'semanas.0', code: 'PRIMERA_SEMANA_ANTES_DEL_INICIO' },
      { campo: 'semanas.1', code: 'FECHAS_NO_CRECIENTES' },
      { campo: 'lideres', code: 'LIDERES_REQUERIDOS' },
    ]);
    const res2 = await admin('post', '/grupos/vida-de-servicio', { nombre: 'x'.repeat(81), sedeId: vs.sedeId, fechaInicio: hoy, semanas: [], lideres: [sinRol] });
    expect(res2.body.errors).toEqual([
      { campo: 'nombre', code: 'NOMBRE_DEMASIADO_LARGO' },
      { campo: 'semanas', code: 'SEMANAS_FUERA_DE_RANGO' },
      { campo: 'lideres', code: 'PERSONA_SIN_ROL_LIDER' },
    ]);
    expect((await como(pastorId, PASTOR, 'post', '/grupos/vida-de-servicio', { nombre: 'x' })).status).toBe(403);
  });

  it('cronograma: mover y quitar una semana liberada no; agregar al final y quitar la última sin material sí (escenario 3)', async () => {
    const inicio = sumarDias(hoy, -7);
    const g = await vs.edicion({ inicio, fechas: cronogramaPropuesto(inicio, 4), lideres: [lider1] });
    await vs.material(g, 1, lider1); // liberada (hace 7 días)
    await vs.material(g, 3, lider1); // cargada, por liberar
    const actual = cronogramaPropuesto(inicio, 4).map((f, i) => ({ numero: i + 1, fechaLiberacion: f }));
    const mover1 = await admin('put', `/grupos/vida-de-servicio/${g}/cronograma`, { semanas: actual.map((s) => (s.numero === 1 ? { ...s, fechaLiberacion: sumarDias(inicio, 1) } : s)) });
    expect(mover1.status).toBe(409);
    expect(mover1.body.code).toBe('SEMANA_LIBERADA_NO_EDITABLE');
    const quitarConMaterial = await admin('put', `/grupos/vida-de-servicio/${g}/cronograma`, { semanas: actual.slice(0, 2) });
    expect(quitarConMaterial.body.code).toBe('SEMANA_CON_MATERIAL');
    const desordenado = await admin('put', `/grupos/vida-de-servicio/${g}/cronograma`, { semanas: actual.map((s) => (s.numero === 3 ? { ...s, fechaLiberacion: actual[0].fechaLiberacion } : s)) });
    expect(desordenado.body.errors).toEqual([{ campo: 'semanas.2', code: 'FECHAS_NO_CRECIENTES' }]);

    // Mover las semanas 2 y 3 un día después de su vecina (la 3 a la vieja fecha de la 4 sin chocar), quitar la 4 y sumar 5.
    const nuevo = [
      actual[0],
      { numero: 2, fechaLiberacion: sumarDias(actual[1].fechaLiberacion, 1) },
      { numero: 3, fechaLiberacion: actual[3].fechaLiberacion },
      { numero: 4, fechaLiberacion: sumarDias(actual[3].fechaLiberacion, 7) },
      { numero: 5, fechaLiberacion: sumarDias(actual[3].fechaLiberacion, 14) },
    ];
    const ok = await admin('put', `/grupos/vida-de-servicio/${g}/cronograma`, { semanas: nuevo });
    expect(ok.status).toBe(200);
    expect((ok.body as EdicionAdminDetalle).semanas.map((s) => [s.numero, s.fechaLiberacion])).toEqual(nuevo.map((s) => [s.numero, s.fechaLiberacion]));
    const sacarUltima = await admin('put', `/grupos/vida-de-servicio/${g}/cronograma`, { semanas: nuevo.slice(0, 4) });
    expect((sacarUltima.body as EdicionAdminDetalle).semanas).toHaveLength(4);
  });

  it('Líderes: sumar (no dos veces, no sin rol), sacar con historial; nunca el último, ni dos a la vez (escenario 4)', async () => {
    const g = await vs.edicion({ lideres: [lider1] });
    expect((await admin('post', `/grupos/vida-de-servicio/${g}/lideres`, { personaId: lider1 })).body.code).toBe('YA_ES_LIDER');
    const sinRol = await vs.persona('sin-rol-2');
    expect((await admin('post', `/grupos/vida-de-servicio/${g}/lideres`, { personaId: sinRol })).body.errors).toEqual([{ campo: 'personaId', code: 'PERSONA_SIN_ROL_LIDER' }]);
    expect((await admin('post', `/grupos/vida-de-servicio/${g}/lideres`, { personaId: lider2 })).status).toBe(200);

    const [a, b] = await Promise.all([admin('delete', `/grupos/vida-de-servicio/${g}/lideres/${lider1}`), admin('delete', `/grupos/vida-de-servicio/${g}/lideres/${lider2}`)]);
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([200, 409]);
    expect([a.body.code, b.body.code]).toContain('ULTIMO_LIDER');
    expect(await prisma.liderazgo.count({ where: { grupoId: g, hasta: null } })).toBe(1);
    const d = (await admin('get', `/grupos/vida-de-servicio/${g}`)).body as EdicionAdminDetalle;
    expect(d.historialLideres).toHaveLength(2);
    expect(d.historialLideres.filter((l) => l.hasta !== null)).toHaveLength(1);
  });

  it('abrir y cerrar la inscripción; con la edición finalizada, nada se cambia (escenario 5, FR-037)', async () => {
    const g = await vs.edicion({ lideres: [lider1] });
    expect(((await admin('put', `/grupos/vida-de-servicio/${g}/inscripcion-abierta`, { abierta: false })).body as EdicionAdminDetalle).inscripcionAbierta).toBe(false);
    expect(((await admin('put', `/grupos/vida-de-servicio/${g}/inscripcion-abierta`, { abierta: true })).body as EdicionAdminDetalle).inscripcionAbierta).toBe(true);
    await prisma.grupo.update({ where: { id: g }, data: { estado: 'finalizado', motivoCierre: 'completado' } });
    for (const [metodo, ruta, cuerpo] of [
      ['put', 'inscripcion-abierta', { abierta: false }],
      ['post', 'lideres', { personaId: lider2 }],
      ['put', 'cronograma', { semanas: [{ numero: 1, fechaLiberacion: hoy }] }],
    ] as const) {
      const res = await admin(metodo, `/grupos/vida-de-servicio/${g}/${ruta}`, cuerpo);
      expect(res.body.code).toBe('GRUPO_NO_EN_CURSO');
    }
  });

  it('listado: filtra por estado y pendiente, con inscriptos y faltas; el Pastor lee; Pendientes del Inicio (FR-038, FR-039)', async () => {
    const g = await vs.edicion({ nombre: `Listado ${vs.sufijo}`, lideres: [lider1] });
    const a = await vs.apta('listado-a');
    const ia = await vs.inscribir(a, g);
    await prisma.inscripcion.update({ where: { id: ia }, data: { bajaPropuestaEn: new Date(), bajaPropuestaPorId: lider1, bajaPropuestaTipo: 'abandono' } });
    await prisma.grupo.update({ where: { id: g }, data: { propuestaFinalizacionEn: new Date(), propuestaFinalizacionPorId: lider1 } });

    const res = await como(pastorId, PASTOR, 'get', `/grupos/vida-de-servicio?q=${encodeURIComponent(`Listado ${vs.sufijo}`)}`);
    expect(res.status).toBe(200);
    expect(res.body.items as EdicionAdminResumen[]).toEqual([
      expect.objectContaining({ grupoId: g, estado: 'en_curso', inscriptosActivos: 1, pendientes: { finalizacion: true, bajas: 1 }, lideres: [expect.objectContaining({ personaId: lider1 })] }),
    ]);
    const conBaja = await admin('get', '/grupos/vida-de-servicio?pendiente=baja&take=100');
    expect((conBaja.body.items as EdicionAdminResumen[]).some((e) => e.grupoId === g)).toBe(true);
    const finalizadas = await admin('get', `/grupos/vida-de-servicio?estado=finalizado&q=${encodeURIComponent(`Listado ${vs.sufijo}`)}`);
    expect(finalizadas.body.total).toBe(0);

    const lineas = await app.get(RegistroPendientesAdmin).lineas(new Date());
    expect(lineas.map((l) => l.clave)).toEqual(expect.arrayContaining(['vida_servicio_finalizaciones', 'vida_servicio_bajas']));
    expect(lineas.find((l) => l.clave === 'vida_servicio_bajas')?.enlace).toBe('/grupos?curso=vida_de_servicio&pendiente=baja');
  });

  it('T068/FR-040: quitar lider_curso con una edición en curso se bloquea y la nombra; finalizada o ya sacado, se puede', async () => {
    const lider = await vs.lider('quitar');
    const otro = await vs.lider('queda');
    const g = await vs.edicion({ nombre: `Bloquea ${vs.sufijo}`, lideres: [lider, otro] });
    // T009: liderar Vida de Servicio no cuenta como discipulado activo (D137).
    expect(await discipuladosActivosDe(prisma, lider)).toEqual([]);
    const bloqueado = await admin('delete', `/personas/${lider}/roles/lider_curso`);
    expect(bloqueado.status).toBe(409);
    expect(bloqueado.body.code).toBe('LIDER_TIENE_GRUPOS_ACTIVOS');
    expect(JSON.stringify(bloqueado.body)).toContain(g);
    await admin('delete', `/grupos/vida-de-servicio/${g}/lideres/${lider}`);
    expect((await admin('delete', `/personas/${lider}/roles/lider_curso`)).status).toBe(200);
  });
});
