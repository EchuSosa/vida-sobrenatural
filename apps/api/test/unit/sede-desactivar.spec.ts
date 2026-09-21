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
    const update = jest.fn().mockResolvedValue({ id: 's1', activo: false, _count: { personas: 0 } });
    const prismaMock = {
      sede: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', activo: true, contactoTelefono: '+5492211110000', contactoEmail: null }),
        count: jest.fn().mockResolvedValue(1),
        update,
      },
    };
    const service = await crearServicio(prismaMock);

    const resultado = await service.update('s1', { activo: false });
    expect(resultado).toEqual({ id: 's1', activo: false, personasAsociadas: 0 });
    expect(update).toHaveBeenCalled();
  });

  it('permite desactivar una Sede que ya estaba inactiva (no vuelve a contar)', async () => {
    const update = jest.fn().mockResolvedValue({ id: 's1', activo: false, _count: { personas: 0 } });
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

// H-51 (revisión manual ronda 4, D117): reactivar puede chocar con un nombre
// creado mientras la Sede estaba inactiva — validarNombreUnicoEntreActivas
// solo mira activas, así que nunca se disparaba al reactivar.
describe('SedeService — nombre duplicado al reactivar', () => {
  it('rechaza reactivar si ya existe otra Sede activa con el mismo nombre', async () => {
    const update = jest.fn();
    const prismaMock = {
      sede: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1',
          nombre: 'La Plata',
          activo: false,
          contactoTelefono: '+5492211110000',
          contactoEmail: null,
        }),
        findFirst: jest.fn().mockResolvedValue({ id: 's2', nombre: 'La Plata', activo: true }),
        update,
      },
    };
    const service = await crearServicio(prismaMock);

    const error = await service.update('s1', { activo: true }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe('SEDE_NOMBRE_DUPLICADO');
    expect(prismaMock.sede.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ nombre: 'La Plata', activo: true, id: { not: 's1' } }),
      }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('permite reactivar si no hay otra Sede activa con ese nombre', async () => {
    const update = jest.fn().mockResolvedValue({ id: 's1', activo: true, _count: { personas: 0 } });
    const prismaMock = {
      sede: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1',
          nombre: 'La Plata',
          activo: false,
          contactoTelefono: '+5492211110000',
          contactoEmail: null,
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        update,
      },
    };
    const service = await crearServicio(prismaMock);

    const resultado = await service.update('s1', { activo: true });
    expect(resultado).toEqual({ id: 's1', activo: true, personasAsociadas: 0 });
    expect(update).toHaveBeenCalled();
  });

  it('desactivar→reactivar sin tocar el nombre no dispara el chequeo si no cambia activo', async () => {
    // Guarda contra una regresión obvia: un PATCH que no toca `activo` ni
    // `nombre` (ej. solo contactoTelefono) no debe llamar a findFirst.
    const update = jest.fn().mockResolvedValue({ id: 's1', _count: { personas: 0 } });
    const prismaMock = {
      sede: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1',
          nombre: 'La Plata',
          activo: true,
          contactoTelefono: '+5492211110000',
          contactoEmail: null,
        }),
        findFirst: jest.fn(),
        update,
      },
    };
    const service = await crearServicio(prismaMock);

    await service.update('s1', { contactoTelefono: '+5492211110001' });
    expect(prismaMock.sede.findFirst).not.toHaveBeenCalled();
  });
});

// HORARIOS_SEDE_REGEX y TELEFONO_REGEX: ver test/unit/validaciones-compartidas.spec.ts (H-33).
