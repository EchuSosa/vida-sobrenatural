import { Test } from '@nestjs/testing';
import { PersonaService } from '../../src/persona/persona.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { conTransaccion, proveedorRolesDeEstado } from './persona-servicio-de-test.js';
import type { RegistroPersonaDto } from '../../src/persona/dto/registro-persona.dto.js';
import type { ActivarPersonaDto } from '../../src/persona/dto/activar-persona.dto.js';

/**
 * Fecha y origen del consentimiento (FR-013) y origen del alta (FR-015, D97)
 * — actualización 2026-09-17 de specs/001-fase-bienvenida (Phase 8, Grupo A).
 */

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
    profesion: 'salud',
    congregaDesde: 2020,
    consentimientoDatos: true,
    ...overrides,
  } as RegistroPersonaDto;
}

function dtoMenorValido(overrides: Partial<RegistroPersonaDto> = {}): RegistroPersonaDto {
  return dtoAdultoValido({
    fechaNacimiento: '2015-01-01',
    consentimientoDatos: false,
    ...overrides,
  });
}

describe('PersonaService — consentimiento (fecha/origen) y origenAlta (FR-013, FR-015)', () => {
  it('create() con mayor de edad setea consentimientoDatosOrigen="app" y origenAlta="autorregistro"', async () => {
    const crear = jest.fn().mockResolvedValue({ id: 'p1', estado: 'activa' });
    const prismaMock = {
      sede: { findFirst: jest.fn().mockResolvedValue({ id: 'sede-1', activo: true }) },
      persona: { create: crear },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [PersonaService, { provide: PrismaService, useValue: conTransaccion(prismaMock) }, proveedorRolesDeEstado()],
    }).compile();
    const service = moduleRef.get(PersonaService);

    await service.create(dtoAdultoValido(), 'adulto@example.com');

    const dataCreada = crear.mock.calls[0][0].data;
    expect(dataCreada.consentimientoDatosOrigen).toBe('app');
    expect(dataCreada.consentimientoDatosFecha).toBeInstanceOf(Date);
    expect(dataCreada.origenAlta).toBe('autorregistro');
    expect(dataCreada.altaPor).toBeNull();
  });

  it('create() con menor de edad no setea fecha/origen de consentimiento (todavía no lo dio nadie)', async () => {
    const crear = jest.fn().mockResolvedValue({ id: 'p2', estado: 'pendiente_tutor' });
    const prismaMock = {
      sede: { findFirst: jest.fn().mockResolvedValue({ id: 'sede-1', activo: true }) },
      persona: { create: crear },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [PersonaService, { provide: PrismaService, useValue: conTransaccion(prismaMock) }, proveedorRolesDeEstado()],
    }).compile();
    const service = moduleRef.get(PersonaService);

    await service.create(dtoMenorValido(), 'menor@example.com');

    const dataCreada = crear.mock.calls[0][0].data;
    expect(dataCreada.consentimientoDatosOrigen).toBeNull();
    expect(dataCreada.consentimientoDatosFecha).toBeNull();
    expect(dataCreada.origenAlta).toBe('autorregistro');
  });

  it('activar() setea consentimientoDatosOrigen="presencial" (consentimiento dado por el tutor)', async () => {
    const actualizar = jest.fn().mockResolvedValue({ id: 'p3', estado: 'activa' });
    const prismaMock = {
      persona: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p3', estado: 'pendiente_tutor', activo: true }),
        update: actualizar,
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [PersonaService, { provide: PrismaService, useValue: conTransaccion(prismaMock) }, proveedorRolesDeEstado()],
    }).compile();
    const service = moduleRef.get(PersonaService);

    const dto: ActivarPersonaDto = { tutorNombre: 'Juan', tutorApellido: 'Pérez', tutorTelefono: '+54 9 221 000-0000' };
    await service.activar('p3', dto);

    const dataActualizada = actualizar.mock.calls[0][0].data;
    expect(dataActualizada.consentimientoDatosOrigen).toBe('presencial');
    expect(dataActualizada.consentimientoDatosFecha).toBeInstanceOf(Date);
  });
});
