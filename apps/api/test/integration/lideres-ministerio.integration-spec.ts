import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { MinisterioCatalogo, MinisterioDePersona, MinisterioLiderado, MinisterioLideradoDetalle } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 016 (D244): líderes de Ministerio. El Admin asigna y quita (rol
 * `lider_ministerio` con su CambioDeRol, nunca a un menor, aviso a la persona);
 * el líder ve a su equipo por área con contacto, autorizado contra la base
 * (líder de otro Ministerio → 404); inactivar y reactivar mueven el rol;
 * eliminar se bloquea con líderes.
 */
describe('Líderes de Ministerio (spec 016, integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let sufijo: string;
  let adminId: string;
  let pastorId: string;
  let liderId: string;
  let otraLiderId: string;
  let miembroId: string;
  let menorId: string;
  let bienvenidaId: string;
  let ceremonialId: string;
  let seguridadId: string;
  const ministerios: string[] = [];
  const ADMIN = ['miembro_registrado', 'admin'];
  const PASTOR = ['miembro_registrado', 'pastor'];
  const MIEMBRO = ['miembro_registrado'];

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post' | 'patch' | 'delete', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }
  const asignar = (ministerioId: string, personaId: string) => como(adminId, ADMIN, 'post', `/ministerios/${ministerioId}/lideres`, { personaId });
  const quitar = (ministerioId: string, personaId: string) => como(adminId, ADMIN, 'delete', `/ministerios/${ministerioId}/lideres/${personaId}`);
  const rolesDe = async (id: string) => (await prisma.persona.findUniqueOrThrow({ where: { id }, select: { rol: true } })).rol;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    sufijo = `limin${Date.now()}`;
    escenario = new Escenario(prisma, sufijo);
    await escenario.preparar();
    adminId = await escenario.persona('admin', { rol: ADMIN });
    pastorId = await escenario.persona('pastor', { rol: PASTOR });
    liderId = await escenario.persona('lider', { telefono: '221 555-0101' });
    otraLiderId = await escenario.persona('otralider');
    miembroId = await escenario.persona('miembro', { telefono: '221 555-0202' });
    menorId = await escenario.persona('menor', { fechaNacimiento: new Date('2012-01-01') });
    const b = await prisma.ministerio.create({ data: { nombre: `Bienvenida ${sufijo}`, descripcion: 'Test' }, select: { id: true } });
    const c = await prisma.ministerio.create({ data: { nombre: `Ceremonial ${sufijo}`, descripcion: 'Test' }, select: { id: true } });
    bienvenidaId = b.id;
    ceremonialId = c.id;
    ministerios.push(b.id, c.id);
    seguridadId = (await prisma.celula.create({ data: { ministerioId: bienvenidaId, nombre: 'Seguridad' }, select: { id: true } })).id;
    // Dos integrantes de Bienvenida: uno en Seguridad y uno sin área.
    await prisma.postulacion.createMany({
      data: [
        { personaId: miembroId, ministerioId: bienvenidaId, celulaId: seguridadId, estado: 'aprobada', revisadoPorId: adminId, revisadaEn: new Date() },
        { personaId: otraLiderId, ministerioId: bienvenidaId, celulaId: null, estado: 'aprobada', revisadoPorId: adminId, revisadaEn: new Date() },
      ],
    });
  });

  afterAll(async () => {
    const avisos = await prisma.notificacion.findMany({ where: { evento: 'ministerio.lider_asignado', entidadId: { in: ministerios } }, select: { id: true } });
    await prisma.entregaNotificacion.deleteMany({ where: { notificacionId: { in: avisos.map((a) => a.id) } } });
    await prisma.notificacion.deleteMany({ where: { id: { in: avisos.map((a) => a.id) } } });
    await prisma.liderMinisterio.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.postulacion.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.celula.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.ministerio.deleteMany({ where: { id: { in: ministerios } } });
    await escenario.limpiar();
    await app.close();
  });

  it('⭐ el Admin asigna: rol + CambioDeRol + aviso; duplicado 409; menor 409; Pastor 403', async () => {
    const r = await asignar(bienvenidaId, liderId);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ persona: { id: liderId, nombre: 'lider' } });
    expect(await rolesDe(liderId)).toContain('lider_ministerio');
    expect(await prisma.cambioDeRol.count({ where: { personaId: liderId, rol: 'lider_ministerio', accion: 'otorgado' } })).toBe(1);
    const aviso = await prisma.entregaNotificacion.findFirst({
      where: { personaId: liderId, canal: 'app', notificacion: { evento: 'ministerio.lider_asignado', entidadId: bienvenidaId } },
      select: { notificacion: { select: { params: true } } },
    });
    expect(aviso?.notificacion.params).toEqual({ ministerioId: bienvenidaId, ministerio: expect.stringContaining('Bienvenida') });

    expect((await asignar(bienvenidaId, liderId)).body.code).toBe('YA_ES_LIDER_DEL_MINISTERIO');
    expect((await asignar(bienvenidaId, menorId)).body.code).toBe('PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO');
    expect(await prisma.liderMinisterio.count({ where: { personaId: menorId } })).toBe(0);
    expect((await como(pastorId, PASTOR, 'post', `/ministerios/${bienvenidaId}/lideres`, { personaId: otraLiderId })).status).toBe(403);

    // El catálogo y el Perfil lo muestran.
    const lista = (await como(pastorId, PASTOR, 'get', '/ministerios')).body as MinisterioCatalogo[];
    expect(lista.find((m) => m.id === bienvenidaId)?.lideres.map((l) => l.id)).toEqual([liderId]);
    expect(lista.find((m) => m.id === ceremonialId)?.lideres).toEqual([]);
    const perfil = (await como(adminId, ADMIN, 'get', `/personas/${liderId}/ministerio`)).body as MinisterioDePersona;
    expect(perfil.lidera.map((m) => m.id)).toEqual([bienvenidaId]);
  });

  it('⭐ el líder ve a su equipo por área, con contacto; otro usuario no lo ve (404)', async () => {
    const liderados = (await como(liderId, MIEMBRO, 'get', '/ministerios/liderados')).body as MinisterioLiderado[];
    expect(liderados).toEqual([{ id: bienvenidaId, nombre: expect.stringContaining('Bienvenida'), integrantes: 2, areas: 1 }]);
    const detalle = (await como(liderId, MIEMBRO, 'get', `/ministerios/liderados/${bienvenidaId}`)).body as MinisterioLideradoDetalle;
    expect(detalle.porArea).toHaveLength(1);
    expect(detalle.porArea[0].celula).toMatchObject({ id: seguridadId, nombre: 'Seguridad' });
    expect(detalle.porArea[0].integrantes.map((i) => i.persona)).toEqual([
      expect.objectContaining({ id: miembroId, telefono: '221 555-0202', whatsapp: '5492215550202', email: expect.stringContaining('miembro') }),
    ]);
    expect(detalle.sinArea.map((i) => i.persona.id)).toEqual([otraLiderId]);
    expect(detalle.otrosLideres).toEqual([]);
    // Nada de la Postulación más allá del contacto (FR-005).
    expect(JSON.stringify(detalle)).not.toMatch(/motivacion|disponibilidad|notas/);

    expect((await como(otraLiderId, MIEMBRO, 'get', `/ministerios/liderados/${bienvenidaId}`)).status).toBe(404);
    expect((await como(otraLiderId, MIEMBRO, 'get', '/ministerios/liderados')).body).toEqual([]);
    expect((await como(liderId, MIEMBRO, 'get', `/ministerios/liderados/${ceremonialId}`)).status).toBe(404);
  });

  it('quitar: cierra con `hasta` y el rol se va solo si no lidera otro Ministerio', async () => {
    expect((await asignar(ceremonialId, liderId)).status).toBe(201);
    expect((await quitar(bienvenidaId, liderId)).status).toBe(200);
    expect(await rolesDe(liderId)).toContain('lider_ministerio'); // sigue liderando Ceremonial
    const cerrado = await prisma.liderMinisterio.findFirst({ where: { ministerioId: bienvenidaId, personaId: liderId }, select: { hasta: true, quitadoPorId: true } });
    expect(cerrado?.hasta).not.toBeNull();
    expect(cerrado?.quitadoPorId).toBe(adminId);
    expect((await quitar(bienvenidaId, liderId)).status).toBe(404);

    expect((await quitar(ceremonialId, liderId)).status).toBe(200);
    expect(await rolesDe(liderId)).not.toContain('lider_ministerio');
    expect(await prisma.cambioDeRol.count({ where: { personaId: liderId, rol: 'lider_ministerio', accion: 'quitado' } })).toBe(1);
    // Volver a asignar después de quitar: nuevo liderazgo (el anterior queda en el historial).
    expect((await asignar(bienvenidaId, liderId)).status).toBe(201);
    expect(await prisma.liderMinisterio.count({ where: { ministerioId: bienvenidaId, personaId: liderId } })).toBe(2);
  });

  it('inactivar quita el rol y reactivar lo devuelve; eliminar se bloquea con líderes', async () => {
    expect((await como(adminId, ADMIN, 'patch', `/ministerios/${bienvenidaId}`, { activo: false, confirmacionNombre: `Bienvenida ${sufijo}` })).status).toBe(200);
    expect(await rolesDe(liderId)).not.toContain('lider_ministerio');
    expect((await como(liderId, MIEMBRO, 'get', '/ministerios/liderados')).body).toEqual([]);
    expect((await asignar(bienvenidaId, otraLiderId)).body.code).toBe('MINISTERIO_NO_DISPONIBLE');

    expect((await como(adminId, ADMIN, 'patch', `/ministerios/${bienvenidaId}`, { activo: true })).status).toBe(200);
    expect(await rolesDe(liderId)).toContain('lider_ministerio');

    const r = await como(adminId, ADMIN, 'delete', `/ministerios/${ceremonialId}`);
    expect(r.body.code).toBe('MINISTERIO_TIENE_DATOS_RELACIONADOS');
  });
});
