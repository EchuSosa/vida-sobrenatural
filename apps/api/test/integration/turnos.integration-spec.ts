import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { fechasDeServicio, hoyEnArgentina, sumarDias, type GrillaDeTurnos, type MiTurno, type TurnoAsignado } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { RecordatoriosTurnosService } from '../../src/turnos/recordatorios-turnos.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 017, entrega 2 (T011–T016; D252–D256): la grilla del líder, asignar (integrante, repetido,
 * otro Ministerio), publicar con avisos una sola vez, cambios en una fecha publicada, copiar la
 * anterior, "este día no hay" con aviso, el recordatorio, "mis turnos" y los permisos.
 */
describe('Turnos de servicio (spec 017, US2 y US3)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  const ministerios: string[] = [];
  let bienvenidaId: string;
  let ceremonialId: string;
  let seguridadId: string;
  let limpiezaId: string;
  const id: Record<string, string> = {};
  const token: Record<string, string> = {};
  const [d1, d2] = fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 2, hoyEnArgentina());
  const http = () => request(app.getHttpServer());
  const como = (quien: string) => ({ Authorization: `Bearer ${token[quien]}` });
  const asignar = (quien: string, ministerioId: string, dia: string, cuerpo: object) =>
    http().post(`/ministerios/${ministerioId}/fechas/${dia}/turnos`).set(como(quien)).send(cuerpo);
  const grilla = async (quien = 'lider', ministerioId = bienvenidaId) =>
    (await http().get(`/ministerios/${ministerioId}/turnos`).set(como(quien))).body as GrillaDeTurnos;
  const avisos = (evento: string, personaId: string) =>
    prisma.entregaNotificacion.findMany({
      where: { personaId, canal: 'app', notificacion: { evento, entidadTipo: 'turno' } },
      select: { notificacion: { select: { params: true, prioridad: true } } },
    });

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    const sufijo = `tur${Date.now()}`;
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    const roles: Record<string, string[]> = {
      admin: ['miembro_registrado', 'admin'],
      pastor: ['miembro_registrado', 'pastor'],
      lider: ['miembro_registrado', 'lider_ministerio'],
    };
    for (const quien of ['admin', 'pastor', 'lider', 'ajeno', 'ana', 'beto', 'caro', 'dani', 'nomiembro']) {
      id[quien] = await esc.persona(quien, { rol: roles[quien] ?? ['miembro_registrado'] });
      token[quien] = await tokenDe(id[quien], roles[quien] ?? ['miembro_registrado']);
    }
    bienvenidaId = (await prisma.ministerio.create({ data: { nombre: `Bienvenida ${sufijo}`, descripcion: 'Test' }, select: { id: true } })).id;
    ceremonialId = (await prisma.ministerio.create({ data: { nombre: `Ceremonial ${sufijo}`, descripcion: 'Test', cupoTurno: 2 }, select: { id: true } })).id;
    ministerios.push(bienvenidaId, ceremonialId);
    seguridadId = (await prisma.celula.create({ data: { ministerioId: bienvenidaId, nombre: 'Seguridad', cupoTurno: 2 }, select: { id: true } })).id;
    limpiezaId = (await prisma.celula.create({ data: { ministerioId: bienvenidaId, nombre: 'Limpieza' }, select: { id: true } })).id;
    for (const ministerioId of ministerios) {
      await prisma.diaDeServicio.create({ data: { ministerioId, frecuencia: 'semanal', diaSemana: 0, creadoPorId: id.admin } });
    }
    const aprobada = { estado: 'aprobada' as const, revisadoPorId: id.admin, revisadaEn: new Date() };
    await prisma.postulacion.createMany({
      data: [
        { personaId: id.ana, ministerioId: bienvenidaId, celulaId: seguridadId, ...aprobada },
        { personaId: id.beto, ministerioId: bienvenidaId, celulaId: seguridadId, ...aprobada },
        { personaId: id.caro, ministerioId: bienvenidaId, celulaId: null, ...aprobada },
        { personaId: id.dani, ministerioId: bienvenidaId, celulaId: limpiezaId, ...aprobada },
        { personaId: id.dani, ministerioId: ceremonialId, celulaId: null, ...aprobada },
      ],
    });
    await prisma.liderMinisterio.create({ data: { ministerioId: bienvenidaId, personaId: id.lider, asignadoPorId: id.admin } });
    // Una fecha publicada que ya pasó, con Ana: cuenta para "cuántas veces sirvió" (FR-007).
    const pasada = await prisma.fechaDeServicio.create({
      data: { ministerioId: bienvenidaId, dia: new Date(`${sumarDias(d1, -7)}T00:00:00Z`), estado: 'publicada', publicadaEn: new Date() },
      select: { id: true },
    });
    await prisma.turno.create({ data: { fechaId: pasada.id, personaId: id.ana, celulaId: seguridadId, asignadoPorId: id.lider } });
  });

  afterAll(async () => {
    await prisma.turno.deleteMany({ where: { fecha: { ministerioId: { in: ministerios } } } });
    await prisma.fechaDeServicio.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.diaDeServicio.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.liderMinisterio.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.postulacion.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.celula.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.ministerio.deleteMany({ where: { id: { in: ministerios } } });
    await esc.limpiar();
    await app.close();
  });

  it('la líder ve las próximas fechas en borrador, con áreas, cupos, lo que falta y cuántas veces sirvió cada uno', async () => {
    const g = await grilla();
    expect(g.puedeEditar).toBe(true);
    expect(g.areas).toEqual([
      { id: limpiezaId, nombre: 'Limpieza', cupo: 1 },
      { id: seguridadId, nombre: 'Seguridad', cupo: 2 },
    ]);
    expect(g.fechas).toHaveLength(8);
    expect(g.fechas[0]).toMatchObject({ dia: d1, estado: 'borrador', enOtroMinisterio: [] });
    expect(g.fechas[0].celdas).toEqual([
      { areaId: limpiezaId, turnos: [], faltan: 1, noPueden: [] },
      { areaId: seguridadId, turnos: [], faltan: 2, noPueden: [] },
    ]);
    const veces = Object.fromEntries(g.integrantes.map((i) => [i.persona.nombre, [i.areaId, i.vecesQueSirvio]]));
    expect(veces).toEqual({ ana: [seguridadId, 1], beto: [seguridadId, 0], caro: [null, 0], dani: [limpiezaId, 0] });
  });

  it('asignar: integrante de su área sí; repetido, de otra área, no integrante o sin área → error con el campo', async () => {
    expect((await asignar('lider', bienvenidaId, d1, { personaId: id.ana, celulaId: seguridadId })).status).toBe(201);
    expect((await asignar('lider', bienvenidaId, d1, { personaId: id.beto, celulaId: seguridadId })).status).toBe(201);
    // Caro no tiene área: puede ir en cualquiera.
    expect((await asignar('lider', bienvenidaId, d1, { personaId: id.caro, celulaId: limpiezaId })).status).toBe(201);

    const repetida = await asignar('lider', bienvenidaId, d1, { personaId: id.ana, celulaId: seguridadId });
    expect(repetida.status).toBe(409);
    expect(repetida.body.errors).toEqual([{ campo: 'personaId', code: 'YA_TIENE_TURNO_ESE_DIA' }]);
    const otraArea = await asignar('lider', bienvenidaId, d2, { personaId: id.ana, celulaId: limpiezaId });
    expect([otraArea.status, otraArea.body.code]).toEqual([409, 'NO_ES_INTEGRANTE']);
    const ajena = await asignar('lider', bienvenidaId, d1, { personaId: id.nomiembro, celulaId: seguridadId });
    expect(ajena.body.errors).toEqual([{ campo: 'personaId', code: 'NO_ES_INTEGRANTE' }]);
    const sinArea = await asignar('lider', bienvenidaId, d1, { personaId: id.beto });
    expect([sinArea.status, sinArea.body.errors]).toEqual([400, [{ campo: 'celulaId', code: 'AREA_INVALIDA' }]]);
    const lunes = await asignar('lider', bienvenidaId, sumarDias(d1, 1), { personaId: id.beto, celulaId: seguridadId });
    expect(lunes.body.code).toBe('NO_ES_DIA_DE_SERVICIO');

    const g = await grilla();
    expect(g.fechas[0].celdas.find((c) => c.areaId === seguridadId)).toMatchObject({ faltan: 0, turnos: [{ persona: { nombre: 'ana' } }, { persona: { nombre: 'beto' } }] });
    expect(g.fechas[0].celdas.find((c) => c.areaId === limpiezaId)).toMatchObject({ faltan: 0 });
    // En borrador no se avisa nada.
    expect(await avisos('turno.asignado', id.ana)).toEqual([]);
  });

  it('D255: si ese día ya sirve en otro Ministerio, se asigna igual y vuelve la advertencia', async () => {
    expect((await asignar('admin', ceremonialId, d1, { personaId: id.dani })).status).toBe(201);
    const r = await asignar('lider', bienvenidaId, d1, { personaId: id.dani, celulaId: limpiezaId });
    expect(r.status).toBe(201);
    const body = r.body as TurnoAsignado;
    expect(body.advertencias).toEqual([{ code: 'TURNO_EN_OTRO_MINISTERIO', ministerio: expect.stringContaining('Ceremonial') }]);
    expect((await grilla()).fechas[0].enOtroMinisterio).toEqual([{ personaId: id.dani, ministerio: expect.stringContaining('Ceremonial') }]);
  });

  it('publicar con tres toques a la vez: queda publicada y cada persona recibe UN aviso importante', async () => {
    const respuestas = await Promise.all([1, 2, 3].map(() => http().post(`/ministerios/${bienvenidaId}/fechas/${d1}/publicacion`).set(como('lider'))));
    expect(respuestas.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(respuestas.map((r) => r.body.avisados as number).sort((a, b) => a - b)).toEqual([0, 0, 4]);
    expect((await grilla()).fechas[0].estado).toBe('publicada');
    for (const quien of ['ana', 'beto', 'caro', 'dani']) expect(await avisos('turno.asignado', id[quien])).toHaveLength(1);
    const [aviso] = await avisos('turno.asignado', id.ana);
    expect(aviso.notificacion.prioridad).toBe('importante');
    expect(aviso.notificacion.params).toMatchObject({ dia: d1, lugar: expect.stringMatching(/^Bienvenida tur\d+ — Seguridad$/), fecha: expect.stringMatching(/^domingo, \d+ de /) });
    // El mail del importante queda pendiente (D256: in-app y mail).
    expect(await prisma.entregaNotificacion.count({ where: { personaId: id.ana, canal: 'email', notificacion: { evento: 'turno.asignado' } } })).toBe(1);
  });

  it('un cambio en la fecha publicada avisa a quien sale y a quien entra', async () => {
    const turnoBeto = (await grilla()).fechas[0].celdas.find((c) => c.areaId === seguridadId)!.turnos.find((t) => t.persona.nombre === 'beto')!;
    expect((await http().delete(`/turnos/${turnoBeto.id}`).set(como('lider'))).status).toBe(200);
    expect(await avisos('turno.quitado', id.beto)).toHaveLength(1);
    // D260: también por mail.
    expect(await prisma.entregaNotificacion.count({ where: { personaId: id.beto, canal: 'email', notificacion: { evento: 'turno.quitado' } } })).toBe(1);
    expect((await http().delete(`/turnos/${turnoBeto.id}`).set(como('lider'))).status).toBe(404);
    expect((await asignar('lider', bienvenidaId, d1, { personaId: id.beto, celulaId: seguridadId })).status).toBe(201);
    expect(await avisos('turno.asignado', id.beto)).toHaveLength(2);
  });

  it('mis turnos: solo los publicados y futuros, con el Ministerio y el área', async () => {
    const ana = (await http().get('/turnos/me').set(como('ana'))).body as MiTurno[];
    expect(ana).toEqual([{ id: expect.any(String), dia: d1, ministerio: { id: bienvenidaId, nombre: expect.stringContaining('Bienvenida') }, area: 'Seguridad' }]);
    // Dani: el de Ceremonial sigue en borrador, no se ve.
    const dani = (await http().get('/turnos/me').set(como('dani'))).body as MiTurno[];
    expect(dani.map((t) => [t.ministerio.id, t.area])).toEqual([[bienvenidaId, 'Limpieza']]);
  });

  it('copiar la fecha anterior trae a quienes siguen siendo integrantes, sin pisar; sin publicada antes → 409', async () => {
    const r = await http().post(`/ministerios/${bienvenidaId}/fechas/${d2}/copiar-anterior`).set(como('lider'));
    expect([r.status, r.body]).toEqual([200, { copiados: 4 }]);
    const otra = await http().post(`/ministerios/${bienvenidaId}/fechas/${d2}/copiar-anterior`).set(como('lider'));
    expect(otra.body).toEqual({ copiados: 0 });
    expect((await grilla()).fechas[1].celdas.flatMap((c) => c.turnos.map((t) => t.persona.nombre)).sort()).toEqual(['ana', 'beto', 'caro', 'dani']);
    const sinAnterior = await http().post(`/ministerios/${ceremonialId}/fechas/${d2}/copiar-anterior`).set(como('admin'));
    expect([sinAnterior.status, sinAnterior.body.code]).toEqual([409, 'SIN_FECHA_ANTERIOR']);
  });

  it('el recordatorio llega DIAS_RECORDATORIO_TURNO días antes, una sola vez', async () => {
    const recordatorios = app.get(RecordatoriosTurnosService);
    const hoy = sumarDias(d1, -2);
    await recordatorios.correr(hoy);
    await recordatorios.correr(hoy);
    for (const quien of ['ana', 'beto', 'caro', 'dani']) expect(await avisos('turno.recordatorio', id[quien])).toHaveLength(1);
  });

  it('"Este día no hay" en una fecha publicada: avisa a quienes tenían turno y la fecha sale de la grilla', async () => {
    const r = await http().post(`/ministerios/${bienvenidaId}/fechas/${d1}/suspension`).set(como('admin'));
    expect([r.status, r.body.avisados]).toEqual([201, 4]);
    for (const quien of ['ana', 'beto', 'caro', 'dani']) expect(await avisos('turno.fecha_suspendida', id[quien])).toHaveLength(1);
    // D260: también por mail; el recordatorio, no.
    expect(await prisma.entregaNotificacion.count({ where: { personaId: id.ana, canal: 'email', notificacion: { evento: 'turno.fecha_suspendida' } } })).toBe(1);
    expect(await prisma.entregaNotificacion.count({ where: { personaId: id.ana, canal: 'email', notificacion: { evento: 'turno.recordatorio' } } })).toBe(0);
    expect((await grilla()).fechas[0].dia).toBe(d2);
    const tarde = await asignar('lider', bienvenidaId, d1, { personaId: id.caro, celulaId: seguridadId });
    expect([tarde.status, tarde.body.code]).toEqual([409, 'FECHA_SUSPENDIDA']);
    expect((await http().get('/turnos/me').set(como('ana'))).body).toEqual([]);
  });

  it('permisos (D253): el Admin edita, el Pastor solo ve, alguien que no lidera no entra; sin sesión 401', async () => {
    expect((await grilla('admin')).puedeEditar).toBe(true);
    expect((await grilla('pastor')).puedeEditar).toBe(false);
    expect((await asignar('pastor', bienvenidaId, d2, { personaId: id.caro, celulaId: seguridadId })).status).toBe(403);
    expect((await http().get(`/ministerios/${bienvenidaId}/turnos`).set(como('ajeno'))).status).toBe(403);
    expect((await http().post(`/ministerios/${bienvenidaId}/fechas/${d2}/publicacion`).set(como('ajeno'))).status).toBe(403);
    // La líder de Bienvenida no arma Ceremonial.
    expect((await http().get(`/ministerios/${ceremonialId}/turnos`).set(como('lider'))).status).toBe(403);
    expect((await http().get(`/ministerios/${bienvenidaId}/turnos`)).status).toBe(401);
  });
});
