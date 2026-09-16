import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PersonaService } from '../../src/persona/persona.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import type { RegistroPersonaDto } from '../../src/persona/dto/registro-persona.dto.js';

function dtoAdultoValido(overrides: Partial<RegistroPersonaDto> = {}): RegistroPersonaDto {
  return {
    apellido: 'García',
    nombre: 'Ana',
    genero: 'femenino',
    fechaNacimiento: '1990-01-01',
    telefono: '+54 9 221 111-1111',
    direccion: 'Calle 1 esq. 2',
    sedeId: 'sede-1',
    estadoCivil: 'soltero_a',
    profesion: 'Diseñadora',
    tiempoCongregacion: 'menos_6_meses',
    consentimientoDatos: true,
    ...overrides,
  } as RegistroPersonaDto;
}

describe('PersonaService.create — dedup por email (FR-009)', () => {
  it('traduce una violación del constraint único de email a ConflictException', async () => {
    const prismaMock = {
      sede: { findFirst: jest.fn().mockResolvedValue({ id: 'sede-1', activo: true }) },
      persona: {
        create: jest.fn().mockRejectedValue({
          code: 'P2002',
          // Forma real de Prisma 7 + driver adapters (sin `meta.target`).
          meta: { driverAdapterError: { cause: { constraint: { index: 'personas_email_key' } } } },
        }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [PersonaService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    const service = moduleRef.get(PersonaService);

    await expect(
      service.create(dtoAdultoValido(), 'ya-existe@example.com'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('NO valida el teléfono como único — un error de constraint por teléfono no debe ocurrir en este flujo', async () => {
    // El teléfono deliberadamente no tiene @unique en el schema (Clarifications
    // del spec) — esta prueba documenta esa decisión: dos personas con el
    // mismo teléfono deben poder registrarse sin conflicto.
    const prismaMock = {
      sede: { findFirst: jest.fn().mockResolvedValue({ id: 'sede-1', activo: true }) },
      persona: {
        create: jest.fn().mockResolvedValue({ id: 'nueva-persona', estado: 'activa' }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [PersonaService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    const service = moduleRef.get(PersonaService);

    const resultado = await service.create(
      dtoAdultoValido({ telefono: '+54 9 221 999-9999' }),
      'nueva@example.com',
    );
    expect(resultado).toEqual({ id: 'nueva-persona', estado: 'activa' });
  });
});
