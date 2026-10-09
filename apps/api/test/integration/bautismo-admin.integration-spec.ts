import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { BautismoService } from '../../src/bautismo/bautismo.service.js';
import { AYER, EscenarioBautismo, levantarApp, tokenDe } from './bautismo-fixtures.js';

/**
 * spec 010, lote B — T027 (FR-007 a FR-011, FR-023), T034 (FR-012 a FR-015,
 * FR-017, FR-033), T035 (FR-016, FR-026), T053 (los avisos de cada
 * transición, SC-006), T056 (FR-027, FR-028, FR-005, FR-030) y la fuente
 * `bautismo` de la bandeja (FR-006).
 */
describe('Bautismo — el Admin (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioBautismo;
  let admin: string;
  let adminId: string;
  let pastor: string;
  let discipulador: string;
  const http = () => request(app.getHttpServer());
  const de = async (personaId: string) => `Bearer ${await tokenDe(personaId, ['miembro_registrado'])}`;
  const nombresDeAvisos = async (id: string) => (await esc.avisos(id)).map((a) => a.evento);

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioBautismo(prisma, `a${Date.now()}`);
    ({ adminId } = await esc.preparar());
    admin = `Bearer ${await tokenDe(adminId, ['miembro_registrado', 'admin'])}`;
    pastor = `Bearer ${await tokenDe(await esc.persona('pastor', { rol: ['miembro_registrado', 'pastor'] }), ['miembro_registrado', 'pastor'])}`;
    discipulador = `Bearer ${await tokenDe(await esc.persona('disc2', { rol: ['miembro_registrado', 'discipulador'] }), ['miembro_registrado', 'discipulador'])}`;
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  describe('detalle, aceptar y rechazar (FR-007 a FR-011)', () => {
    it('el detalle trae Vida Nueva, la habilitación con quién, el comentario y el motivo (solo para el equipo)', async () => {
      const id = await esc.persona('detalle', { vidaNueva: 'ninguna' });
      await prisma.persona.update({ where: { id }, data: { bautismoHabilitadoEn: new Date(), bautismoHabilitadoPorId: adminId } });
      const s = await prisma.solicitudBautismo.create({ data: { personaId: id, comentario: 'Con mi familia', creadoPorId: adminId }, select: { id: true } });
      const res = await http().get(`/bautismo/solicitudes/${s.id}`).set('Authorization', admin);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: s.id,
        estado: 'pendiente',
        comentario: 'Con mi familia',
        vidaNueva: { estado: 'ninguna', desde: null },
        habilitacion: { por: { id: adminId } },
        creadoPor: { id: adminId },
        evento: null,
        persona: { id, sinAccesoALaApp: false },
      });
      const enCurso = await esc.persona('detalle-vn');
      const s2 = await esc.solicitud(enCurso);
      const r2 = await http().get(`/bautismo/solicitudes/${s2.id}`).set('Authorization', pastor);
      expect(r2.status).toBe(200);
      expect(r2.body.vidaNueva.estado).toBe('en_curso');
      expect(r2.body.vidaNueva.desde).toEqual(expect.any(String));
      const completa = await esc.persona('detalle-vn-ok', { vidaNueva: 'completada' });
      const s3 = await esc.solicitud(completa);
      expect((await http().get(`/bautismo/solicitudes/${s3.id}`).set('Authorization', admin)).body.vidaNueva.estado).toBe('completada');
    });

    it('D220: el detalle trae el talle (null = "Sin dato" en los de antes); el Admin lo corrige; el Pastor no', async () => {
      const s = await esc.solicitud(await esc.persona('talle-detalle'));
      const antes = await http().get(`/bautismo/solicitudes/${s.id}`).set('Authorization', admin);
      expect(antes.body.talleRemera).toBeNull();
      const res = await http().put(`/bautismo/solicitudes/${s.id}/talle`).set('Authorization', admin).send({ talleRemera: 'XL' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: s.id, estado: 'pendiente', talleRemera: 'XL' });
      const malo = await http().put(`/bautismo/solicitudes/${s.id}/talle`).set('Authorization', admin).send({ talleRemera: 'grande' });
      expect(malo.status).toBe(400);
      expect(malo.body.errors).toEqual([{ campo: 'talleRemera', code: 'TALLE_INVALIDO' }]);
      const vacio = await http().put(`/bautismo/solicitudes/${s.id}/talle`).set('Authorization', admin).send({});
      expect(vacio.body.errors).toEqual([{ campo: 'talleRemera', code: 'TALLE_REQUERIDO' }]);
      expect((await http().put(`/bautismo/solicitudes/${s.id}/talle`).set('Authorization', pastor).send({ talleRemera: 'S' })).status).toBe(403);
      expect((await http().put('/bautismo/solicitudes/no-existe/talle').set('Authorization', admin).send({ talleRemera: 'S' })).status).toBe(404);
      expect((await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).talleRemera).toBe('XL');
    });

    it('aceptar → aprobada con quién y cuándo, un aviso, y la Persona ve esperando_fecha', async () => {
      const id = await esc.persona('acepta');
      const s = await esc.solicitud(id);
      const res = await http().post(`/bautismo/solicitudes/${s.id}/aceptar`).set('Authorization', admin).send({});
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ estado: 'aprobada', revisadoPor: { id: adminId }, evento: null });
      expect(await nombresDeAvisos(s.id)).toEqual(['bautismo.solicitud_aceptada']);
      expect((await http().get('/bautismo/me').set('Authorization', await de(id))).body.estado).toBe('esperando_fecha');
    });

    it('aceptar con eventoId → además asignada (inscripción confirmada creada por el Admin), dos avisos', async () => {
      const id = await esc.persona('acepta-con-fecha');
      const ev = await esc.eventoBautismo();
      const s = await esc.solicitud(id);
      const res = await http().post(`/bautismo/solicitudes/${s.id}/aceptar`).set('Authorization', admin).send({ eventoId: ev.id });
      expect(res.status).toBe(200);
      expect(res.body.evento).toMatchObject({ id: ev.id });
      const insc = await prisma.inscripcionEvento.findFirstOrThrow({ where: { personaId: id, eventoId: ev.id } });
      expect(insc).toMatchObject({ estado: 'confirmada', creadoPorId: adminId });
      expect((await nombresDeAvisos(s.id)).sort((x, y) => String(x).localeCompare(String(y)))).toEqual(['bautismo.fecha_asignada', 'bautismo.solicitud_aceptada']);
    });

    it('aceptar con un Evento que no es de bautismo → 409 y nada cambia', async () => {
      const id = await esc.persona('acepta-mal');
      const general = await esc.eventos.evento();
      const s = await esc.solicitud(id);
      const res = await http().post(`/bautismo/solicitudes/${s.id}/aceptar`).set('Authorization', admin).send({ eventoId: general.id });
      expect(res.body.code).toBe('EVENTO_NO_ES_DE_BAUTISMO');
      expect((await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).estado).toBe('pendiente');
    });

    it('rechazar con motivo → rechazada; la Persona ve puede_pedir sin el motivo', async () => {
      const id = await esc.persona('rechaza');
      const s = await esc.solicitud(id);
      const res = await http().post(`/bautismo/solicitudes/${s.id}/rechazar`).set('Authorization', admin).send({ motivo: 'Charlar antes con el equipo' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ estado: 'rechazada', motivoRechazo: 'Charlar antes con el equipo' });
      expect(await nombresDeAvisos(s.id)).toEqual(['bautismo.solicitud_rechazada']);
      const me = await http().get('/bautismo/me').set('Authorization', await de(id));
      expect(me.body).toEqual({ estado: 'puede_pedir', ultimo: 'rechazada' });
    });

    it('motivo de 501 → VALIDACION; aceptar una ya aceptada → 409 SOLICITUD_BAUTISMO_YA_CAMBIO', async () => {
      const id = await esc.persona('ya-cambio');
      const s = await esc.solicitud(id);
      const largo = await http().post(`/bautismo/solicitudes/${s.id}/rechazar`).set('Authorization', admin).send({ motivo: 'x'.repeat(501) });
      expect(largo.body.errors).toEqual([{ campo: 'motivo', code: 'MOTIVO_DEMASIADO_LARGO' }]);
      await http().post(`/bautismo/solicitudes/${s.id}/aceptar`).set('Authorization', admin).send({});
      const otra = await http().post(`/bautismo/solicitudes/${s.id}/aceptar`).set('Authorization', admin).send({});
      expect(otra.status).toBe(409);
      expect(otra.body.code).toBe('SOLICITUD_BAUTISMO_YA_CAMBIO');
      expect(await nombresDeAvisos(s.id)).toEqual(['bautismo.solicitud_aceptada']);
    });

    it('carrera: la Persona retira mientras el Admin acepta → una gana, la otra 409, estado coherente', async () => {
      const id = await esc.persona('carrera');
      const s = await esc.solicitud(id);
      const [retiro, acepto] = await Promise.all([
        http().post('/bautismo/solicitudes/me/retirar').set('Authorization', await de(id)),
        http().post(`/bautismo/solicitudes/${s.id}/aceptar`).set('Authorization', admin).send({}),
      ]);
      // El retiro siempre termina ganando: si el Admin llegó primero, retirar una aceptada sin fecha también vale (FR-020).
      expect(retiro.status).toBe(200);
      expect((await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).estado).toBe('retirada');
      if (acepto.status !== 200) expect(acepto.body.code).toBe('SOLICITUD_BAUTISMO_YA_CAMBIO');
      expect(await nombresDeAvisos(s.id)).toEqual(acepto.status === 200 ? ['bautismo.solicitud_aceptada'] : []);
    });

    it('el Pastor ve y no actúa (403); el Discipulador, nada', async () => {
      const s = await esc.solicitud(await esc.persona('permisos'));
      expect((await http().get(`/bautismo/solicitudes/${s.id}`).set('Authorization', pastor)).status).toBe(200);
      expect((await http().post(`/bautismo/solicitudes/${s.id}/aceptar`).set('Authorization', pastor).send({})).status).toBe(403);
      expect((await http().post(`/bautismo/solicitudes/${s.id}/rechazar`).set('Authorization', pastor).send({})).status).toBe(403);
      expect((await http().get(`/bautismo/solicitudes/${s.id}`).set('Authorization', discipulador)).status).toBe(403);
      expect((await http().get('/bautismo/eventos').set('Authorization', discipulador)).status).toBe(403);
    });
  });

  describe('asignar y quitar (FR-012 a FR-015, FR-017, FR-033)', () => {
    it('asigna dos, deja afuera una pendiente con su código (parcial-tolerante); un aviso por asignada', async () => {
      const ev = await esc.eventoBautismo();
      const a = await esc.solicitud(await esc.persona('asig-a'), 'aprobada');
      const b = await esc.solicitud(await esc.persona('asig-b'), 'aprobada');
      const p = await esc.solicitud(await esc.persona('asig-p'));
      const res = await http().post(`/bautismo/eventos/${ev.id}/asignar`).set('Authorization', admin).send({ solicitudIds: [a.id, b.id, p.id] });
      expect(res.status).toBe(200);
      expect([...res.body.asignadas].sort((x: string, y: string) => x.localeCompare(y))).toEqual([a.id, b.id].sort((x, y) => x.localeCompare(y)));
      expect(res.body.noAsignadas).toEqual([{ id: p.id, code: 'SOLICITUD_BAUTISMO_YA_CAMBIO' }]);
      for (const s of [a, b]) {
        const fila = await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id }, select: { inscripcionEvento: true } });
        expect(fila.inscripcionEvento).toMatchObject({ eventoId: ev.id, estado: 'confirmada', creadoPorId: adminId });
        expect(await nombresDeAvisos(s.id)).toEqual(['bautismo.fecha_asignada']);
      }
      // repetir es idempotente: ya está en ESE Evento
      const otra = await http().post(`/bautismo/eventos/${ev.id}/asignar`).set('Authorization', admin).send({ solicitudIds: [a.id] });
      expect(otra.body).toEqual({ asignadas: [a.id], noAsignadas: [] });
      expect(await prisma.inscripcionEvento.count({ where: { eventoId: ev.id, solicitudBautismo: { id: a.id } } })).toBe(1);
    });

    it('a un Evento que no es de bautismo, pasado o cancelado → 409; nada cambia', async () => {
      const s = await esc.solicitud(await esc.persona('asig-mal'), 'aprobada');
      const general = await esc.eventos.evento();
      const pasado = await esc.eventoBautismo({ inicio: AYER() });
      const cancelado = await esc.eventoBautismo({ estado: 'cancelado' });
      const r1 = await http().post(`/bautismo/eventos/${general.id}/asignar`).set('Authorization', admin).send({ solicitudIds: [s.id] });
      expect(r1.body.code).toBe('EVENTO_NO_ES_DE_BAUTISMO');
      for (const ev of [pasado, cancelado]) {
        const r = await http().post(`/bautismo/eventos/${ev.id}/asignar`).set('Authorization', admin).send({ solicitudIds: [s.id] });
        expect(r.status).toBe(409);
        expect(r.body.code).toBe('EVENTO_NO_DISPONIBLE_PARA_ASIGNAR');
      }
      expect((await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).inscripcionEventoId).toBeNull();
    });

    it('reasignar a otro Evento cancela la inscripción anterior y crea una nueva (FR-013)', async () => {
      const id = await esc.persona('reasigna');
      const ev1 = await esc.eventoBautismo();
      const ev2 = await esc.eventoBautismo();
      const s = await esc.asignada(id, ev1.id);
      const res = await http().post(`/bautismo/eventos/${ev2.id}/asignar`).set('Authorization', admin).send({ solicitudIds: [s.id] });
      expect(res.body.asignadas).toEqual([s.id]);
      expect((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: s.inscripcionId } })).estado).toBe('cancelada');
      const nueva = await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id }, select: { inscripcionEvento: { select: { eventoId: true } } } });
      expect(nueva.inscripcionEvento?.eventoId).toBe(ev2.id);
      expect((await esc.avisos(s.id)).map((a) => (a.params as { eventoId: string }).eventoId)).toEqual([ev2.id]);
    });

    it('reusa una inscripción abierta que el Admin hizo por la vía genérica de la 011', async () => {
      const id = await esc.persona('reusa');
      const ev = await esc.eventoBautismo();
      const previa = await esc.eventos.inscripcion(ev.id, id);
      const s = await esc.solicitud(id, 'aprobada');
      const res = await http().post(`/bautismo/eventos/${ev.id}/asignar`).set('Authorization', admin).send({ solicitudIds: [s.id] });
      expect(res.body.asignadas).toEqual([s.id]);
      expect((await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).inscripcionEventoId).toBe(previa);
    });

    it('quitar → FK null, inscripción cancelada, aviso, y la Persona ve esperando_fecha', async () => {
      const id = await esc.persona('quita');
      const ev = await esc.eventoBautismo();
      const s = await esc.asignada(id, ev.id);
      const res = await http().post(`/bautismo/solicitudes/${s.id}/quitar-de-evento`).set('Authorization', admin);
      expect(res.status).toBe(200);
      expect(res.body.evento).toBeNull();
      expect((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: s.inscripcionId } })).motivoCancelacion).toBe('admin');
      expect(await nombresDeAvisos(s.id)).toEqual(['bautismo.fecha_quitada']);
      expect((await http().get('/bautismo/me').set('Authorization', await de(id))).body.estado).toBe('esperando_fecha');
      const otra = await http().post(`/bautismo/solicitudes/${s.id}/quitar-de-evento`).set('Authorization', admin);
      expect(otra.body.code).toBe('SOLICITUD_BAUTISMO_YA_CAMBIO');
    });

    it('la sección del Evento: asignadas y esperando fecha paginada, la más antigua primero; Pastor ve, no asigna', async () => {
      const ev = await esc.eventoBautismo();
      await esc.asignada(await esc.persona('sec-asig'), ev.id);
      const vieja = await esc.solicitud(await esc.persona('sec-vieja'), 'aprobada');
      await prisma.solicitudBautismo.update({ where: { id: vieja.id }, data: { revisadaEn: new Date('2000-01-01T00:00:00Z') } });
      const res = await http().get(`/bautismo/eventos/${ev.id}?takeEsperando=1`).set('Authorization', pastor);
      expect(res.status).toBe(200);
      expect(res.body.asignadas.total).toBe(1);
      expect(res.body.esperandoFecha.items).toHaveLength(1);
      expect(res.body.esperandoFecha.items[0].solicitudId).toBe(vieja.id);
      expect(res.body.esperandoFecha.total).toBeGreaterThanOrEqual(2);
      expect(res.body.puedeConfirmar).toBe(false);
      const r2 = await http().get(`/bautismo/eventos/${ev.id}?takeEsperando=1&skipEsperando=1`).set('Authorization', admin);
      expect(r2.body.esperandoFecha.items[0].solicitudId).not.toBe(vieja.id);
      expect((await http().post(`/bautismo/eventos/${ev.id}/asignar`).set('Authorization', pastor).send({ solicitudIds: [vieja.id] })).status).toBe(403);
      const general = await esc.eventos.evento();
      expect((await http().get(`/bautismo/eventos/${general.id}`).set('Authorization', admin)).status).toBe(404);
    });

    it('D220: la sección del Evento resume los talles de TODAS las asignadas (no solo la página), con "Sin dato"', async () => {
      const ev = await esc.eventoBautismo();
      const talles = ['M', 'S', 'M', null, 'XXL'] as const;
      for (const [i, talle] of talles.entries()) {
        const { id } = await esc.asignada(await esc.persona(`talles-${i}`), ev.id);
        await prisma.solicitudBautismo.update({ where: { id }, data: { talleRemera: talle } });
      }
      // Una esperando fecha no cuenta: la remera es de las que van a ESTE Evento.
      const otra = await esc.solicitud(await esc.persona('talles-espera'), 'aprobada');
      await prisma.solicitudBautismo.update({ where: { id: otra.id }, data: { talleRemera: 'L' } });
      const res = await http().get(`/bautismo/eventos/${ev.id}?takeAsignadas=2`).set('Authorization', pastor);
      expect(res.status).toBe(200);
      expect(res.body.asignadas.items).toHaveLength(2);
      expect(res.body.talles).toEqual({
        talles: [
          { talle: 'S', cantidad: 1 },
          { talle: 'M', cantidad: 2 },
          { talle: 'XXL', cantidad: 1 },
        ],
        sinDato: 1,
        total: 5,
      });
      expect(res.body.asignadas.items[0]).toHaveProperty('talleRemera');
    });

    it('GET /bautismo/eventos: solo próximos de bautismo publicados', async () => {
      const futuro = await esc.eventoBautismo();
      const pasado = await esc.eventoBautismo({ inicio: AYER() });
      const ids = (await http().get('/bautismo/eventos').set('Authorization', admin)).body.map((e: { id: string }) => e.id);
      expect(ids).toContain(futuro.id);
      expect(ids).not.toContain(pasado.id);
    });
  });

  describe('Evento cancelado (FR-016, FR-026, hook E7)', () => {
    it('cancelar el Evento por la API de la 011 → todas las asignadas vuelven a esperar fecha, un aviso cada una', async () => {
      const ev = await esc.eventoBautismo();
      const s1 = await esc.asignada(await esc.persona('canc-1'), ev.id);
      const s2 = await esc.asignada(await esc.persona('canc-2'), ev.id);
      const s3 = await esc.asignada(await esc.persona('canc-3'), ev.id);
      const res = await http().post(`/eventos/${ev.id}/cancelar`).set('Authorization', admin);
      expect(res.status).toBe(200);
      for (const s of [s1, s2, s3]) {
        expect(await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ estado: 'aprobada', inscripcionEventoId: null });
        expect((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: s.inscripcionId } })).estado).toBe('cancelada');
        expect(await nombresDeAvisos(s.id)).toEqual(['bautismo.evento_cancelado']);
      }
    });

    it('si la transacción se revierte, nada cambia y no queda ningún aviso', async () => {
      const ev = await esc.eventoBautismo();
      const s = await esc.asignada(await esc.persona('canc-rev'), ev.id);
      const hooks = app.get(BautismoService);
      await expect(
        prisma.$transaction(async (tx) => {
          await hooks.liberarAsignacionesDeEvento(tx, ev.id);
          throw new Error('se revierte');
        }),
      ).rejects.toThrow('se revierte');
      expect((await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).inscripcionEventoId).toBe(s.inscripcionId);
      expect(await esc.avisos(s.id)).toEqual([]);
    });
  });

  describe('confirmar (FR-027, FR-028, FR-030)', () => {
    it('Evento futuro → 409 EVENTO_TODAVIA_NO_OCURRIO', async () => {
      const ev = await esc.eventoBautismo();
      const res = await http().post(`/bautismo/eventos/${ev.id}/confirmar`).set('Authorization', admin).send({ realizadas: [] });
      expect(res.body.code).toBe('EVENTO_TODAVIA_NO_OCURRIO');
    });

    it('pasado con tres: confirma dos → realizadas con la fecha del Evento; la tercera vuelve a esperar; idempotente', async () => {
      const inicio = AYER();
      const ev = await esc.eventoBautismo({ inicio });
      const personas = [await esc.persona('conf-1'), await esc.persona('conf-2'), await esc.persona('conf-3')];
      const [a, b, c] = [await esc.asignada(personas[0], ev.id), await esc.asignada(personas[1], ev.id), await esc.asignada(personas[2], ev.id)];
      const seccion = await http().get(`/bautismo/eventos/${ev.id}`).set('Authorization', admin);
      expect(seccion.body.puedeConfirmar).toBe(true);
      const res = await http().post(`/bautismo/eventos/${ev.id}/confirmar`).set('Authorization', admin).send({ realizadas: [a.id, b.id] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ realizadas: 2, devueltasAEspera: 1 });
      for (const s of [a, b]) {
        const fila = await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } });
        expect(fila.estado).toBe('realizada');
        expect(fila.realizadaEn?.toISOString()).toBe(inicio.toISOString());
        expect(await nombresDeAvisos(s.id)).toEqual(['bautismo.realizado']);
      }
      expect(await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ estado: 'aprobada', inscripcionEventoId: null });
      expect((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: c.inscripcionId } })).estado).toBe('confirmada');
      expect((await http().get('/bautismo/me').set('Authorization', await de(personas[0]))).body).toEqual({ estado: 'bautizada', en: inicio.toISOString() });
      expect((await http().get('/bautismo/me').set('Authorization', await de(personas[2]))).body.estado).toBe('esperando_fecha');
      const otra = await http().post(`/bautismo/eventos/${ev.id}/confirmar`).set('Authorization', admin).send({ realizadas: [a.id, b.id] });
      expect(otra.body).toEqual({ realizadas: 0, devueltasAEspera: 0 });
      expect(await nombresDeAvisos(a.id)).toEqual(['bautismo.realizado']);
      expect((await http().get(`/bautismo/eventos/${ev.id}`).set('Authorization', admin)).body.puedeConfirmar).toBe(false);
      const pide = await http().post('/bautismo/solicitudes/me').set('Authorization', await de(personas[0])).send({ talleRemera: 'M' });
      expect(pide.body.code).toBe('PERSONA_YA_BAUTIZADA');
    });

    it('un id que no está asignado a ese Evento → VALIDACION', async () => {
      const ev = await esc.eventoBautismo({ inicio: AYER() });
      const ajena = await esc.solicitud(await esc.persona('conf-ajena'), 'aprobada');
      const res = await http().post(`/bautismo/eventos/${ev.id}/confirmar`).set('Authorization', admin).send({ realizadas: [ajena.id] });
      expect(res.body.errors).toEqual([{ campo: 'realizadas', code: 'SOLICITUD_NO_ASIGNADA_A_ESTE_EVENTO' }]);
    });
  });

  describe('bandeja y pendientes (FR-006, FR-029)', () => {
    it('la bandeja trae las de bautismo con su Evento en extra, filtrables por tipo', async () => {
      const id = await esc.persona('bandeja');
      const ev = await esc.eventoBautismo();
      const s = await esc.asignada(id, ev.id);
      const res = await http().get(`/solicitudes?tipo=bautismo&filtro=todas&persona=${id}`).set('Authorization', admin);
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([expect.objectContaining({ tipo: 'bautismo', id: s.id, estado: 'aprobada', abierta: false, extra: { evento: expect.objectContaining({ id: ev.id }) } })]);
    });

    it('los pendientes del Inicio cuentan aceptadas sin fecha y Eventos pasados sin confirmar (los pedidos nuevos ya los cuenta la bandeja)', async () => {
      const ev = await esc.eventoBautismo({ inicio: AYER() });
      await esc.asignada(await esc.persona('pend-pasado'), ev.id);
      await esc.solicitud(await esc.persona('pend-pendiente'));
      await esc.solicitud(await esc.persona('pend-espera'), 'aprobada');
      const res = await http().get('/discipulado/pendientes-admin').set('Authorization', admin);
      const claves = res.body.extra.map((l: { clave: string }) => l.clave);
      expect(claves).toEqual(expect.arrayContaining(['bautismo_esperando_fecha', 'bautismo_sin_confirmar']));
    });
  });
});
