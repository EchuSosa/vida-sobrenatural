/**
 * ROTO A PROPÓSITO — no mergear. Rama `verificar-ci-en-rojo` (H-146/H-147):
 * prueba que un test que falla pone el job `integracion` de CI en rojo y que
 * su informe se sube igual (artefacto `informe-integracion`). Falla al CORRER,
 * no al compilar: `verificacion` tiene que seguir en verde.
 */
describe('zz-ci-rojo-a-proposito (integración)', () => {
  it('falla a propósito para verificar que CI se pone en rojo', () => {
    expect('rojo a propósito').toBe('verde');
  });
});
