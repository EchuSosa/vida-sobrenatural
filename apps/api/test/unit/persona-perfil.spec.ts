import { Test } from '@nestjs/testing';
import { PersonaService } from '../../src/persona/persona.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { conTransaccion, proveedorRolesDeEstado } from './persona-servicio-de-test.js';
import { AppException } from '../../src/common/errors/app-exception.js';
import type { ActualizarPerfilDto } from '../../src/persona/dto/actualizar-perfil.dto.js';

/**
 * H-35 (revisión manual ronda 3, Flujo 11, FR-028/FR-029): PATCH /personas/me
 * acepta cualquier subconjunto de los 4 campos, nunca fechaNacimiento/email.
 */

async function crearServicio(prismaMock: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    providers: [PersonaService, { provide: PrismaService, useValue: conTransaccion(prismaMock) }, proveedorRolesDeEstado()],
  }).compile();
  return moduleRef.get(PersonaService);
}

describe('PersonaService.actualizarPerfilPropio (H-35)', () => {
  it('rechaza sin personaId (sesión sin Persona asociada)', async () => {
    const service = await crearServicio({ persona: { update: jest.fn() } });
    const error = await service.actualizarPerfilPropio(null, {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe('NO_ENCONTRADO');
  });

  it('actualiza solo el subconjunto de campos presentes en el DTO (ej. solo telefono)', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'p1', telefono: '+54911', direccion: null, estadoCivil: null, profesion: null, profesionDetalle: null });
    const service = await crearServicio({ persona: { update } });

    const dto: ActualizarPerfilDto = { telefono: '+54911' };
    await service.actualizarPerfilPropio('p1', dto);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: {
        telefono: '+54911',
        direccion: undefined,
        estadoCivil: undefined,
        profesion: undefined,
        profesionDetalle: undefined,
      },
      select: { id: true, telefono: true, direccion: true, estadoCivil: true, profesion: true, profesionDetalle: true },
    });
  });

  it('envía profesionDetalle solo cuando profesion viene en la misma petición', async () => {
    const update = jest.fn().mockResolvedValue({});
    const service = await crearServicio({ persona: { update } });

    // direccion sola, sin profesion: profesionDetalle no debe tocarse aunque venga en el DTO.
    await service.actualizarPerfilPropio('p1', { direccion: 'Calle 1', profesionDetalle: 'Ignorado' } as ActualizarPerfilDto);
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ profesionDetalle: undefined }) }),
    );

    // profesion presente: profesionDetalle sí se envía.
    await service.actualizarPerfilPropio('p1', { profesion: 'otro', profesionDetalle: 'Apicultor' } as ActualizarPerfilDto);
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ profesion: 'otro', profesionDetalle: 'Apicultor' }) }),
    );
  });
});
