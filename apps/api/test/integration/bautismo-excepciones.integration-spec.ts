import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { EscenarioBautismo, levantarApp, tokenDe } from './bautismo-fixtures.js';

/**
 * spec 010, lote C — T048 (FR-021, FR-022) y cierre — T061 (H3: confirmar
 * "ya se bautizó" retira la Solicitud abierta), más el bloque Bautismo del
 * Perfil de Persona.
 */
describe('Bautismo — excepciones del Admin (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioBautismo;
  let admin: string;
  let adminId: string;
  let pastor: string;
  let discipulador: string;
  const http = () => request(app.getHttpServer());
  const de = async (personaId: string) => `Bearer ${await tokenDe(personaId, ['miembro_registrado'])}`;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioBautismo(prisma, `c${Date.now()}`);
    ({ adminId } = await esc.preparar());
    admin = `Bearer ${await tokenDe(adminId, ['miembro_registrado', 'admin'])}`;
    pastor = `Bearer ${await tokenDe(await esc.persona('pastor', { rol: ['miembro_registrado', 'pastor'] }), ['miembro_registrado', 'pastor'])}`;
    discipulador = `Bearer ${await tokenDe(await esc.persona('disc2', { rol: ['miembro_registrado', 'discipulador'] }), ['miembro_registrado', 'discipulador'])}`;
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  describe('habilitar (FR-021)', () => {
    it('habilitar → queda quién y cuándo, y la card de esa Persona ofrece pedir; es idempotente', async () => {
      const id = await esc.persona('habilitar', { vidaNueva: 'ninguna' });
      expect((await http().get('/bautismo/me').set('Authorization', await de(id))).body.estado).toBe('no_habilitada');
      const res = await http().put(`/personas/${id}/habilitacion-bautismo`).set('Authorization', admin);
      expect(res.status).toBe(200);
      expect(res.body.habilitacion).toMatchObject({ por: { id: adminId } });
      const en = res.body.habilitacion.en;
      const otra = await http().put(`/personas/${id}/habilitacion-bautismo`).set('Authorization', admin);
      expect(otra.body.habilitacion.en).toBe(en);
      expect((await http().get('/bautismo/me').set('Authorization', await de(id))).body.estado).toBe('puede_pedir');
    });

    it('deshabilitar con una Solicitud abierta → la Solicitud sigue; sin ella y sin Vida Nueva → no_habilitada', async () => {
      const id = await esc.persona('deshabilitar', { vidaNueva: 'ninguna' });
      await http().put(`/personas/${id}/habilitacion-bautismo`).set('Authorization', admin);
      await http().post('/bautismo/solicitudes/me').set('Authorization', await de(id)).send({ talleRemera: 'M' });
      const res = await http().delete(`/personas/${id}/habilitacion-bautismo`).set('Authorization', admin);
      expect(res.status).toBe(200);
      expect(res.body.habilitacion).toBeNull();
      expect((await http().get('/bautismo/me').set('Authorization', await de(id))).body.estado).toBe('en_revision');
      await http().post('/bautismo/solicitudes/me/retirar').set('Authorization', await de(id));
      expect((await http().get('/bautismo/me').set('Authorization', await de(id))).body.estado).toBe('no_habilitada');
    });

    it('Persona inexistente → 404; Pastor y Discipulador → 403', async () => {
      expect((await http().put('/personas/no-existe/habilitacion-bautismo').set('Authorization', admin)).status).toBe(404);
      const id = await esc.persona('perm-hab', { vidaNueva: 'ninguna' });
      expect((await http().put(`/personas/${id}/habilitacion-bautismo`).set('Authorization', pastor)).status).toBe(403);
      expect((await http().put(`/personas/${id}/habilitacion-bautismo`).set('Authorization', discipulador)).status).toBe(403);
      expect((await http().post('/bautismo/solicitudes').set('Authorization', discipulador).send({ personaId: id, talleRemera: 'S' })).status).toBe(403);
      expect((await http().post('/bautismo/solicitudes').set('Authorization', pastor).send({ personaId: id, talleRemera: 'S' })).status).toBe(403);
    });
  });

  describe('pedir en nombre de (FR-022)', () => {
    it('de un menor de 11 sin Vida Nueva → 201 con creadoPorId, sin aviso; aparece en la bandeja con "creada por"', async () => {
      const id = await esc.persona('menor', { edad: 10, vidaNueva: 'ninguna' });
      const res = await http().post('/bautismo/solicitudes').set('Authorization', admin).send({ personaId: id, talleRemera: 'S', comentario: 'Lo pidió su mamá' });
      expect(res.status).toBe(201);
      const fila = await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(fila).toMatchObject({ estado: 'pendiente', creadoPorId: adminId, comentario: 'Lo pidió su mamá', talleRemera: 'S' });
      expect(await esc.avisos(fila.id)).toEqual([]);
      const bandeja = await http().get(`/solicitudes?tipo=bautismo&persona=${id}`).set('Authorization', admin);
      expect(bandeja.body.items[0]).toMatchObject({ id: fila.id, creadoPor: { id: adminId } });
    });

    it('D220: sin talle → 400 TALLE_REQUERIDO en talleRemera y nada se crea', async () => {
      const id = await esc.persona('en-nombre-sin-talle');
      const res = await http().post('/bautismo/solicitudes').set('Authorization', admin).send({ personaId: id });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ campo: 'talleRemera', code: 'TALLE_REQUERIDO' }]);
      expect(await prisma.solicitudBautismo.count({ where: { personaId: id } })).toBe(0);
    });

    it('de alguien sin acceso a la app → 201, y si después entra ve su card en revisión', async () => {
      const id = await esc.persona('sin-app', { sinEmail: true });
      const res = await http().post('/bautismo/solicitudes').set('Authorization', admin).send({ personaId: id, talleRemera: 'S' });
      expect(res.status).toBe(201);
      expect((await http().get('/bautismo/me').set('Authorization', await de(id))).body.estado).toBe('en_revision');
      expect((await http().get(`/bautismo/solicitudes/${res.body.id}`).set('Authorization', admin)).body.persona.sinAccesoALaApp).toBe(true);
    });

    it('con una abierta → 409 SOLICITUD_BAUTISMO_YA_ABIERTA; bautizada → 409 PERSONA_YA_BAUTIZADA; inexistente → 404', async () => {
      const abierta = await esc.persona('en-nombre-abierta');
      await esc.solicitud(abierta);
      expect((await http().post('/bautismo/solicitudes').set('Authorization', admin).send({ personaId: abierta, talleRemera: 'S' })).body.code).toBe('SOLICITUD_BAUTISMO_YA_ABIERTA');
      const bautizada = await esc.persona('en-nombre-bautizada');
      await prisma.completitudManual.create({ data: { personaId: bautizada, etapa: 'bautismo', origen: 'admin', registradaPorId: adminId } });
      expect((await http().post('/bautismo/solicitudes').set('Authorization', admin).send({ personaId: bautizada, talleRemera: 'S' })).body.code).toBe('PERSONA_YA_BAUTIZADA');
      expect((await http().post('/bautismo/solicitudes').set('Authorization', admin).send({ personaId: 'no-existe', talleRemera: 'S' })).status).toBe(404);
    });
  });

  describe('el bloque Bautismo del Perfil (GET /bautismo/personas/:id)', () => {
    it('dice Vida Nueva, habilitación, si está bautizada y la Solicitud abierta con su Evento', async () => {
      const id = await esc.persona('perfil');
      const ev = await esc.eventoBautismo();
      const s = await esc.asignada(id, ev.id);
      const res = await http().get(`/bautismo/personas/${id}`).set('Authorization', pastor);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        activa: true,
        vidaNueva: { estado: 'en_curso' },
        habilitacion: null,
        bautizada: null,
        solicitudAbierta: { id: s.id, estado: 'aprobada', evento: { id: ev.id } },
      });
      expect((await http().get(`/bautismo/personas/${id}`).set('Authorization', discipulador)).status).toBe(403);
    });
  });

  describe('"ya se bautizó" por historial retira la Solicitud abierta (H3, T061)', () => {
    it('confirmar la declaración de bautismo → la Solicitud con fecha queda retirada y sale del Evento', async () => {
      const id = await esc.persona('declara');
      const ev = await esc.eventoBautismo();
      const s = await esc.asignada(id, ev.id);
      const decl = await prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'bautismo' }, select: { id: true } });
      const res = await http().post(`/historial/declaraciones/${decl.id}/confirmar`).set('Authorization', admin);
      expect(res.status).toBe(200);
      expect(await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ estado: 'retirada', inscripcionEventoId: null });
      expect((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: s.inscripcionId } })).estado).toBe('cancelada');
      expect((await http().get('/bautismo/me').set('Authorization', await de(id))).body).toEqual({ estado: 'bautizada', en: null });
    });

    it('registrar la etapa hecha desde el perfil también la retira; sin Solicitud abierta no hace nada', async () => {
      const id = await esc.persona('registra');
      const s = await esc.solicitud(id);
      const res = await http().post(`/personas/${id}/completitudes`).set('Authorization', admin).send({ etapa: 'bautismo' });
      expect(res.status).toBe(201);
      expect((await prisma.solicitudBautismo.findUniqueOrThrow({ where: { id: s.id } })).estado).toBe('retirada');
      const otra = await esc.persona('registra-sin');
      expect((await http().post(`/personas/${otra}/completitudes`).set('Authorization', admin).send({ etapa: 'bautismo' })).status).toBe(201);
    });
  });
});
