import { Test } from '@nestjs/testing';
import { PersonaService } from '../../../src/persona/persona.service.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { AppException } from '../../../src/common/errors/app-exception.js';
import { conTransaccion, proveedorRolesDeEstado, proveedorNotificaciones } from '../persona-servicio-de-test.js';

/**
 * spec 007, T010 (FR-010, FR-011): mismo email → misma Persona, escrito como
 * sea. `GET /personas/by-email` busca por el email normalizado.
 */
async function crearServicio(prismaMock: Record<string, unknown>) {
  const moduleRef = await Test.createTestingModule({
    providers: [PersonaService, { provide: PrismaService, useValue: conTransaccion(prismaMock) }, proveedorRolesDeEstado(), proveedorNotificaciones()],
  }).compile();
  return moduleRef.get(PersonaService);
}

describe('PersonaService.findByEmail con email normalizado (spec 007)', () => {
  it('busca "ANA@Hotmail.com " como "ana@hotmail.com"', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'p1', estado: 'activa', activo: true, rol: [], temaPreferido: 'sistema' });
    const service = await crearServicio({ persona: { findUnique } });

    await expect(service.findByEmail('ANA@Hotmail.com ')).resolves.toMatchObject({ id: 'p1' });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'ana@hotmail.com' } }));
  });

  it('sin email responde NO_ENCONTRADO sin consultar la base', async () => {
    const findUnique = jest.fn();
    const service = await crearServicio({ persona: { findUnique } });

    for (const vacio of [undefined, '', '   ']) {
      const error = await service.findByEmail(vacio).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('NO_ENCONTRADO');
    }
    expect(findUnique).not.toHaveBeenCalled();
  });
});
