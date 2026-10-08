import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { erroresDeDatosPersonales } from '@vida-sobrenatural/shared-types';
import { RegistroPersonaDto } from '../../src/persona/dto/registro-persona.dto.js';

/**
 * spec 006, T006 (FR-031, research #9): `erroresDeDatosPersonales`
 * (shared-types, la usa el alta por el Admin) tiene EXACTAMENTE las reglas de
 * `RegistroPersonaDto` (el auto-registro). Se comparan las dos sobre los
 * mismos datos: si alguien cambia una, este test lo nota.
 */
const ANIO = new Date().getFullYear();
const validos = {
  apellido: 'Gómez',
  nombre: 'Rosa',
  genero: 'femenino',
  fechaNacimiento: '1948-03-12',
  telefono: '+54 9 221 5550101',
  direccion: 'Calle 7 1234',
  sedeId: '0b3f6b1e-1a2b-4c3d-8e9f-0123456789ab',
  estadoCivil: 'viudo_a',
  profesion: 'jubilado_a',
  congregaDesde: 2012,
};

const casos: Array<[string, Record<string, unknown>]> = [
  ['todo bien', {}],
  ['todo vacío', Object.fromEntries(Object.keys(validos).map((k) => [k, undefined]))],
  ['apellido vacío', { apellido: '' }],
  ['género raro', { genero: 'otro' }],
  ['fecha que no es fecha', { fechaNacimiento: 'ayer' }],
  ['teléfono sin código de país', { telefono: '221 5550101' }],
  ['teléfono con letras', { telefono: '+54 221 55A0101' }],
  ['sede que no es uuid', { sedeId: 'la-plata' }],
  ['estado civil raro', { estadoCivil: 'complicado' }],
  ['profesión rara', { profesion: 'astronauta' }],
  ['"otro" sin detalle', { profesion: 'otro' }],
  ['"otro" con detalle', { profesion: 'otro', profesionDetalle: 'Apicultora' }],
  ['año en el futuro', { congregaDesde: ANIO + 1 }],
  ['año antes de 1900', { congregaDesde: 1899 }],
  ['año con decimales', { congregaDesde: 2010.5 }],
];

describe('erroresDeDatosPersonales = RegistroPersonaDto (spec 006, T006)', () => {
  it.each(casos)('%s', async (_nombre, cambios) => {
    const datos = { ...validos, ...cambios };
    const dto = plainToInstance(RegistroPersonaDto, { ...datos, consentimientoDatos: true });
    const delDto = (await validate(dto)).map((e) => e.property).sort();
    const compartida = erroresDeDatosPersonales(datos, ANIO).map((e) => e.campo).sort();
    expect(compartida).toEqual(delDto);
  });

  it('los códigos son los que deriva la fábrica de validación de la API (<CAMPO>_INVALIDO)', () => {
    expect(erroresDeDatosPersonales({ ...validos, telefono: 'x', profesion: 'otro' }, ANIO)).toEqual([
      { campo: 'telefono', code: 'TELEFONO_INVALIDO' },
      { campo: 'profesionDetalle', code: 'PROFESIONDETALLE_INVALIDO' },
    ]);
  });
});
