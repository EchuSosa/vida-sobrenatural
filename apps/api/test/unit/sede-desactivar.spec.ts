import { Test } from '@nestjs/testing';
import { SedeService } from '../../src/sede/sede.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { AppException } from '../../src/common/errors/app-exception.js';

async function crearServicio(prismaMock: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    providers: [SedeService, { provide: PrismaService, useValue: prismaMock }],
  }).compile();
  return moduleRef.get(SedeService);
}

// H-30 (revisión manual, actualización 2026-09-20, D38/D102).
describe('SedeService — regla de "al menos una Sede activa"', () => {
  it('rechaza desactivar la única Sede activa', async () => {
    const prismaMock = {
      sede: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', activo: true, contactoTelefono: '+5492211110000', contactoEmail: null }),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    };
    const service = await crearServicio(prismaMock);

    const error = await service.update('s1', { activo: false }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe('SEDE_UNICA_ACTIVA');
    expect((error as AppException).getStatus()).toBe(409);
    expect(prismaMock.sede.update).not.toHaveBeenCalled();
  });

  it('permite desactivar una Sede si hay otra activa', async () => {
    const update = jest.fn().mockResolvedValue({ id: 's1', activo: false });
    const prismaMock = {
      sede: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', activo: true, contactoTelefono: '+5492211110000', contactoEmail: null }),
        count: jest.fn().mockResolvedValue(1),
        update,
      },
    };
    const service = await crearServicio(prismaMock);

    const resultado = await service.update('s1', { activo: false });
    expect(resultado).toEqual({ id: 's1', activo: false });
    expect(update).toHaveBeenCalled();
  });

  it('permite desactivar una Sede que ya estaba inactiva (no vuelve a contar)', async () => {
    const update = jest.fn().mockResolvedValue({ id: 's1', activo: false });
    const prismaMock = {
      sede: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', activo: false, contactoTelefono: '+5492211110000', contactoEmail: null }),
        count: jest.fn(),
        update,
      },
    };
    const service = await crearServicio(prismaMock);

    await service.update('s1', { activo: false });
    expect(prismaMock.sede.count).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });
});

// HORARIOS_SEDE_REGEX y TELEFONO_REGEX: ver test/unit/validaciones-compartidas.spec.ts (H-33).
