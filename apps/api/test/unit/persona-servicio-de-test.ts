import { RolesDeEstadoService } from '../../src/persona/roles-de-estado.service.js';

/**
 * Piezas compartidas por los tests unitarios de PersonaService (specs/005,
 * T054): desde que el rol de estado lo escribe RolesDeEstadoService dentro
 * de una transacción interactiva, el módulo de test necesita ese proveedor y
 * un `$transaction` que ejecute la función con el mismo mock de Prisma.
 */
export function conTransaccion<T extends Record<string, unknown>>(prismaMock: T) {
  return {
    $transaction: (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: T) => unknown)(prismaMock) : Promise.all(arg as Promise<unknown>[]),
    ...prismaMock,
  };
}

export function proveedorRolesDeEstado(otorgarRolDeEstado: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
  return { provide: RolesDeEstadoService, useValue: { otorgarRolDeEstado } };
}
