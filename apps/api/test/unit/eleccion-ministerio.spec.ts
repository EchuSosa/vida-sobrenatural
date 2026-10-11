import { validarEleccionMinisterio, type MinisterioParaValidar } from '@vida-sobrenatural/shared-types';

/** spec 015 (D239): la regla única de la elección de ministerio. */
describe('validarEleccionMinisterio (D239)', () => {
  const m = (disponible: boolean, areas: Array<[string, boolean]>): MinisterioParaValidar => ({ disponible, areas: new Map(areas.map(([id, enParalelo]) => [id, { enParalelo }])) });
  const ministerios = new Map<string, MinisterioParaValidar>([
    ['bienvenida', m(true, [['consolidadores', false], ['seguridad', false]])],
    ['multimedia', m(true, [['fotografia', false]])],
    ['mesa', m(true, [])], // sin áreas: se elige entero (docs/22)
    ['ensenanza', m(true, [['discipulados', true]])],
    ['pausado', m(false, [])],
  ]);
  const o = (...pares: Array<[string, string | null]>) => pares.map(([ministerioId, celulaId]) => ({ ministerioId, celulaId }));

  it('de 1 a 2 Ministerios, un área de cada uno; sin áreas, el Ministerio entero; Discipulados Vida Nueva no cuenta (D217)', () => {
    expect(validarEleccionMinisterio(o(['bienvenida', 'consolidadores']), ministerios)).toEqual([]);
    expect(validarEleccionMinisterio(o(['bienvenida', 'consolidadores'], ['mesa', null]), ministerios)).toEqual([]);
    expect(validarEleccionMinisterio(o(['bienvenida', 'consolidadores'], ['multimedia', 'fotografia'], ['ensenanza', 'discipulados']), ministerios)).toEqual([]);
    expect(validarEleccionMinisterio(o(['ensenanza', 'discipulados']), ministerios)).toEqual([]);
  });

  it('vacía, tres Ministerios, dos áreas del mismo, o algo que no está disponible', () => {
    expect(validarEleccionMinisterio([], ministerios)).toEqual([{ campo: 'opciones', code: 'ELECCION_VACIA' }]);
    expect(validarEleccionMinisterio(o(['bienvenida', 'consolidadores'], ['multimedia', 'fotografia'], ['mesa', null]), ministerios)).toEqual([
      { campo: 'opciones', code: 'ELECCION_MAXIMO_MINISTERIOS' },
    ]);
    expect(validarEleccionMinisterio(o(['bienvenida', 'consolidadores'], ['bienvenida', 'seguridad']), ministerios)).toEqual([
      { campo: 'opciones', code: 'ELECCION_UN_AREA_POR_MINISTERIO' },
    ]);
    const noDisponible = [{ campo: 'opciones', code: 'ELECCION_AREA_NO_DISPONIBLE' }];
    expect(validarEleccionMinisterio(o(['pausado', null]), ministerios)).toEqual(noDisponible);
    expect(validarEleccionMinisterio(o(['bienvenida', null]), ministerios)).toEqual(noDisponible); // tiene áreas: hay que elegir una
    expect(validarEleccionMinisterio(o(['mesa', 'consolidadores']), ministerios)).toEqual(noDisponible); // área de otro Ministerio
    expect(validarEleccionMinisterio(o(['no-existe', null]), ministerios)).toEqual(noDisponible);
  });

  it('textos: comentario hasta 500 y notas hasta 2000', () => {
    expect(validarEleccionMinisterio(o(['mesa', null]), ministerios, { comentario: 'a'.repeat(500), notas: 'a'.repeat(2000) })).toEqual([]);
    expect(validarEleccionMinisterio(o(['mesa', null]), ministerios, { comentario: 'a'.repeat(501), notas: 'a'.repeat(2001) })).toEqual([
      { campo: 'comentario', code: 'TEXTO_DEMASIADO_LARGO' },
      { campo: 'notas', code: 'TEXTO_DEMASIADO_LARGO' },
    ]);
  });
});
