import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { EventoAviso } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { registrarAvisos } from './camino-fixtures.js';
import { AYER, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T057 — FR-018, FR-022 a FR-024, FR-051. */
describe('Mis eventos (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let avisos: { emitidos: EventoAviso[]; restaurar: () => void };
  const http = () => request(app.getHttpServer());
  const cancelar = (id: string, token: string) => http().post(`/inscripciones-evento/${id}/cancelar`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `mis${Date.now()}`);
    await esc.preparar();
    avisos = registrarAvisos(app.get(NotificacionesService));
  });
  afterAll(async () => {
    avisos.restaurar();
    await esc.limpiar();
    await app.close();
  });
  beforeEach(() => avisos.emitidos.splice(0));

  it('lista las propias con estado de pago y posición; próximas y pasadas por separado (FR-023, FR-024)', async () => {
    const yo = await esc.persona('yo');
    const token = await tokenDe(yo, ['miembro_registrado']);
    const conCosto = await esc.evento({ costo: '1000.00', instruccionesPago: 'Alias', cupo: 1, permiteListaEspera: true });
    const insc = await esc.inscripcion(conCosto.id, yo);
    await esc.pago(insc);
    const otro = await esc.evento({ cupo: 1, permiteListaEspera: true });
    await esc.inscripcion(otro.id, await esc.persona('ocupa'));
    await esc.inscripcion(otro.id, yo, 'lista_espera');
    const pasado = await esc.evento({ inicio: new Date(Date.now() - 5 * 86_400_000) });
    await esc.inscripcion(pasado.id, yo);
    const eliminado = await esc.evento({ eliminadoEn: new Date() });
    await esc.inscripcion(eliminado.id, yo);

    const proximas = await http().get('/mis-inscripciones-evento').set('Authorization', `Bearer ${token}`);
    expect(proximas.body.total).toBe(2);
    const porEvento = Object.fromEntries(proximas.body.items.map((i: { evento: { id: string } }) => [i.evento.id, i]));
    expect(porEvento[conCosto.id]).toMatchObject({ estado: 'confirmada', estadoPago: 'pendiente_verificacion', ultimoPago: { estado: 'pendiente_verificacion', monto: '1000.00' } });
    expect(porEvento[otro.id]).toMatchObject({ estado: 'lista_espera', posicionEnLista: 1, estadoPago: 'no_aplica' });
    const pasadas = await http().get('/mis-inscripciones-evento?cuando=pasadas').set('Authorization', `Bearer ${token}`);
    expect(pasadas.body.items.map((i: { evento: { id: string } }) => i.evento.id)).toEqual([pasado.id]);
  });

  it('cancelar una confirmada con lista promueve a la primera y emite su aviso (FR-018, FR-022)', async () => {
    const ev = await esc.evento({ cupo: 1, permiteListaEspera: true });
    const yo = await esc.persona('cancela');
    const mia = await esc.inscripcion(ev.id, yo);
    const t0 = Date.now();
    const primera = await esc.inscripcion(ev.id, await esc.persona('l1'), 'lista_espera', new Date(t0));
    const segunda = await esc.inscripcion(ev.id, await esc.persona('l2'), 'lista_espera', new Date(t0 + 1000));
    const res = await cancelar(mia, await tokenDe(yo, ['miembro_registrado']));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: 'cancelada', motivoCancelacion: 'persona' });
    expect((await prisma.inscripcionEvento.findUnique({ where: { id: primera } }))?.estado).toBe('confirmada');
    expect((await prisma.inscripcionEvento.findUnique({ where: { id: segunda } }))?.estado).toBe('lista_espera');
    expect(avisos.emitidos).toEqual([expect.objectContaining({ nombre: 'evento.lista_espera_promovida', datos: expect.objectContaining({ inscripcionId: primera, estadoNuevo: 'confirmada' }) })]);
  });

  it('con aprobación, la promovida queda pendiente', async () => {
    const ev = await esc.evento({ cupo: 1, permiteListaEspera: true, requiereAprobacion: true });
    const yo = await esc.persona('aprob');
    const mia = await esc.inscripcion(ev.id, yo, 'pendiente');
    const enLista = await esc.inscripcion(ev.id, await esc.persona('la'), 'lista_espera');
    await cancelar(mia, await tokenDe(yo, ['miembro_registrado']));
    expect((await prisma.inscripcionEvento.findUnique({ where: { id: enLista } }))?.estado).toBe('pendiente');
  });

  it('cancelar estando en la lista no promueve a nadie: los de atrás suben', async () => {
    const ev = await esc.evento({ cupo: 1, permiteListaEspera: true });
    await esc.inscripcion(ev.id, await esc.persona('ocupa2'));
    const yo = await esc.persona('enlista');
    const t0 = Date.now();
    const mia = await esc.inscripcion(ev.id, yo, 'lista_espera', new Date(t0));
    const atras = await esc.inscripcion(ev.id, await esc.persona('atras'), 'lista_espera', new Date(t0 + 1000));
    await cancelar(mia, await tokenDe(yo, ['miembro_registrado']));
    expect(avisos.emitidos).toEqual([]);
    const tokenAtras = await tokenDe((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: atras } })).personaId, ['miembro_registrado']);
    const vista = await http().get(`/eventos/${ev.id}/mi-inscripcion`).set('Authorization', `Bearer ${tokenAtras}`);
    expect(vista.body.inscripcion).toMatchObject({ estado: 'lista_espera', posicionEnLista: 1 });
  });

  it('después del inicio → EVENTO_YA_EMPEZO; ajena → 404; ya cancelada → INSCRIPCION_NO_ABIERTA (FR-022, FR-051)', async () => {
    const yo = await esc.persona('errores');
    const token = await tokenDe(yo, ['miembro_registrado']);
    const empezo = await esc.inscripcion((await esc.evento({ inicio: AYER() })).id, yo);
    expect((await cancelar(empezo, token)).body.code).toBe('EVENTO_YA_EMPEZO');
    const ajena = await esc.inscripcion((await esc.evento()).id, await esc.persona('duena'));
    expect((await cancelar(ajena, token)).status).toBe(404);
    const cancelada = await esc.inscripcion((await esc.evento()).id, yo, 'cancelada');
    expect((await cancelar(cancelada, token)).body.code).toBe('INSCRIPCION_NO_ABIERTA');
  });
});
