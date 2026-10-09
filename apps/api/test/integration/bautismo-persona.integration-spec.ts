import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { AYER, EscenarioBautismo, levantarApp, tokenDe } from './bautismo-fixtures.js';

/**
 * spec 010, lote A — T019 (FR-001 a FR-005, FR-025) y T042 (FR-020,
 * FR-020a): la Persona pide, ve su card, retira y dice "No puedo ese día".
 * También T010 (FR-004, FR-034): las restricciones de la base.
 */
describe('Bautismo — la Persona (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioBautismo;
  const http = () => request(app.getHttpServer());
  const como = async (personaId: string) => `Bearer ${await tokenDe(personaId, ['miembro_registrado'])}`;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioBautismo(prisma, `p${Date.now()}`);
    await esc.preparar();
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  describe('pedir (FR-001 a FR-005)', () => {
    it('con Vida Nueva en curso → 201 en_revision, fila pendiente creada por ella misma, sin aviso', async () => {
      const id = await esc.persona('vn-en-curso');
      const res = await http().post('/bautismo/solicitudes/me').set('Authorization', await como(id)).send({ comentario: '  Quiero hacerlo en familia ', talleRemera: 'L' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ estado: 'en_revision' });
      const fila = await prisma.solicitudBautismo.findFirstOrThrow({ where: { personaId: id } });
      expect(fila).toMatchObject({ estado: 'pendiente', creadoPorId: null, comentario: 'Quiero hacerlo en familia', talleRemera: 'L' });
      expect(await esc.avisos(fila.id)).toEqual([]);
      const me = await http().get('/bautismo/me').set('Authorization', await como(id));
      expect(me.body).toEqual({ estado: 'en_revision', solicitudId: fila.id, desde: fila.createdAt.toISOString() });
    });

    it('con Vida Nueva completada → 201', async () => {
      const id = await esc.persona('vn-completada', { vidaNueva: 'completada' });
      const res = await http().post('/bautismo/solicitudes/me').set('Authorization', await como(id)).send({ talleRemera: 'M' });
      expect(res.status).toBe(201);
    });

    it('con Vida Nueva registrada por historial (D144) → 201', async () => {
      const id = await esc.persona('vn-historial', { vidaNueva: 'ninguna' });
      await prisma.completitudManual.create({ data: { personaId: id, etapa: 'vida_nueva', origen: 'admin', registradaPorId: id } });
      const res = await http().post('/bautismo/solicitudes/me').set('Authorization', await como(id)).send({ talleRemera: 'M' });
      expect(res.status).toBe(201);
    });

    it('sin Vida Nueva → 409 BAUTISMO_NO_HABILITADO y la card dice no_habilitada', async () => {
      const id = await esc.persona('sin-vn', { vidaNueva: 'ninguna' });
      const me = await http().get('/bautismo/me').set('Authorization', await como(id));
      expect(me.body).toEqual({ estado: 'no_habilitada' });
      const res = await http().post('/bautismo/solicitudes/me').set('Authorization', await como(id)).send({ talleRemera: 'M' });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('BAUTISMO_NO_HABILITADO');
      expect(await prisma.solicitudBautismo.count({ where: { personaId: id } })).toBe(0);
    });

    it('habilitada sin Vida Nueva → 201', async () => {
      const id = await esc.persona('habilitada', { vidaNueva: 'ninguna' });
      await prisma.persona.update({ where: { id }, data: { bautismoHabilitadoEn: new Date(), bautismoHabilitadoPorId: id } });
      const res = await http().post('/bautismo/solicitudes/me').set('Authorization', await como(id)).send({ talleRemera: 'M' });
      expect(res.status).toBe(201);
    });

    it('11 años → 409 EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO (la card: lo_pide_su_tutor); 12 → 201', async () => {
      const menor = await esc.persona('once', { edad: 11 });
      expect((await http().get('/bautismo/me').set('Authorization', await como(menor))).body).toEqual({ estado: 'lo_pide_su_tutor' });
      const res = await http().post('/bautismo/solicitudes/me').set('Authorization', await como(menor)).send({ talleRemera: 'M' });
      expect(res.body.code).toBe('EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO');
      const doce = await esc.persona('doce', { edad: 12 });
      expect((await http().post('/bautismo/solicitudes/me').set('Authorization', await como(doce)).send({ talleRemera: 'M' })).status).toBe(201);
    });

    it('dos pedidos a la vez → uno 201 y otro 409 SOLICITUD_BAUTISMO_YA_ABIERTA, una sola fila (FR-004)', async () => {
      const id = await esc.persona('doble');
      const token = await como(id);
      const [a, b] = await Promise.all([
        http().post('/bautismo/solicitudes/me').set('Authorization', token).send({ talleRemera: 'M' }),
        http().post('/bautismo/solicitudes/me').set('Authorization', token).send({ talleRemera: 'M' }),
      ]);
      expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);
      expect([a.body.code, b.body.code]).toContain('SOLICITUD_BAUTISMO_YA_ABIERTA');
      expect(await prisma.solicitudBautismo.count({ where: { personaId: id } })).toBe(1);
    });

    it('ya bautizada → 409 PERSONA_YA_BAUTIZADA y la card dice bautizada con la fecha', async () => {
      const id = await esc.persona('bautizada');
      const fecha = new Date('2025-11-15T21:00:00.000Z');
      await prisma.solicitudBautismo.create({ data: { personaId: id, estado: 'realizada', realizadaEn: fecha } });
      expect((await http().get('/bautismo/me').set('Authorization', await como(id))).body).toEqual({ estado: 'bautizada', en: fecha.toISOString() });
      const res = await http().post('/bautismo/solicitudes/me').set('Authorization', await como(id)).send({ talleRemera: 'M' });
      expect(res.body.code).toBe('PERSONA_YA_BAUTIZADA');
    });

    it('comentario de 501 caracteres → 400 VALIDACION en comentario', async () => {
      const id = await esc.persona('largo');
      const res = await http().post('/bautismo/solicitudes/me').set('Authorization', await como(id)).send({ comentario: 'a'.repeat(501), talleRemera: 'M' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ campo: 'comentario', code: 'COMENTARIO_DEMASIADO_LARGO' }]);
    });

    it('D220: sin talle → 400 TALLE_REQUERIDO; un talle que no existe → TALLE_INVALIDO; nada se crea', async () => {
      const id = await esc.persona('sin-talle');
      const token = await como(id);
      const sin = await http().post('/bautismo/solicitudes/me').set('Authorization', token).send({});
      expect(sin.status).toBe(400);
      expect(sin.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'talleRemera', code: 'TALLE_REQUERIDO' }] });
      const vacio = await http().post('/bautismo/solicitudes/me').set('Authorization', token).send({ talleRemera: '' });
      expect(vacio.body.errors).toEqual([{ campo: 'talleRemera', code: 'TALLE_REQUERIDO' }]);
      const malo = await http().post('/bautismo/solicitudes/me').set('Authorization', token).send({ talleRemera: 'XXXXL' });
      expect(malo.body.errors).toEqual([{ campo: 'talleRemera', code: 'TALLE_INVALIDO' }]);
      const dos = await http().post('/bautismo/solicitudes/me').set('Authorization', token).send({ comentario: 'a'.repeat(501) });
      expect(dos.body.errors).toEqual([
        { campo: 'comentario', code: 'COMENTARIO_DEMASIADO_LARGO' },
        { campo: 'talleRemera', code: 'TALLE_REQUERIDO' },
      ]);
      expect(await prisma.solicitudBautismo.count({ where: { personaId: id } })).toBe(0);
    });

    it('rechazada antes: la card ofrece pedir de nuevo con "ultimo: rechazada" y nunca el motivo', async () => {
      const id = await esc.persona('rechazada');
      await prisma.solicitudBautismo.create({ data: { personaId: id, estado: 'rechazada', motivoRechazo: 'Hablar primero con su Discipuladora' } });
      const me = await http().get('/bautismo/me').set('Authorization', await como(id));
      expect(me.body).toEqual({ estado: 'puede_pedir', ultimo: 'rechazada' });
      expect(JSON.stringify(me.body)).not.toContain('Discipuladora');
    });
  });

  describe('retirar y "No puedo ese día" (FR-020, FR-020a)', () => {
    it('retirar una pendiente → retirada, card puede_pedir { ultimo: retirada }, y puede volver a pedir', async () => {
      const id = await esc.persona('retira');
      const token = await como(id);
      await http().post('/bautismo/solicitudes/me').set('Authorization', token).send({ talleRemera: 'M' });
      const res = await http().post('/bautismo/solicitudes/me/retirar').set('Authorization', token);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ estado: 'puede_pedir', ultimo: 'retirada' });
      const fila = await prisma.solicitudBautismo.findFirstOrThrow({ where: { personaId: id } });
      expect(fila.estado).toBe('retirada');
      expect(fila.retiradaEn).not.toBeNull();
      expect(await esc.avisos(fila.id)).toEqual([]);
      expect((await http().post('/bautismo/solicitudes/me').set('Authorization', token).send({ talleRemera: 'M' })).status).toBe(201);
    });

    it('retirar con fecha → sale del Evento (inscripción cancelada por la Persona, FK null)', async () => {
      const id = await esc.persona('retira-con-fecha');
      const ev = await esc.eventoBautismo();
      const s = await esc.asignada(id, ev.id);
      const res = await http().post('/bautismo/solicitudes/me/retirar').set('Authorization', await como(id));
      expect(res.status).toBe(200);
      const fila = await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } });
      expect(fila).toMatchObject({ estado: 'retirada', inscripcionEventoId: null });
      const insc = await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: s.inscripcionId } });
      expect(insc).toMatchObject({ estado: 'cancelada', motivoCancelacion: 'persona', canceladaPorId: id });
    });

    it('retirar con un Evento ya pasado sin confirmar → 409 (lo resuelve el Admin)', async () => {
      const id = await esc.persona('retira-pasado');
      const ev = await esc.eventoBautismo({ inicio: AYER() });
      await esc.asignada(id, ev.id);
      const me = await http().get('/bautismo/me').set('Authorization', await como(id));
      expect(me.body.estado).toBe('fecha_pasada_sin_confirmar');
      const res = await http().post('/bautismo/solicitudes/me/retirar').set('Authorization', await como(id));
      expect(res.body.code).toBe('SOLICITUD_BAUTISMO_YA_CAMBIO');
    });

    it('retirar sin nada abierto (o ya realizada) → 409', async () => {
      const id = await esc.persona('nada-que-retirar');
      await prisma.solicitudBautismo.create({ data: { personaId: id, estado: 'realizada', realizadaEn: new Date() } });
      const res = await http().post('/bautismo/solicitudes/me/retirar').set('Authorization', await como(id));
      expect(res.body.code).toBe('SOLICITUD_BAUTISMO_YA_CAMBIO');
    });

    it('"No puedo ese día" con Evento futuro → esperando_fecha, sigue aceptada, sin aviso', async () => {
      const id = await esc.persona('no-puedo');
      const ev = await esc.eventoBautismo({ lugar: 'Río de la Plata, Punta Lara' });
      const s = await esc.asignada(id, ev.id);
      const antes = await http().get('/bautismo/me').set('Authorization', await como(id));
      expect(antes.body).toMatchObject({ estado: 'con_fecha', evento: { id: ev.id, lugar: 'Río de la Plata, Punta Lara' } });
      const res = await http().post('/bautismo/solicitudes/me/no-puedo').set('Authorization', await como(id));
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('esperando_fecha');
      expect(await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ estado: 'aprobada', inscripcionEventoId: null });
      expect((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: s.inscripcionId } })).estado).toBe('cancelada');
      expect(await esc.avisos(s.id)).toEqual([]);
    });

    it('"No puedo" sin Evento o con Evento pasado → 409', async () => {
      const sin = await esc.persona('no-puedo-sin');
      await esc.solicitud(sin, 'aprobada');
      expect((await http().post('/bautismo/solicitudes/me/no-puedo').set('Authorization', await como(sin))).body.code).toBe('SOLICITUD_BAUTISMO_YA_CAMBIO');
      const pasado = await esc.persona('no-puedo-pasado');
      await esc.asignada(pasado, (await esc.eventoBautismo({ inicio: AYER() })).id);
      expect((await http().post('/bautismo/solicitudes/me/no-puedo').set('Authorization', await como(pasado))).body.code).toBe('SOLICITUD_BAUTISMO_YA_CAMBIO');
    });

    it('la card lee nombre y lugar del Evento vigente (cambiar el lugar cambia lo que ve)', async () => {
      const id = await esc.persona('lee-evento');
      const ev = await esc.eventoBautismo({ lugar: 'Templo central' });
      await esc.asignada(id, ev.id);
      await prisma.evento.update({ where: { id: ev.id }, data: { lugar: null } });
      const me = await http().get('/bautismo/me').set('Authorization', await como(id));
      expect(me.body.evento.lugar).toBe('Calle 7 entre 50 y 51'); // la dirección de la Sede (D190)
    });
  });

  describe('restricciones de la base (T010: FR-004, FR-034)', () => {
    it('dos pendientes de la misma Persona: la segunda falla por el índice; pendiente + rechazada conviven', async () => {
      const id = await esc.persona('indice');
      await prisma.solicitudBautismo.create({ data: { personaId: id } });
      await expect(prisma.solicitudBautismo.create({ data: { personaId: id } })).rejects.toMatchObject({ code: 'P2002' });
      await expect(prisma.solicitudBautismo.create({ data: { personaId: id, estado: 'rechazada' } })).resolves.toBeDefined();
    });

    it('realizada sin realizadaEn falla; pendiente con inscripción falla', async () => {
      const id = await esc.persona('checks');
      await expect(prisma.solicitudBautismo.create({ data: { personaId: id, estado: 'realizada' } })).rejects.toBeDefined();
      const ev = await esc.eventoBautismo();
      const insc = await prisma.inscripcionEvento.create({ data: { eventoId: ev.id, personaId: id, estado: 'confirmada' }, select: { id: true } });
      await expect(prisma.solicitudBautismo.create({ data: { personaId: id, inscripcionEventoId: insc.id } })).rejects.toBeDefined();
    });
  });
});
