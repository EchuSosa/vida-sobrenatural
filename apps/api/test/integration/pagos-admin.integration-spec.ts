import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { EventoAviso } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { registrarAvisos } from './camino-fixtures.js';
import { EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T068 — FR-033 a FR-036, SC-004. */
describe('Verificación de Pagos (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let admin: string;
  let adminId: string;
  let avisos: { emitidos: EventoAviso[]; restaurar: () => void };
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `paga${Date.now()}`);
    await esc.preparar();
    adminId = await esc.persona('admin', { rol: ['admin'] });
    admin = await tokenDe(adminId, ['admin']);
    avisos = registrarAvisos(app.get(NotificacionesService));
  });
  afterAll(async () => {
    avisos.restaurar();
    await esc.limpiar();
    await app.close();
  });
  beforeEach(() => avisos.emitidos.splice(0));

  const conCosto = (datos = {}) => esc.evento({ costo: '1000.00', instruccionesPago: 'Alias', ...datos });

  it('verificar registra quién y cuándo y emite pago_verificado (FR-033)', async () => {
    const insc = await esc.inscripcion((await conCosto()).id, await esc.persona('v'));
    const pago = await esc.pago(insc);
    const r = await http().post(`/pagos/${pago}/verificar`).set('Authorization', `Bearer ${admin}`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ estado: 'verificado', verificadoPor: { id: adminId } });
    expect(r.body.revisadoEn).not.toBeNull();
    expect(avisos.emitidos.map((a) => a.nombre)).toEqual(['evento.pago_verificado']);
    expect((await http().post(`/pagos/${pago}/verificar`).set('Authorization', `Bearer ${admin}`)).body.code).toBe('PAGO_NO_PENDIENTE');
  });

  it('rechazar sin motivo → error de campo', async () => {
    const pago = await esc.pago(await esc.inscripcion((await conCosto()).id, await esc.persona('sm')));
    const r = await http().post(`/pagos/${pago}/rechazar`).set('Authorization', `Bearer ${admin}`).send({ motivo: ' ' });
    expect(r.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'motivo', code: 'MOTIVO_REQUERIDO' }] });
  });

  it('rechazar cancela la Inscripción, libera el lugar y promueve a la primera de la lista (FR-035, SC-004)', async () => {
    const ev = await conCosto({ cupo: 1, permiteListaEspera: true });
    const insc = await esc.inscripcion(ev.id, await esc.persona('r'));
    const enLista = await esc.inscripcion(ev.id, await esc.persona('rl'), 'lista_espera');
    const pago = await esc.pago(insc);
    const r = await http().post(`/pagos/${pago}/rechazar`).set('Authorization', `Bearer ${admin}`).send({ motivo: 'No se ve el monto' });
    expect(r.body).toMatchObject({ estado: 'rechazado', motivoRechazo: 'No se ve el monto' });
    expect(await prisma.inscripcionEvento.findUnique({ where: { id: insc }, select: { estado: true, motivoCancelacion: true } })).toEqual({ estado: 'cancelada', motivoCancelacion: 'pago_rechazado' });
    expect((await prisma.inscripcionEvento.findUnique({ where: { id: enLista } }))?.estado).toBe('confirmada');
    expect(avisos.emitidos.map((a) => a.nombre)).toEqual(['evento.pago_rechazado', 'evento.lista_espera_promovida']);
  });

  it('en nombre de la Persona, sin comprobante, nace verificado con el Admin como autor (FR-036)', async () => {
    const insc = await esc.inscripcion((await conCosto()).id, await esc.persona('en'));
    const r = await http()
      .post(`/inscripciones-evento/${insc}/pagos/en-nombre`)
      .set('Authorization', `Bearer ${admin}`)
      .field('monto', '1000')
      .field('medio', 'efectivo')
      .field('fechaPago', '2026-01-02');
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ estado: 'verificado', tieneComprobante: false, creadoPor: { id: adminId }, verificadoPor: { id: adminId } });
  });

  it('GET /pagos lista los pendientes con Persona y Evento; la bandeja los muestra con tipo pago (FR-034)', async () => {
    const ev = await conCosto();
    const pago = await esc.pago(await esc.inscripcion(ev.id, await esc.persona('lst')));
    const lista = await http().get(`/pagos?eventoId=${ev.id}`).set('Authorization', `Bearer ${admin}`);
    expect(lista.body.items).toEqual([expect.objectContaining({ id: pago, evento: expect.objectContaining({ id: ev.id }), persona: expect.objectContaining({ nombre: 'lst' }) })]);
    const bandeja = await http().get('/solicitudes?tipo=pago&take=100').set('Authorization', `Bearer ${admin}`);
    expect(bandeja.status).toBe(200);
    expect(bandeja.body.items.map((s: { id: string }) => s.id)).toContain(pago);
    expect((await http().get('/pagos').set('Authorization', `Bearer ${await tokenDe(await esc.persona('pst', { rol: ['pastor'] }), ['pastor'])}`)).status).toBe(403);
  });
});
