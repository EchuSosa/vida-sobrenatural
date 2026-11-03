import { NOMBRE_ANONIMO, PALABRA_CONFIRMACION_BAJA, confirmacionBajaValida, tienePermiso } from '@vida-sobrenatural/shared-types';

/** spec 018 (D261, D263): la confirmación de la baja y quién puede darla en nombre de otro. */
describe('Baja de la app (spec 018)', () => {
  it('la palabra se acepta sin importar mayúsculas ni espacios alrededor; cualquier otra cosa no', () => {
    expect(PALABRA_CONFIRMACION_BAJA).toBe('BAJA');
    for (const v of ['BAJA', 'baja', '  Baja ']) expect(confirmacionBajaValida(v)).toBe(true);
    for (const v of ['BAJ', 'BAJAS', 'BA JA', '', null, undefined, 1]) expect(confirmacionBajaValida(v)).toBe(false);
  });

  it('se ve como "Persona dada de baja"', () => {
    expect(`${NOMBRE_ANONIMO.nombre} ${NOMBRE_ANONIMO.apellido}`).toBe('Persona dada de baja');
  });

  it('solo el Admin da de baja en nombre de otro (D263)', () => {
    expect(tienePermiso(['admin'], 'personas.baja')).toBe(true);
    expect(tienePermiso(['pastor'], 'personas.baja')).toBe(false);
    expect(tienePermiso(['miembro_registrado', 'discipulador'], 'personas.baja')).toBe(false);
  });
});
