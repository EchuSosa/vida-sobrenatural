import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { BusquedaPersona } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 006, Pregunta 5 (lote C): `GET /personas/buscar` para el Discipulador
 * (sin `personas.ver`) solo encuentra Personas activas sin acceso a la app, con
 * nombre, apellido y edad; el Admin sigue viendo la búsqueda completa.
 */
describe('Búsqueda de "Pedir en nombre de…" para el Discipulador (spec 006, Pregunta 5)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let discId: string;
  let adminId: string;
  const sufijo = `bsa-${Date.now()}`;
  const apellido = `Buscable${sufijo}`;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    discId = await esc.persona('disc', { rol: ['miembro_registrado', 'discipulador'] });
    adminId = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    const comun = {
      apellido, genero: 'femenino' as const, fechaNacimiento: new Date('1950-03-01'), telefono: '+5492215550000', direccion: 'Calle 1',
      sedeId: esc.sedeId, estadoCivil: 'viudo_a' as const, profesion: 'jubilado_a' as const, congregaDesde: 1980, estado: 'activa' as const, consentimientoDatos: true,
    };
    await prisma.persona.create({ data: { ...comun, nombre: 'Sinmail', email: null } });
    await prisma.persona.create({ data: { ...comun, nombre: 'Conmail', email: `con-${sufijo}@example.com` } });
  });

  afterAll(async () => {
    await prisma.persona.deleteMany({ where: { apellido } });
    await esc.limpiar();
    await app.close();
  });

  it('el Discipulador solo ve a quien no tiene acceso, sin email ni teléfono, con la edad', async () => {
    const res = await request(app.getHttpServer())
      .get(`/personas/buscar?q=${apellido}`)
      .set('Authorization', `Bearer ${await tokenDe(discId, ['miembro_registrado', 'discipulador'])}`)
      .expect(200);
    const filas = res.body as BusquedaPersona[];
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ nombre: 'Sinmail', email: null, telefono: '', edad: expect.any(Number) });
  });

  it('el Admin ve a las dos, con sus datos', async () => {
    const res = await request(app.getHttpServer())
      .get(`/personas/buscar?q=${apellido}`)
      .set('Authorization', `Bearer ${await tokenDe(adminId, ['miembro_registrado', 'admin'])}`)
      .expect(200);
    expect((res.body as BusquedaPersona[]).map((p) => p.nombre).sort()).toEqual(['Conmail', 'Sinmail']);
  });
});
