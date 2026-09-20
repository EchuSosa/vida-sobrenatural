import { Test } from '@nestjs/testing';
import { PersonaService } from '../../src/persona/persona.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { AppException } from '../../src/common/errors/app-exception.js';

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

      const error = await service
        .activar('p1', { tutorNombre: 'X', tutorTelefono: 'Y' })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('PERSONA_NO_PENDIENTE_TUTOR');
      expect((error as AppException).getStatus()).toBe(409);
    });

    // H-29 (revisión manual, D108/D112).
    it('rechaza activar sin tutorPersonaId ni tutorNombre/tutorTelefono', async () => {
      const prismaMock = {
        persona: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', estado: 'pendiente_tutor', activo: true }) },
      };
      const service = await crearServicio(prismaMock);

      const error = await service.activar('p1', {}).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACTIVAR_TUTOR_INVALIDO');
    });

    it('rechaza activar con tutorPersonaId Y tutorNombre/tutorTelefono a la vez', async () => {
      const prismaMock = {
        persona: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', estado: 'pendiente_tutor', activo: true }) },
      };
      const service = await crearServicio(prismaMock);

      const error = await service
        .activar('p1', { tutorPersonaId: 'p2', tutorNombre: 'X', tutorTelefono: 'Y' })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACTIVAR_TUTOR_INVALIDO');
    });

    it('rechaza vincular a la Persona consigo misma como tutor', async () => {
      const prismaMock = {
        persona: {
          findUnique: jest.fn().mockResolvedValue({ id: 'p1', estado: 'pendiente_tutor', activo: true }),
        },
      };
      const service = await crearServicio(prismaMock);

      const error = await service
        .activar('p1', { tutorPersonaId: 'p1' })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('RELACION_FAMILIAR_INVALIDA');
    });

    it('rechaza vincular un tutorPersonaId que no existe', async () => {
      const prismaMock = {
        persona: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ id: 'p1', estado: 'pendiente_tutor', activo: true }) // buscarPendienteTutorActivoOFallar
            .mockResolvedValueOnce(null), // familiar
        },
      };
      const service = await crearServicio(prismaMock);

      const error = await service.activar('p1', { tutorPersonaId: 'p2' }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('NO_ENCONTRADO');
    });

    it('rechaza el vínculo espejo (ya existe padre_madre en sentido inverso a hijo_a)', async () => {
      // No hay flujo real que arme "hijo_a" todavía (solo "tutor" tiene UI),
      // pero la validación es genérica — se prueba directo contra el
      // método privado, con el tipo que sí tiene inversa en el enum.
      const prismaMock = {
        persona: { findUnique: jest.fn().mockResolvedValue({ id: 'p2' }) },
        relacionFamiliar: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(null) // sin duplicado literal
            .mockResolvedValueOnce({ id: 'r1' }), // duplicado espejo
        },
      };
      const service = await crearServicio(prismaMock);
      const validar = (
        service as unknown as { validarVinculoFamiliar: (a: string, b: string, t: string) => Promise<void> }
      ).validarVinculoFamiliar.bind(service);

      const error = await validar('p1', 'p2', 'hijo_a').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('RELACION_FAMILIAR_INVALIDA');
    });

    it('vincula un tutorPersonaId: crea la Relación Familiar y vacía tutorNombre/tutorTelefono', async () => {
      const crearRelacion = jest.fn().mockResolvedValue({ id: 'r1' });
      const updatePersona = jest.fn().mockResolvedValue({ id: 'p1', estado: 'activa' });
      const prismaMock = {
        persona: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ id: 'p1', estado: 'pendiente_tutor', activo: true })
            .mockResolvedValueOnce({ id: 'p2' }),
          update: updatePersona,
        },
        relacionFamiliar: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: crearRelacion,
        },
        $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      };
      const service = await crearServicio(prismaMock);

      const resultado = await service.activar('p1', { tutorPersonaId: 'p2' });

      expect(resultado).toEqual({ id: 'p1', estado: 'activa' });
      expect(crearRelacion).toHaveBeenCalledWith({
        data: { personaId: 'p1', familiarId: 'p2', tipoRelacion: 'tutor' },
      });
      expect(updatePersona).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tutorNombre: null, tutorTelefono: null, estado: 'activa' }),
        }),
      );
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

      const error = await service.marcarInactiva('p1').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('PERSONA_NO_PENDIENTE_TUTOR');
      expect((error as AppException).getStatus()).toBe(409);
    });
  });
});
