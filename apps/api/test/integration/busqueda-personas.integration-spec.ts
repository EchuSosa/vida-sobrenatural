import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { normalizarNombre } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Prisma } from '../../src/generated/prisma/client.js';
import { CON_MARCA, SIN_MARCA, campoSinTildes } from '../../src/persona/busqueda-texto.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * BUG-11 (QA ronda 2, D267): buscar a una Persona por nombre completo, por palabras y sin importar
 * tildes, en todas las búsquedas que usan `filtroDeBusqueda`.
 */
describe('Búsqueda de Personas por texto (BUG-11, D267)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let token: string;
  let valeriaId: string;
  let apellido: string;
  const http = () => request(app.getHttpServer());
  const ids = (body: { items?: Array<{ id: string }> } | Array<{ id: string }>) => (Array.isArray(body) ? body : (body.items ?? [])).map((p) => p.id);

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    const sufijo = `bus${Date.now()}`;
    escenario = new Escenario(prisma, sufijo);
    await escenario.preparar();
    const adminId = await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    token = await tokenDe(adminId, ['miembro_registrado', 'admin']);
    valeriaId = await escenario.persona('valeria');
    apellido = `Domínguez Núñez${sufijo}`;
    await prisma.persona.update({ where: { id: valeriaId }, data: { nombre: 'Valéria', apellido } });
  });

  afterAll(async () => {
    await escenario?.limpiar();
    await app?.close();
  });

  const listar = (buscar: string) => http().get(`/personas?buscar=${encodeURIComponent(buscar)}&take=50`).set('Authorization', `Bearer ${token}`);

  it('nombre y apellido juntos, en cualquier orden, la encuentran', async () => {
    const sufijo = apellido.replace('Domínguez Núñez', '');
    for (const texto of [`Valéria Domínguez Núñez${sufijo}`, `Núñez${sufijo} Valéria`, `valéria ${sufijo}`]) {
      const r = await listar(texto);
      expect([texto, r.status]).toEqual([texto, 200]);
      expect([texto, ids(r.body)]).toEqual([texto, [valeriaId]]);
    }
  });

  it('sin tildes ni mayúsculas también la encuentra', async () => {
    const sufijo = apellido.replace('Domínguez Núñez', '');
    expect(ids((await listar(`VALERIA dominguez nunez${sufijo}`)).body)).toEqual([valeriaId]);
  });

  it('una palabra que no está en ningún campo la deja afuera', async () => {
    const sufijo = apellido.replace('Domínguez Núñez', '');
    expect(ids((await listar(`Valeria Pérez${sufijo}`)).body)).toEqual([]);
  });

  it('un % o un _ se buscan como letras, no como comodín', async () => {
    const sufijo = apellido.replace('Domínguez Núñez', '');
    // Sin escapar, `%` y `_` en LIKE son comodines: "v_leria" encontraría a Valéria.
    expect(ids((await listar(`v_leria ${sufijo}`)).body)).toEqual([]);
    expect(ids((await listar(`v%a ${sufijo}`)).body)).toEqual([]);
    expect(ids((await listar('%')).body)).toEqual([]);
  });

  it('la búsqueda corta (elegir tutor, personas-elegibles) usa la misma regla', async () => {
    const sufijo = apellido.replace('Domínguez Núñez', '');
    const corta = await http().get(`/personas/buscar?q=${encodeURIComponent(`valeria nunez${sufijo}`)}`).set('Authorization', `Bearer ${token}`);
    expect(ids(corta.body)).toContain(valeriaId);
    const gex = await http().get(`/grupos-extension/personas-elegibles?q=${encodeURIComponent(`valeria nunez${sufijo}`)}`).set('Authorization', `Bearer ${token}`);
    expect(ids(gex.body)).toEqual([valeriaId]);
  });

  it('la regla de la base es la misma que normalizarNombre (Principio XI)', async () => {
    const muestra = 'ÁÀÄÂÃÅ áàäâãå ÉÈËÊ éèëê ÍÌÏÎ íìïî ÓÒÖÔÕ óòöôõ ÚÙÜÛ úùüû Ñ ñ Ç ç Ý ý ÿ José Pérez Güemes';
    const filas = await prisma.$queryRaw<Array<{ v: string }>>(
      Prisma.sql`SELECT translate(lower(coalesce(${muestra}::text, '')), ${CON_MARCA}, ${SIN_MARCA}) AS v`,
    );
    expect(filas[0].v).toBe(normalizarNombre(muestra));
    // Y la expresión que usa la búsqueda es esa misma.
    expect(campoSinTildes('nombre').sql).toContain('translate(lower(coalesce("nombre"');
  });
});
