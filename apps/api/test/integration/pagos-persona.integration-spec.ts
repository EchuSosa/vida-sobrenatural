import { hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { AYER, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T063 — FR-030 a FR-032, SC-005, D148. */
describe('Pago de la Persona (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  const http = () => request(app.getHttpServer());
  const PDF = Buffer.from('%PDF-1.4\n%%EOF');
  // La fecha civil de Argentina: entre las 21 y las 24 de allá, la de UTC ya es "mañana" y la API la rechaza por futura.
  const hoy = () => hoyEnArgentina();
  const pagar = (inscripcionId: string, token: string, campos: Record<string, string> = {}, archivo: Buffer | null = PDF) => {
    let r = http().post(`/inscripciones-evento/${inscripcionId}/pagos`).set('Authorization', `Bearer ${token}`);
    for (const [k, v] of Object.entries({ monto: '1000', medio: 'transferencia', fechaPago: '2026-01-01', ...campos })) r = r.field(k, v);
    return archivo ? r.attach('comprobante', archivo, { filename: 'comprobante.pdf', contentType: 'application/pdf' }) : r;
  };

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `pagp${Date.now()}`);
    await esc.preparar();
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  const conCosto = (datos = {}) => esc.evento({ costo: '1000.00', instruccionesPago: 'Alias', ...datos });

  it('registra con cada medio; la Inscripción sigue confirmada (FR-030, D148)', async () => {
    for (const medio of ['transferencia', 'efectivo', 'otro']) {
      const yo = await esc.persona(`m${medio}`);
      const insc = await esc.inscripcion((await conCosto()).id, yo);
      const r = await pagar(insc, await tokenDe(yo, ['miembro_registrado']), { medio });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ estado: 'pendiente_verificacion', medio, monto: '1000.00', tieneComprobante: true, comprobanteMime: 'application/pdf' });
      expect((await prisma.inscripcionEvento.findUnique({ where: { id: insc } }))?.estado).toBe('confirmada');
    }
  });

  it('errores de campo juntos, sin comprobante incluido (H-50)', async () => {
    const yo = await esc.persona('campos');
    const insc = await esc.inscripcion((await conCosto()).id, yo);
    const manana = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const r = await pagar(insc, await tokenDe(yo, ['miembro_registrado']), { monto: '0', medio: 'cripto', fechaPago: manana }, null);
    expect(r.status).toBe(400);
    expect(r.body.errors.map((e: { campo: string; code: string }) => `${e.campo}:${e.code}`)).toEqual(
      expect.arrayContaining(['monto:MONTO_INVALIDO', 'medio:MEDIO_INVALIDO', 'fechaPago:FECHA_PAGO_FUTURA', 'comprobante:COMPROBANTE_REQUERIDO']),
    );
  });

  it('pendiente o en lista → INSCRIPCION_NO_CONFIRMADA; sin costo → EVENTO_SIN_COSTO; ya empezó se permite; segundo → PAGO_PENDIENTE_EXISTENTE', async () => {
    const yo = await esc.persona('reglas');
    const token = await tokenDe(yo, ['miembro_registrado']);
    expect((await pagar(await esc.inscripcion((await conCosto({ requiereAprobacion: true })).id, yo, 'pendiente'), token)).body.code).toBe('INSCRIPCION_NO_CONFIRMADA');
    expect((await pagar(await esc.inscripcion((await esc.evento()).id, yo), token)).body.code).toBe('EVENTO_SIN_COSTO');
    const empezado = await esc.inscripcion((await conCosto({ inicio: AYER() })).id, yo);
    expect((await pagar(empezado, token, { fechaPago: hoy() })).status).toBe(201);
    expect((await pagar(empezado, token)).body.code).toBe('PAGO_PENDIENTE_EXISTENTE');
  });

  it('un archivo que no es imagen ni PDF → COMPROBANTE_TIPO_INVALIDO (FR-031)', async () => {
    const yo = await esc.persona('tipo');
    const insc = await esc.inscripcion((await conCosto()).id, yo);
    expect((await pagar(insc, await tokenDe(yo, ['miembro_registrado']), {}, Buffer.from('MZ ejecutable'))).body.code).toBe('COMPROBANTE_TIPO_INVALIDO');
  });

  it('comprobante: la dueña lo ve, otra Persona 404, sin sesión 401, el Admin lo ve, el Pastor 404 (FR-032, SC-005)', async () => {
    const yo = await esc.persona('duena');
    const insc = await esc.inscripcion((await conCosto()).id, yo);
    const pago = (await pagar(insc, await tokenDe(yo, ['miembro_registrado']))).body;
    const ver = (token?: string) => {
      const r = http().get(`/pagos/${pago.id}/comprobante`);
      return token ? r.set('Authorization', `Bearer ${token}`) : r;
    };
    const propio = await ver(await tokenDe(yo, ['miembro_registrado']));
    expect(propio.status).toBe(200);
    expect(propio.headers['content-type']).toContain('application/pdf');
    expect(propio.headers['cache-control']).toBe('private, no-store');
    expect(propio.headers['x-content-type-options']).toBe('nosniff');
    expect((await ver(await tokenDe(await esc.persona('otra'), ['miembro_registrado']))).status).toBe(404);
    expect((await ver()).status).toBe(401);
    expect((await ver(await tokenDe(await esc.persona('adm', { rol: ['admin'] }), ['admin']))).status).toBe(200);
    expect((await ver(await tokenDe(await esc.persona('pas', { rol: ['pastor'] }), ['pastor']))).status).toBe(404);
  });
});
