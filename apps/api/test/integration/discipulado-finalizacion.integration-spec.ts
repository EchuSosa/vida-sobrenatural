import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { discipuladosActivosDe } from '../../src/discipulado/discipulados-activos.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/** specs/004, T051 (FR-019 a FR-022) y la reasignación aceptada (FR-030), contra la base real. */
describe('Finalización y reasignación (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let admin: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `fin-${Date.now()}`);
    await esc.preparar();
    admin = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    tokenAdmin = await tokenDe(admin, ['miembro_registrado', 'admin']);
  });

  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('confirmar en un Grupo de dos pasa las dos a completada, cierra por completado, y deja de contar como activo', async () => {
    const disc = await esc.discipulador('disc', { max: 2 });
    const a = await esc.persona('ana');
    const b = await esc.persona('beto');
    const { grupoId } = await esc.grupo(disc, [a, b], admin);
    const tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
    const antes = await prisma.persona.findMany({ where: { id: { in: [a, b] } }, orderBy: { id: 'asc' } });

    expect((await http().post(`/discipulado/mis-discipulados/${grupoId}/finalizacion/proponer`).set('Authorization', `Bearer ${tokenDisc}`)).status).toBe(200);
    expect((await http().post(`/grupos/discipulados/${grupoId}/finalizacion/confirmar`).set('Authorization', `Bearer ${tokenAdmin}`)).status).toBe(200);

    const grupo = await prisma.grupo.findUnique({ where: { id: grupoId }, select: { estado: true, motivoCierre: true, cerradoPorId: true } });
    expect(grupo).toEqual({ estado: 'finalizado', motivoCierre: 'completado', cerradoPorId: admin });
    const estados = await prisma.inscripcion.findMany({ where: { grupoId }, select: { estado: true } });
    expect(estados.map((e) => e.estado)).toEqual(['completada', 'completada']);
    expect(await discipuladosActivosDe(prisma, disc)).toEqual([]);
    // FR-022: ninguna columna de `personas` cambia.
    const despues = await prisma.persona.findMany({ where: { id: { in: [a, b] } }, orderBy: { id: 'asc' } });
    expect(despues).toEqual(antes);
  });

  it('confirmar sin propuesta → 409 FINALIZACION_NO_PROPUESTA', async () => {
    const disc = await esc.discipulador('disc2');
    const { grupoId } = await esc.grupo(disc, [await esc.persona('caro')], admin);
    const res = await http().post(`/grupos/discipulados/${grupoId}/finalizacion/confirmar`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('FINALIZACION_NO_PROPUESTA');
  });

  it('rechazar con motivo y volver a proponer funciona; el Discipulador ve el motivo', async () => {
    const disc = await esc.discipulador('disc3');
    const { grupoId } = await esc.grupo(disc, [await esc.persona('dani')], admin);
    const tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
    await http().post(`/discipulado/mis-discipulados/${grupoId}/finalizacion/proponer`).set('Authorization', `Bearer ${tokenDisc}`);
    const rechazo = await http().post(`/grupos/discipulados/${grupoId}/finalizacion/rechazar`).set('Authorization', `Bearer ${tokenAdmin}`).send({ motivo: 'Faltan dos capítulos' });
    expect(rechazo.status).toBe(200);
    const detalle = await http().get(`/discipulado/mis-discipulados/${grupoId}`).set('Authorization', `Bearer ${tokenDisc}`);
    expect(detalle.body.propuestaFinalizacionEn).toBeNull();
    expect(detalle.body.finalizacionRechazada.motivo).toBe('Faltan dos capítulos');
    const otraVez = await http().post(`/discipulado/mis-discipulados/${grupoId}/finalizacion/proponer`).set('Authorization', `Bearer ${tokenDisc}`);
    expect(otraVez.status).toBe(200);
  });

  it('reasignar propone; hasta que acepte, el anterior sigue; al aceptar, el nuevo ve los Encuentros y el anterior ya no (FR-030)', async () => {
    const viejo = await esc.discipulador('viejo');
    const nuevo = await esc.discipulador('nuevo');
    const { grupoId } = await esc.grupo(viejo, [await esc.persona('eva')], admin);
    const tokenViejo = await tokenDe(viejo, ['miembro_registrado', 'discipulador']);
    const tokenNuevo = await tokenDe(nuevo, ['miembro_registrado', 'discipulador']);
    await http().post(`/discipulado/mis-discipulados/${grupoId}/encuentros`).set('Authorization', `Bearer ${tokenViejo}`).send({ fecha: '2026-09-01', capitulos: '1', notas: 'nota del anterior' });

    const cruce = await http().get(`/grupos/discipulados/${grupoId}/cruce`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(cruce.status).toBe(200);
    const enCruce = cruce.body.franjas.flatMap((f: { coinciden: Array<{ id: string }> }) => f.coinciden.map((d) => d.id));
    expect(enCruce).toContain(nuevo);
    expect(enCruce).not.toContain(viejo);

    const mismo = await http().post(`/grupos/discipulados/${grupoId}/reasignar`).set('Authorization', `Bearer ${tokenAdmin}`).send({ discipuladorId: viejo });
    expect(mismo.body.code).toBe('REASIGNACION_AL_MISMO_DISCIPULADOR');
    const propuesta = await http().post(`/grupos/discipulados/${grupoId}/reasignar`).set('Authorization', `Bearer ${tokenAdmin}`).send({ discipuladorId: nuevo });
    expect(propuesta.status).toBe(200);
    const doble = await http().post(`/grupos/discipulados/${grupoId}/reasignar`).set('Authorization', `Bearer ${tokenAdmin}`).send({ discipuladorId: nuevo });
    expect(doble.body.code).toBe('REASIGNACION_YA_PROPUESTA');

    expect((await http().get(`/discipulado/mis-discipulados/${grupoId}`).set('Authorization', `Bearer ${tokenViejo}`)).status).toBe(200);
    const listado = await http().get('/grupos/discipulados?pendiente=reasignacion').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(listado.body.items.map((i: { grupoId: string }) => i.grupoId)).toContain(grupoId);

    const acepta = await http().post(`/discipulado/propuestas/${propuesta.body.propuestaId}/aceptar`).set('Authorization', `Bearer ${tokenNuevo}`);
    expect(acepta.status).toBe(200);
    const delNuevo = await http().get(`/discipulado/mis-discipulados/${grupoId}`).set('Authorization', `Bearer ${tokenNuevo}`);
    expect(delNuevo.status).toBe(200);
    expect(delNuevo.body.encuentros[0].notas).toBe('nota del anterior');
    expect((await http().get(`/discipulado/mis-discipulados/${grupoId}`).set('Authorization', `Bearer ${tokenViejo}`)).status).toBe(404);
    const liderazgos = await prisma.liderazgo.findMany({ where: { grupoId }, select: { personaId: true, hasta: true, cerradoPorId: true }, orderBy: { desde: 'asc' } });
    expect(liderazgos).toEqual([
      { personaId: viejo, hasta: expect.any(Date), cerradoPorId: admin },
      { personaId: nuevo, hasta: null, cerradoPorId: null },
    ]);
  });

  it('retirar una reasignación la saca del listado de pendientes', async () => {
    const viejo = await esc.discipulador('viejo2');
    const nuevo = await esc.discipulador('nuevo2');
    const { grupoId } = await esc.grupo(viejo, [await esc.persona('fede')], admin);
    await http().post(`/grupos/discipulados/${grupoId}/reasignar`).set('Authorization', `Bearer ${tokenAdmin}`).send({ discipuladorId: nuevo });
    expect((await http().post(`/grupos/discipulados/${grupoId}/reasignar/retirar`).set('Authorization', `Bearer ${tokenAdmin}`)).status).toBe(200);
    const detalle = await http().get(`/grupos/discipulados/${grupoId}`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(detalle.body.reasignacionPropuesta).toBeNull();
    const deNuevo = await http().post(`/grupos/discipulados/${grupoId}/reasignar/retirar`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(deNuevo.body.code).toBe('PROPUESTA_NO_VIGENTE');

    // D219: al Discipulador propuesto le llega un aviso in-app (normal: sin mail) de que ya no hace falta responder.
    const avisos = await prisma.entregaNotificacion.findMany({
      where: { personaId: nuevo, notificacion: { evento: 'discipulado.reasignacion_retirada' } },
      select: { canal: true, notificacion: { select: { prioridad: true, params: true } } },
    });
    expect(avisos).toEqual([{ canal: 'app', notificacion: { prioridad: 'normal', params: { propuestaId: expect.any(String), grupoId } } }]);
  });
});
