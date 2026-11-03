import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { fechasDeServicio, hoyEnArgentina, sumarDias, type GrillaDeTurnos, type MiTurno } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 017, entrega 3 (T022, T023; D257): "No puedo ir" (motivo solo para líderes y Admin, aviso a
 * los líderes sin motivo, una sola vez, no después de empezar) y los casos borde: baja del
 * integrante, regla quitada y Ministerio inactivo.
 */
describe('Turnos: "No puedo ir" y casos borde (spec 017, US4)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let ministerioId: string;
  let seguridadId: string;
  let reglaId: string;
  const postulacion: Record<string, string> = {};
  const id: Record<string, string> = {};
  const token: Record<string, string> = {};
  // Desde mañana: si hoy fuera domingo, la primera fecha ya habría empezado (D257).
  const [d1, d2] = fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 2, sumarDias(hoyEnArgentina(), 1));
  const http = () => request(app.getHttpServer());
  const como = (quien: string) => ({ Authorization: `Bearer ${token[quien]}` });
  const grilla = async (quien = 'lider') => (await http().get(`/ministerios/${ministerioId}/turnos`).set(como(quien))).body as GrillaDeTurnos;
  const avisos = (evento: string, personaId: string) =>
    prisma.entregaNotificacion.findMany({ where: { personaId, canal: 'app', notificacion: { evento } }, select: { notificacion: { select: { params: true } } } });
  const turnoDe = async (quien: string, dia: string) => (await prisma.turno.findFirstOrThrow({ where: { personaId: id[quien], estado: 'asignado', fecha: { ministerioId, dia: new Date(`${dia}T00:00:00Z`) } }, select: { id: true } })).id;
  const asignarYPublicar = async (dia: string, quienes: string[]) => {
    for (const quien of quienes) {
      const r = await http().post(`/ministerios/${ministerioId}/fechas/${dia}/turnos`).set(como('lider')).send({ personaId: id[quien], celulaId: seguridadId });
      expect(r.status).toBe(201);
    }
    expect((await http().post(`/ministerios/${ministerioId}/fechas/${dia}/publicacion`).set(como('lider'))).status).toBe(200);
  };

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    const sufijo = `tnp${Date.now()}`;
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    const roles: Record<string, string[]> = {
      admin: ['miembro_registrado', 'admin'],
      pastor: ['miembro_registrado', 'pastor'],
      lider: ['miembro_registrado', 'lider_ministerio'],
    };
    for (const quien of ['admin', 'pastor', 'lider', 'ana', 'beto', 'caro']) {
      id[quien] = await esc.persona(quien, { rol: roles[quien] ?? ['miembro_registrado'] });
      token[quien] = await tokenDe(id[quien], roles[quien] ?? ['miembro_registrado']);
    }
    ministerioId = (await prisma.ministerio.create({ data: { nombre: `Bienvenida ${sufijo}`, descripcion: 'Test' }, select: { id: true } })).id;
    seguridadId = (await prisma.celula.create({ data: { ministerioId, nombre: 'Seguridad', cupoTurno: 3 }, select: { id: true } })).id;
    reglaId = (await prisma.diaDeServicio.create({ data: { ministerioId, frecuencia: 'semanal', diaSemana: 0, creadoPorId: id.admin }, select: { id: true } })).id;
    for (const quien of ['ana', 'beto', 'caro']) {
      postulacion[quien] = (
        await prisma.postulacion.create({
          data: { personaId: id[quien], ministerioId, celulaId: seguridadId, estado: 'aprobada', revisadoPorId: id.admin, revisadaEn: new Date() },
          select: { id: true },
        })
      ).id;
    }
    await prisma.liderMinisterio.create({ data: { ministerioId, personaId: id.lider, asignadoPorId: id.admin } });
    await asignarYPublicar(d1, ['ana', 'beto', 'caro']);
  });

  afterAll(async () => {
    await prisma.turno.deleteMany({ where: { fecha: { ministerioId } } });
    await prisma.fechaDeServicio.deleteMany({ where: { ministerioId } });
    await prisma.diaDeServicio.deleteMany({ where: { ministerioId } });
    await prisma.liderMinisterio.deleteMany({ where: { ministerioId } });
    await prisma.postulacion.deleteMany({ where: { ministerioId } });
    await prisma.celula.deleteMany({ where: { ministerioId } });
    await prisma.ministerio.delete({ where: { id: ministerioId } });
    await esc.limpiar();
    await app.close();
  });

  it('"No puedo ir": el turno queda para cubrir, la líder ve el motivo y recibe UN aviso sin motivo ni nombre', async () => {
    const turno = await turnoDe('ana', d1);
    const [r1, r2] = await Promise.all([1, 2].map(() => http().post(`/turnos/${turno}/cancelacion`).set(como('ana')).send({ motivo: '  Viajo a ver a mi mamá  ' })));
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(await prisma.turno.findUnique({ where: { id: turno }, select: { estado: true, motivoCancelacion: true } })).toEqual({ estado: 'cancelado_por_persona', motivoCancelacion: 'Viajo a ver a mi mamá' });

    const avisosLider = await avisos('turno.no_puede', id.lider);
    expect(avisosLider).toHaveLength(1);
    expect(JSON.stringify(avisosLider[0].notificacion.params)).not.toMatch(/Viajo|ana/);

    const celda = (await grilla()).fechas[0].celdas[0];
    expect(celda.faltan).toBe(1);
    expect(celda.noPueden).toEqual([{ id: turno, persona: expect.objectContaining({ nombre: 'ana' }), motivo: 'Viajo a ver a mi mamá' }]);
    // D257: el Pastor ve que no puede, pero no el motivo.
    expect((await grilla('pastor')).fechas[0].celdas[0].noPueden[0].motivo).toBeNull();
    expect((await http().get('/turnos/me').set(como('ana'))).body).toEqual([]);
  });

  it('"No puedo ir": motivo largo → error en el campo; turno ajeno o en borrador → 404; con la fecha empezada → 409', async () => {
    const turnoBeto = await turnoDe('beto', d1);
    const largo = await http().post(`/turnos/${turnoBeto}/cancelacion`).set(como('beto')).send({ motivo: 'x'.repeat(201) });
    expect([largo.status, largo.body.errors]).toEqual([400, [{ campo: 'motivo', code: 'MOTIVO_CANCELACION_LARGO' }]]);
    expect((await http().post(`/turnos/${turnoBeto}/cancelacion`).set(como('caro')).send({})).status).toBe(404);

    expect((await http().post(`/ministerios/${ministerioId}/fechas/${d2}/turnos`).set(como('lider')).send({ personaId: id.beto, celulaId: seguridadId })).status).toBe(201);
    expect((await http().post(`/turnos/${await turnoDe('beto', d2)}/cancelacion`).set(como('beto')).send({})).status).toBe(404);

    // Una fecha publicada que es hoy: ya empezó.
    const hoy = await prisma.fechaDeServicio.create({ data: { ministerioId, dia: new Date(`${hoyEnArgentina()}T00:00:00Z`), estado: 'publicada', publicadaEn: new Date() }, select: { id: true } });
    const deHoy = await prisma.turno.create({ data: { fechaId: hoy.id, personaId: id.caro, celulaId: seguridadId, asignadoPorId: id.lider }, select: { id: true } });
    const tarde = await http().post(`/turnos/${deHoy.id}/cancelacion`).set(como('caro')).send({});
    expect([tarde.status, tarde.body.code]).toEqual([409, 'TURNO_YA_EMPEZO']);
    await prisma.turno.delete({ where: { id: deHoy.id } });
    await prisma.fechaDeServicio.delete({ where: { id: hoy.id } });
  });

  it('baja del integrante: sus turnos futuros quedan para cubrir y la líder recibe el aviso', async () => {
    const turnoBeto = await turnoDe('beto', d1);
    const antes = (await avisos('turno.no_puede', id.lider)).length;
    expect((await http().post(`/postulaciones/${postulacion.beto}/dar-de-baja`).set(como('admin')).send({})).status).toBe(200);
    expect(await prisma.turno.count({ where: { personaId: id.beto, estado: 'asignado' } })).toBe(0);
    expect(await prisma.turno.findUnique({ where: { id: turnoBeto }, select: { estado: true } })).toEqual({ estado: 'quitado' });
    // Uno solo: la fecha d1 está publicada; la d2 era borrador.
    expect(await avisos('turno.no_puede', id.lider)).toHaveLength(antes + 1);
  });

  it('el Ministerio inactivo: sus turnos dejan de verse; al reactivarlo vuelven', async () => {
    expect((await http().get('/turnos/me').set(como('caro'))).body as MiTurno[]).toHaveLength(1);
    await prisma.ministerio.update({ where: { id: ministerioId }, data: { activo: false } });
    expect((await http().get('/turnos/me').set(como('caro'))).body).toEqual([]);
    expect((await http().get(`/ministerios/${ministerioId}/turnos`).set(como('lider'))).status).toBe(404);
    await prisma.ministerio.update({ where: { id: ministerioId }, data: { activo: true } });
    expect((await http().get('/turnos/me').set(como('caro'))).body as MiTurno[]).toHaveLength(1);
  });

  it('quitar la regla: la fecha publicada se suspende y avisa a quien tenía turno', async () => {
    const r = await http().delete(`/ministerios/${ministerioId}/dias-de-servicio/${reglaId}`).set(como('admin'));
    expect([r.status, r.body.fechasSuspendidas]).toEqual([200, 1]);
    expect(await avisos('turno.fecha_suspendida', id.caro)).toHaveLength(1);
    expect(await prisma.fechaDeServicio.findFirst({ where: { ministerioId, dia: new Date(`${d1}T00:00:00Z`) }, select: { estado: true } })).toEqual({ estado: 'suspendida' });
    expect((await http().get('/turnos/me').set(como('caro'))).body).toEqual([]);
  });
});
