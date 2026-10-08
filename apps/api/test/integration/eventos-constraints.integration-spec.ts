import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { Prisma } from '../../src/generated/prisma/client.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { EscenarioEventos, levantarApp } from './eventos-fixtures.js';

/**
 * spec 011, T010 — las restricciones de la base son la última línea (H-140):
 * cada CHECK rechaza su caso (incluido el del bautismo, FR-045) y los índices
 * únicos parciales impiden dos Inscripciones abiertas y dos Pagos pendientes
 * (FR-021, FR-030).
 */
describe('Restricciones de Eventos en la base (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `cons${Date.now()}`);
    await esc.preparar();
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  const inicio = new Date(Date.now() + 86_400_000);
  it.each<[string, Partial<Prisma.EventoUncheckedCreateInput>]>([
    ['eventos_fin_despues_del_inicio', { fin: new Date(inicio.getTime() - 1000) }],
    ['eventos_aprobacion_con_inscripcion', { requiereInscripcion: false, requiereAprobacion: true }],
    ['eventos_cupo_positivo', { cupo: 0 }],
    ['eventos_lista_con_cupo', { permiteListaEspera: true }],
    ['eventos_costo_positivo', { costo: '-1', instruccionesPago: 'x' }],
    ['eventos_costo_con_instrucciones', { costo: '100' }],
    ['eventos_recordatorio_valido', { requiereInscripcion: false, diasAnticipacionRecordatorio: 3 }],
    ['eventos_flyer_con_texto_alternativo', { imagenUrl: 'http://x/flyer.jpg' }],
    ['eventos_bautismo_config', { tipo: 'bautismo', costo: '100', instruccionesPago: 'x' }],
  ])('%s rechaza su caso', async (restriccion, datos) => {
    await expect(esc.evento({ inicio, ...datos })).rejects.toThrow(restriccion);
  });

  it('inscripciones_evento_una_abierta: una sola abierta por Persona y Evento; con la anterior cancelada, sí', async () => {
    const ev = await esc.evento({ inicio });
    const persona = await esc.persona('u1');
    await esc.inscripcion(ev.id, persona);
    await expect(esc.inscripcion(ev.id, persona, 'lista_espera')).rejects.toThrow();
    const otro = await esc.evento({ inicio });
    await esc.inscripcion(otro.id, persona, 'cancelada');
    await expect(esc.inscripcion(otro.id, persona)).resolves.toBeDefined();
  });

  it('pagos_uno_pendiente_por_inscripcion: un solo Pago en revisión por Inscripción', async () => {
    const ev = await esc.evento({ inicio, costo: '100', instruccionesPago: 'Alias' });
    const insc = await esc.inscripcion(ev.id, await esc.persona('p1'));
    await esc.pago(insc);
    await expect(esc.pago(insc)).rejects.toThrow();
    await expect(esc.pago(insc, 'verificado')).resolves.toBeDefined();
  });
});
