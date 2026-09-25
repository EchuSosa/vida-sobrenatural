import { Test } from '@nestjs/testing';
import { PersonaService } from '../../src/persona/persona.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { proveedorRolesDeEstado } from './persona-servicio-de-test.js';
import { calcularEdad, nacidosAntesDeParaEdad } from '../../src/persona/calcular-edad.js';

/**
 * specs/005, Historia 2 (T017-T019): el listado paginado de GET /personas y
 * el buscador de tutor GET /personas/buscar son dos casos de uso distintos
 * — el filtro de edad de FR-024 es un parámetro del primero y NO debe
 * aparecer en el segundo (ver el comentario de `buscarPersonas`).
 */
async function crearServicio() {
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const moduleRef = await Test.createTestingModule({
    providers: [PersonaService, { provide: PrismaService, useValue: { persona: { findMany, count } } }, proveedorRolesDeEstado()],
  }).compile();
  return { service: moduleRef.get(PersonaService), findMany, count };
}

describe('nacidosAntesDeParaEdad — la regla de calcularEdad expresada como fecha', () => {
  const utc = (texto: string) => new Date(`${texto}T00:00:00Z`);

  // Para cada "hoy", recorre fechas de nacimiento alrededor del corte y
  // exige que el filtro de fecha diga lo mismo que calcularEdad — incluidos
  // los 29 de febrero de los dos lados.
  it.each(['2026-09-24', '2026-02-28', '2026-03-01', '2028-02-29', '2027-12-31', '2027-01-01'])(
    'coincide con calcularEdad(…) >= 18 alrededor del corte, con hoy = %s',
    (hoyTexto) => {
      const hoy = new Date(`${hoyTexto}T15:30:00Z`);
      const limite = nacidosAntesDeParaEdad(18, hoy);
      const inicio = Date.UTC(hoy.getUTCFullYear() - 18, hoy.getUTCMonth(), hoy.getUTCDate() - 5);
      for (let dia = 0; dia < 10; dia += 1) {
        const nacimiento = new Date(inicio + dia * 86_400_000);
        expect({ nacimiento, incluida: nacimiento < limite }).toEqual({ nacimiento, incluida: calcularEdad(nacimiento, hoy) >= 18 });
      }
    },
  );

  it('con hoy 29/2 y año de corte no bisiesto, deja afuera a quien nació el 1 de marzo', () => {
    expect(nacidosAntesDeParaEdad(18, utc('2028-02-29'))).toEqual(utc('2010-03-01'));
  });
});

describe('PersonaService.listarPersonas (GET /personas)', () => {
  it('sin soloMayores no filtra por fecha de nacimiento — listar Personas es listar a todas (default false)', async () => {
    const { service, findMany, count } = await crearServicio();

    await service.listarPersonas(0, 20);

    const { where } = findMany.mock.calls[0][0];
    expect(where).toEqual({ activo: true });
    expect(count).toHaveBeenCalledWith({ where });
  });

  it('con soloMayores excluye a los menores filtrando en la base, con el mismo corte que calcularEdad (FR-024)', async () => {
    const { service, findMany, count } = await crearServicio();

    await service.listarPersonas(0, 20, undefined, 'apellido', 'asc', true);

    const { where } = findMany.mock.calls[0][0];
    expect(where.fechaNacimiento).toEqual({ lt: nacidosAntesDeParaEdad(18) });
    // El total tiene que contar lo mismo que se lista, si no la paginación miente.
    expect(count).toHaveBeenCalledWith({ where });
  });

  it('busca por nombre, apellido, email o teléfono y ordena en la base con desempate estable', async () => {
    const { service, findMany } = await crearServicio();

    await service.listarPersonas(40, 20, '  garcía ', 'nombre', 'desc');

    const argumentos = findMany.mock.calls[0][0];
    expect(argumentos.where.OR).toEqual([
      { nombre: { contains: 'garcía', mode: 'insensitive' } },
      { apellido: { contains: 'garcía', mode: 'insensitive' } },
      { email: { contains: 'garcía', mode: 'insensitive' } },
      { telefono: { contains: 'garcía', mode: 'insensitive' } },
    ]);
    expect(argumentos.orderBy).toEqual([{ nombre: 'desc' }, { apellido: 'desc' }, { id: 'asc' }]);
    expect(argumentos).toMatchObject({ skip: 40, take: 20 });
    expect(argumentos.select).toMatchObject({ rol: true });
    expect(argumentos.select).not.toHaveProperty('fechaNacimiento');
  });

  it('devuelve { items, total } (Pagina<T>)', async () => {
    const { service, findMany, count } = await crearServicio();
    findMany.mockResolvedValue([{ id: 'p1' }]);
    count.mockResolvedValue(41);

    await expect(service.listarPersonas(0, 20)).resolves.toEqual({ items: [{ id: 'p1' }], total: 41 });
  });
});

describe('PersonaService.buscarPersonas (GET /personas/buscar, el buscador de tutor — H-29)', () => {
  it('devuelve los roles actuales (T017) sin exponer la fecha de nacimiento', async () => {
    const { service, findMany } = await crearServicio();

    await service.buscarPersonas('ana');

    const { select } = findMany.mock.calls[0][0];
    expect(select).toEqual({ id: true, nombre: true, apellido: true, email: true, telefono: true, rol: true });
  });

  // Corrección a T018: la regla de D133 no gobierna esta búsqueda. Si un
  // día alguien la agrega acá "porque un tutor tiene que ser mayor igual",
  // este test lo frena — esa regla es de `activar` (H-74), no de D133.
  it('NO filtra por edad: el umbral de roles de cargo (D133) no gobierna la búsqueda de tutor', async () => {
    const { service, findMany } = await crearServicio();

    await service.buscarPersonas('ana');

    const { where, take } = findMany.mock.calls[0][0];
    expect(where).not.toHaveProperty('fechaNacimiento');
    expect(where.activo).toBe(true);
    expect(take).toBe(10);
  });

  it('con menos de 2 caracteres no consulta la base (sin cambios)', async () => {
    const { service, findMany } = await crearServicio();

    expect(await service.buscarPersonas(' a ')).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
