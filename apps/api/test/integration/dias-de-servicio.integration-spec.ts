import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { fechasDeServicio, hoyEnArgentina, type DiasDeServicioDelMinisterio } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/** spec 017, US1 (T004–T006): días de servicio, cupos y "este día no hay". */
describe('Días de servicio y cupos (spec 017, US1)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let ministerioId: string;
  let celulaId: string;
  let admin: string;
  let pastor: string;
  let miembro: string;
  const http = () => request(app.getHttpServer());
  const como = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    const sufijo = `dds${Date.now()}`;
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    admin = await tokenDe(await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] }), ['miembro_registrado', 'admin']);
    pastor = await tokenDe(await esc.persona('pastor', { rol: ['miembro_registrado', 'pastor'] }), ['miembro_registrado', 'pastor']);
    miembro = await tokenDe(await esc.persona('miembro'), ['miembro_registrado']);
    const m = await prisma.ministerio.create({ data: { nombre: `e2e-Turnos ${sufijo}`, descripcion: 'Test' }, select: { id: true } });
    ministerioId = m.id;
    celulaId = (await prisma.celula.create({ data: { ministerioId, nombre: 'Seguridad' }, select: { id: true } })).id;
  });

  afterAll(async () => {
    await prisma.fechaDeServicio.deleteMany({ where: { ministerioId } });
    await prisma.diaDeServicio.deleteMany({ where: { ministerioId } });
    await prisma.celula.deleteMany({ where: { ministerioId } });
    await prisma.ministerio.delete({ where: { id: ministerioId } });
    await esc.limpiar();
    await app.close();
  });

  it('sin reglas no hay fechas; con "todos los domingos" salen los próximos domingos', async () => {
    const antes = await http().get(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(admin));
    expect(antes.status).toBe(200);
    expect((antes.body as DiasDeServicioDelMinisterio).proximas).toEqual([]);

    const creada = await http().post(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(admin)).send({ frecuencia: 'semanal', diaSemana: 0 });
    expect(creada.status).toBe(201);
    expect(creada.body).toMatchObject({ frecuencia: 'semanal', diaSemana: 0, posicionEnMes: null });

    const vista = (await http().get(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(admin))).body as DiasDeServicioDelMinisterio;
    expect(vista.proximas.map((p) => p.dia)).toEqual(fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 8, hoyEnArgentina()));
    expect(vista.proximas.every((p) => p.estado === 'borrador' && p.turnosAsignados === 0)).toBe(true);
    expect(vista.celulas).toEqual([{ id: celulaId, nombre: 'Seguridad', cupoTurno: 1 }]);
  });

  it('la misma regla dos veces → 409 DIA_DE_SERVICIO_REPETIDO en el campo; tres pedidos a la vez crean una sola', async () => {
    const repetida = await http().post(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(admin)).send({ frecuencia: 'semanal', diaSemana: 0 });
    expect(repetida.status).toBe(409);
    expect(repetida.body.code).toBe('DIA_DE_SERVICIO_REPETIDO');
    expect(repetida.body.errors).toEqual([{ campo: 'diaSemana', code: 'DIA_DE_SERVICIO_REPETIDO' }]);

    const respuestas = await Promise.all(
      [1, 2, 3].map(() => http().post(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(admin)).send({ frecuencia: 'mensual', diaSemana: 6, posicionEnMes: 2 })),
    );
    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(await prisma.diaDeServicio.count({ where: { ministerioId, frecuencia: 'mensual', activo: true } })).toBe(1);
  });

  it('una regla mal armada → 400 con el error en cada campo', async () => {
    const r = await http().post(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(admin)).send({ frecuencia: 'mensual', diaSemana: 9, posicionEnMes: 7 });
    expect(r.status).toBe(400);
    expect(r.body.errors).toEqual([
      { campo: 'diaSemana', code: 'DIA_SEMANA_INVALIDO' },
      { campo: 'posicionEnMes', code: 'POSICION_EN_MES_INVALIDA' },
    ]);
  });

  it('quitar una regla la deja inactiva (no se borra) y saca sus fechas', async () => {
    const regla = await prisma.diaDeServicio.findFirstOrThrow({ where: { ministerioId, frecuencia: 'mensual', activo: true } });
    expect((await http().delete(`/ministerios/${ministerioId}/dias-de-servicio/${regla.id}`).set(como(admin))).status).toBe(200);
    expect(await prisma.diaDeServicio.findUnique({ where: { id: regla.id }, select: { activo: true } })).toEqual({ activo: false });
    expect((await http().delete(`/ministerios/${ministerioId}/dias-de-servicio/${regla.id}`).set(como(admin))).status).toBe(404);
  });

  it('cupo: 1 a 20; fuera de rango → 400 CUPO_TURNO_INVALIDO en el campo', async () => {
    expect((await http().patch(`/celulas/${celulaId}/cupo-turno`).set(como(admin)).send({ cupo: 3 })).body).toEqual({ cupo: 3 });
    expect((await http().patch(`/ministerios/${ministerioId}/cupo-turno`).set(como(admin)).send({ cupo: 2 })).body).toEqual({ cupo: 2 });
    for (const cupo of [0, 21, 1.5, '3']) {
      const r = await http().patch(`/celulas/${celulaId}/cupo-turno`).set(como(admin)).send({ cupo });
      expect(r.status).toBe(400);
      expect(r.body.errors).toEqual([{ campo: 'cupo', code: 'CUPO_TURNO_INVALIDO' }]);
    }
    expect(await prisma.celula.findUnique({ where: { id: celulaId }, select: { cupoTurno: true } })).toEqual({ cupoTurno: 3 });
  });

  it('suspender una fecha la marca "suspendida" y volver a habilitarla la deja en borrador', async () => {
    const [primera] = fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 1, hoyEnArgentina());
    const r = await http().post(`/ministerios/${ministerioId}/fechas/${primera}/suspension`).set(como(admin));
    expect(r.status).toBe(201);
    let vista = (await http().get(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(admin))).body as DiasDeServicioDelMinisterio;
    expect(vista.proximas[0]).toMatchObject({ dia: primera, estado: 'suspendida' });

    expect((await http().delete(`/ministerios/${ministerioId}/fechas/${primera}/suspension`).set(como(admin))).body).toEqual({ dia: primera, estado: 'borrador' });
    vista = (await http().get(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(admin))).body as DiasDeServicioDelMinisterio;
    expect(vista.proximas[0]).toMatchObject({ dia: primera, estado: 'borrador' });
  });

  it('suspender un día que no es de servicio → 409; una fecha que ya pasó → 409', async () => {
    const [domingo] = fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 1, hoyEnArgentina());
    const lunes = new Date(`${domingo}T00:00:00Z`);
    lunes.setUTCDate(lunes.getUTCDate() + 1);
    const r1 = await http().post(`/ministerios/${ministerioId}/fechas/${lunes.toISOString().slice(0, 10)}/suspension`).set(como(admin));
    expect(r1.status).toBe(409);
    expect(r1.body.code).toBe('NO_ES_DIA_DE_SERVICIO');
    const r2 = await http().post(`/ministerios/${ministerioId}/fechas/2020-01-05/suspension`).set(como(admin));
    expect(r2.status).toBe(409);
    expect(r2.body.code).toBe('FECHA_YA_PASO');
  });

  it('permisos (D253): el Pastor ve y no escribe; un miembro no ve; sin sesión 401', async () => {
    expect((await http().get(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(pastor))).status).toBe(200);
    expect((await http().post(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(pastor)).send({ frecuencia: 'semanal', diaSemana: 6 })).status).toBe(403);
    expect((await http().patch(`/celulas/${celulaId}/cupo-turno`).set(como(pastor)).send({ cupo: 5 })).status).toBe(403);
    expect((await http().get(`/ministerios/${ministerioId}/dias-de-servicio`).set(como(miembro))).status).toBe(403);
    expect((await http().get(`/ministerios/${ministerioId}/dias-de-servicio`)).status).toBe(401);
  });
});
