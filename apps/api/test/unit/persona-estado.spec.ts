import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PersonaService } from '../../src/persona/persona.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

async function crearServicio(prismaMock: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    providers: [PersonaService, { provide: PrismaService, useValue: prismaMock }],
  }).compile();
  return moduleRef.get(PersonaService);
}

describe('PersonaService — transiciones de estado (FR-008, FR-014)', () => {
  describe('activar', () => {
    it('pasa una Persona pendiente_tutor a activa, guarda datos del tutor y setea consentimientoDatos=true', async () => {
      const update = jest.fn().mockResolvedValue({ id: 'p1', estado: 'activa' });
      const prismaMock = {
        persona: {
          findUnique: jest.fn().mockResolvedValue({ id: 'p1', estado: 'pendiente_tutor', activo: true }),
          update,
        },
      };
      const service = await crearServicio(prismaMock);

      const resultado = await service.activar('p1', {
        tutorNombre: 'María Pérez',
        tutorTelefono: '+5492211111111',
      });

      expect(resultado).toEqual({ id: 'p1', estado: 'activa' });
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({
            estado: 'activa',
            tutorNombre: 'María Pérez',
            tutorTelefono: '+5492211111111',
            consentimientoDatos: true,
            rol: ['miembro_registrado'],
          }),
        }),
      );
    });

    it('rechaza activar una Persona que no está en pendiente_tutor', async () => {
      const prismaMock = {
        persona: {
          findUnique: jest.fn().mockResolvedValue({ id: 'p1', estado: 'activa', activo: true }),
          update: jest.fn(),
        },
      };
      const service = await crearServicio(prismaMock);

      await expect(
        service.activar('p1', { tutorNombre: 'X', tutorTelefono: 'Y' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('marcarInactiva', () => {
    it('pasa activo a false sin cambiar estado, cuando el tutor no autoriza (FR-014)', async () => {
      const update = jest.fn().mockResolvedValue({ id: 'p1', activo: false });
      const prismaMock = {
        persona: {
          findUnique: jest.fn().mockResolvedValue({ id: 'p1', estado: 'pendiente_tutor', activo: true }),
          update,
        },
      };
      const service = await crearServicio(prismaMock);

      const resultado = await service.marcarInactiva('p1');

      expect(resultado).toEqual({ id: 'p1', activo: false });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { activo: false },
        select: { id: true, activo: true },
      });
    });

    it('rechaza marcar inactiva una Persona que ya no está pendiente_tutor', async () => {
      const prismaMock = {
        persona: {
          findUnique: jest.fn().mockResolvedValue({ id: 'p1', estado: 'pendiente_tutor', activo: false }),
          update: jest.fn(),
        },
      };
      const service = await crearServicio(prismaMock);

      await expect(service.marcarInactiva('p1')).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
