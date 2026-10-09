import { TALLES_REMERA, errorTalleRemera, esTalleRemera, resumirTalles } from '@vida-sobrenatural/shared-types';
import { normalizarPedidoBautismo } from '../../src/bautismo/operaciones.js';
import { AppException } from '../../src/common/errors/app-exception.js';

/**
 * D229: el talle de remera del pedido de bautismo — la regla del campo (la
 * misma que usan la API y los formularios), el resumen para comprar las
 * remeras y la validación del pedido con los dos campos juntos.
 */
describe('talle de remera (D229)', () => {
  it('los siete talles, en orden de menor a mayor', () => {
    expect(TALLES_REMERA).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
  });

  it.each([
    [undefined, 'TALLE_REQUERIDO'],
    [null, 'TALLE_REQUERIDO'],
    ['', 'TALLE_REQUERIDO'],
    ['   ', 'TALLE_REQUERIDO'],
    ['m', 'TALLE_INVALIDO'],
    ['XXXXL', 'TALLE_INVALIDO'],
    [3, 'TALLE_INVALIDO'],
    ['M', null],
    ['XXXL', null],
  ])('errorTalleRemera(%p) → %p', (valor, esperado) => {
    expect(errorTalleRemera(valor)).toBe(esperado);
    expect(esTalleRemera(valor)).toBe(esperado === null);
  });

  it('resumirTalles: solo los talles con alguna, en orden, y los null como "sin dato"', () => {
    expect(resumirTalles(['L', 'S', null, 'M', 'S', 'M', 'M', null])).toEqual({
      talles: [
        { talle: 'S', cantidad: 2 },
        { talle: 'M', cantidad: 3 },
        { talle: 'L', cantidad: 1 },
      ],
      sinDato: 2,
      total: 8,
    });
    expect(resumirTalles([])).toEqual({ talles: [], sinDato: 0, total: 0 });
  });

  it('normalizarPedidoBautismo: junta los errores de comentario y talle en una sola respuesta', () => {
    expect(normalizarPedidoBautismo('  hola ', 'XL')).toEqual({ comentario: 'hola', talleRemera: 'XL' });
    expect(normalizarPedidoBautismo('', 'S')).toEqual({ comentario: null, talleRemera: 'S' });
    try {
      normalizarPedidoBautismo('a'.repeat(501), undefined);
      throw new Error('no falló');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect({ code: (error as AppException).code, errors: (error as AppException).errors }).toEqual({
        code: 'VALIDACION',
        errors: [
          { campo: 'comentario', code: 'COMENTARIO_DEMASIADO_LARGO' },
          { campo: 'talleRemera', code: 'TALLE_REQUERIDO' },
        ],
      });
    }
  });
});
