import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { Escenario, levantarApp, MARTES_19_A_21, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 012, T029 y T036 — la 004 y la activación de cuenta producen avisos
 * reales por el mecanismo único, dentro de su transacción (FR-011, FR-013,
 * FR-015, FR-018, FR-019; US2-1 a US2-4, US2-6, US2-7).
 */
describe('Avisos de la 004 y de la activación (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let admin: string;
  let tokenAdmin: string;
  const http = () => request(app.getHttpServer());

  const avisosDe = (personaId: string) =>
    prisma.entregaNotificacion.findMany({
      where: { personaId },
      select: { canal: true, estado: true, notificacion: { select: { evento: true, prioridad: true, params: true } } },
      orderBy: [{ createdAt: 'asc' }, { canal: 'asc' }],
    });

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `avd${Date.now()}`);
    await esc.preparar();
    admin = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    tokenAdmin = await tokenDe(admin, ['miembro_registrado', 'admin']);
  });

  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  it('proponer avisa al Discipulador y aceptar avisa a la Persona, los dos importantes (app + email) (US2-1, US2-3)', async () => {
    const disc = await esc.discipulador('disc');
    const persona = await esc.persona('ana');
    const solicitud = await prisma.solicitudDiscipulado.create({ data: { personaId: persona, franjas: { create: [MARTES_19_A_21] } }, select: { id: true } });

    const propuesta = await http().post(`/discipulado/solicitudes/${solicitud.id}/proponer`).set('Authorization', `Bearer ${tokenAdmin}`).send({ discipuladorId: disc });
    expect(propuesta.status).toBe(200);
    expect(await avisosDe(disc)).toEqual([
      { canal: 'app', estado: 'enviada', notificacion: { evento: 'discipulado.propuesta_nueva', prioridad: 'importante', params: { propuestaId: propuesta.body.propuestaId, solicitudId: solicitud.id } } },
      { canal: 'email', estado: expect.stringMatching(/pendiente|enviada|fallida/), notificacion: expect.objectContaining({ evento: 'discipulado.propuesta_nueva' }) },
    ]);

    const tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
    const aceptar = await http().post(`/discipulado/propuestas/${propuesta.body.propuestaId}/aceptar`).set('Authorization', `Bearer ${tokenDisc}`);
    expect(aceptar.status).toBe(200);
    const deAna = await avisosDe(persona);
    expect(deAna.map((a) => [a.canal, a.notificacion.evento, a.notificacion.prioridad])).toEqual([
      ['app', 'discipulado.propuesta_aceptada', 'importante'],
      ['email', 'discipulado.propuesta_aceptada', 'importante'],
    ]);
    expect(deAna[0].notificacion.params).toEqual({ solicitudId: solicitud.id, grupoId: aceptar.body.grupoId, discipuladorId: disc });
  });

  it('rechazar crea el importante sin motivo en los params (US2-2, FR-013)', async () => {
    const persona = await esc.persona('beto');
    const solicitud = await prisma.solicitudDiscipulado.create({ data: { personaId: persona, franjas: { create: [MARTES_19_A_21] } }, select: { id: true } });
    const r = await http().post(`/discipulado/solicitudes/${solicitud.id}/rechazar`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r.status).toBe(200);
    const avisos = await avisosDe(persona);
    expect(avisos.map((a) => a.canal)).toEqual(['app', 'email']);
    expect(avisos[0].notificacion).toEqual({ evento: 'discipulado.solicitud_rechazada', prioridad: 'importante', params: { solicitudId: solicitud.id } });
  });

  it('una Persona sin email recibe el aviso en la app y no tiene Entrega email (US3-3)', async () => {
    const persona = await esc.persona('sinmail');
    await prisma.persona.update({ where: { id: persona }, data: { email: null } });
    const solicitud = await prisma.solicitudDiscipulado.create({ data: { personaId: persona, franjas: { create: [MARTES_19_A_21] } }, select: { id: true } });
    await http().post(`/discipulado/solicitudes/${solicitud.id}/rechazar`).set('Authorization', `Bearer ${tokenAdmin}`).expect(200);
    expect((await avisosDe(persona)).map((a) => a.canal)).toEqual(['app']);
  });

  it('declinar no crea ningún aviso: va al Admin, que lo ve en Pendientes (US2-6, D201)', async () => {
    const disc = await esc.discipulador('disc2');
    const persona = await esc.persona('carla');
    const { propuestaId } = await esc.propuestaNueva(persona, disc, admin);
    const tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
    await http().post(`/discipulado/propuestas/${propuestaId}/declinar`).set('Authorization', `Bearer ${tokenDisc}`).send({ motivo: 'No puedo ese día' }).expect(200);
    expect(await prisma.notificacion.count({ where: { evento: 'discipulado.propuesta_declinada' } })).toBe(0);
    expect(await avisosDe(persona)).toEqual([]);
    expect(await avisosDe(admin)).toEqual([]);
  });

  it('una transición que falla después de emitir no deja aviso (US2-4, FR-011)', async () => {
    const persona = await esc.persona('rollback');
    const notificaciones = app.get(NotificacionesService);
    await expect(
      prisma.$transaction(async (tx) => {
        await notificaciones.emitir(tx, { nombre: 'discipulado.solicitud_rechazada', a: { tipo: 'persona', personaId: persona }, datos: { solicitudId: 'x' } });
        throw new Error('falla después de emitir');
      }),
    ).rejects.toThrow('falla después de emitir');
    expect(await avisosDe(persona)).toEqual([]);
  });

  it('activar a un menor crea su aviso importante y no lo duplica si se reintenta (T036, US2-7, FR-019)', async () => {
    const menor = await esc.persona('menor', { rol: [], fechaNacimiento: new Date('2014-03-01') });
    await prisma.persona.update({ where: { id: menor }, data: { estado: 'pendiente_tutor' } });
    const r = await http()
      .patch(`/personas/${menor}/activar`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ tutorNombre: 'Marta', tutorApellido: 'Gómez', tutorTelefono: '+5492215550000' });
    expect(r.status).toBe(200);
    const avisos = await avisosDe(menor);
    expect(avisos.map((a) => [a.canal, a.notificacion.evento, a.notificacion.prioridad])).toEqual([
      ['app', 'persona.cuenta_activada', 'importante'],
      ['email', 'persona.cuenta_activada', 'importante'],
    ]);
    // Reintentar la emisión (misma clave) no crea otro.
    const notificaciones = app.get(NotificacionesService);
    await prisma.$transaction((tx) => notificaciones.emitir(tx, { nombre: 'persona.cuenta_activada', a: { tipo: 'persona', personaId: menor }, datos: { personaId: menor } }));
    expect(await avisosDe(menor)).toHaveLength(2);
  });
});
