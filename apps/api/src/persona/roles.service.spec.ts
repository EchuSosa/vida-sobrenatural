import { Test } from '@nestjs/testing';
import { RolesService } from './roles.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';

const ADULTA = new Date('1985-06-15');

function haceAnios(anios: number): Date {
  const fecha = new Date();
  fecha.setUTCFullYear(fecha.getUTCFullYear() - anios);
  return fecha;
}

async function crearServicio(persona: Record<string, unknown> | null) {
  const findUnique = jest.fn().mockResolvedValue(persona);
  const update = jest.fn().mockImplementation(({ data }: { data: { rol: string[] } }) =>
    Promise.resolve({ id: persona?.id, rol: data.rol }),
  );
  const moduleRef = await Test.createTestingModule({
    providers: [RolesService, { provide: PrismaService, useValue: { persona: { findUnique, update } } }],
  }).compile();
  return { service: moduleRef.get(RolesService), findUnique, update };
}

async function codigoDeError(promesa: Promise<unknown>): Promise<string | undefined> {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  return (error as AppException).code;
}

describe('RolesService (specs/005, Historia 2)', () => {
  describe('otorgarRol', () => {
    it('agrega el rol sin quitar los que ya tenía (acumulativo, FR-006)', async () => {
      const { service, update } = await crearServicio({ id: 'p1', rol: ['miembro_registrado'], fechaNacimiento: ADULTA, adminSembrado: false });

      const resultado = await service.otorgarRol('p1', 'discipulador', 'admin-1');

      expect(resultado.rol).toEqual(['miembro_registrado', 'discipulador']);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { rol: ['miembro_registrado', 'discipulador'] } }));
    });

    it('si ya tiene el rol, responde éxito sin duplicarlo ni escribir (Edge Case idempotente)', async () => {
      const { service, update } = await crearServicio({ id: 'p1', rol: ['pastor'], fechaNacimiento: ADULTA, adminSembrado: false });

      const resultado = await service.otorgarRol('p1', 'pastor', 'admin-1');

      expect(resultado).toEqual({ id: 'p1', rol: ['pastor'] });
      expect(update).not.toHaveBeenCalled();
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
      const { service, update } = await crearServicio({ id: 'p1', rol: ['miembro_registrado', 'pastor', 'lider_curso'], fechaNacimiento: ADULTA, adminSembrado: false });

      const resultado = await service.quitarRol('p1', 'pastor', 'admin-1');

      expect(resultado.rol).toEqual(['miembro_registrado', 'lider_curso']);
      expect(update).toHaveBeenCalledTimes(1);
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

    // H-127: fallo cerrado. Se prueba que rechaza SIN consultar nada — ni
    // siquiera si la Persona existe o si tiene el rol: no hay ninguna
    // condición que lo deje pasar mientras el spec 004 no exista.
    it('rechaza SIEMPRE quitar discipulador, sin consultar la base (FR-009/H-127, fallo cerrado)', async () => {
      const { service, findUnique, update } = await crearServicio({ id: 'p1', rol: ['discipulador'], fechaNacimiento: ADULTA, adminSembrado: false });

      expect(await codigoDeError(service.quitarRol('p1', 'discipulador', 'admin-1'))).toBe('DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS');
      expect(await codigoDeError(service.quitarRol('no-existe', 'discipulador', 'admin-1'))).toBe('DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS');
      expect(await codigoDeError(service.quitarRol('p1', 'discipulador', 'p1'))).toBe('DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS');
      expect(findUnique).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it('si no tenía el rol, responde éxito sin escribir (idempotente)', async () => {
      const { service, update } = await crearServicio({ id: 'p1', rol: ['miembro_registrado'], fechaNacimiento: ADULTA, adminSembrado: false });

      await expect(service.quitarRol('p1', 'pastor', 'admin-1')).resolves.toEqual({ id: 'p1', rol: ['miembro_registrado'] });
      expect(update).not.toHaveBeenCalled();
    });
  });
});
