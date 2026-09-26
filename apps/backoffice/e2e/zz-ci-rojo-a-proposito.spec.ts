import { test, expect } from './helpers';

/**
 * ROTO A PROPÓSITO — no mergear. Rama `verificar-ci-en-rojo` (H-146/H-147):
 * prueba que un test que falla pone el job `e2e` de CI en rojo y que el
 * informe de esta suite se sube igual (artefacto `informe-e2e-backoffice`). Falla al
 * CORRER, no al compilar: `verificacion` tiene que seguir en verde.
 */
test('zz-ci-rojo-a-proposito (backoffice): falla a propósito para verificar que CI se pone en rojo', () => {
  expect('rojo a propósito').toBe('verde');
});
