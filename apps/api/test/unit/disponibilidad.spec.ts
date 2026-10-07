import { Test } from '@nestjs/testing';
import { hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import {
  aparicionEnElCruce,
  bloqueosVisibles,
  validarBloqueo,
  validarFranja,
  validarFranjaContraAgenda,
  validarMaximoPorGrupo,
} from '../../src/disponibilidad/disponibilidad-puro.js';
import { DisponibilidadService } from '../../src/disponibilidad/disponibilidad.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { AppException } from '../../src/common/errors/app-exception.js';

/**
 * specs/004, T037 (Historia 4, contracts/disponibilidad-api.md): validaciones
 * por campo, `apareceEnElCruce`/`porQueNo` y que el sistema nunca toque el
 * toggle (FR-015).
 */
const HOY = '2026-10-10';

describe('validarFranja', () => {
  it('franja válida → sin errores', () => {
    expect(validarFranja({ diaSemana: 2, inicio: 1140, fin: 1260 })).toEqual([]);
  });

  it('fin igual al inicio → FRANJA_FIN_ANTERIOR_AL_INICIO en fin', () => {
    expect(validarFranja({ diaSemana: 2, inicio: 1140, fin: 1140 })).toEqual([{ campo: 'fin', code: 'FRANJA_FIN_ANTERIOR_AL_INICIO' }]);
  });

  it('fin anterior al inicio → FRANJA_FIN_ANTERIOR_AL_INICIO en fin', () => {
    expect(validarFranja({ diaSemana: 2, inicio: 1140, fin: 600 })).toEqual([{ campo: 'fin', code: 'FRANJA_FIN_ANTERIOR_AL_INICIO' }]);
  });

  it('diaSemana 7 → DIA_SEMANA_INVALIDO', () => {
    expect(validarFranja({ diaSemana: 7, inicio: 600, fin: 700 })).toEqual([{ campo: 'diaSemana', code: 'DIA_SEMANA_INVALIDO' }]);
  });

  it('diaSemana -1 → DIA_SEMANA_INVALIDO', () => {
    expect(validarFranja({ diaSemana: -1, inicio: 600, fin: 700 })).toEqual([{ campo: 'diaSemana', code: 'DIA_SEMANA_INVALIDO' }]);
  });

  it('fin 1440 (medianoche) es válido; fin 1441 no', () => {
    expect(validarFranja({ diaSemana: 0, inicio: 1380, fin: 1440 })).toEqual([]);
    expect(validarFranja({ diaSemana: 0, inicio: 1380, fin: 1441 })).toEqual([{ campo: 'fin', code: 'FIN_INVALIDO' }]);
  });

  it('inicio 1440 no es válido', () => {
    expect(validarFranja({ diaSemana: 0, inicio: 1440, fin: 1440 })).toEqual([{ campo: 'inicio', code: 'INICIO_INVALIDO' }]);
  });

  it('junta los errores de varios campos', () => {
    expect(validarFranja({ diaSemana: 9, inicio: 700, fin: 600 })).toEqual([
      { campo: 'diaSemana', code: 'DIA_SEMANA_INVALIDO' },
      { campo: 'fin', code: 'FRANJA_FIN_ANTERIOR_AL_INICIO' },
    ]);
  });
});

describe('validarFranjaContraAgenda (FR-017a, H-R7/H-R8)', () => {
  const martes19a21 = { diaSemana: 2, inicio: 1140, fin: 1260 };

  it('de menos de 60 minutos → FRANJA_MUY_CORTA en fin; 60 exactos se aceptan', () => {
    expect(validarFranjaContraAgenda({ diaSemana: 2, inicio: 1350, fin: 1351 }, [])).toEqual([{ campo: 'fin', code: 'FRANJA_MUY_CORTA' }]);
    expect(validarFranjaContraAgenda({ diaSemana: 2, inicio: 1350, fin: 1409 }, [])).toEqual([{ campo: 'fin', code: 'FRANJA_MUY_CORTA' }]);
    expect(validarFranjaContraAgenda({ diaSemana: 2, inicio: 1350, fin: 1410 }, [])).toEqual([]);
  });

  it('igual a una ya cargada → FRANJA_REPETIDA en inicio', () => {
    expect(validarFranjaContraAgenda({ ...martes19a21 }, [martes19a21])).toEqual([{ campo: 'inicio', code: 'FRANJA_REPETIDA' }]);
  });

  it('que pisa a otra del mismo día → FRANJA_SUPERPUESTA en inicio', () => {
    expect(validarFranjaContraAgenda({ diaSemana: 2, inicio: 1200, fin: 1320 }, [martes19a21])).toEqual([{ campo: 'inicio', code: 'FRANJA_SUPERPUESTA' }]);
    expect(validarFranjaContraAgenda({ diaSemana: 2, inicio: 1080, fin: 1320 }, [martes19a21])).toEqual([{ campo: 'inicio', code: 'FRANJA_SUPERPUESTA' }]);
  });

  it('pegada a otra (termina cuando la otra empieza) u otro día → se acepta', () => {
    expect(validarFranjaContraAgenda({ diaSemana: 2, inicio: 1260, fin: 1320 }, [martes19a21])).toEqual([]);
    expect(validarFranjaContraAgenda({ diaSemana: 3, inicio: 1140, fin: 1260 }, [martes19a21])).toEqual([]);
  });
});

describe('validarBloqueo', () => {
  it('hasta anterior a desde → BLOQUEO_FIN_ANTERIOR_AL_INICIO en hasta', () => {
    expect(validarBloqueo({ desde: '2026-10-20', hasta: '2026-10-15' }, HOY)).toEqual([
      { campo: 'hasta', code: 'BLOQUEO_FIN_ANTERIOR_AL_INICIO' },
    ]);
  });

  it('hasta anterior a hoy → BLOQUEO_YA_VENCIDO en hasta', () => {
    expect(validarBloqueo({ desde: '2026-10-01', hasta: '2026-10-09' }, HOY)).toEqual([{ campo: 'hasta', code: 'BLOQUEO_YA_VENCIDO' }]);
  });

  it('hasta == hoy se acepta (todavía cubre hoy)', () => {
    expect(validarBloqueo({ desde: '2026-10-01', hasta: HOY }, HOY)).toEqual([]);
  });

  it('un solo día (desde == hasta) se acepta', () => {
    expect(validarBloqueo({ desde: '2026-10-20', hasta: '2026-10-20' }, HOY)).toEqual([]);
  });
});

describe('validarMaximoPorGrupo', () => {
  it.each([0, 7, -1, 2.5])('%p → MAXIMO_POR_GRUPO_FUERA_DE_RANGO', (n) => {
    expect(validarMaximoPorGrupo(n)).toEqual([{ campo: 'maxPersonasPorGrupo', code: 'MAXIMO_POR_GRUPO_FUERA_DE_RANGO' }]);
  });

  it.each([1, 3, 6])('%p → válido', (n) => {
    expect(validarMaximoPorGrupo(n)).toEqual([]);
  });
});

describe('aparicionEnElCruce (FR-006), en orden de prioridad', () => {
  const vigente = { desde: '2026-10-05', hasta: '2026-10-15' };
  const futuro = { desde: '2026-11-01', hasta: '2026-11-15' };

  it('sin agenda gana aunque el toggle esté apagado y haya bloqueo vigente', () => {
    expect(aparicionEnElCruce({ cantidadFranjas: 0, disponible: false, bloqueos: [vigente], hoy: HOY })).toEqual({
      apareceEnElCruce: false,
      porQueNo: 'sin_agenda',
    });
  });

  it('con agenda y toggle apagado → toggle_apagado, aunque haya bloqueo vigente', () => {
    expect(aparicionEnElCruce({ cantidadFranjas: 1, disponible: false, bloqueos: [vigente], hoy: HOY })).toEqual({
      apareceEnElCruce: false,
      porQueNo: 'toggle_apagado',
    });
  });

  it('con agenda, toggle prendido y bloqueo vigente → bloqueo_vigente', () => {
    expect(aparicionEnElCruce({ cantidadFranjas: 1, disponible: true, bloqueos: [futuro, vigente], hoy: HOY })).toEqual({
      apareceEnElCruce: false,
      porQueNo: 'bloqueo_vigente',
    });
  });

  it('con agenda, toggle prendido y solo bloqueos futuros → aparece', () => {
    expect(aparicionEnElCruce({ cantidadFranjas: 2, disponible: true, bloqueos: [futuro], hoy: HOY })).toEqual({
      apareceEnElCruce: true,
      porQueNo: null,
    });
  });
});

describe('bloqueosVisibles', () => {
  it('oculta los vencidos, marca el vigente y ordena por desde; superpuestos conviven', () => {
    const resultado = bloqueosVisibles(
      [
        { id: 'futuro', desde: '2026-11-01', hasta: '2026-11-15' },
        { id: 'vencido', desde: '2026-09-01', hasta: '2026-10-09' },
        { id: 'vigente', desde: '2026-10-05', hasta: '2026-10-10' },
        { id: 'superpuesto', desde: '2026-10-08', hasta: '2026-11-03' },
      ],
      HOY,
    );
    expect(resultado).toEqual([
      { id: 'vigente', desde: '2026-10-05', hasta: '2026-10-10', vigente: true },
      { id: 'superpuesto', desde: '2026-10-08', hasta: '2026-11-03', vigente: true },
      { id: 'futuro', desde: '2026-11-01', hasta: '2026-11-15', vigente: false },
    ]);
  });
});

describe('DisponibilidadService', () => {
  function prismaMock(estado: { disponible: boolean; franjas: { id: string; diaSemana: number; inicio: number; fin: number }[] }) {
    return {
      persona: {
        findUniqueOrThrow: jest.fn().mockImplementation(() =>
          Promise.resolve({ disponibleDiscipulado: estado.disponible, maxPersonasPorGrupo: 1 }),
        ),
        update: jest.fn().mockResolvedValue({ id: 'p1' }),
      },
      franjaAgenda: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve(estado.franjas)),
        create: jest.fn().mockImplementation(({ data }: { data: { diaSemana: number; inicio: number; fin: number } }) => {
          estado.franjas.push({ id: `f${estado.franjas.length + 1}`, ...data });
          return Promise.resolve({ id: 'nueva' });
        }),
        updateMany: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          const antes = estado.franjas.length;
          estado.franjas = estado.franjas.filter((f) => f.id !== where.id);
          return Promise.resolve({ count: antes - estado.franjas.length });
        }),
      },
      bloqueoDisponibilidad: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'b1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
  }

  async function crear(mock: ReturnType<typeof prismaMock>) {
    const moduleRef = await Test.createTestingModule({
      providers: [DisponibilidadService, { provide: PrismaService, useValue: mock }],
    }).compile();
    return moduleRef.get(DisponibilidadService);
  }

  it('agregar la primera franja NO prende el toggle (FR-015)', async () => {
    const mock = prismaMock({ disponible: false, franjas: [] });
    const service = await crear(mock);
    const resultado = await service.agregarFranja('p1', { diaSemana: 2, inicio: 1140, fin: 1260 });
    expect(mock.persona.update).not.toHaveBeenCalled();
    expect(resultado.disponible).toBe(false);
    expect(resultado.porQueNo).toBe('toggle_apagado');
  });

  it('borrar la última franja NO apaga el toggle (FR-015) y deja sin_agenda', async () => {
    const mock = prismaMock({ disponible: true, franjas: [{ id: 'f1', diaSemana: 2, inicio: 1140, fin: 1260 }] });
    const service = await crear(mock);
    const resultado = await service.borrarFranja('p1', 'f1');
    expect(mock.persona.update).not.toHaveBeenCalled();
    expect(resultado.disponible).toBe(true);
    expect(resultado).toMatchObject({ apareceEnElCruce: false, porQueNo: 'sin_agenda' });
  });

  it('una franja superpuesta con otra se rechaza y no se guarda (FR-017a)', async () => {
    const mock = prismaMock({ disponible: true, franjas: [{ id: 'f1', diaSemana: 2, inicio: 1140, fin: 1260 }] });
    const service = await crear(mock);
    const error = await service.agregarFranja('p1', { diaSemana: 2, inicio: 1200, fin: 1300 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).errors).toEqual([{ campo: 'inicio', code: 'FRANJA_SUPERPUESTA' }]);
    expect(mock.franjaAgenda.create).not.toHaveBeenCalled();
  });

  it('franja con fin <= inicio → VALIDACION con el campo fin, sin escribir', async () => {
    const mock = prismaMock({ disponible: false, franjas: [] });
    const service = await crear(mock);
    const error = await service.agregarFranja('p1', { diaSemana: 2, inicio: 1260, fin: 1140 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe('VALIDACION');
    expect((error as AppException).errors).toEqual([{ campo: 'fin', code: 'FRANJA_FIN_ANTERIOR_AL_INICIO' }]);
    expect(mock.franjaAgenda.create).not.toHaveBeenCalled();
  });

  it('borrar una franja ajena o ya borrada → 404 NO_ENCONTRADO', async () => {
    const mock = prismaMock({ disponible: true, franjas: [] });
    const service = await crear(mock);
    const error = await service.borrarFranja('p1', 'ajena').catch((e: unknown) => e);
    expect((error as AppException).code).toBe('NO_ENCONTRADO');
    expect((error as AppException).getStatus()).toBe(404);
  });

  it('maxPersonasPorGrupo 7 → MAXIMO_POR_GRUPO_FUERA_DE_RANGO, sin escribir', async () => {
    const mock = prismaMock({ disponible: true, franjas: [] });
    const service = await crear(mock);
    const error = await service.actualizar('p1', { maxPersonasPorGrupo: 7 }).catch((e: unknown) => e);
    expect((error as AppException).errors).toEqual([{ campo: 'maxPersonasPorGrupo', code: 'MAXIMO_POR_GRUPO_FUERA_DE_RANGO' }]);
    expect(mock.persona.update).not.toHaveBeenCalled();
  });

  it('PUT sin ningún campo → VALIDACION', async () => {
    const mock = prismaMock({ disponible: true, franjas: [] });
    const service = await crear(mock);
    const error = await service.actualizar('p1', {}).catch((e: unknown) => e);
    expect((error as AppException).code).toBe('VALIDACION');
  });

  it('bloqueo ya vencido → BLOQUEO_YA_VENCIDO, sin escribir', async () => {
    const mock = prismaMock({ disponible: true, franjas: [] });
    const service = await crear(mock);
    const error = await service.agregarBloqueo('p1', { desde: '2000-01-01', hasta: '2000-01-02' }).catch((e: unknown) => e);
    expect((error as AppException).errors).toEqual([{ campo: 'hasta', code: 'BLOQUEO_YA_VENCIDO' }]);
    expect(mock.bloqueoDisponibilidad.create).not.toHaveBeenCalled();
  });

  it('bloqueo que cubre hoy se guarda', async () => {
    const mock = prismaMock({ disponible: true, franjas: [] });
    const service = await crear(mock);
    const hoy = hoyEnArgentina();
    await service.agregarBloqueo('p1', { desde: hoy, hasta: hoy });
    expect(mock.bloqueoDisponibilidad.create).toHaveBeenCalled();
  });

  it('editar un período propio cambia desde y hasta (FR-040, H-R12)', async () => {
    const mock = prismaMock({ disponible: true, franjas: [] });
    mock.bloqueoDisponibilidad.updateMany.mockResolvedValue({ count: 1 });
    const service = await crear(mock);
    const hoy = hoyEnArgentina();
    await service.editarBloqueo('p1', 'b1', { desde: hoy, hasta: hoy });
    expect(mock.bloqueoDisponibilidad.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', personaId: 'p1', eliminadoEn: null },
      data: { desde: expect.any(Date), hasta: expect.any(Date) },
    });
  });

  it('editar con fechas que no sirven → el mismo error que al crear, sin escribir', async () => {
    const mock = prismaMock({ disponible: true, franjas: [] });
    const service = await crear(mock);
    const error = await service.editarBloqueo('p1', 'b1', { desde: '2000-01-01', hasta: '2000-01-02' }).catch((e: unknown) => e);
    expect((error as AppException).errors).toEqual([{ campo: 'hasta', code: 'BLOQUEO_YA_VENCIDO' }]);
    expect(mock.bloqueoDisponibilidad.updateMany).not.toHaveBeenCalled();
  });

  it('editar un período ajeno o borrado → NO_ENCONTRADO', async () => {
    const mock = prismaMock({ disponible: true, franjas: [] });
    const service = await crear(mock);
    const hoy = hoyEnArgentina();
    const error = await service.editarBloqueo('p1', 'ajeno', { desde: hoy, hasta: hoy }).catch((e: unknown) => e);
    expect((error as AppException).code).toBe('NO_ENCONTRADO');
  });
});
