import {
  alertaFaltas,
  cronogramaPropuesto,
  cronogramaValido,
  cumplePrerrequisito,
  errorEdicionPedida,
  estadoSemanaLider,
  estadoSemanaPersona,
  liberada,
  materialCargado,
  semanasVisibles,
  sePuedeProponerFinalizacion,
  validarCambioCronograma,
} from '@vida-sobrenatural/shared-types';

/** spec 008, T003: las reglas puras de `vida-de-servicio.ts`, una rama por caso (Principio VI). */
describe('Vida de Servicio — reglas puras (spec 008, T003)', () => {
  describe('cumplePrerrequisito (FR-008)', () => {
    it('cumple por una Inscripción completada de Vida Nueva (individual o grupal: la categoría es la misma)', () => {
      expect(cumplePrerrequisito({ inscripcionesCompletadas: ['vida_nueva'], completitudes: [] }, 'vida_nueva')).toBe(true);
    });
    it('cumple por una Completitud Manual de Vida Nueva', () => {
      expect(cumplePrerrequisito({ inscripcionesCompletadas: [], completitudes: ['vida_nueva'] }, 'vida_nueva')).toBe(true);
    });
    it('no cumple sin ninguna, ni con otra categoría', () => {
      expect(cumplePrerrequisito({ inscripcionesCompletadas: [], completitudes: [] }, 'vida_nueva')).toBe(false);
      expect(cumplePrerrequisito({ inscripcionesCompletadas: ['vida_de_servicio'], completitudes: [] }, 'vida_nueva')).toBe(false);
    });
    it('sin prerrequisito, siempre cumple', () => {
      expect(cumplePrerrequisito({ inscripcionesCompletadas: [], completitudes: [] }, null)).toBe(true);
    });
  });

  describe('cronograma (FR-002, FR-004)', () => {
    it('propone 8 semanas, una cada 7 días desde el inicio (cruza de mes)', () => {
      expect(cronogramaPropuesto('2026-10-28', 8)).toEqual([
        '2026-10-28', '2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09', '2026-12-16',
      ]);
    });
    it('acepta fechas crecientes desde el inicio', () => {
      expect(cronogramaValido(['2026-10-28', '2026-11-05'], '2026-10-28')).toEqual([]);
    });
    it('marca la repetida y la desordenada con su índice', () => {
      expect(cronogramaValido(['2026-10-28', '2026-10-28', '2026-11-20', '2026-11-10'], '2026-10-28')).toEqual([
        { campo: 'semanas.1', code: 'FECHAS_NO_CRECIENTES' },
        { campo: 'semanas.3', code: 'FECHAS_NO_CRECIENTES' },
      ]);
    });
    it('la primera antes del inicio, y una fecha inválida', () => {
      expect(cronogramaValido(['2026-10-27'], '2026-10-28')).toEqual([{ campo: 'semanas.0', code: 'PRIMERA_SEMANA_ANTES_DEL_INICIO' }]);
      expect(cronogramaValido(['2026-10-28', 'mañana'], '2026-10-28')).toEqual([{ campo: 'semanas.1', code: 'FECHA_INVALIDA' }]);
    });
    it('fuera de rango: 0 o 53 semanas', () => {
      expect(cronogramaValido([], '2026-10-28')).toEqual([{ campo: 'semanas', code: 'SEMANAS_FUERA_DE_RANGO' }]);
      expect(cronogramaValido(cronogramaPropuesto('2026-10-28', 53), '2026-10-28')).toEqual([{ campo: 'semanas', code: 'SEMANAS_FUERA_DE_RANGO' }]);
    });
  });

  describe('validarCambioCronograma (FR-004)', () => {
    const hoy = '2026-11-10';
    const actual = [
      { numero: 1, fechaLiberacion: '2026-11-01', conMaterial: true }, // liberada
      { numero: 2, fechaLiberacion: '2026-11-08', conMaterial: false }, // vencida sin material
      { numero: 3, fechaLiberacion: '2026-11-15', conMaterial: true }, // cargada, por liberar
      { numero: 4, fechaLiberacion: '2026-11-22', conMaterial: false },
    ];
    const igual = actual.map(({ numero, fechaLiberacion }) => ({ numero, fechaLiberacion }));

    it('mover una semana no liberada y agregar al final: ok', () => {
      const nuevo = [...igual.slice(0, 3), { numero: 4, fechaLiberacion: '2026-11-23' }, { numero: 5, fechaLiberacion: '2026-11-30' }];
      expect(validarCambioCronograma(actual, nuevo, '2026-11-01', hoy)).toEqual({ errores: [], conflicto: null });
    });
    it('mover una vencida sin material también se puede (no está liberada)', () => {
      const nuevo = igual.map((s) => (s.numero === 2 ? { ...s, fechaLiberacion: '2026-11-12' } : s));
      expect(validarCambioCronograma(actual, nuevo, '2026-11-01', hoy).conflicto).toBeNull();
    });
    it('mover una liberada: SEMANA_LIBERADA_NO_EDITABLE', () => {
      const nuevo = igual.map((s) => (s.numero === 1 ? { ...s, fechaLiberacion: '2026-11-02' } : s));
      expect(validarCambioCronograma(actual, nuevo, '2026-11-01', hoy).conflicto).toBe('SEMANA_LIBERADA_NO_EDITABLE');
    });
    it('quitar la última sin material: ok; quitar una con material: SEMANA_CON_MATERIAL', () => {
      expect(validarCambioCronograma(actual, igual.slice(0, 3), '2026-11-01', hoy).conflicto).toBeNull();
      expect(validarCambioCronograma(actual, igual.slice(0, 2), '2026-11-01', hoy).conflicto).toBe('SEMANA_CON_MATERIAL');
    });
    it('quitar del medio no se puede: los números tienen que seguir siendo 1..n', () => {
      const nuevo = [igual[0], igual[1], igual[3]];
      expect(validarCambioCronograma(actual, nuevo, '2026-11-01', hoy).errores).toEqual([{ campo: 'semanas', code: 'SEMANAS_NO_CONSECUTIVAS' }]);
    });
  });

  describe('liberada (FR-021) y estados de semana', () => {
    const hoy = '2026-11-10';
    it.each([
      ['2026-11-10', true, true],
      ['2026-11-09', true, true],
      ['2026-11-11', true, false],
      ['2026-11-09', false, false],
      ['2026-11-10', false, false],
    ])('fecha %s con material=%s → liberada=%s', (fecha, conMaterial, esperado) => {
      expect(liberada({ fechaLiberacion: fecha }, conMaterial ? {} : null, hoy)).toBe(esperado);
    });
    it('estado para el Líder: los cuatro', () => {
      expect(estadoSemanaLider('2026-11-11', false, hoy)).toBe('sin_material');
      expect(estadoSemanaLider('2026-11-11', true, hoy)).toBe('cargado_por_liberar');
      expect(estadoSemanaLider('2026-11-10', true, hoy)).toBe('liberada');
      expect(estadoSemanaLider('2026-11-09', false, hoy)).toBe('vencida_sin_material');
    });
    it('estado para la Persona: de una fecha futura no se dice si hay material', () => {
      expect(estadoSemanaPersona('2026-11-11', true, hoy)).toBe('proxima');
      expect(estadoSemanaPersona('2026-11-11', false, hoy)).toBe('proxima');
      expect(estadoSemanaPersona('2026-11-10', true, hoy)).toBe('liberada');
      expect(estadoSemanaPersona('2026-11-09', false, hoy)).toBe('sin_material');
    });
  });

  describe('semanasVisibles (FR-034)', () => {
    const hoy = '2026-11-20';
    const items = [
      { numero: 1, fechaLiberacion: '2026-11-01', conMaterial: true },
      { numero: 2, fechaLiberacion: '2026-11-08', conMaterial: true },
      { numero: 3, fechaLiberacion: '2026-11-15', conMaterial: true },
      { numero: 4, fechaLiberacion: '2026-11-22', conMaterial: true },
    ];
    it('activa y completada: todas las semanas en la lista', () => {
      expect(semanasVisibles({ estado: 'activa', cerradaEn: null }, items, hoy).map((s) => s.numero)).toEqual([1, 2, 3, 4]);
      expect(semanasVisibles({ estado: 'completada', cerradaEn: '2026-11-25T12:00:00Z' }, items, hoy).map((s) => s.numero)).toEqual([1, 2, 3, 4]);
    });
    it('dada de baja y abandono: solo las liberadas hasta la fecha de cierre (inclusive)', () => {
      expect(semanasVisibles({ estado: 'dada_de_baja', cerradaEn: '2026-11-08T15:00:00Z' }, items, hoy).map((s) => s.numero)).toEqual([1, 2]);
      expect(semanasVisibles({ estado: 'abandono', cerradaEn: '2026-11-10T15:00:00Z' }, items, hoy).map((s) => s.numero)).toEqual([1, 2]);
    });
  });

  it('materialCargado (FR-020): título solo no alcanza; con texto, archivo o enlace sí', () => {
    expect(materialCargado({ titulo: 'Semana 1', texto: '  ', archivos: 0, enlaces: 0 })).toBe(false);
    expect(materialCargado({ titulo: '  ', texto: 'Hola', archivos: 0, enlaces: 0 })).toBe(false);
    expect(materialCargado({ titulo: 'Semana 1', texto: 'Hola', archivos: 0, enlaces: 0 })).toBe(true);
    expect(materialCargado({ titulo: 'Semana 1', texto: null, archivos: 1, enlaces: 0 })).toBe(true);
    expect(materialCargado({ titulo: 'Semana 1', archivos: 0, enlaces: 1 })).toBe(true);
  });

  it('errorEdicionPedida (FR-010, FR-011): con edición, abierta; sin edición, solo si no hay ninguna', () => {
    expect(errorEdicionPedida(['g1', 'g2'], 'g1')).toBeNull();
    expect(errorEdicionPedida(['g1'], 'g9')).toEqual({ campo: 'grupoId', code: 'EDICION_NO_DISPONIBLE' });
    expect(errorEdicionPedida([], 'g1')).toEqual({ campo: 'grupoId', code: 'EDICION_NO_DISPONIBLE' });
    expect(errorEdicionPedida([], null)).toBeNull();
    expect(errorEdicionPedida(['g1'], null)).toEqual({ campo: 'grupoId', code: 'EDICION_REQUERIDA' });
  });

  it('alertaFaltas (FR-029, D164): desde 2', () => {
    expect(alertaFaltas(1)).toBe(false);
    expect(alertaFaltas(2)).toBe(true);
    expect(alertaFaltas(3)).toBe(true);
  });

  it('sePuedeProponerFinalizacion (FR-035): desde el día de la última semana', () => {
    const fechas = ['2026-11-01', '2026-11-08'];
    expect(sePuedeProponerFinalizacion(fechas, '2026-11-07')).toBe(false);
    expect(sePuedeProponerFinalizacion(fechas, '2026-11-08')).toBe(true);
    expect(sePuedeProponerFinalizacion(fechas, '2026-11-09')).toBe(true);
    expect(sePuedeProponerFinalizacion([], '2026-11-09')).toBe(false);
  });
});
