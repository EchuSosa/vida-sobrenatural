import { Test } from '@nestjs/testing';
import { hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import { RolesService } from './roles.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CambioDeRolService } from '../cambio-de-rol/cambio-de-rol.service.js';
import { AppException } from '../common/errors/app-exception.js';

const ADULTA = new Date('1985-06-15');

/**
 * Cumple `anios` justo hoy, con "hoy" en Argentina: es el día que usa
 * `otorgarRol` (`esMenorDeEdad(…, hoyEnArgentina())`). Con el día de UTC,
 * entre las 21 y las 24 de Argentina el cumpleaños caía "mañana".
 */
function haceAnios(anios: number): Date {
  const [anio, mes, dia] = hoyEnArgentina().split('-').map(Number);
  return new Date(Date.UTC(anio - anios, mes - 1, dia));
}

/**
 * specs/004, D137: lo que devuelven las consultas de discipulados activos y
 * propuestas pendientes (`discipulados-activos.ts`) — por defecto, nada.
 */
interface Discipulados {
  liderazgos?: { personaId: string; grupoId: string }[];
  propuestas?: { id: string; discipuladorId: string; tipo: 'nueva' | 'reasignacion'; solicitudId: string | null; grupoId: string | null }[];
}

async function crearServicio(persona: Record<string, unknown> | null, discipulados: Discipulados = {}) {
  // H-142: RolesService lee con `SELECT … FOR UPDATE` y escribe con un UPDATE
  // condicionado (`array_append`/`array_remove`), todo con $queryRaw dentro de
  // la transacción. El mock simula esa semántica: el SELECT devuelve la
  // Persona (o nada); el UPDATE escribe SOLO si su condición se cumple — y en
  // ese caso llama a `update` con el arreglo resultante, así "escribió X" /
  // "no escribió nada" se sigue leyendo igual en cada test.
  const findUnique = jest.fn();
  const update = jest.fn();
  const $queryRaw = jest.fn((strings: TemplateStringsArray, ...valores: unknown[]) => {
    const sql = strings.join('?');
    if (sql.includes('FOR UPDATE')) {
      findUnique();
      return Promise.resolve(persona ? [persona] : []);
    }
    const rol = valores[0] as string;
    const actuales = (persona?.rol as string[]) ?? [];
    if (sql.includes('array_append')) {
      if (actuales.includes(rol)) return Promise.resolve([]);
      const nuevo = [...actuales, rol];
      update({ where: { id: persona?.id }, data: { rol: nuevo } });
      return Promise.resolve([{ id: persona?.id, rol: nuevo }]);
    }
    if (sql.includes('array_remove')) {
      if (!actuales.includes(rol)) return Promise.resolve([]);
      const nuevo = actuales.filter((r) => r !== rol);
      update({ where: { id: persona?.id }, data: { rol: nuevo } });
      return Promise.resolve([{ id: persona?.id, rol: nuevo }]);
    }
    throw new Error(`SQL inesperado en el test: ${sql}`);
  });
  // Historia 6 (T050): cada cambio real se registra en CambioDeRol dentro de
  // la misma transacción — el mock ejecuta la función con el mismo cliente.
  const registrar = jest.fn().mockResolvedValue(undefined);
  const liderazgos = discipulados.liderazgos ?? [];
  const propuestas = discipulados.propuestas ?? [];
  const consultasDeDiscipulados = jest.fn();
  const prisma: Record<string, unknown> = {
    $queryRaw,
    liderazgo: {
      findMany: jest.fn(() => {
        consultasDeDiscipulados();
        return Promise.resolve(liderazgos);
      }),
    },
    propuestaDiscipulado: {
      findMany: jest.fn(() => {
        consultasDeDiscipulados();
        return Promise.resolve(propuestas);
      }),
    },
    inscripcion: {
      findMany: jest.fn(() =>
        Promise.resolve(liderazgos.map((l) => ({ grupoId: l.grupoId, personaId: `inscripta-${l.grupoId}` }))),
      ),
    },
    solicitudDiscipulado: {
      findMany: jest.fn(() =>
        Promise.resolve(propuestas.filter((p) => p.solicitudId).map((p) => ({ id: p.solicitudId, personaId: `pide-${p.solicitudId}` }))),
      ),
    },
    persona: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(where.id.in.map((id) => ({ id, nombre: 'Nombre', apellido: id }))),
      ),
    },
  };
  prisma.$transaction = (fn: (tx: unknown) => unknown) => fn(prisma);
  const moduleRef = await Test.createTestingModule({
    providers: [RolesService, { provide: PrismaService, useValue: prisma }, { provide: CambioDeRolService, useValue: { registrar } }],
  }).compile();
  return { service: moduleRef.get(RolesService), findUnique, update, registrar, consultasDeDiscipulados };
}

async function codigoDeError(promesa: Promise<unknown>): Promise<string | undefined> {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  return (error as AppException).code;
}

describe('RolesService (specs/005, Historia 2)', () => {
  describe('otorgarRol', () => {
    it('agrega el rol sin quitar los que ya tenía (acumulativo, FR-006)', async () => {
      const { service, update, registrar } = await crearServicio({ id: 'p1', rol: ['miembro_registrado'], fechaNacimiento: ADULTA, adminSembrado: false });

      const resultado = await service.otorgarRol('p1', 'discipulador', 'admin-1');

      expect(resultado.rol).toEqual(['miembro_registrado', 'discipulador']);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { rol: ['miembro_registrado', 'discipulador'] } }));
      // FR-022 (T050): el autor viaja y se registra — antes se descartaba (`_adminId`, H-140).
      expect(registrar).toHaveBeenCalledWith(
        { personaId: 'p1', rol: 'discipulador', accion: 'otorgado', actor: { origen: 'backoffice', realizadoPorId: 'admin-1' } },
        expect.anything(),
      );
    });

    it('si ya tiene el rol, responde éxito sin duplicarlo ni escribir (Edge Case idempotente)', async () => {
      const { service, update, registrar } = await crearServicio({ id: 'p1', rol: ['pastor'], fechaNacimiento: ADULTA, adminSembrado: false });

      const resultado = await service.otorgarRol('p1', 'pastor', 'admin-1');

      expect(resultado).toEqual({ id: 'p1', rol: ['pastor'] });
      expect(update).not.toHaveBeenCalled();
      expect(registrar).not.toHaveBeenCalled(); // no hubo cambio, no hay nada que registrar
    });

    it('rechaza a una Persona menor de edad (FR-011), aunque esté activa', async () => {
      const { service, update } = await crearServicio({ id: 'p1', rol: ['miembro_registrado'], fechaNacimiento: haceAnios(17), adminSembrado: false });

      expect(await codigoDeError(service.otorgarRol('p1', 'lider_curso', 'admin-1'))).toBe('PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO');
      expect(update).not.toHaveBeenCalled();
    });

    it('acepta a quien cumple 18 justo hoy — mismo criterio que calcularEdad', async () => {
      const { service } = await crearServicio({ id: 'p1', rol: [], fechaNacimiento: haceAnios(18), adminSembrado: false });

      await expect(service.otorgarRol('p1', 'pastor', 'admin-1')).resolves.toEqual({ id: 'p1', rol: ['pastor'] });
    });

    it('responde NO_ENCONTRADO si la Persona no existe', async () => {
      const { service } = await crearServicio(null);

      expect(await codigoDeError(service.otorgarRol('no-existe', 'pastor', 'admin-1'))).toBe('NO_ENCONTRADO');
    });
  });

  describe('quitarRol', () => {
    it('quita solo ese rol y conserva los demás (FR-007)', async () => {
      const { service, update, registrar } = await crearServicio({ id: 'p1', rol: ['miembro_registrado', 'pastor', 'lider_curso'], fechaNacimiento: ADULTA, adminSembrado: false });

      const resultado = await service.quitarRol('p1', 'pastor', 'admin-1');

      expect(resultado.rol).toEqual(['miembro_registrado', 'lider_curso']);
      expect(update).toHaveBeenCalledTimes(1);
      expect(registrar).toHaveBeenCalledWith(
        { personaId: 'p1', rol: 'pastor', accion: 'quitado', actor: { origen: 'backoffice', realizadoPorId: 'admin-1' } },
        expect.anything(),
      );
    });

    it('rechaza quitarle admin al Admin sembrado, lo pida quien lo pida (FR-002)', async () => {
      const { service, update } = await crearServicio({ id: 'sembrado', rol: ['admin'], fechaNacimiento: ADULTA, adminSembrado: true });

      expect(await codigoDeError(service.quitarRol('sembrado', 'admin', 'otro-admin'))).toBe('NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO');
      expect(await codigoDeError(service.quitarRol('sembrado', 'admin', 'sembrado'))).toBe('NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO');
      expect(update).not.toHaveBeenCalled();
    });

    it('al Admin sembrado sí se le puede quitar otro rol de cargo que no sea admin', async () => {
      const { service } = await crearServicio({ id: 'sembrado', rol: ['admin', 'pastor'], fechaNacimiento: ADULTA, adminSembrado: true });

      await expect(service.quitarRol('sembrado', 'pastor', 'otro-admin')).resolves.toEqual({ id: 'sembrado', rol: ['admin'] });
    });

    it('rechaza que un Admin se quite a sí mismo el rol admin (FR-010)', async () => {
      const { service, update } = await crearServicio({ id: 'admin-1', rol: ['admin'], fechaNacimiento: ADULTA, adminSembrado: false });

      expect(await codigoDeError(service.quitarRol('admin-1', 'admin', 'admin-1'))).toBe('ADMIN_NO_PUEDE_AUTO_REVOCARSE');
      expect(update).not.toHaveBeenCalled();
    });

    it('un Admin sí puede quitarse a sí mismo otro rol de cargo (FR-010 es solo para admin)', async () => {
      const { service } = await crearServicio({ id: 'admin-1', rol: ['admin', 'lider_curso'], fechaNacimiento: ADULTA, adminSembrado: false });

      await expect(service.quitarRol('admin-1', 'lider_curso', 'admin-1')).resolves.toEqual({ id: 'admin-1', rol: ['admin'] });
    });

    it('otro Admin sí puede quitarle admin a un Admin no sembrado', async () => {
      const { service } = await crearServicio({ id: 'admin-2', rol: ['admin', 'miembro_registrado'], fechaNacimiento: ADULTA, adminSembrado: false });

      await expect(service.quitarRol('admin-2', 'admin', 'admin-1')).resolves.toEqual({ id: 'admin-2', rol: ['miembro_registrado'] });
    });

    // specs/004, D137 (cierra H-127): ya no falla cerrado — la regla sigue en
    // `puedeQuitarRol` (shared-types, T062) y ahora recibe como dato los
    // discipulados activos y las propuestas pendientes, consultados con la
    // fila de la Persona ya bloqueada.
    it('sin discipulados ni propuestas, quita discipulador y registra el cambio (D137)', async () => {
      const { service, update, registrar, consultasDeDiscipulados } = await crearServicio({
        id: 'p1',
        rol: ['discipulador', 'miembro_registrado'],
        fechaNacimiento: ADULTA,
        adminSembrado: false,
      });

      await expect(service.quitarRol('p1', 'discipulador', 'admin-1')).resolves.toEqual({ id: 'p1', rol: ['miembro_registrado'] });
      expect(consultasDeDiscipulados).toHaveBeenCalled();
      expect(update).toHaveBeenCalled();
      expect(registrar).toHaveBeenCalledWith(
        { personaId: 'p1', rol: 'discipulador', accion: 'quitado', actor: { origen: 'backoffice', realizadoPorId: 'admin-1' } },
        expect.anything(),
      );
    });

    it('con un discipulado activo, rechaza nombrándolo, sin escribir (FR-009/FR-043)', async () => {
      const { service, update, registrar } = await crearServicio(
        { id: 'p1', rol: ['discipulador'], fechaNacimiento: ADULTA, adminSembrado: false },
        { liderazgos: [{ personaId: 'p1', grupoId: 'g1' }] },
      );

      const error = (await service.quitarRol('p1', 'discipulador', 'admin-1').catch((e: unknown) => e)) as AppException;
      expect(error).toBeInstanceOf(AppException);
      expect(error.code).toBe('DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS');
      expect(error.getStatus()).toBe(409);
      expect(error.extensiones).toEqual({
        discipulados: [{ grupoId: 'g1', persona: { nombre: 'Nombre', apellido: 'inscripta-g1' } }],
        propuestas: [],
      });
      expect(update).not.toHaveBeenCalled();
      expect(registrar).not.toHaveBeenCalled();
    });

    it('con solo una propuesta pendiente, también rechaza, con el enlace a su Solicitud (FR-043)', async () => {
      const { service, update } = await crearServicio(
        { id: 'p1', rol: ['discipulador'], fechaNacimiento: ADULTA, adminSembrado: false },
        { propuestas: [{ id: 'prop-1', discipuladorId: 'p1', tipo: 'nueva', solicitudId: 's1', grupoId: null }] },
      );

      const error = (await service.quitarRol('p1', 'discipulador', 'admin-1').catch((e: unknown) => e)) as AppException;
      expect(error.code).toBe('DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS');
      expect(error.extensiones).toEqual({
        discipulados: [],
        propuestas: [{ propuestaId: 'prop-1', persona: { nombre: 'Nombre', apellido: 'pide-s1' }, solicitudId: 's1', grupoId: null }],
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('los otros roles no consultan discipulados', async () => {
      const { service, consultasDeDiscipulados } = await crearServicio({ id: 'p1', rol: ['pastor'], fechaNacimiento: ADULTA, adminSembrado: false });

      await service.quitarRol('p1', 'pastor', 'admin-1');
      expect(consultasDeDiscipulados).not.toHaveBeenCalled();
    });

    it('una Persona que no existe responde NO_ENCONTRADO, también para discipulador (no hay rol que proteger)', async () => {
      const { service, update } = await crearServicio(null);

      expect(await codigoDeError(service.quitarRol('no-existe', 'discipulador', 'admin-1'))).toBe('NO_ENCONTRADO');
      expect(update).not.toHaveBeenCalled();
    });

    it('si no tenía el rol, responde éxito sin escribir (idempotente)', async () => {
      const { service, update, registrar } = await crearServicio({ id: 'p1', rol: ['miembro_registrado'], fechaNacimiento: ADULTA, adminSembrado: false });

      await expect(service.quitarRol('p1', 'pastor', 'admin-1')).resolves.toEqual({ id: 'p1', rol: ['miembro_registrado'] });
      expect(update).not.toHaveBeenCalled();
      expect(registrar).not.toHaveBeenCalled();
    });
  });
});
