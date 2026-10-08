import { normalizarDni } from '@vida-sobrenatural/shared-types';
import { AltaPersonaService } from '../../src/persona/alta-persona.service.js';
import type { AppException } from '../../src/common/errors/app-exception.js';
import type { AltaPersonaDto } from '../../src/persona/dto/alta-persona.dto.js';

/**
 * D215: el DNI opcional del alta por el Admin — formato (7 u 8 dígitos, se
 * guarda sin puntos) y bloqueo si otra Persona ya lo tiene, con quién es.
 */
describe('normalizarDni (D215)', () => {
  it('vacío o ausente = no vino', () => {
    for (const v of [undefined, null, '', '   ']) expect(normalizarDni(v)).toBeNull();
  });

  it('con puntos o espacios se guarda solo con dígitos', () => {
    expect(normalizarDni('30.123.456')).toBe('30123456');
    expect(normalizarDni(' 7 123 456 ')).toBe('7123456');
  });

  it('menos de 7, más de 8, letras o no-texto: inválido', () => {
    for (const v of ['123456', '123456789', '30A23456', '30-123-456', 30123456]) expect(normalizarDni(v)).toBeUndefined();
  });
});

describe('AltaPersonaService — DNI (D215)', () => {
  const datosValidos = {
    apellido: 'Gómez',
    nombre: 'Rosa',
    genero: 'femenino',
    fechaNacimiento: '1948-03-12',
    telefono: '+54 9 221 5550101',
    direccion: 'Calle 7 1234',
    sedeId: '00000000-0000-4000-8000-000000000001',
    estadoCivil: 'viudo_a',
    profesion: 'jubilado_a',
    congregaDesde: 2012,
    consentimiento: true,
  };

  function servicio(conDni: { id: string; nombre: string; apellido: string } | null) {
    const prisma = {
      persona: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(conDni),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
    };
    return { prisma, service: new AltaPersonaService(prisma as never, {} as never, {} as never) };
  }

  async function error(promesa: Promise<unknown>): Promise<AppException> {
    try {
      await promesa;
    } catch (e) {
      return e as AppException;
    }
    throw new Error('Se esperaba un error');
  }

  it('un DNI mal escrito es un error de campo, junto con los demás', async () => {
    const { service } = servicio(null);
    const e = await error(service.alta({ ...datosValidos, nombre: '', dni: '12.345' } as unknown as AltaPersonaDto, 'admin'));
    expect(e.code).toBe('VALIDACION');
    expect(e.errors).toEqual(expect.arrayContaining([{ campo: 'dni', code: 'DNI_INVALIDO' }, expect.objectContaining({ campo: 'nombre' })]));
  });

  it('un DNI que ya tiene otra Persona bloquea, en el campo y con quién es (aunque se confirme el posible duplicado)', async () => {
    const { service, prisma } = servicio({ id: 'p-1', nombre: 'Rosa', apellido: 'Gómez' });
    const e = await error(service.alta({ ...datosValidos, dni: '30.123.456', confirmarPosibleDuplicado: true } as unknown as AltaPersonaDto, 'admin'));
    expect(e.code).toBe('DNI_DUPLICADO');
    expect(e.getStatus()).toBe(409);
    expect(e.errors).toEqual([{ campo: 'dni', code: 'DNI_DUPLICADO' }]);
    expect(e.extensiones).toEqual({ persona: { id: 'p-1', nombre: 'Rosa', apellido: 'Gómez' } });
    // Se busca sin puntos y entre todas las Personas, activas o no.
    expect(prisma.persona.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { dni: '30123456' } }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
