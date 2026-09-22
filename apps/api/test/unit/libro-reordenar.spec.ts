import { Test } from '@nestjs/testing';
import { LibroService } from '../../src/libro/libro.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { StorageService } from '../../src/storage/storage.service.js';
import { ImagenPortadaService } from '../../src/storage/imagen-portada.service.js';
import { AppException } from '../../src/common/errors/app-exception.js';

/**
 * H-89: PATCH /libros/reordenar persiste el orden nuevo COMPLETO en una
 * sola transacción, y solo si los ids recibidos son EXACTAMENTE el
 * conjunto de Libros activos actuales — sin faltantes, sin repetidos
 * (`ArrayUnique` en el DTO, ver reordenar-libros.dto.ts — acá se prueba la
 * segunda mitad, que el propio LibroService.reordenar valida por su
 * cuenta) ni ajenos.
 */
async function crearServicio(prismaMock: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      LibroService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: StorageService, useValue: {} },
      { provide: ImagenPortadaService, useValue: {} },
    ],
  }).compile();
  return moduleRef.get(LibroService);
}

describe('LibroService.reordenar (H-89)', () => {
  it('persiste el orden nuevo en una sola transacción, uno por índice', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const count = jest.fn().mockResolvedValue(3);
    const update = jest.fn();
    const transaction = jest.fn().mockImplementation((operaciones: unknown[]) => Promise.all(operaciones));
    const service = await crearServicio({
      libro: { findMany, count, update },
      $transaction: transaction,
    });

    await service.reordenar(['c', 'a', 'b']);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ where: { id: 'c' }, data: { orden: 0 } });
    expect(update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { orden: 1 } });
    expect(update).toHaveBeenCalledWith({ where: { id: 'b' }, data: { orden: 2 } });
  });

  it('rechaza si falta un id del conjunto activo actual', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const transaction = jest.fn();
    const service = await crearServicio({
      libro: { findMany, update: jest.fn() },
      $transaction: transaction,
    });

    await expect(service.reordenar(['a', 'b'])).rejects.toMatchObject({ code: 'LIBRO_ORDEN_CONJUNTO_INVALIDO' });
    await expect(service.reordenar(['a', 'b'])).rejects.toBeInstanceOf(AppException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rechaza si trae un id ajeno (no está entre los activos actuales)', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const transaction = jest.fn();
    const service = await crearServicio({
      libro: { findMany, update: jest.fn() },
      $transaction: transaction,
    });

    await expect(service.reordenar(['a', 'b', 'x'])).rejects.toMatchObject({ code: 'LIBRO_ORDEN_CONJUNTO_INVALIDO' });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rechaza si el mismo id viene repetido (aunque cubra el mismo tamaño)', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const transaction = jest.fn();
    const service = await crearServicio({
      libro: { findMany, update: jest.fn() },
      $transaction: transaction,
    });

    // Bypass del ArrayUnique del DTO (ej. alguien llama al service directo) —
    // 'a' repetido en vez de 'c': el Set de ids nuevos queda en tamaño 2,
    // menor que el conjunto real (3), así que se rechaza igual.
    await expect(service.reordenar(['a', 'b', 'a'])).rejects.toMatchObject({ code: 'LIBRO_ORDEN_CONJUNTO_INVALIDO' });
    expect(transaction).not.toHaveBeenCalled();
  });
});
