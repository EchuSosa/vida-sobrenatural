import { Test } from '@nestjs/testing';
import { CambioDeRolService } from './cambio-de-rol.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** specs/005, Historia 6 (T052): el historial de cambios de rol — solo INSERT, y un listado paginado. */
async function crearServicio(filas: Array<Record<string, unknown>> = [], autores: Array<Record<string, unknown>> = []) {
  const cambioDeRol = {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue(filas),
    count: jest.fn().mockResolvedValue(filas.length),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  };
  const persona = { findMany: jest.fn().mockResolvedValue(autores) };
  const moduleRef = await Test.createTestingModule({
    providers: [CambioDeRolService, { provide: PrismaService, useValue: { cambioDeRol, persona } }],
  }).compile();
  return { service: moduleRef.get(CambioDeRolService), cambioDeRol, persona };
}

describe('CambioDeRolService (specs/005, Historia 6)', () => {
  describe('registrar', () => {
    it('backoffice: inserta con el Admin que lo hizo', async () => {
      const { service, cambioDeRol } = await crearServicio();
      await service.registrar({ personaId: 'p1', rol: 'pastor', accion: 'otorgado', actor: { origen: 'backoffice', realizadoPorId: 'admin-1' } });
      expect(cambioDeRol.create).toHaveBeenCalledWith({
        data: { personaId: 'p1', rol: 'pastor', accion: 'otorgado', origen: 'backoffice', realizadoPorId: 'admin-1' },
      });
    });

    it('recuperacion_cli: inserta SIN autor — no se inventa uno (H-141)', async () => {
      const { service, cambioDeRol } = await crearServicio();
      await service.registrar({ personaId: 'p1', rol: 'admin', accion: 'otorgado', actor: { origen: 'recuperacion_cli' } });
      expect(cambioDeRol.create).toHaveBeenCalledWith({
        data: { personaId: 'p1', rol: 'admin', accion: 'otorgado', origen: 'recuperacion_cli', realizadoPorId: null },
      });
    });

    it('solo inserta: nunca actualiza ni borra una fila previa (FR-023)', async () => {
      const { service, cambioDeRol } = await crearServicio();
      await service.registrar({ personaId: 'p1', rol: 'pastor', accion: 'quitado', actor: { origen: 'backoffice', realizadoPorId: 'admin-1' } });
      for (const metodo of ['update', 'updateMany', 'delete', 'deleteMany', 'upsert'] as const) {
        expect(cambioDeRol[metodo]).not.toHaveBeenCalled();
      }
    });

    it('corre en el cliente de la transacción que le pasan, no en el suyo', async () => {
      const { service, cambioDeRol } = await crearServicio();
      const tx = { cambioDeRol: { create: jest.fn().mockResolvedValue({}) } };
      await service.registrar({ personaId: 'p1', rol: 'pastor', accion: 'otorgado', actor: { origen: 'backoffice', realizadoPorId: 'a' } }, tx as never);
      expect(tx.cambioDeRol.create).toHaveBeenCalledTimes(1);
      expect(cambioDeRol.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('filtra por personaId, pagina y ordena en la base, el más reciente primero', async () => {
      const { service, cambioDeRol } = await crearServicio();
      await service.listar('p1', 20, 10);
      expect(cambioDeRol.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { personaId: 'p1' }, skip: 20, take: 10, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      );
      expect(cambioDeRol.count).toHaveBeenCalledWith({ where: { personaId: 'p1' } });
    });

    it('sin personaId, lista general', async () => {
      const { service, cambioDeRol } = await crearServicio();
      await service.listar(undefined, 0, 20);
      expect(cambioDeRol.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('resuelve el nombre de quien lo hizo; realizadoPor null solo en la fila del CLI', async () => {
      const fecha = new Date('2026-09-25T12:00:00Z');
      const { service, persona } = await crearServicio(
        [
          { id: 'c2', personaId: 'p1', rol: 'pastor', accion: 'quitado', origen: 'backoffice', realizadoPorId: 'admin-1', createdAt: fecha },
          { id: 'c1', personaId: 'p1', rol: 'admin', accion: 'otorgado', origen: 'recuperacion_cli', realizadoPorId: null, createdAt: fecha },
        ],
        [{ id: 'admin-1', nombre: 'Adela', apellido: 'Admin' }],
      );
      const { items, total } = await service.listar('p1', 0, 20);
      expect(total).toBe(2);
      expect(persona.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['admin-1'] } } }));
      expect(items[0]).toMatchObject({ origen: 'backoffice', realizadoPor: { id: 'admin-1', nombre: 'Adela', apellido: 'Admin' } });
      expect(items[1]).toMatchObject({ origen: 'recuperacion_cli', realizadoPor: null });
      expect(items[0]).not.toHaveProperty('realizadoPorId');
    });
  });
});
