import { validarConfigEvento, type ConfigEvento } from '../../src/evento/validacion-evento.js';

/** spec 011 — FR-010 (cada error de campo) y FR-045 (bautismo). */
const valido: ConfigEvento = {
  nombre: 'Campamento',
  descripcion: 'Tres días en la sierra.',
  tipo: 'general',
  inicio: new Date('2026-11-14T22:00:00Z'),
  fin: null,
  lugar: null,
  publicoObjetivo: null,
  requiereInscripcion: true,
  requiereAprobacion: false,
  cupo: 40,
  permiteListaEspera: true,
  costo: 15000,
  instruccionesPago: 'Alias VIDA.SOBRENATURAL',
  diasAnticipacionRecordatorio: 7,
};
const codigos = (c: Partial<ConfigEvento>) => validarConfigEvento({ ...valido, ...c }).map((e) => `${e.campo}:${e.code}`);

describe('validarConfigEvento (FR-010, FR-045)', () => {
  it('una configuración completa no tiene errores', () => {
    expect(codigos({})).toEqual([]);
  });
  it.each([
    [{ nombre: '  ' }, 'nombre:NOMBRE_REQUERIDO'],
    [{ nombre: 'ab' }, 'nombre:NOMBRE_DEMASIADO_CORTO'],
    [{ nombre: 'x'.repeat(121) }, 'nombre:NOMBRE_DEMASIADO_LARGO'],
    [{ descripcion: '' }, 'descripcion:DESCRIPCION_REQUERIDA'],
    [{ descripcion: 'x'.repeat(5001) }, 'descripcion:DESCRIPCION_DEMASIADO_LARGA'],
    [{ inicio: null }, 'inicio:INICIO_REQUERIDO'],
    [{ fin: new Date('2026-11-14T21:00:00Z') }, 'fin:FIN_ANTERIOR_AL_INICIO'],
    [{ lugar: 'x'.repeat(301) }, 'lugar:LUGAR_DEMASIADO_LARGO'],
    [{ publicoObjetivo: 'x'.repeat(121) }, 'publicoObjetivo:PUBLICO_OBJETIVO_DEMASIADO_LARGO'],
    [{ cupo: 0 }, 'cupo:CUPO_INVALIDO'],
    [{ cupo: 2.5 }, 'cupo:CUPO_INVALIDO'],
    [{ requiereInscripcion: false, diasAnticipacionRecordatorio: null, requiereAprobacion: true }, 'requiereAprobacion:APROBACION_SIN_INSCRIPCION'],
    [{ cupo: null }, 'permiteListaEspera:LISTA_ESPERA_SIN_CUPO'],
    [{ costo: -1 }, 'costo:COSTO_INVALIDO'],
    [{ costo: Number.NaN }, 'costo:COSTO_INVALIDO'],
    [{ instruccionesPago: ' ' }, 'instruccionesPago:INSTRUCCIONES_PAGO_REQUERIDAS'],
    [{ diasAnticipacionRecordatorio: 61 }, 'diasAnticipacionRecordatorio:DIAS_RECORDATORIO_FUERA_DE_RANGO'],
    [{ diasAnticipacionRecordatorio: 0 }, 'diasAnticipacionRecordatorio:DIAS_RECORDATORIO_FUERA_DE_RANGO'],
  ])('%j → %s', (cambio, esperado) => {
    expect(codigos(cambio)).toContain(esperado);
  });
  it('junta todos los errores a la vez (H-50)', () => {
    expect(codigos({ nombre: '', descripcion: '', inicio: null })).toHaveLength(3);
  });
  it('bautismo con costo, lista, aprobación o recordatorio → CONFIG_BAUTISMO_INVALIDA', () => {
    expect(codigos({ tipo: 'bautismo' })).toContain('tipo:CONFIG_BAUTISMO_INVALIDA');
  });
  it('bautismo bien configurado (con cupo) no tiene errores', () => {
    expect(
      codigos({ tipo: 'bautismo', permiteListaEspera: false, costo: null, instruccionesPago: null, diasAnticipacionRecordatorio: null }),
    ).toEqual([]);
  });
});
