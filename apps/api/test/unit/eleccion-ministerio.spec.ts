import { validarEleccionMinisterio, type AreaParaValidar } from '@vida-sobrenatural/shared-types';

/** spec 015 (D239): la regla única de la elección de ministerio. */
describe('validarEleccionMinisterio (D239)', () => {
  const areas = new Map<string, AreaParaValidar>([
    ['consolidadores', { ministerioId: 'bienvenida', enParalelo: false, disponible: true }],
    ['seguridad', { ministerioId: 'bienvenida', enParalelo: false, disponible: true }],
    ['fotografia', { ministerioId: 'multimedia', enParalelo: false, disponible: true }],
    ['informes', { ministerioId: 'mesa', enParalelo: false, disponible: true }],
    ['discipulados', { ministerioId: 'ensenanza', enParalelo: true, disponible: true }],
    ['pausada', { ministerioId: 'pausado', enParalelo: false, disponible: false }],
  ]);
  const o = (...celulas: string[]) => celulas.map((celulaId) => ({ ministerioId: areas.get(celulaId)?.ministerioId ?? 'x', celulaId }));

  it('de 1 a 2 Ministerios, un área de cada uno; Discipulados Vida Nueva no cuenta (D217)', () => {
    expect(validarEleccionMinisterio(o('consolidadores'), areas)).toEqual([]);
    expect(validarEleccionMinisterio(o('consolidadores', 'fotografia'), areas)).toEqual([]);
    expect(validarEleccionMinisterio(o('consolidadores', 'fotografia', 'discipulados'), areas)).toEqual([]);
    expect(validarEleccionMinisterio(o('discipulados'), areas)).toEqual([]);
  });

  it('vacía, tres Ministerios, dos áreas del mismo, o un área que no está disponible', () => {
    expect(validarEleccionMinisterio([], areas)).toEqual([{ campo: 'opciones', code: 'ELECCION_VACIA' }]);
    expect(validarEleccionMinisterio(o('consolidadores', 'fotografia', 'informes'), areas)).toEqual([{ campo: 'opciones', code: 'ELECCION_MAXIMO_MINISTERIOS' }]);
    expect(validarEleccionMinisterio(o('consolidadores', 'seguridad'), areas)).toEqual([{ campo: 'opciones', code: 'ELECCION_UN_AREA_POR_MINISTERIO' }]);
    expect(validarEleccionMinisterio(o('pausada'), areas)).toEqual([{ campo: 'opciones', code: 'ELECCION_AREA_NO_DISPONIBLE' }]);
    expect(validarEleccionMinisterio([{ ministerioId: 'mesa', celulaId: 'consolidadores' }], areas)).toEqual([{ campo: 'opciones', code: 'ELECCION_AREA_NO_DISPONIBLE' }]);
    expect(validarEleccionMinisterio([{ ministerioId: 'x', celulaId: 'no-existe' }], areas)).toEqual([{ campo: 'opciones', code: 'ELECCION_AREA_NO_DISPONIBLE' }]);
  });

  it('textos: comentario hasta 500 y notas hasta 2000', () => {
    expect(validarEleccionMinisterio(o('informes'), areas, { comentario: 'a'.repeat(500), notas: 'a'.repeat(2000) })).toEqual([]);
    expect(validarEleccionMinisterio(o('informes'), areas, { comentario: 'a'.repeat(501), notas: 'a'.repeat(2001) })).toEqual([
      { campo: 'comentario', code: 'TEXTO_DEMASIADO_LARGO' },
      { campo: 'notas', code: 'TEXTO_DEMASIADO_LARGO' },
    ]);
  });
});
