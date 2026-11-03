import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import pg from 'pg';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 018, FR-006 (D264): la única Admin no puede darse de baja (ni la puede dar de baja nadie)
 * hasta que haya otra. En la base de test compartida siempre hay otros Admins, así que este archivo
 * arma una base propia, recién migrada, con UNA sola Admin, y la borra al terminar.
 */
const RAIZ_API = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('Baja de la app: la única Admin (spec 018, FR-006)', () => {
  const urlOriginal = process.env.DATABASE_URL!;
  const nombreBase = `${new URL(urlOriginal).pathname.slice(1)}_unica_admin_${process.pid}`;
  const urlBase = (() => {
    const u = new URL(urlOriginal);
    u.pathname = `/${nombreBase}`;
    return u.toString();
  })();
  const admin = async (sql: string) => {
    const u = new URL(urlOriginal);
    u.pathname = '/postgres';
    const cliente = new pg.Client({ connectionString: u.toString() });
    await cliente.connect();
    try {
      await cliente.query(sql);
    } finally {
      await cliente.end();
    }
  };

  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let unicaId: string;
  let sedeId: string;
  const http = () => request(app.getHttpServer());

  async function persona(email: string, rol: string[]): Promise<string> {
    return (
      await prisma.persona.create({
        data: {
          email,
          nombre: 'Única',
          apellido: 'Admin',
          genero: 'femenino',
          fechaNacimiento: new Date('1980-01-01'),
          telefono: '+5492211234567',
          direccion: 'Calle 1 y 50',
          sedeId,
          estadoCivil: 'soltero_a',
          profesion: 'otro',
          congregaDesde: 2020,
          estado: 'activa',
          consentimientoDatos: true,
          rol,
        },
        select: { id: true },
      })
    ).id;
  }

  beforeAll(async () => {
    await admin(`DROP DATABASE IF EXISTS "${nombreBase}" WITH (FORCE)`);
    await admin(`CREATE DATABASE "${nombreBase}"`);
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], { cwd: RAIZ_API, env: { ...process.env, DATABASE_URL: urlBase }, stdio: 'pipe' });
    // La app de este archivo apunta a la base nueva; se restaura en afterAll.
    process.env.DATABASE_URL = urlBase;
    ({ app, prisma } = await levantarApp());
    sedeId = (await prisma.sede.create({ data: { nombre: 'Sede única', direccion: 'Dirección', horarios: 'Horario', activo: true }, select: { id: true } })).id;
    unicaId = await persona('unica-admin@example.com', ['miembro_registrado', 'admin']);
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    process.env.DATABASE_URL = urlOriginal;
    await admin(`DROP DATABASE IF EXISTS "${nombreBase}" WITH (FORCE)`);
  }, 60_000);

  it('es la única Admin de la base: ni ella ni nadie la puede dar de baja (409 ULTIMO_ADMIN) y no se borra nada', async () => {
    expect(await prisma.persona.count({ where: { rol: { has: 'admin' }, activo: true } })).toBe(1);
    const token = await tokenDe(unicaId, ['miembro_registrado', 'admin']);

    const propia = await http().post('/personas/me/baja').set({ Authorization: `Bearer ${token}` }).send({ confirmacion: 'BAJA' });
    expect([propia.status, propia.body.code]).toEqual([409, 'ULTIMO_ADMIN']);
    const enNombre = await http().post(`/personas/${unicaId}/baja`).set({ Authorization: `Bearer ${token}` }).send({ confirmacion: 'BAJA' });
    expect([enNombre.status, enNombre.body.code]).toEqual([409, 'ULTIMO_ADMIN']);

    expect(await prisma.persona.findUnique({ where: { id: unicaId }, select: { nombre: true, activo: true, dadaDeBajaEn: true } })).toEqual({ nombre: 'Única', activo: true, dadaDeBajaEn: null });
  });

  it('con una segunda Admin, la primera ya se puede dar de baja', async () => {
    await persona('otra-admin@example.com', ['miembro_registrado', 'admin']);
    const token = await tokenDe(unicaId, ['miembro_registrado', 'admin']);
    const r = await http().post('/personas/me/baja').set({ Authorization: `Bearer ${token}` }).send({ confirmacion: 'BAJA' });
    expect(r.status).toBe(200);
    expect(await prisma.persona.count({ where: { rol: { has: 'admin' }, activo: true } })).toBe(1);
  });
});
