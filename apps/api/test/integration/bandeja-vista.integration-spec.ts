import { ESTADOS_POR_TIPO, TIPOS_SOLICITUD, esAbierta, type TipoSolicitud } from '@vida-sobrenatural/shared-types';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp } from './discipulado-fixtures.js';

const DIA = 86_400_000;

/**
 * spec 013, T011 (research #3) — el test de coherencia EXHAUSTIVO de la vista
 * `solicitudes_bandeja`: por cada tipo de `TIPOS_SOLICITUD` y cada estado de
 * `ESTADOS_POR_TIPO`, un registro real en su tabla, y la vista lo tiene que
 * devolver una vez, con `abierta === esAbierta(tipo, estado)` y la espera
 * correcta. Si una spec cambia los estados de su tipo en `bandeja.ts` sin
 * tocar la vista (o al revés), falla acá (contrato de cinco pasos, paso 6).
 *
 * Cada registro es de una Persona distinta, para no chocar con los índices
 * únicos parciales ("una abierta por Persona"). Los datos de cada estado
 * cumplen los CHECK de la migración de lote 0.
 */
describe('Vista solicitudes_bandeja — coherencia exhaustiva (spec 013 T011)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let adminId: string;
  let ministerioId: string;
  let eventoId: string;
  let apellido: string;
  /** Las Inscripciones `confirmada` que sostienen a cada Pago: también son filas de la vista. */
  let inscripcionesDePagos = 0;
  const creados: Array<{ tipo: TipoSolicitud; estado: string; id: string; personaId: string; esperaDesde: Date }> = [];
  const creadoEn = new Date(Date.now() - 10 * DIA);
  const propuestaEn = new Date(Date.now() - 3 * DIA);

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    const sufijo = `vista${Date.now()}`;
    escenario = new Escenario(prisma, sufijo);
    apellido = `Test${sufijo}`;
    await escenario.preparar();
    adminId = await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    ministerioId = (await prisma.ministerio.create({ data: { nombre: `Ministerio ${sufijo}`, descripcion: 'Test' }, select: { id: true } })).id;
    eventoId = (
      await prisma.evento.create({
        data: {
          sedeId: escenario.sedeId,
          nombre: `Evento ${sufijo}`,
          slug: `evento-${sufijo}`,
          descripcion: 'Test',
          inicio: new Date(Date.now() + 30 * DIA),
          requiereInscripcion: true,
          requiereAprobacion: true,
          cupo: 10,
          permiteListaEspera: true,
          creadoPorId: adminId,
        },
        select: { id: true },
      })
    ).id;

    let n = 0;
    for (const tipo of TIPOS_SOLICITUD) {
      for (const estado of ESTADOS_POR_TIPO[tipo]) {
        const personaId = await escenario.persona(`v${n++}`);
        creados.push(await crear(tipo, estado, personaId));
      }
    }
  });

  afterAll(async () => {
    const personas = creados.map((c) => c.personaId);
    const inscripciones = (await prisma.inscripcionEvento.findMany({ where: { eventoId }, select: { id: true } })).map((i) => i.id);
    await prisma.pago.deleteMany({ where: { inscripcionEventoId: { in: inscripciones } } });
    await prisma.solicitudBautismo.deleteMany({ where: { personaId: { in: personas } } });
    await prisma.inscripcionEvento.deleteMany({ where: { eventoId } });
    await prisma.evento.deleteMany({ where: { id: eventoId } });
    await prisma.postulacion.deleteMany({ where: { ministerioId } });
    await prisma.ministerio.deleteMany({ where: { id: ministerioId } });
    await prisma.solicitudVidaServicio.deleteMany({ where: { personaId: { in: personas } } });
    await prisma.declaracionHistorial.deleteMany({ where: { personaId: { in: personas } } });
    await escenario.limpiar();
    await app.close();
  });

  it('cada tipo y cada estado aparece una vez, con `abierta` = esAbierta y su espera', async () => {
    expect(creados).toHaveLength(TIPOS_SOLICITUD.reduce((n, t) => n + ESTADOS_POR_TIPO[t].length, 0));
    const filas = await prisma.$queryRaw<Array<{ tipo: string; id: string; personaId: string; estado: string; abierta: boolean; esperaDesde: Date }>>`
      SELECT "tipo", "id", "personaId", "estado", "abierta", "esperaDesde" FROM "solicitudes_bandeja"
      WHERE "personaId" IN (SELECT "id" FROM "personas" WHERE "apellido" = ${apellido})`;
    for (const c of creados) {
      const deEste = filas.filter((f) => f.tipo === c.tipo && f.id === c.id);
      expect({ tipo: c.tipo, estado: c.estado, filas: deEste.length }).toEqual({ tipo: c.tipo, estado: c.estado, filas: 1 });
      expect({ tipo: c.tipo, estado: c.estado, personaId: deEste[0].personaId, abierta: deEste[0].abierta, esperaDesde: deEste[0].esperaDesde.toISOString() }).toEqual({
        tipo: c.tipo,
        estado: c.estado,
        personaId: c.personaId,
        abierta: esAbierta(c.tipo, c.estado),
        esperaDesde: c.esperaDesde.toISOString(),
      });
    }
    // Y nada de más: la vista no inventa filas para estas Personas.
    expect(filas).toHaveLength(creados.length + inscripcionesDePagos);
  });

  /** Un registro de `tipo` en `estado`, con lo mínimo que exigen los CHECK de ese estado. */
  async function crear(tipo: TipoSolicitud, estado: string, personaId: string) {
    const revisado = { revisadoPorId: adminId, revisadaEn: new Date() };
    const base = { personaId, createdAt: creadoEn };
    const fila = (id: string, esperaDesde = creadoEn) => ({ tipo, estado, id, personaId, esperaDesde });
    switch (tipo) {
      case 'discipulado': {
        const { id } = await prisma.solicitudDiscipulado.create({ data: { ...base, estado: estado as never }, select: { id: true } });
        if (estado !== 'propuesta') return fila(id);
        // Discipulado con propuesta vigente → la espera cuenta desde `propuestaEn`.
        const discipuladorId = await escenario.persona(`disc-${id.slice(0, 8)}`, { rol: ['miembro_registrado', 'discipulador'] });
        await prisma.propuestaDiscipulado.create({ data: { tipo: 'nueva', solicitudId: id, discipuladorId, propuestaPorId: adminId, propuestaEn } });
        return fila(id, propuestaEn);
      }
      case 'historial': {
        const data = {
          ...base,
          etapa: 'vida_nueva' as const,
          estado: estado as never,
          ...(estado === 'confirmada' || estado === 'rechazada' ? revisado : {}),
          ...(estado === 'retirada' ? { retiradaEn: new Date() } : {}),
        };
        return fila((await prisma.declaracionHistorial.create({ data, select: { id: true } })).id);
      }
      case 'vida_de_servicio':
        return fila((await prisma.solicitudVidaServicio.create({ data: { ...base, estado: estado as never }, select: { id: true } })).id);
      case 'postulacion': {
        const data = {
          ...base,
          ministerioId,
          estado: estado as never,
          ...(estado === 'aprobada' || estado === 'rechazada' ? revisado : {}),
          ...(estado === 'inactiva' ? { motivoInactivacion: 'baja' as const, inactivadaEn: new Date() } : {}),
          ...(estado === 'retirada' ? { retiradaEn: new Date() } : {}),
        };
        return fila((await prisma.postulacion.create({ data, select: { id: true } })).id);
      }
      case 'bautismo': {
        const data = {
          ...base,
          estado: estado as never,
          ...(estado === 'realizada' ? { realizadaEn: new Date() } : {}),
          ...(estado === 'retirada' ? { retiradaEn: new Date() } : {}),
        };
        return fila((await prisma.solicitudBautismo.create({ data, select: { id: true } })).id);
      }
      case 'inscripcion_evento': {
        const data = {
          ...base,
          eventoId,
          estado: estado as never,
          ...(estado === 'lista_espera' ? { enListaDesde: new Date() } : {}),
          ...(estado === 'cancelada' ? { motivoCancelacion: 'persona' as const, canceladaEn: new Date() } : {}),
        };
        return fila((await prisma.inscripcionEvento.create({ data, select: { id: true } })).id);
      }
      case 'pago': {
        // La Persona de un Pago es la de su Inscripción.
        const inscripcion = await prisma.inscripcionEvento.create({ data: { personaId, eventoId, estado: 'confirmada' }, select: { id: true } });
        inscripcionesDePagos++;
        const { id } = await prisma.pago.create({
          data: {
            inscripcionEventoId: inscripcion.id,
            monto: 1000,
            medio: 'transferencia',
            fechaPago: new Date(),
            estado: estado as never,
            createdAt: creadoEn,
            ...(estado === 'rechazado' ? { motivoRechazo: 'No llegó la transferencia' } : {}),
          },
          select: { id: true },
        });
        return fila(id);
      }
    }
  }
});
