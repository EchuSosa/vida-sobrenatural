import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { esAbierta, normalizarTelefono, type TipoSolicitud } from '@vida-sobrenatural/shared-types';
import { AppModule } from '../../src/app.module.js';
import { configurarApp } from '../../src/configurar-app.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { StorageService } from '../../src/storage/storage.service.js';
import { servirArchivosPublicos } from '../../src/storage/archivos-publicos.js';
import { completoEtapa } from '../../src/camino/consultas.js';
import { cancelarInscripcionBautismo, inscribirEnBautismo } from '../../src/evento/inscripcion-bautismo.js';
import { Escenario } from './discipulado-fixtures.js';

/**
 * Lote 0 global (specs 006–013): lo compartido que ya funciona contra la base
 * real — el trigger del teléfono normalizado (y su gemelo en TS), la vista de
 * la bandeja, `emitir` dentro de la transacción, la consulta única de
 * "¿completó esta etapa?" y las áreas privadas del storage.
 */
describe('Lote 0 global (integración)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let avisos: NotificacionesService;
  let escenario: Escenario;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configurarApp(app);
    servirArchivosPublicos(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    avisos = moduleFixture.get(NotificacionesService);
    escenario = new Escenario(prisma, `l0-${Date.now()}`);
    await escenario.preparar();
    adminId = await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] });
  });

  afterAll(async () => {
    const personas = (await prisma.persona.findMany({ where: { apellido: { startsWith: 'Testl0-' } }, select: { id: true } })).map((p) => p.id);
    await prisma.entregaNotificacion.deleteMany({ where: { personaId: { in: personas } } });
    await prisma.notificacion.deleteMany({ where: { entidadId: { startsWith: 'l0-' } } });
    await prisma.completitudManual.deleteMany({ where: { personaId: { in: personas } } });
    await prisma.inscripcionEvento.deleteMany({ where: { personaId: { in: personas } } });
    await prisma.evento.deleteMany({ where: { nombre: { startsWith: 'l0-' } } });
    await escenario.limpiar();
    await app.close();
  });

  describe('teléfono normalizado (spec 006, research #7)', () => {
    it('el trigger calcula lo mismo que normalizarTelefono, al crear y al editar', async () => {
      const id = await escenario.persona('tel', { telefono: '+54 9 221 555-1234' });
      const creada = await prisma.persona.findUniqueOrThrow({ where: { id }, select: { telefonoNormalizado: true } });
      expect(creada.telefonoNormalizado).toBe(normalizarTelefono('+54 9 221 555-1234'));

      await prisma.persona.update({ where: { id }, data: { telefono: '+598 99 123 456' } });
      const editada = await prisma.persona.findUniqueOrThrow({ where: { id }, select: { telefonoNormalizado: true } });
      expect(editada.telefonoNormalizado).toBe(normalizarTelefono('+598 99 123 456'));
    });

    it('coincide con la regla de TS en todas las Personas de la base', async () => {
      const todas = await prisma.persona.findMany({ select: { telefono: true, telefonoNormalizado: true } });
      for (const p of todas) expect(p.telefonoNormalizado).toBe(normalizarTelefono(p.telefono));
    });
  });

  describe('vista solicitudes_bandeja (D178, D208)', () => {
    it('la columna abierta coincide con ESTADOS_ABIERTOS para cada fila', async () => {
      const personaId = await escenario.persona('bandeja');
      await prisma.solicitudDiscipulado.create({ data: { personaId, estado: 'pendiente' } });
      const filas = await prisma.$queryRaw<{ tipo: TipoSolicitud; estado: string; abierta: boolean; personaId: string }[]>`
        SELECT "tipo", "estado", "abierta", "personaId" FROM "solicitudes_bandeja"`;
      expect(filas.some((f) => f.personaId === personaId && f.tipo === 'discipulado' && f.abierta)).toBe(true);
      for (const f of filas) expect({ ...f, abierta: f.abierta }).toEqual({ ...f, abierta: esAbierta(f.tipo, f.estado) });
    });
  });

  describe('NotificacionesService.emitir (spec 012, D197)', () => {
    it('si la transacción se deshace no queda nada; si se confirma, queda el aviso con su entrega', async () => {
      const personaId = await escenario.persona('aviso');
      const evento = {
        nombre: 'discipulado.solicitud_rechazada' as const,
        a: { tipo: 'persona' as const, personaId },
        datos: { solicitudId: 'l0-solicitud' },
      };

      await expect(
        prisma.$transaction(async (tx) => {
          await avisos.emitir(tx, evento);
          throw new Error('se deshace');
        }),
      ).rejects.toThrow('se deshace');
      expect(await prisma.entregaNotificacion.count({ where: { personaId } })).toBe(0);

      const { hayEmails } = await prisma.$transaction((tx) => avisos.emitir(tx, evento));
      // `importante` y con email → una entrega en la app y otra por email (pendiente).
      expect(hayEmails).toBe(true);
      const entregas = await prisma.entregaNotificacion.findMany({ where: { personaId }, select: { canal: true, estado: true } });
      expect(entregas).toEqual(
        expect.arrayContaining([
          { canal: 'app', estado: 'enviada' },
          { canal: 'email', estado: 'pendiente' },
        ]),
      );
    });

    it('con clave de idempotencia, emitir dos veces deja un solo aviso', async () => {
      const personaId = await escenario.persona('idem');
      const evento = { nombre: 'persona.cuenta_activada' as const, a: { tipo: 'persona' as const, personaId }, datos: { personaId } };
      await prisma.$transaction((tx) => avisos.emitir(tx, evento));
      await prisma.$transaction((tx) => avisos.emitir(tx, evento));
      expect(await prisma.notificacion.count({ where: { claveIdempotencia: `persona.cuenta_activada:${personaId}` } })).toBe(1);
      await prisma.entregaNotificacion.deleteMany({ where: { personaId } });
      await prisma.notificacion.deleteMany({ where: { claveIdempotencia: `persona.cuenta_activada:${personaId}` } });
    });

    it('lo que va al Admin no genera avisos (D201)', async () => {
      const antes = await prisma.notificacion.count();
      await prisma.$transaction((tx) =>
        avisos.emitir(tx, { nombre: 'discipulado.finalizacion_propuesta', a: { tipo: 'admin' }, datos: { grupoId: 'l0-grupo' } }),
      );
      expect(await prisma.notificacion.count()).toBe(antes);
    });
  });

  describe('completoEtapa (spec 006, D155)', () => {
    it('sin nada → null; con Completitud Manual vigente → historial; anulada → null', async () => {
      const personaId = await escenario.persona('camino');
      expect(await completoEtapa(prisma, personaId, 'vida_de_servicio')).toBeNull();
      const c = await prisma.completitudManual.create({
        data: { personaId, etapa: 'vida_de_servicio', origen: 'admin', registradaPorId: adminId },
      });
      expect(await completoEtapa(prisma, personaId, 'vida_de_servicio')).toBe('historial');
      await prisma.completitudManual.update({ where: { id: c.id }, data: { anuladaEn: new Date(), anuladaPorId: adminId } });
      expect(await completoEtapa(prisma, personaId, 'vida_de_servicio')).toBeNull();
    });

    it('Vida Nueva completada en el sistema → sistema', async () => {
      const personaId = await escenario.persona('vn');
      const discipuladorId = await escenario.discipulador('vn-disc');
      const { inscripciones } = await escenario.grupo(discipuladorId, [personaId], adminId);
      await prisma.inscripcion.update({ where: { id: inscripciones[0] }, data: { estado: 'completada' } });
      expect(await completoEtapa(prisma, personaId, 'vida_nueva')).toBe('sistema');
    });
  });

  describe('inscripción a un Evento de bautismo (E5 de la 010 con la 011)', () => {
    it('inscribe salteando cupo y aprobación, y cancela; rechaza un Evento que no es de bautismo', async () => {
      const personaId = await escenario.persona('bautismo');
      const base = {
        sedeId: escenario.sedeId,
        descripcion: 'Evento de prueba',
        inicio: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        requiereInscripcion: true,
        creadoPorId: adminId,
      };
      const bautismo = await prisma.evento.create({ data: { ...base, nombre: 'l0-bautismo', slug: `l0-bautismo-${Date.now()}`, tipo: 'bautismo', cupo: 1 } });
      const general = await prisma.evento.create({ data: { ...base, nombre: 'l0-general', slug: `l0-general-${Date.now()}` } });

      const { inscripcionId } = await prisma.$transaction((tx) =>
        inscribirEnBautismo(tx, { eventoId: bautismo.id, personaId, creadoPorId: adminId }),
      );
      expect((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: inscripcionId } })).estado).toBe('confirmada');

      await prisma.$transaction((tx) => cancelarInscripcionBautismo(tx, { inscripcionId, canceladaPorId: adminId, motivo: 'admin' }));
      expect((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: inscripcionId } })).estado).toBe('cancelada');

      await expect(
        prisma.$transaction((tx) => inscribirEnBautismo(tx, { eventoId: general.id, personaId, creadoPorId: adminId })),
      ).rejects.toMatchObject({ code: 'EVENTO_NO_ES_DE_BAUTISMO' });
    });
  });

  describe('storage: áreas privadas (D168)', () => {
    it('un archivo privado no se sirve como estático, pero la API lo puede leer', async () => {
      const storage = app.get(StorageService);
      const { ruta } = await storage.subirPrivado('contenidos', {
        buffer: Buffer.from('%PDF-1.4 l0'),
        nombreOriginal: 'material.pdf',
        mimeType: 'application/pdf',
      });
      const respuesta = await request(app.getHttpServer()).get(`/archivos/portadas/.privado/contenidos/${ruta}`);
      expect([403, 404]).toContain(respuesta.status);

      const chunks: Buffer[] = [];
      for await (const chunk of await storage.leer('contenidos', ruta)) chunks.push(chunk as Buffer);
      expect(Buffer.concat(chunks).toString()).toBe('%PDF-1.4 l0');
      await storage.eliminar(ruta, 'contenidos');
    });
  });
});
