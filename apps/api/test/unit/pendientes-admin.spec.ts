import { DIAS_PROPUESTA_SIN_RESPUESTA } from '@vida-sobrenatural/shared-types';
import { ENLACES_PENDIENTES, PendientesAdminService } from '../../src/discipulado/pendientes-admin.service.js';
import { comoPrisma, prismaFalso } from './discipulado-tx-falso.js';

/** specs/004, T054f (FR-048): los cuatro contadores de la tarjeta de Pendientes. */
describe('PendientesAdminService', () => {
  const AHORA = new Date('2026-09-28T12:00:00Z');

  function armar() {
    const prisma = prismaFalso({});
    prisma.solicitudDiscipulado.findMany.mockResolvedValue([{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }]);
    // Última propuesta de cada Solicitud pendiente: una declinada, una retirada, una sin propuestas.
    prisma.propuestaDiscipulado.findMany.mockResolvedValue([
      { solicitudId: 's-1', estado: 'declinada' },
      { solicitudId: 's-2', estado: 'retirada' },
    ]);
    prisma.propuestaDiscipulado.count.mockResolvedValue(4);
    prisma.grupo.count.mockResolvedValue(2);
    prisma.inscripcion.count.mockResolvedValue(1);
    return { prisma, servicio: new PendientesAdminService(comoPrisma(prisma)) };
  }

  it('cuenta cada pendiente con su enlace al listado filtrado', async () => {
    const { servicio } = armar();
    await expect(servicio.pendientes(AHORA)).resolves.toEqual({
      propuestasDeclinadas: { cantidad: 1, enlace: ENLACES_PENDIENTES.propuestasDeclinadas },
      propuestasSinRespuesta: { cantidad: 4, enlace: ENLACES_PENDIENTES.propuestasSinRespuesta },
      finalizacionesPropuestas: { cantidad: 2, enlace: ENLACES_PENDIENTES.finalizacionesPropuestas },
      bajasPropuestas: { cantidad: 1, enlace: ENLACES_PENDIENTES.bajasPropuestas },
    });
  });

  it(`"sin respuesta" = pendientes propuestas hace más de ${DIAS_PROPUESTA_SIN_RESPUESTA} días`, async () => {
    const { servicio, prisma } = armar();
    await servicio.pendientes(AHORA);
    const limite = new Date(AHORA.getTime() - DIAS_PROPUESTA_SIN_RESPUESTA * 24 * 60 * 60 * 1000);
    expect(prisma.propuestaDiscipulado.count).toHaveBeenCalledWith({ where: { estado: 'pendiente', propuestaEn: { lt: limite } } });
  });

  it('declinadas: solo cuenta la ÚLTIMA propuesta de cada Solicitud pendiente', async () => {
    const { servicio, prisma } = armar();
    await servicio.pendientes(AHORA);
    expect(prisma.propuestaDiscipulado.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ['solicitudId'], orderBy: [{ solicitudId: 'asc' }, { propuestaEn: 'desc' }] }),
    );
  });

  it('sin Solicitudes pendientes → 0 declinadas sin consultar propuestas', async () => {
    const { servicio, prisma } = armar();
    prisma.solicitudDiscipulado.findMany.mockResolvedValue([]);
    const r = await servicio.pendientes(AHORA);
    expect(r.propuestasDeclinadas.cantidad).toBe(0);
    expect(prisma.propuestaDiscipulado.findMany).not.toHaveBeenCalled();
  });
});
