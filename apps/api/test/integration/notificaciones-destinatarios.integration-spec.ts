import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { resolverDestinatarios } from '../../src/notificaciones/destinatarios.js';
import { Escenario, levantarApp } from './discipulado-fixtures.js';
import { limpiarAvisos } from './notificaciones-fixtures.js';

/**
 * spec 012, T010 y T013 (d)–(e) — FR-015, FR-016, SC-005 y los CHECK de la
 * migración. `resolverDestinatarios` es la única resolución de "a quién le
 * llega" (envío y conteo previo).
 */
describe('resolverDestinatarios y emitir a escala (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  const ids: string[] = [];
  const persona = async (clave: string, opciones: Parameters<Escenario['persona']>[1] = {}) => {
    const id = await esc.persona(clave, opciones);
    ids.push(id);
    return id;
  };

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `dest${Date.now()}`);
    await esc.preparar();
  });

  afterAll(async () => {
    await limpiarAvisos(prisma, ids);
    await prisma.persona.deleteMany({ where: { apellido: { startsWith: 'Testmasivo' } } });
    await esc.limpiar();
    await app.close();
  });

  it('una Persona pendiente_tutor o inactiva nunca aparece; tieneEmail refleja el email (FR-016)', async () => {
    const activa = await persona('activa');
    const pendiente = await persona('pendiente');
    await prisma.persona.update({ where: { id: pendiente }, data: { estado: 'pendiente_tutor' } });
    const inactiva = await persona('inactiva');
    await prisma.persona.update({ where: { id: inactiva }, data: { activo: false } });
    const sinEmail = await persona('sinemail');
    await prisma.persona.update({ where: { id: sinEmail }, data: { email: null } });

    expect(await resolverDestinatarios(prisma, { tipo: 'persona', personaId: activa })).toEqual([{ id: activa, tieneEmail: true }]);
    expect(await resolverDestinatarios(prisma, { tipo: 'persona', personaId: pendiente })).toEqual([]);
    expect(await resolverDestinatarios(prisma, { tipo: 'discipulador', personaId: inactiva })).toEqual([]);
    expect(await resolverDestinatarios(prisma, { tipo: 'persona', personaId: sinEmail })).toEqual([{ id: sinEmail, tieneEmail: false }]);

    const todas = (await resolverDestinatarios(prisma, { tipo: 'todas' })).map((d) => d.id);
    expect(todas).toEqual(expect.arrayContaining([activa, sinEmail]));
    expect(todas).not.toContain(pendiente);
    expect(todas).not.toContain(inactiva);
  });

  it('`todas` incluye a la Persona Admin; `admin` no resuelve a nadie (D201)', async () => {
    const admin = await persona('admin', { rol: ['miembro_registrado', 'admin'] });
    expect((await resolverDestinatarios(prisma, { tipo: 'todas' })).map((d) => d.id)).toContain(admin);
    expect(await resolverDestinatarios(prisma, { tipo: 'admin' })).toEqual([]);
  });

  it('`grupo` solo trae Inscripciones activas (FR-015)', async () => {
    const admin = await persona('adm2', { rol: ['miembro_registrado', 'admin'] });
    const disc = await persona('disc', { rol: ['miembro_registrado', 'discipulador'] });
    const [a, b, c, d] = [await persona('ga'), await persona('gb'), await persona('gc'), await persona('gd')];
    const { grupoId, inscripciones } = await esc.grupo(disc, [a, b, c, d], admin);
    await prisma.inscripcion.update({ where: { id: inscripciones[1] }, data: { estado: 'completada' } });
    await prisma.inscripcion.update({ where: { id: inscripciones[2] }, data: { estado: 'dada_de_baja' } });
    await prisma.inscripcion.update({ where: { id: inscripciones[3] }, data: { estado: 'abandono' } });
    expect((await resolverDestinatarios(prisma, { tipo: 'grupo', grupoId })).map((x) => x.id)).toEqual([a]);
    // Líderes vigentes del Grupo.
    expect((await resolverDestinatarios(prisma, { tipo: 'lideres_grupo', grupoId })).map((x) => x.id)).toEqual([disc]);
  });

  it('un evento `todas` con 500 Personas crea 500 Entregas app en menos de 1 s (SC-005)', async () => {
    const sufijo = `masivo${Date.now()}`;
    const base = await prisma.persona.findUniqueOrThrow({ where: { id: ids[0] }, select: { sedeId: true } });
    await prisma.persona.createMany({
      data: Array.from({ length: 500 }, (_, i) => ({
        email: `integ-${sufijo}-${i}@example.com`,
        nombre: `n${i}`,
        apellido: `Test${sufijo}`,
        genero: 'femenino' as const,
        fechaNacimiento: new Date('1990-01-01'),
        telefono: '+5492211234567',
        direccion: 'Calle',
        sedeId: base.sedeId,
        estadoCivil: 'soltero_a' as const,
        profesion: 'otro' as const,
        congregaDesde: 2020,
        estado: 'activa' as const,
        consentimientoDatos: true,
        rol: ['miembro_registrado'],
      })),
    });
    const masivas = (await prisma.persona.findMany({ where: { apellido: `Test${sufijo}` }, select: { id: true } })).map((p) => p.id);
    ids.push(...masivas);
    const propias = new Set(masivas);

    // Ningún evento automático del catálogo va a `todas`: se mide con
    // `resolverDestinatarios` + la misma inserción por canal que hace `emitir`
    // (y el envío manual). Solo se insertan las de estas 500 para no tocar las
    // Personas de los otros archivos que corren en paralelo.
    const inicio = Date.now();
    await prisma.$transaction(async (tx) => {
      const n = await tx.notificacion.create({
        data: { tipo: 'manual', prioridad: 'normal', alcance: 'todos', titulo: 'Masivo', mensaje: 'Masivo', creadoPorId: masivas[0] },
        select: { id: true },
      });
      const destinatarios = await resolverDestinatarios(tx, { tipo: 'todas' });
      await tx.entregaNotificacion.createMany({
        data: destinatarios.filter((x) => propias.has(x.id)).map((x) => ({ notificacionId: n.id, personaId: x.id, canal: 'app' as const, estado: 'enviada' as const })),
      });
    });
    const duracion = Date.now() - inicio;
    const creadas = await prisma.entregaNotificacion.count({ where: { personaId: { in: masivas }, canal: 'app' } });
    expect(creadas).toBe(500);
    expect(duracion).toBeLessThan(1000);
  });

  it('los CHECK rechazan una manual sin título y una automática sin evento', async () => {
    const autor = ids[0];
    await expect(
      prisma.notificacion.create({ data: { tipo: 'manual', prioridad: 'normal', alcance: 'todos', mensaje: 'x', creadoPorId: autor } }),
    ).rejects.toThrow();
    await expect(prisma.notificacion.create({ data: { tipo: 'automatica', prioridad: 'normal', alcance: 'persona', alcanceId: autor } })).rejects.toThrow();
    await expect(
      prisma.notificacion.create({ data: { tipo: 'manual', prioridad: 'normal', alcance: 'grupo', titulo: 't', mensaje: 'm', creadoPorId: autor } }),
    ).rejects.toThrow();
  });
});
