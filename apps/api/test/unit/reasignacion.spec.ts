import type { Franja } from '@vida-sobrenatural/shared-types';
import { ReasignacionService } from '../../src/discipulado/reasignacion.service.js';
import { CruceService } from '../../src/discipulado/cruce.service.js';
import { interseccionDeFranjas } from '../../src/discipulado/validaciones.js';
import { codigoDe, comoPrisma, eventosEspia, prismaFalso } from './discipulado-tx-falso.js';

/**
 * specs/004, T028 (FR-030): la reasignación se PROPONE; el Liderazgo actual
 * no se toca hasta que el nuevo acepte. Y el horario derivado de un Grupo
 * (research #14), que usa el cruce de la reasignación.
 */
const disponible = { id: 'nuevo', rol: ['discipulador'], activo: true, disponibleDiscipulado: true, maxPersonasPorGrupo: 1 };

function armar(opciones: { grupoEstado?: 'en_curso' | 'finalizado'; pendiente?: boolean; vigente?: string; nuevo?: Record<string, unknown>; conAgenda?: boolean } = {}) {
  const prisma = prismaFalso({
    grupo: { id: 'g-1', estado: opciones.grupoEstado ?? 'en_curso', propuestaFinalizacionEn: null },
    reasignacionPendiente: opciones.pendiente ? { id: 'prop-r', discipuladorId: 'otro', estado: 'pendiente' } : null,
    persona: opciones.nuevo ?? disponible,
  });
  prisma.liderazgo.findFirst.mockResolvedValue({ personaId: opciones.vigente ?? 'actual' });
  prisma.franjaAgenda.findFirst.mockResolvedValue(opciones.conAgenda === false ? null : { id: 'f' });
  prisma.propuestaDiscipulado.create.mockResolvedValue({ id: 'prop-nueva' });
  const { eventos, emitir } = eventosEspia();
  const servicio = new ReasignacionService(comoPrisma(prisma), new CruceService(comoPrisma(prisma)), eventos);
  return { prisma, emitir, servicio };
}

describe('ReasignacionService.proponer', () => {
  it('crea una Propuesta `reasignacion` pendiente y NO toca el Liderazgo actual', async () => {
    const { servicio, prisma, emitir } = armar();
    await expect(servicio.proponer('g-1', 'nuevo', 'admin')).resolves.toEqual({ propuestaId: 'prop-nueva' });
    expect(prisma.propuestaDiscipulado.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tipo: 'reasignacion', grupoId: 'g-1', discipuladorId: 'nuevo', propuestaPorId: 'admin', estado: 'pendiente' } }),
    );
    expect(prisma.liderazgo.updateMany).not.toHaveBeenCalled();
    expect(prisma.liderazgo.create).not.toHaveBeenCalled();
    expect(emitir).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'propuesta_nueva', a: { tipo: 'discipulador', personaId: 'nuevo' } }));
  });

  it('al mismo Discipulador → REASIGNACION_AL_MISMO_DISCIPULADOR', async () => {
    expect(await codigoDe(armar({ vigente: 'nuevo' }).servicio.proponer('g-1', 'nuevo', 'admin'))).toBe('REASIGNACION_AL_MISMO_DISCIPULADOR');
  });

  it('con otra reasignación pendiente → REASIGNACION_YA_PROPUESTA', async () => {
    expect(await codigoDe(armar({ pendiente: true }).servicio.proponer('g-1', 'nuevo', 'admin'))).toBe('REASIGNACION_YA_PROPUESTA');
  });

  it('Grupo cerrado → DISCIPULADO_NO_EN_CURSO', async () => {
    expect(await codigoDe(armar({ grupoEstado: 'finalizado' }).servicio.proponer('g-1', 'nuevo', 'admin'))).toBe('DISCIPULADO_NO_EN_CURSO');
  });

  it('el nuevo sin rol, con el toggle apagado o sin agenda → DISCIPULADOR_NO_DISPONIBLE (FR-006)', async () => {
    for (const caso of [
      armar({ nuevo: { ...disponible, rol: [] } }),
      armar({ nuevo: { ...disponible, disponibleDiscipulado: false } }),
      armar({ conAgenda: false }),
    ]) {
      expect(await codigoDe(caso.servicio.proponer('g-1', 'nuevo', 'admin'))).toBe('DISCIPULADOR_NO_DISPONIBLE');
    }
  });

  it('el índice único parcial (P2002) se traduce a REASIGNACION_YA_PROPUESTA, nunca a 500', async () => {
    const { servicio, prisma } = armar();
    prisma.propuestaDiscipulado.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await codigoDe(servicio.proponer('g-1', 'nuevo', 'admin'))).toBe('REASIGNACION_YA_PROPUESTA');
  });
});

describe('ReasignacionService.retirar', () => {
  it('sin reasignación pendiente → PROPUESTA_NO_VIGENTE', async () => {
    expect(await codigoDe(armar().servicio.retirar('g-1'))).toBe('PROPUESTA_NO_VIGENTE');
  });

  it('la deja `retirada` por el Admin', async () => {
    const { servicio, prisma } = armar({ pendiente: true });
    await servicio.retirar('g-1');
    expect(prisma.propuestaDiscipulado.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'prop-r' }, data: { estado: 'retirada', retiradaPor: 'admin' } }));
  });
});

describe('interseccionDeFranjas (research #14)', () => {
  const martes18a21: Franja = { diaSemana: 2, inicio: 1080, fin: 1260 };
  const martes19a22: Franja = { diaSemana: 2, inicio: 1140, fin: 1320 };
  const sabado: Franja = { diaSemana: 6, inicio: 600, fin: 780 };

  it('una sola lista → esa misma', () => {
    expect(interseccionDeFranjas([[martes18a21]])).toEqual([martes18a21]);
  });

  it('el tramo común del mismo día, si tiene al menos 60 minutos', () => {
    expect(interseccionDeFranjas([[martes18a21], [martes19a22]])).toEqual([{ diaSemana: 2, inicio: 1140, fin: 1260 }]);
  });

  it('días distintos o menos de 60 minutos en común → vacío', () => {
    expect(interseccionDeFranjas([[martes18a21], [sabado]])).toEqual([]);
    expect(interseccionDeFranjas([[martes18a21], [{ diaSemana: 2, inicio: 1230, fin: 1300 }]])).toEqual([]);
  });

  it('sin listas → sin horario', () => {
    expect(interseccionDeFranjas([])).toEqual([]);
  });
});
