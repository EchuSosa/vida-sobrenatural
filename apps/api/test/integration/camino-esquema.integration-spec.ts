import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp } from './discipulado-fixtures.js';
import { limpiarCamino } from './camino-fixtures.js';

/**
 * spec 006, T013 (FR-010, FR-015, FR-030): lo que garantiza la base aunque
 * el código se equivoque — los índices únicos parciales y los CHECK de
 * `declaraciones_historial` y `completitudes_manuales` (migración del lote 0),
 * y que `Persona.email` admite varios NULL. El teléfono normalizado (trigger
 * vs `normalizarTelefono`) ya lo prueba `lote-0-global.integration-spec.ts`.
 */
describe('Esquema de Mi camino (spec 006, T013)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let adminId: string;
  const sufijo = `cesq-${Date.now()}`;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    adminId = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
  });

  afterAll(async () => {
    await prisma.persona.deleteMany({ where: { apellido: `Sinemail${sufijo}` } });
    await limpiarCamino(prisma, `Test${sufijo}`);
    await esc.limpiar();
    await app.close();
  });

  it('una sola declaración pendiente por Persona y etapa; resueltas o de otra etapa conviven', async () => {
    const id = await esc.persona('pend');
    await prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'bautismo' } });
    await expect(prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'bautismo' } })).rejects.toMatchObject({ code: 'P2002' });
    await prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'ministerio' } });
    await prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'bautismo', estado: 'retirada', retiradaEn: new Date() } });
    await prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'bautismo', estado: 'retirada', retiradaEn: new Date() } });
  });

  it('una sola Completitud vigente por Persona y etapa; las anuladas no cuentan', async () => {
    const id = await esc.persona('compl');
    const primera = await prisma.completitudManual.create({ data: { personaId: id, etapa: 'vida_nueva', origen: 'admin', registradaPorId: adminId } });
    await expect(
      prisma.completitudManual.create({ data: { personaId: id, etapa: 'vida_nueva', origen: 'admin', registradaPorId: adminId } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await prisma.completitudManual.update({ where: { id: primera.id }, data: { anuladaEn: new Date(), anuladaPorId: adminId } });
    await prisma.completitudManual.create({ data: { personaId: id, etapa: 'vida_nueva', origen: 'admin', registradaPorId: adminId } });
  });

  it('los CHECK de la declaración rechazan estados incoherentes', async () => {
    const id = await esc.persona('check');
    const incoherentes = [
      { estado: 'confirmada' as const }, // sin quién ni cuándo
      { estado: 'pendiente' as const, revisadoPorId: adminId, revisadaEn: new Date() }, // revisada pero pendiente
      { estado: 'pendiente' as const, motivoRechazo: 'No' }, // motivo sin rechazo
      { estado: 'retirada' as const }, // retirada sin fecha
      { estado: 'pendiente' as const, retiradaEn: new Date() }, // fecha de retiro sin retirar
      { estado: 'pendiente' as const, comentario: 'a'.repeat(501) },
      { estado: 'rechazada' as const, revisadoPorId: adminId, revisadaEn: new Date(), motivoRechazo: 'a'.repeat(501) },
    ];
    for (const datos of incoherentes) {
      await expect(prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'ministerio', ...datos } })).rejects.toThrow();
    }
    expect(await prisma.declaracionHistorial.count({ where: { personaId: id } })).toBe(0);
  });

  it('los CHECK de la Completitud: origen declaración ⇔ declaracionId; anulación con quién y cuándo; nota ≤ 500', async () => {
    const id = await esc.persona('checkc');
    const declaracion = await prisma.declaracionHistorial.create({
      data: { personaId: id, etapa: 'bautismo', estado: 'confirmada', revisadoPorId: adminId, revisadaEn: new Date() },
    });
    const incoherentes = [
      { origen: 'declaracion' as const },
      { origen: 'admin' as const, declaracionId: declaracion.id },
      { origen: 'admin' as const, anuladaEn: new Date() },
      { origen: 'admin' as const, nota: 'a'.repeat(501) },
    ];
    for (const datos of incoherentes) {
      await expect(prisma.completitudManual.create({ data: { personaId: id, etapa: 'bautismo', registradaPorId: adminId, ...datos } })).rejects.toThrow();
    }
    await prisma.completitudManual.create({
      data: { personaId: id, etapa: 'bautismo', origen: 'declaracion', declaracionId: declaracion.id, registradaPorId: adminId, nota: 'é'.repeat(500) },
    });
  });

  it('dos Personas sin email conviven (email opcional y único entre quienes lo tienen)', async () => {
    const datos = {
      nombre: 'Sin',
      apellido: `Sinemail${sufijo}`,
      genero: 'femenino' as const,
      fechaNacimiento: new Date('1950-01-01'),
      telefono: '+5492214440000',
      direccion: 'Calle 2',
      sedeId: esc.sedeId,
      estadoCivil: 'viudo_a' as const,
      profesion: 'jubilado_a' as const,
      congregaDesde: 1990,
      estado: 'activa' as const,
      consentimientoDatos: true,
    };
    await prisma.persona.create({ data: { ...datos, email: null } });
    await prisma.persona.create({ data: { ...datos, email: null } });
    expect(await prisma.persona.count({ where: { apellido: `Sinemail${sufijo}`, email: null } })).toBe(2);
  });
});
