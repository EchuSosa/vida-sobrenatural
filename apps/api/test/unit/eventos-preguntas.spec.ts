import { validarPreguntas, validarRespuestas, type DatosPreguntaEvento, type PreguntaEvento } from '@vida-sobrenatural/shared-types';

/** spec 011, ampliación 2026-10-09 — FR-064 (forma de las preguntas) y FR-065 (respuestas). */
const celiaca: PreguntaEvento = { id: 'p1', texto: '¿Sos celíaca?', tipo: 'si_no', opciones: [], obligatoria: true, sensible: true };
const jornada: PreguntaEvento = {
  id: 'p2',
  texto: '¿Participaste alguna vez de una jornada de sanidad?',
  tipo: 'opcion',
  opciones: ['Sí, hace mucho', 'No, nunca'],
  obligatoria: false,
  sensible: false,
};
const comentario: PreguntaEvento = { id: 'p3', texto: '¿Algo más?', tipo: 'texto', opciones: [], obligatoria: false, sensible: false };
const codigos = (r: { errores: { campo: string; code: string }[] }) => r.errores.map((e) => `${e.campo}:${e.code}`);

describe('validarPreguntas (FR-064)', () => {
  const p = (x: Partial<DatosPreguntaEvento>): DatosPreguntaEvento => ({ texto: '¿Venís?', tipo: 'si_no', obligatoria: false, sensible: false, ...x });
  it('preguntas bien armadas no tienen errores', () => {
    expect(validarPreguntas([p({}), p({ tipo: 'opcion', opciones: ['A', 'B'] }), p({ tipo: 'texto' })])).toEqual([]);
  });
  it('más de 10, texto vacío o largo, tipo desconocido', () => {
    expect(validarPreguntas(Array.from({ length: 11 }, () => p({}))).map((e) => e.code)).toContain('PREGUNTAS_DEMASIADAS');
    expect(validarPreguntas([p({ texto: '  ' })])).toEqual([{ campo: 'pregunta-0-texto', code: 'PREGUNTA_TEXTO_REQUERIDO' }]);
    expect(validarPreguntas([p({ texto: 'x'.repeat(201) })])).toEqual([{ campo: 'pregunta-0-texto', code: 'PREGUNTA_TEXTO_DEMASIADO_LARGO' }]);
    expect(validarPreguntas([p({ tipo: 'fecha' as never })])).toEqual([{ campo: 'pregunta-0-tipo', code: 'PREGUNTA_TIPO_INVALIDO' }]);
  });
  it('"Una opción" necesita entre 2 y 10 opciones no vacías y distintas', () => {
    const err = [{ campo: 'pregunta-0-opciones', code: 'PREGUNTA_OPCIONES_INVALIDAS' }];
    expect(validarPreguntas([p({ tipo: 'opcion', opciones: ['Sola'] })])).toEqual(err);
    expect(validarPreguntas([p({ tipo: 'opcion', opciones: ['A', ''] })])).toEqual(err);
    expect(validarPreguntas([p({ tipo: 'opcion', opciones: ['Sí', 'sí'] })])).toEqual(err);
    expect(validarPreguntas([p({ tipo: 'opcion', opciones: Array.from({ length: 11 }, (_, i) => `O${i}`) })])).toEqual(err);
  });
});

describe('validarRespuestas (FR-065)', () => {
  const preguntas = [celiaca, jornada, comentario];
  it('respuestas válidas, normalizadas; las vacías no opcionales se omiten', () => {
    const r = validarRespuestas(preguntas, [
      { preguntaId: 'p1', valor: 'no' },
      { preguntaId: 'p2', valor: 'No, nunca' },
      { preguntaId: 'p3', valor: '  ' },
    ]);
    expect(r.errores).toEqual([]);
    expect(r.validas).toEqual([
      { preguntaId: 'p1', valor: 'no' },
      { preguntaId: 'p2', valor: 'No, nunca' },
    ]);
  });
  it('obligatoria sin responder, valor fuera de las opciones y texto largo, cada una en su campo', () => {
    expect(codigos(validarRespuestas(preguntas, undefined))).toEqual(['respuesta-p1:RESPUESTA_REQUERIDA']);
    expect(
      codigos(
        validarRespuestas(preguntas, [
          { preguntaId: 'p1', valor: 'tal vez' },
          { preguntaId: 'p2', valor: 'Otra' },
          { preguntaId: 'p3', valor: 'x'.repeat(201) },
        ]),
      ),
    ).toEqual(['respuesta-p1:RESPUESTA_INVALIDA', 'respuesta-p2:RESPUESTA_INVALIDA', 'respuesta-p3:RESPUESTA_DEMASIADO_LARGA']);
  });
  it('ignora respuestas a preguntas que no son del Evento', () => {
    expect(validarRespuestas([jornada], [{ preguntaId: 'otra', valor: 'x' }])).toEqual({ errores: [], validas: [] });
  });
});
