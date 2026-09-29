import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { RolesService } from '../../src/persona/roles.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * specs/004, T037d (FR-036/FR-037, D137): aceptar contra la base real. La
 * Propuesta se arma por Prisma en el setup (lo que deja el `proponer` del
 * lote A) — TODO(merge): cuando exista, T029 cubre el camino por servicio.
 */
describe('Propuestas: aceptar y declinar (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let admin: string;
  let disc: string;
  let otroDisc: string;
  let tokenDisc: string;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `acep-${Date.now()}`);
    await esc.preparar();
    admin = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    disc = await esc.discipulador('disc');
    otroDisc = await esc.discipulador('otro');
    tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
  });

  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('aceptar deja Grupo en curso, Inscripción activa, Liderazgo vigente y Solicitud aprobada', async () => {
    const persona = await esc.persona('ana');
    const { solicitudId, propuestaId } = await esc.propuestaNueva(persona, disc, admin);

    const res = await http().post(`/discipulado/propuestas/${propuestaId}/aceptar`).set('Authorization', `Bearer ${tokenDisc}`);
    expect(res.status).toBe(200);
    const { grupoId } = res.body as { grupoId: string };

    const grupo = await prisma.grupo.findUnique({ where: { id: grupoId }, select: { estado: true, sedeId: true } });
    expect(grupo).toEqual({ estado: 'en_curso', sedeId: esc.sedeId });
    const inscripcion = await prisma.inscripcion.findUnique({ where: { solicitudId }, select: { estado: true, grupoId: true, personaId: true } });
    expect(inscripcion).toEqual({ estado: 'activa', grupoId, personaId: persona });
    const liderazgo = await prisma.liderazgo.findFirst({ where: { grupoId, hasta: null }, select: { personaId: true, propuestaId: true } });
    expect(liderazgo).toEqual({ personaId: disc, propuestaId });
    const solicitud = await prisma.solicitudDiscipulado.findUnique({ where: { id: solicitudId }, select: { estado: true, grupoId: true } });
    expect(solicitud).toEqual({ estado: 'aprobada', grupoId });
    const propuesta = await prisma.propuestaDiscipulado.findUnique({ where: { id: propuestaId }, select: { estado: true } });
    expect(propuesta?.estado).toBe('aceptada');

    // Aparece en sus discipulados, con el contacto.
    const mios = await http().get('/discipulado/mis-discipulados').set('Authorization', `Bearer ${tokenDisc}`);
    expect(mios.status).toBe(200);
    const discipulado = mios.body.discipulados.find((d: { grupoId: string }) => d.grupoId === grupoId);
    expect(discipulado.personas[0].contacto.telefono).toBe('+5492211234567');
  });

  it('las propuestas del Discipulador no traen el teléfono ni la dirección de la Persona (FR-037, SC-003)', async () => {
    const persona = await esc.persona('bea', { telefono: '+5491199998888', direccion: 'Diagonal Secreta 742' });
    await esc.propuestaNueva(persona, disc, admin);
    const res = await http().get('/discipulado/mis-discipulados').set('Authorization', `Bearer ${tokenDisc}`);
    expect(res.status).toBe(200);
    const texto = JSON.stringify(res.body.propuestas);
    expect(texto).toContain('bea');
    expect(texto).not.toContain('+5491199998888');
    expect(texto).not.toContain('Diagonal Secreta 742');
    expect(res.body.tieneAgenda).toBe(true);
  });

  it('otro Discipulador recibe 404 al aceptar una propuesta ajena', async () => {
    const persona = await esc.persona('cami');
    const { propuestaId } = await esc.propuestaNueva(persona, disc, admin);
    const tokenOtro = await tokenDe(otroDisc, ['miembro_registrado', 'discipulador']);
    const res = await http().post(`/discipulado/propuestas/${propuestaId}/aceptar`).set('Authorization', `Bearer ${tokenOtro}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NO_ENCONTRADO');
  });

  it('declinar con motivo deja la Propuesta declinada y la Solicitud otra vez pendiente', async () => {
    const persona = await esc.persona('dora');
    const { solicitudId, propuestaId } = await esc.propuestaNueva(persona, disc, admin);
    const res = await http()
      .post(`/discipulado/propuestas/${propuestaId}/declinar`)
      .set('Authorization', `Bearer ${tokenDisc}`)
      .send({ motivo: 'Ese día no puedo' });
    expect(res.status).toBe(200);
    expect(await prisma.propuestaDiscipulado.findUnique({ where: { id: propuestaId }, select: { estado: true, motivoDeclinacion: true } })).toEqual({
      estado: 'declinada',
      motivoDeclinacion: 'Ese día no puedo',
    });
    expect((await prisma.solicitudDiscipulado.findUnique({ where: { id: solicitudId }, select: { estado: true } }))?.estado).toBe('pendiente');
  });

  it('un motivo de más de 500 caracteres → 400 con el error en el campo', async () => {
    const persona = await esc.persona('eli');
    const { propuestaId } = await esc.propuestaNueva(persona, disc, admin);
    const res = await http()
      .post(`/discipulado/propuestas/${propuestaId}/declinar`)
      .set('Authorization', `Bearer ${tokenDisc}`)
      .send({ motivo: 'x'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ campo: 'motivo', code: 'MOTIVO_DEMASIADO_LARGO' }]);
  });

  it('aceptar y retirar en paralelo dejan UNA sola de las dos (la Propuesta queda aceptada o retirada, nunca las dos)', async () => {
    const persona = await esc.persona('flor');
    const { solicitudId, propuestaId } = await esc.propuestaNueva(persona, disc, admin);
    // TODO(merge): el retiro es del lote A (T024). Mientras tanto se simula
    // con la misma forma que tendrá: bloquear la Solicitud y la Propuesta y
    // pasarla a `retirada` solo si sigue pendiente.
    const retirar = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "solicitudes_discipulado" WHERE "id" = ${solicitudId} FOR UPDATE`;
      const [p] = await tx.$queryRaw<Array<{ estado: string }>>`SELECT "estado"::text AS "estado" FROM "propuestas_discipulado" WHERE "id" = ${propuestaId} FOR UPDATE`;
      if (p.estado !== 'pendiente') return 'no';
      await tx.propuestaDiscipulado.update({ where: { id: propuestaId }, data: { estado: 'retirada', retiradaPor: 'admin' } });
      await tx.solicitudDiscipulado.update({ where: { id: solicitudId }, data: { estado: 'pendiente' } });
      return 'si';
    });
    const aceptar = http().post(`/discipulado/propuestas/${propuestaId}/aceptar`).set('Authorization', `Bearer ${tokenDisc}`);
    const [retiro, aceptacion] = await Promise.all([retirar, aceptar]);

    const final = await prisma.propuestaDiscipulado.findUnique({ where: { id: propuestaId }, select: { estado: true } });
    const grupos = await prisma.inscripcion.count({ where: { solicitudId } });
    if (aceptacion.status === 200) {
      expect(retiro).toBe('no');
      expect(final?.estado).toBe('aceptada');
      expect(grupos).toBe(1);
    } else {
      expect(retiro).toBe('si');
      expect(aceptacion.body.code).toBe('PROPUESTA_NO_VIGENTE');
      expect(final?.estado).toBe('retirada');
      expect(grupos).toBe(0);
    }
  });

  it('carrera de D137: quitarRol y aceptar en paralelo nunca dejan un Liderazgo vigente de alguien sin el rol', async () => {
    // Hasta el lote D (T055), quitar `discipulador` falla cerrado siempre; el
    // invariante se verifica igual y pasa a tener dientes cuando D lo abra.
    const nueva = await esc.discipulador('gaby');
    const persona = await esc.persona('hugo');
    const { propuestaId } = await esc.propuestaNueva(persona, nueva, admin);
    const token = await tokenDe(nueva, ['miembro_registrado', 'discipulador']);
    const roles = app.get(RolesService);

    await Promise.allSettled([
      roles.quitarRol(nueva, 'discipulador', admin),
      http().post(`/discipulado/propuestas/${propuestaId}/aceptar`).set('Authorization', `Bearer ${token}`),
    ]);

    const [persistida, vigentes] = await Promise.all([
      prisma.persona.findUnique({ where: { id: nueva }, select: { rol: true } }),
      prisma.liderazgo.count({ where: { personaId: nueva, hasta: null } }),
    ]);
    if (vigentes > 0) expect(persistida?.rol).toContain('discipulador');
  });

  it('con un Grupo destino lleno → 409 GRUPO_SIN_LUGAR y la Propuesta sigue pendiente', async () => {
    const ya = await esc.persona('ines');
    const { grupoId } = await esc.grupo(disc, [ya], admin); // max 1: lleno
    const persona = await esc.persona('juan');
    const { propuestaId } = await esc.propuestaNueva(persona, disc, admin, grupoId);
    const res = await http().post(`/discipulado/propuestas/${propuestaId}/aceptar`).set('Authorization', `Bearer ${tokenDisc}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('GRUPO_SIN_LUGAR');
    expect((await prisma.propuestaDiscipulado.findUnique({ where: { id: propuestaId }, select: { estado: true } }))?.estado).toBe('pendiente');
  });
});
