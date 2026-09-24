import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermisosGuard } from './permisos.guard.js';

jest.mock('@vida-sobrenatural/shared-types', () => ({
  CATALOGO_PERMISOS: {
    'test.con_admin': ['admin'],
    'test.sin_roles': [],
  },
}));

function crearReflector(permiso: string | undefined): Reflector {
  return { getAllAndOverride: () => permiso } as unknown as Reflector;
}

function crearContexto(rol: string[] | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: rol ? { rol } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermisosGuard', () => {
  it('deniega (fail-closed) si el permiso pedido no está en el catálogo', () => {
    const guard = new PermisosGuard(crearReflector('test.no_existe'));
    expect(() => guard.canActivate(crearContexto(['admin']))).toThrow(ForbiddenException);
  });

  it('un permiso declarado autoriza solo a los roles listados', () => {
    const guard = new PermisosGuard(crearReflector('test.con_admin'));
    expect(guard.canActivate(crearContexto(['admin']))).toBe(true);
    expect(() => guard.canActivate(crearContexto(['pastor']))).toThrow(ForbiddenException);
  });

  it('ningún rol autoriza si el permiso está declarado con una lista de roles vacía', () => {
    const guard = new PermisosGuard(crearReflector('test.sin_roles'));
    expect(() => guard.canActivate(crearContexto(['admin']))).toThrow(ForbiddenException);
  });

  it('sin @RequierePermiso en el endpoint, deja pasar sin chequear roles', () => {
    const guard = new PermisosGuard(crearReflector(undefined));
    expect(guard.canActivate(crearContexto(undefined))).toBe(true);
  });
});
