import { Test } from '@nestjs/testing';
import { LibroService } from '../../src/libro/libro.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { StorageService } from '../../src/storage/storage.service.js';
import { ImagenPortadaService } from '../../src/storage/imagen-portada.service.js';

/**
 * H-91: GET /libros/autores — autores ya cargados, para sugerir mientras
 * se escribe. No es un catálogo cerrado (el CRUD de Autores queda fuera de
 * alcance a propósito), así que lo único que se prueba es: distintos,
 * ordenados, y sin los de Libros eliminados (D119) — sí incluye los de
 * Libros inactivos.
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

describe('LibroService.findAutores (H-91)', () => {
  it('pide autores distintos, ordenados, de Libros no eliminados', async () => {
    const findMany = jest.fn().mockResolvedValue([{ autor: 'Ana' }, { autor: 'Beto' }]);
    const service = await crearServicio({ libro: { findMany } });

    const resultado = await service.findAutores();

    expect(findMany).toHaveBeenCalledWith({
      where: { eliminadoEn: null },
      select: { autor: true },
      distinct: ['autor'],
      orderBy: { autor: 'asc' },
    });
    expect(resultado).toEqual(['Ana', 'Beto']);
  });

  it('devuelve una lista vacía cuando no hay Libros', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = await crearServicio({ libro: { findMany } });

    await expect(service.findAutores()).resolves.toEqual([]);
  });
});
