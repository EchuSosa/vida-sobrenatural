import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from '../../src/common/errors/all-exceptions.filter.js';
import { AppException } from '../../src/common/errors/app-exception.js';

function mockHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ id: 'req-123' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('normaliza un AppException con su code, status y errors propios', () => {
    const { host, json, status } = mockHost();
    const exception = new AppException('EMAIL_DUPLICADO', 409, 'Ya existe una Persona con este email.');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'EMAIL_DUPLICADO',
        status: 409,
        detail: 'Ya existe una Persona con este email.',
        requestId: 'req-123',
      }),
    );
  });

  // specs/004, FR-043: los miembros de extensión (RFC 9457 §3.2) van al nivel
  // raíz — ej. los discipulados que traban quitar el rol — y no pisan los estándar.
  it('agrega las extensiones de un AppException al nivel raíz, sin pisar los miembros estándar', () => {
    const { host, json } = mockHost();
    const discipulados = [{ grupoId: 'g1', persona: { nombre: 'Ana', apellido: 'Pérez' } }];
    filter.catch(
      new AppException('DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS', 409, 'Tiene discipulados.', undefined, {
        discipulados,
        propuestas: [],
        code: 'PISADO',
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS', status: 409, discipulados, propuestas: [] }),
    );
  });

  it('normaliza un error de validación (BadRequestException) a code VALIDACION', () => {
    const { host, json, status } = mockHost();
    filter.catch(new BadRequestException('inválido'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDACION' }));
  });

  it('mapea NotFoundException (no migrado a AppException) a code NO_ENCONTRADO', () => {
    const { host, json, status } = mockHost();
    filter.catch(new NotFoundException('no existe'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_ENCONTRADO' }));
  });

  it('normaliza un error no reconocido a 500 / ERROR_INTERNO sin exponer el mensaje original', () => {
    const { host, json, status } = mockHost();
    filter.catch(new Error('detalle interno sensible'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe('ERROR_INTERNO');
    expect(body.detail).not.toContain('detalle interno sensible');
  });

  it('incluye siempre el requestId de la request', () => {
    const { host, json } = mockHost();
    filter.catch(new NotFoundException(), host);

    expect(json.mock.calls[0][0].requestId).toBe('req-123');
  });
});
