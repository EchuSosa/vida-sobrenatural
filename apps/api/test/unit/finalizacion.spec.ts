import { FinalizacionService } from '../../src/discipulado/finalizacion.service.js';
import { codigoDe, comoPrisma, eventosEspia, prismaFalso } from './discipulado-tx-falso.js';

/**
 * specs/004, T050 (FR-019 a FR-022, data-model → Grupo): en_curso →
 * (propuesta) → finalizado/completado, o → rechazada → en_curso otra vez.
 */
function armar(grupo: { estado: 'en_curso' | 'finalizado'; propuestaFinalizacionEn: Date | null }, conLiderazgo = true) {
  const prisma = prismaFalso({ grupo: { id: 'g-1', ...grupo } });
  prisma.liderazgo.findFirst.mockResolvedValue(conLiderazgo ? { id: 'lid', desde: new Date() } : null);
  prisma.inscripcion.findMany.mockResolvedValue([
    { id: 'i-1', personaId: 'p-1' },
    { id: 'i-2', personaId: 'p-2' },
  ]);
  const { eventos, emitir } = eventosEspia();
  return { prisma, emitir, servicio: new FinalizacionService(comoPrisma(prisma), eventos) };
}

describe('FinalizacionService.proponer', () => {
  it('en curso y sin propuesta → la guarda y avisa al Admin', async () => {
    const { servicio, prisma, emitir } = armar({ estado: 'en_curso', propuestaFinalizacionEn: null });
    await servicio.proponer('d', 'g-1');
    expect(prisma.grupo.update).toHaveBeenCalledWith(expect.objectContaining({ data: { propuestaFinalizacionEn: expect.any(Date), propuestaFinalizacionPorId: 'd' } }));
    expect(emitir).toHaveBeenCalledWith({ nombre: 'finalizacion_propuesta', a: { tipo: 'admin' }, datos: { grupoId: 'g-1' } });
  });

  it('ya propuesta → FINALIZACION_YA_PROPUESTA', async () => {
    const { servicio } = armar({ estado: 'en_curso', propuestaFinalizacionEn: new Date() });
    expect(await codigoDe(servicio.proponer('d', 'g-1'))).toBe('FINALIZACION_YA_PROPUESTA');
  });

  it('Grupo cerrado → DISCIPULADO_NO_EN_CURSO; sin Liderazgo vigente → 404', async () => {
    expect(await codigoDe(armar({ estado: 'finalizado', propuestaFinalizacionEn: null }).servicio.proponer('d', 'g-1'))).toBe('DISCIPULADO_NO_EN_CURSO');
    expect(await codigoDe(armar({ estado: 'en_curso', propuestaFinalizacionEn: null }, false).servicio.proponer('d', 'g-1'))).toBe('NO_ENCONTRADO');
  });
});

describe('FinalizacionService.confirmar', () => {
  it('pasa TODAS las activas a completada, cierra por completado y emite un evento por Persona', async () => {
    const { servicio, prisma, emitir } = armar({ estado: 'en_curso', propuestaFinalizacionEn: new Date() });
    await servicio.confirmar('g-1', 'admin-1');
    expect(prisma.inscripcion.updateMany).toHaveBeenCalledWith({ where: { grupoId: 'g-1', estado: 'activa' }, data: { estado: 'completada', cerradaEn: expect.any(Date) } });
    expect(prisma.grupo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: 'finalizado', motivoCierre: 'completado', cerradoEn: expect.any(Date), cerradoPorId: 'admin-1' } }),
    );
    expect(emitir).toHaveBeenCalledTimes(2);
    expect(prisma.persona.update).not.toHaveBeenCalled(); // FR-022: apto_ministerio no se toca
  });

  it('sin propuesta → FINALIZACION_NO_PROPUESTA, sin escribir', async () => {
    const { servicio, prisma } = armar({ estado: 'en_curso', propuestaFinalizacionEn: null });
    expect(await codigoDe(servicio.confirmar('g-1', 'admin-1'))).toBe('FINALIZACION_NO_PROPUESTA');
    expect(prisma.inscripcion.updateMany).not.toHaveBeenCalled();
  });

  it('retira una reasignación que había quedado propuesta (el Grupo cerró)', async () => {
    const { servicio, prisma } = armar({ estado: 'en_curso', propuestaFinalizacionEn: new Date() });
    prisma.propuestaDiscipulado.findFirst.mockResolvedValue({ id: 'reasig' });
    await servicio.confirmar('g-1', 'admin-1');
    expect(prisma.propuestaDiscipulado.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'reasig' }, data: { estado: 'retirada', retiradaPor: 'admin' } }));
  });
});

describe('FinalizacionService.rechazar', () => {
  it('limpia la propuesta y guarda el rechazo con motivo; el Grupo sigue en curso', async () => {
    const { servicio, prisma } = armar({ estado: 'en_curso', propuestaFinalizacionEn: new Date() });
    await servicio.rechazar('g-1', 'Falta el último capítulo');
    expect(prisma.grupo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { propuestaFinalizacionEn: null, propuestaFinalizacionPorId: null, finalizacionRechazadaEn: expect.any(Date), finalizacionRechazadaMotivo: 'Falta el último capítulo' },
      }),
    );
  });

  it('sin propuesta → FINALIZACION_NO_PROPUESTA', async () => {
    expect(await codigoDe(armar({ estado: 'en_curso', propuestaFinalizacionEn: null }).servicio.rechazar('g-1', undefined))).toBe('FINALIZACION_NO_PROPUESTA');
  });
});
