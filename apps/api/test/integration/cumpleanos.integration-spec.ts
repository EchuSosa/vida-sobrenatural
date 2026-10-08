import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { Cumpleanero } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { CumpleanosService } from '../../src/inicio/cumpleanos.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 013, T051 (Historia 4): cumpleaños contra la base real, con el reloj
 * fijado (el servicio recibe `ahora`). Otros specs siembran Personas en
 * paralelo: cada aserción mira solo las de este escenario.
 */
describe('Cumpleaños (integración, spec 013 T051)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let servicio: CumpleanosService;
  let escenario: Escenario;
  let admin: string;
  let pastor: string;
  let discipulador: string;
  const id: Record<string, string> = {};

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    servicio = app.get(CumpleanosService);
    escenario = new Escenario(prisma, `cumple${Date.now()}`);
    await escenario.preparar();
    admin = await tokenDe(await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] }), ['miembro_registrado', 'admin']);
    pastor = await tokenDe(await escenario.persona('pastor', { rol: ['miembro_registrado', 'pastor'] }), ['miembro_registrado', 'pastor']);
    discipulador = await tokenDe(await escenario.persona('disc', { rol: ['miembro_registrado', 'discipulador'] }), ['miembro_registrado', 'discipulador']);
    const nacida = async (clave: string, fecha: string, apellido?: string) => {
      id[clave] = await escenario.persona(clave, { fechaNacimiento: new Date(fecha) });
      if (apellido) await prisma.persona.update({ where: { id: id[clave] }, data: { apellido } });
    };
    await nacida('hoyB', '1992-10-07', 'Bbb');
    await nacida('hoyA', '1990-10-07', 'Aaa');
    await nacida('dia3', '1985-10-03');
    await nacida('dia31', '1970-10-31');
    await nacida('bisiesta', '2000-02-29');
    await nacida('dic31', '1990-12-31');
    await nacida('ene2', '1990-01-02');
    await nacida('pendiente', '1990-10-10');
    await prisma.persona.update({ where: { id: id.pendiente }, data: { estado: 'pendiente_tutor' } });
    await nacida('baja', '1990-10-11');
    await prisma.persona.update({ where: { id: id.baja }, data: { activo: false } });
  });

  afterAll(async () => {
    await escenario.limpiar();
    await app.close();
  });

  const mias = (items: Cumpleanero[]) => items.filter((c) => Object.values(id).includes(c.persona.id));
  const nombre = (c: Cumpleanero) => c.persona.nombre;

  it('H4.1, H4.5: el mes, por día y apellido, con cumple y "hoy"; sin pendientes de tutor ni dadas de baja', async () => {
    const octubre = mias((await servicio.delMes(10, 0, 100_000, new Date('2026-10-07T15:00:00Z'))).items);
    expect(octubre.map(nombre)).toEqual(['dia3', 'hoyA', 'hoyB', 'dia31']);
    expect(octubre[1]).toMatchObject({ dia: 7, cumple: 36, esHoy: true, yaPaso: false, fecha: '2026-10-07' });
    expect(octubre[0]).toMatchObject({ cumple: 41, yaPaso: true, esHoy: false });
    expect(octubre[3]).toMatchObject({ dia: 31, cumple: 56, yaPaso: false });
  });

  it('H4.3: el 29/2 aparece el 28 en febrero de un año no bisiesto, y el 29 en uno bisiesto', async () => {
    expect(mias((await servicio.delMes(2, 0, 100_000, new Date('2026-10-07T15:00:00Z'))).items)).toEqual([expect.objectContaining({ fecha: '2026-02-28', dia: 28, cumple: 26 })]);
    expect(mias((await servicio.delMes(2, 0, 100_000, new Date('2028-01-07T15:00:00Z'))).items)).toEqual([expect.objectContaining({ fecha: '2028-02-29', dia: 29 })]);
  });

  it('H4.4: otro mes es del año en curso ("cumplió" si ya pasó)', async () => {
    const enero = mias((await servicio.delMes(1, 0, 100_000, new Date('2026-10-07T15:00:00Z'))).items);
    expect(enero).toEqual([expect.objectContaining({ fecha: '2026-01-02', cumple: 36, yaPaso: true })]);
    const diciembre = mias((await servicio.delMes(12, 0, 100_000, new Date('2026-10-07T15:00:00Z'))).items);
    expect(diciembre).toEqual([expect.objectContaining({ fecha: '2026-12-31', yaPaso: false })]);
  });

  it('la semana: hoy y 7 días más, cruzando fin de mes y fin de año', async () => {
    const octubre = mias((await servicio.deLaSemana(new Date('2026-10-07T15:00:00Z'))).items);
    expect(octubre.map(nombre)).toEqual(['hoyA', 'hoyB']);
    const finDeMes = mias((await servicio.deLaSemana(new Date('2026-10-28T15:00:00Z'))).items);
    expect(finDeMes.map(nombre)).toEqual(['dia31']);
    const finDeAnio = mias((await servicio.deLaSemana(new Date('2026-12-28T15:00:00Z'))).items);
    expect(finDeAnio.map((c) => [nombre(c), c.fecha])).toEqual([
      ['dic31', '2026-12-31'],
      ['ene2', '2027-01-02'],
    ]);
    // H4.2: a las 02:30 UTC del 8, en Argentina todavía es el 7.
    expect(mias((await servicio.deLaSemana(new Date('2026-10-08T02:30:00Z'))).items)[0]).toMatchObject({ esHoy: true, fecha: '2026-10-07' });
  });

  it('por HTTP: mes inválido → 400 en el campo; el Pastor lee; un Discipulador no', async () => {
    const get = (ruta: string, token = admin) => request(app.getHttpServer()).get(ruta).set('Authorization', `Bearer ${token}`);
    const malo = await get('/personas/cumpleanos?mes=13');
    expect(malo.status).toBe(400);
    expect(malo.body.errors).toEqual([{ campo: 'mes', code: 'MES_INVALIDO' }]);
    expect((await get('/personas/cumpleanos?mes=10&take=5', pastor)).body).toMatchObject({ total: expect.any(Number), items: expect.any(Array) });
    expect((await get('/inicio/cumpleanos-semana', pastor)).body).toMatchObject({ items: expect.any(Array), hayMas: expect.any(Boolean) });
    expect((await get('/personas/cumpleanos', discipulador)).status).toBe(403);
    expect((await get('/inicio/cumpleanos-semana', discipulador)).status).toBe(403);
  });
});
