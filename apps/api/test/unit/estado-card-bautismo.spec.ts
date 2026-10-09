import {
  EDAD_MINIMA_PEDIR_BAUTISMO_SOLO,
  estadoCardBautismo,
  motivoNoPuedePedir,
  puedeRetirarBautismo,
  type EventoDeBautismoResumen,
  type HechosBautismo,
} from '@vida-sobrenatural/shared-types';

/**
 * spec 010, T003 (FR-002, FR-003, FR-004, FR-005, FR-019, SC-004): una fila
 * por cada una de las 8 variantes de la card, y cada rama de
 * `motivoNoPuedePedir` con su precedencia.
 */

const AHORA = '2026-10-08T15:00:00.000Z';
const EVENTO: EventoDeBautismoResumen = {
  id: 'ev1',
  nombre: 'Bautismos de noviembre',
  slug: 'bautismos-de-noviembre',
  inicio: '2026-11-08T21:00:00.000Z',
  fin: null,
  lugar: 'Calle 7 1234, La Plata',
};

function hechos(cambios: Partial<HechosBautismo> = {}): HechosBautismo {
  return {
    vidaNueva: 'en_curso',
    habilitada: false,
    edad: 30,
    solicitudAbierta: null,
    ultimoDesenlace: null,
    bautizada: false,
    bautizadaEn: null,
    eventoAsignado: null,
    ahora: AHORA,
    ...cambios,
  };
}

const PENDIENTE = { id: 's1', estado: 'pendiente' as const, createdAt: '2026-10-01T12:00:00.000Z', revisadaEn: null };
const APROBADA = { id: 's1', estado: 'aprobada' as const, createdAt: '2026-10-01T12:00:00.000Z', revisadaEn: '2026-10-02T12:00:00.000Z' };

describe('estadoCardBautismo (FR-019): las 8 variantes', () => {
  it.each<[string, Partial<HechosBautismo>, unknown]>([
    ['no_habilitada: sin Vida Nueva ni habilitación', { vidaNueva: 'ninguna' }, { estado: 'no_habilitada' }],
    ['lo_pide_su_tutor: 11 años', { edad: 11 }, { estado: 'lo_pide_su_tutor' }],
    ['puede_pedir: Vida Nueva en curso', {}, { estado: 'puede_pedir' }],
    ['puede_pedir con último rechazo', { ultimoDesenlace: 'rechazada' }, { estado: 'puede_pedir', ultimo: 'rechazada' }],
    ['puede_pedir con último retiro', { ultimoDesenlace: 'retirada' }, { estado: 'puede_pedir', ultimo: 'retirada' }],
    ['en_revision', { solicitudAbierta: PENDIENTE }, { estado: 'en_revision', solicitudId: 's1', desde: PENDIENTE.createdAt }],
    ['esperando_fecha', { solicitudAbierta: APROBADA }, { estado: 'esperando_fecha', solicitudId: 's1', aceptadaEn: APROBADA.revisadaEn }],
    ['con_fecha', { solicitudAbierta: APROBADA, eventoAsignado: EVENTO }, { estado: 'con_fecha', solicitudId: 's1', evento: EVENTO }],
    [
      'fecha_pasada_sin_confirmar',
      { solicitudAbierta: APROBADA, eventoAsignado: { ...EVENTO, inicio: '2026-10-01T21:00:00.000Z' } },
      { estado: 'fecha_pasada_sin_confirmar', solicitudId: 's1', evento: { ...EVENTO, inicio: '2026-10-01T21:00:00.000Z' } },
    ],
    ['bautizada con fecha', { bautizada: true, bautizadaEn: '2026-09-01T21:00:00.000Z' }, { estado: 'bautizada', en: '2026-09-01T21:00:00.000Z' }],
    ['bautizada por historial, sin fecha', { bautizada: true, vidaNueva: 'ninguna' }, { estado: 'bautizada', en: null }],
  ])('%s', (_nombre, cambios, esperado) => {
    expect(estadoCardBautismo(hechos(cambios))).toEqual(esperado);
  });

  it('el último desenlace no se muestra si hay una Solicitud abierta', () => {
    expect(estadoCardBautismo(hechos({ solicitudAbierta: PENDIENTE, ultimoDesenlace: 'rechazada' })).estado).toBe('en_revision');
  });

  it('aceptada sin revisadaEn usa la fecha del pedido', () => {
    expect(estadoCardBautismo(hechos({ solicitudAbierta: { ...APROBADA, revisadaEn: null } }))).toMatchObject({ aceptadaEn: APROBADA.createdAt });
  });

  it('borde exacto: un Evento que empieza AHORA ya está "pasado sin confirmar"; un milisegundo después del ahora, todavía "con fecha"', () => {
    const exacto = hechos({ solicitudAbierta: APROBADA, eventoAsignado: { ...EVENTO, inicio: AHORA } });
    expect(estadoCardBautismo(exacto).estado).toBe('fecha_pasada_sin_confirmar');
    const despues = hechos({ solicitudAbierta: APROBADA, eventoAsignado: { ...EVENTO, inicio: '2026-10-08T15:00:00.001Z' } });
    expect(estadoCardBautismo(despues).estado).toBe('con_fecha');
  });

  it('una Solicitud abierta se muestra aunque la Persona ya no cumpla la regla (se mira solo al pedir)', () => {
    expect(estadoCardBautismo(hechos({ vidaNueva: 'ninguna', solicitudAbierta: PENDIENTE })).estado).toBe('en_revision');
    expect(estadoCardBautismo(hechos({ edad: 10, solicitudAbierta: APROBADA })).estado).toBe('esperando_fecha');
  });
});

describe('motivoNoPuedePedir (FR-002 a FR-005)', () => {
  it.each<[string, Partial<HechosBautismo>, ReturnType<typeof motivoNoPuedePedir>]>([
    ['Vida Nueva en curso → puede', { vidaNueva: 'en_curso' }, null],
    ['Vida Nueva completada → puede', { vidaNueva: 'completada' }, null],
    ['sin Vida Nueva ni habilitación → BAUTISMO_NO_HABILITADO', { vidaNueva: 'ninguna' }, 'BAUTISMO_NO_HABILITADO'],
    ['sin Vida Nueva, habilitada → puede', { vidaNueva: 'ninguna', habilitada: true }, null],
    ['11 años con Vida Nueva → EDAD_INSUFICIENTE', { edad: EDAD_MINIMA_PEDIR_BAUTISMO_SOLO - 1 }, 'EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO'],
    ['12 años con Vida Nueva → puede', { edad: EDAD_MINIMA_PEDIR_BAUTISMO_SOLO }, null],
    ['con una abierta → YA_ABIERTA', { solicitudAbierta: PENDIENTE }, 'SOLICITUD_BAUTISMO_YA_ABIERTA'],
    ['bautizada (con todo lo demás) → PERSONA_YA_BAUTIZADA', { bautizada: true, habilitada: true }, 'PERSONA_YA_BAUTIZADA'],
  ])('%s', (_nombre, cambios, esperado) => {
    expect(motivoNoPuedePedir(hechos(cambios))).toBe(esperado);
  });

  it('precedencia: bautizada > abierta > edad > no habilitada', () => {
    const todo: Partial<HechosBautismo> = { bautizada: true, solicitudAbierta: PENDIENTE, edad: 8, vidaNueva: 'ninguna' };
    expect(motivoNoPuedePedir(hechos(todo))).toBe('PERSONA_YA_BAUTIZADA');
    expect(motivoNoPuedePedir(hechos({ ...todo, bautizada: false }))).toBe('SOLICITUD_BAUTISMO_YA_ABIERTA');
    expect(motivoNoPuedePedir(hechos({ ...todo, bautizada: false, solicitudAbierta: null }))).toBe('EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO');
    expect(motivoNoPuedePedir(hechos({ ...todo, bautizada: false, solicitudAbierta: null, edad: 30 }))).toBe('BAUTISMO_NO_HABILITADO');
  });
});

describe('puedeRetirarBautismo (FR-020)', () => {
  it('solo en revisión, esperando fecha o con fecha futura', () => {
    const si = [
      estadoCardBautismo(hechos({ solicitudAbierta: PENDIENTE })),
      estadoCardBautismo(hechos({ solicitudAbierta: APROBADA })),
      estadoCardBautismo(hechos({ solicitudAbierta: APROBADA, eventoAsignado: EVENTO })),
    ];
    expect(si.map(puedeRetirarBautismo)).toEqual([true, true, true]);
    const no = [
      estadoCardBautismo(hechos({ solicitudAbierta: APROBADA, eventoAsignado: { ...EVENTO, inicio: AHORA } })),
      estadoCardBautismo(hechos({ bautizada: true })),
      estadoCardBautismo(hechos()),
    ];
    expect(no.map(puedeRetirarBautismo)).toEqual([false, false, false]);
  });
});
