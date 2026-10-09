import { BajaService } from '../../src/discipulado/baja.service.js';
import { cursaOCompletoVidaNueva } from '../../src/discipulado/consultas.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { codigoDe, comoPrisma, eventosEspia, prismaFalso } from './discipulado-tx-falso.js';

/**
 * specs/004, T054a (FR-042, research #15): proponer, confirmar y rechazar la
 * baja de una Persona de un Grupo.
 */
function armar(
  inscripcion: { estado: string; bajaPropuestaEn: Date | null } | null,
  opciones: { grupoEstado?: 'en_curso' | 'finalizado'; quedan?: number } = {},
) {
  const prisma = prismaFalso({
    grupo: { id: 'g-1', estado: opciones.grupoEstado ?? 'en_curso', propuestaFinalizacionEn: null },
    inscripcion: inscripcion ? { id: 'i-1', grupoId: 'g-1', personaId: 'p-1', ...inscripcion } : null,
  });
  prisma.liderazgo.findFirst.mockResolvedValue({ id: 'lid', desde: new Date() });
  prisma.inscripcion.count.mockResolvedValue(opciones.quedan ?? 1);
  const { eventos, emitir } = eventosEspia();
  return { prisma, emitir, servicio: new BajaService(comoPrisma(prisma), eventos) };
}

describe('BajaService.proponer', () => {
  it('Inscripción no activa → DISCIPULADO_NO_EN_CURSO; de otro Grupo → 404', async () => {
    expect(await codigoDe(armar({ estado: 'completada', bajaPropuestaEn: null }).servicio.proponer('d', 'g-1', 'i-1', undefined))).toBe('DISCIPULADO_NO_EN_CURSO');
    expect(await codigoDe(armar(null).servicio.proponer('d', 'g-1', 'i-otra', undefined))).toBe('NO_ENCONTRADO');
  });

  it('dos veces → BAJA_YA_PROPUESTA', async () => {
    expect(await codigoDe(armar({ estado: 'activa', bajaPropuestaEn: new Date() }).servicio.proponer('d', 'g-1', 'i-1', undefined))).toBe('BAJA_YA_PROPUESTA');
  });

  it('guarda quién, cuándo y el motivo; avisa al Admin', async () => {
    const { servicio, prisma, emitir } = armar({ estado: 'activa', bajaPropuestaEn: null });
    await servicio.proponer('d', 'g-1', 'i-1', 'Dejó de venir');
    expect(prisma.inscripcion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { bajaPropuestaEn: expect.any(Date), bajaPropuestaPorId: 'd', bajaPropuestaMotivo: 'Dejó de venir' } }),
    );
    expect(emitir).toHaveBeenCalledWith(expect.anything(), { nombre: 'discipulado.baja_propuesta', a: { tipo: 'admin' }, datos: { grupoId: 'g-1', inscripcionId: 'i-1' } });
  });
});

describe('BajaService.confirmar', () => {
  it('sin baja propuesta → BAJA_NO_PROPUESTA', async () => {
    expect(await codigoDe(armar({ estado: 'activa', bajaPropuestaEn: null }).servicio.confirmar('g-1', 'i-1', 'admin'))).toBe('BAJA_NO_PROPUESTA');
  });

  it('deja `abandono` con cerradaEn; si quedan otras activas, el Grupo sigue en curso', async () => {
    const { servicio, prisma } = armar({ estado: 'activa', bajaPropuestaEn: new Date() }, { quedan: 1 });
    await expect(servicio.confirmar('g-1', 'i-1', 'admin')).resolves.toEqual({ grupoCerrado: false });
    expect(prisma.inscripcion.update).toHaveBeenCalledWith(expect.objectContaining({ data: { estado: 'abandono', cerradaEn: expect.any(Date) } }));
    expect(prisma.grupo.update).not.toHaveBeenCalled();
  });

  it('si era la última activa, el Grupo pasa a finalizado/abandonado', async () => {
    const { servicio, prisma, emitir } = armar({ estado: 'activa', bajaPropuestaEn: new Date() }, { quedan: 0 });
    await expect(servicio.confirmar('g-1', 'i-1', 'admin')).resolves.toEqual({ grupoCerrado: true });
    expect(prisma.grupo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: 'finalizado', motivoCierre: 'abandonado', cerradoEn: expect.any(Date), cerradoPorId: 'admin' } }),
    );
    expect(emitir).toHaveBeenCalledWith(expect.anything(), { nombre: 'discipulado.baja_confirmada', a: { tipo: 'persona', personaId: 'p-1' }, datos: { grupoId: 'g-1', inscripcionId: 'i-1' } });
  });
});

describe('BajaService.rechazar', () => {
  it('limpia la propuesta y guarda el rechazo con motivo', async () => {
    const { servicio, prisma } = armar({ estado: 'activa', bajaPropuestaEn: new Date() });
    await servicio.rechazar('g-1', 'i-1', 'Hablé con ella, sigue');
    expect(prisma.inscripcion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { bajaPropuestaEn: null, bajaPropuestaPorId: null, bajaPropuestaMotivo: null, bajaRechazadaEn: expect.any(Date), bajaRechazadaMotivo: 'Hablé con ella, sigue' },
      }),
    );
  });

  it('sin baja propuesta → BAJA_NO_PROPUESTA', async () => {
    expect(await codigoDe(armar({ estado: 'activa', bajaPropuestaEn: null }).servicio.rechazar('g-1', 'i-1', undefined))).toBe('BAJA_NO_PROPUESTA');
  });
});

describe('cursaOCompletoVidaNueva (FR-042: el abandono no impide volver a pedir)', () => {
  it('solo mira `activa` y `completada`', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const db = { inscripcion: { findFirst } } as unknown as PrismaService;
    await expect(cursaOCompletoVidaNueva(db, 'p-1')).resolves.toBe(false);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ estado: { in: ['activa', 'completada'] } }) }));
  });
});
