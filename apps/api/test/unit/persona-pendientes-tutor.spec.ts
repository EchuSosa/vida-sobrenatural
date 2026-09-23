import { Test } from '@nestjs/testing';
import { PersonaService } from '../../src/persona/persona.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

/** H-42 (revisión manual, revisión de código): findPendientesTutor pagina. */

async function crearServicio(prismaMock: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    providers: [PersonaService, { provide: PrismaService, useValue: prismaMock }],
  }).compile();
  return moduleRef.get(PersonaService);
}

describe('PersonaService.findPendientesTutor (H-42)', () => {
  it('pasa skip/take a Prisma y devuelve items + total', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'p1' }]);
    const count = jest.fn().mockResolvedValue(7);
    const service = await crearServicio({ persona: { findMany, count } });

    const resultado = await service.findPendientesTutor(20, 10);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
    expect(count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
    expect(resultado).toEqual({ items: [{ id: 'p1' }], total: 7 });
  });

  it('findMany y count filtran por el mismo where (estado pendiente_tutor, activo)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const service = await crearServicio({ persona: { findMany, count } });

    await service.findPendientesTutor(0, 20);

    const whereFindMany = findMany.mock.calls[0][0].where;
    const whereCount = count.mock.calls[0][0].where;
    expect(whereFindMany).toEqual(whereCount);
    expect(whereFindMany).toEqual({ estado: 'pendiente_tutor', activo: true });
  });

  // Revisión del criterio de H-88: orden/dirección viajan a la base, igual
  // que buscar (no en memoria — esta cola pagina de verdad).
  it('sin orden/dirección explícitos, ordena por createdAt asc (el default de siempre)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const service = await crearServicio({ persona: { findMany, count } });

    await service.findPendientesTutor(0, 20);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: 'asc' } }));
  });

  it('con orden="nombre" y dirección "desc", arma el orderBy correspondiente', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const service = await crearServicio({ persona: { findMany, count } });

    await service.findPendientesTutor(0, 20, undefined, 'nombre', 'desc');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { nombre: 'desc' } }));
  });
});
