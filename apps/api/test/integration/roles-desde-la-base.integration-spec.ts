import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * D258 (docs/25, S-02): la API toma el rol y el estado de la base en cada pedido, no del token.
 * Antes, a una Admin a la que se le sacaba el rol le seguía valiendo la sesión hasta 7 días.
 */
describe('El rol y el estado salen de la base en cada pedido (D258)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let adminId: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `rdb${Date.now()}`);
    await esc.preparar();
    adminId = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
  });

  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  it('al sacarle el rol de Admin, el MISMO token deja de servir desde el pedido siguiente', async () => {
    const token = await tokenDe(adminId, ['miembro_registrado', 'admin']);
    expect((await http().get('/personas').set('Authorization', `Bearer ${token}`)).status).toBe(200);

    await prisma.persona.update({ where: { id: adminId }, data: { rol: ['miembro_registrado'] } });
    const despues = await http().get('/personas').set('Authorization', `Bearer ${token}`);
    expect(despues.status).toBe(403);
  });

  it('un rol que el token no trae pero la base sí, vale (la base manda en los dos sentidos)', async () => {
    await prisma.persona.update({ where: { id: adminId }, data: { rol: ['miembro_registrado', 'admin'] } });
    const tokenViejo = await tokenDe(adminId, ['miembro_registrado']);
    expect((await http().get('/personas').set('Authorization', `Bearer ${tokenViejo}`)).status).toBe(200);
  });

  it('una Persona dada de baja (activo = false) recibe 401 aunque el token siga vigente', async () => {
    const token = await tokenDe(adminId, ['miembro_registrado', 'admin']);
    await prisma.persona.update({ where: { id: adminId }, data: { activo: false } });
    expect((await http().get('/personas').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    expect((await http().get('/camino/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  it('un token de una Persona que no existe recibe 401', async () => {
    const token = await tokenDe('00000000-0000-4000-8000-000000000000', ['miembro_registrado', 'admin']);
    expect((await http().get('/personas').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  it('el estado también sale de la base: pendiente de tutor no entra a lo de una cuenta activa', async () => {
    await prisma.persona.update({ where: { id: adminId }, data: { activo: true, estado: 'pendiente_tutor', rol: [] } });
    const token = await tokenDe(adminId, ['miembro_registrado']);
    expect((await http().get('/camino/me').set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });
});
