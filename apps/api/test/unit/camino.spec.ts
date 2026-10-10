import {
  CATALOGO_PERMISOS,
  ETAPAS_CAMINO,
  ETAPAS_CONSTRUIDAS,
  estadoDeEtapa,
  etapasEnCurso,
  puedeDeclarar,
  reglaDeEtapa,
  requisitoDeEtapa,
  tienePermiso,
  type EstadoMiDiscipulado,
  type EtapaCamino,
  type HechosCamino,
} from '@vida-sobrenatural/shared-types';
import { normalizarComentario } from '../../src/camino/camino.service.js';

/**
 * spec 006, T005 (SC-002, FR-003, FR-008): cada rama de las reglas puras de Mi
 * camino (`packages/shared-types/src/camino.ts`). Los casos base están en
 * `lote-0-global.spec.ts`; acá va el resto, en el orden de reglas de
 * data-model.md. Nada asume la lista concreta de `ETAPAS_CONSTRUIDAS`: las
 * specs 008/009/010 se suman ahí y este test tiene que seguir en verde.
 */

const VN: Record<EstadoMiDiscipulado['estado'], EstadoMiDiscipulado> = {
  puede_pedir: { estado: 'puede_pedir' },
  lo_pide_su_tutor: { estado: 'lo_pide_su_tutor' },
  buscando: { estado: 'buscando', solicitudId: 's1', franjas: [{ diaSemana: 2, inicio: 1140, fin: 1260 }], createdAt: '2026-10-01T12:00:00Z' },
  en_curso: { estado: 'en_curso', grupoId: 'g1', discipulador: { nombre: 'Ana', apellido: 'Pérez', telefono: '+542215550101' }, desde: '2026-09-01T12:00:00Z' },
  finalizado: { estado: 'finalizado', finalizadoEn: '2026-08-01T12:00:00Z' },
  baja: { estado: 'baja', en: '2026-08-01T12:00:00Z' },
};

const base: HechosCamino = { edad: 30, vidaNueva: VN.puede_pedir, completas: {}, ultimaDeclaracion: {} };

function con(cambios: Partial<HechosCamino>): HechosCamino {
  return { ...base, ...cambios };
}

function declaracion(estado: 'pendiente' | 'confirmada' | 'rechazada' | 'retirada', motivo: string | null = null) {
  return { id: `d-${estado}`, estado, fecha: '2026-10-02T15:00:00Z', motivo };
}

describe('Mi camino — estadoDeEtapa (spec 006, T005, data-model §reglas)', () => {
  it('1. completa (por sistema o por historial) gana a todo, aunque haya una declaración pendiente', () => {
    for (const etapa of ETAPAS_CAMINO) {
      for (const como of ['sistema', 'historial'] as const) {
        const hechos = con({ completas: { [etapa]: como }, ultimaDeclaracion: { [etapa]: declaracion('pendiente') } });
        expect(estadoDeEtapa(etapa, hechos)).toEqual({ etapa, estado: 'completada', como });
      }
    }
  });

  it('2. declaración pendiente → en revisión, con su id y desde cuándo (reemplaza al estado de fondo)', () => {
    for (const etapa of ETAPAS_CAMINO) {
      expect(estadoDeEtapa(etapa, con({ ultimaDeclaracion: { [etapa]: declaracion('pendiente') } }))).toEqual({
        etapa,
        estado: 'en_revision',
        declaracionId: 'd-pendiente',
        desde: '2026-10-02T15:00:00Z',
      });
    }
  });

  it('3. Vida Nueva buscando o en curso (004) → en curso; finalizado sin Inscripción completa no es "en curso"', () => {
    expect(estadoDeEtapa('vida_nueva', con({ vidaNueva: VN.buscando }))).toEqual({ etapa: 'vida_nueva', estado: 'en_curso' });
    expect(estadoDeEtapa('vida_nueva', con({ vidaNueva: VN.en_curso }))).toEqual({ etapa: 'vida_nueva', estado: 'en_curso' });
    // Las otras etapas no se ponen "en curso" por Vida Nueva.
    expect(estadoDeEtapa('bautismo', con({ vidaNueva: VN.en_curso })).estado).not.toBe('en_curso');
  });

  it('4. una etapa fuera de ETAPAS_CONSTRUIDAS se ve "Próximamente" (aunque cumpla su regla); Vida Nueva siempre está construida', () => {
    expect(ETAPAS_CONSTRUIDAS).toContain('vida_nueva');
    const todoCompleto = con({ completas: { vida_nueva: 'sistema', vida_de_servicio: 'historial' } });
    for (const etapa of ETAPAS_CAMINO.filter((e) => !ETAPAS_CONSTRUIDAS.includes(e))) {
      expect(estadoDeEtapa(etapa, base)).toEqual({ etapa, estado: 'proximamente', puedeDeclarar: true });
      if (etapa !== 'vida_de_servicio') expect(estadoDeEtapa(etapa, todoCompleto).estado).toBe('proximamente');
    }
  });

  it('5. construida y sin cumplir la regla → bloqueada, diciendo qué le falta; 6. si la cumple → disponible', () => {
    for (const etapa of ETAPAS_CONSTRUIDAS.filter((e) => e !== 'vida_nueva')) {
      expect(estadoDeEtapa(etapa, base)).toMatchObject({ etapa, estado: 'bloqueada', requisito: requisitoDeEtapa(etapa) });
    }
    for (const vida of [VN.puede_pedir, VN.baja, VN.lo_pide_su_tutor]) {
      expect(estadoDeEtapa('vida_nueva', con({ vidaNueva: vida })).estado).toBe('disponible');
    }
  });

  it('Ajustes 2: la etapa informa su pedido propio en revisión → el encabezado dice "En revisión" (no "La podés empezar"); completa o declarada siguen ganando', () => {
    const enRevision = { estado: 'solicitud_en_revision', desde: '2026-10-05T12:00:00Z' } as const;
    const ministerioHabilitado = con({ completas: { vida_nueva: 'sistema', vida_de_servicio: 'sistema' }, propios: { ministerio: enRevision } });
    expect(estadoDeEtapa('ministerio', ministerioHabilitado)).toEqual({
      etapa: 'ministerio',
      estado: 'solicitud_en_revision',
      desde: '2026-10-05T12:00:00Z',
      // D235 (DEMO-12): con el pedido propio en revisión no se ofrece "Ya lo hice".
      puedeDeclarar: false,
    });
    for (const etapa of ['vida_de_servicio', 'ministerio', 'bautismo'] as const) {
      expect(puedeDeclarar(etapa, con({ propios: { [etapa]: enRevision } }))).toBe(false);
    }
    // Sin pedido propio, la misma etapa está disponible.
    expect(estadoDeEtapa('ministerio', { ...ministerioHabilitado, propios: {} }).estado).toBe('disponible');
    // Un estado propio de OTRA etapa no la toca.
    expect(estadoDeEtapa('vida_nueva', con({ propios: { ministerio: enRevision } })).estado).toBe('disponible');
    // Precedencia: completa y "Ya lo hice" pendiente ganan.
    expect(estadoDeEtapa('ministerio', con({ completas: { ministerio: 'sistema' }, propios: { ministerio: enRevision } })).estado).toBe('completada');
    expect(estadoDeEtapa('ministerio', con({ ultimaDeclaracion: { ministerio: declaracion('pendiente') }, propios: { ministerio: enRevision } })).estado).toBe(
      'en_revision',
    );
  });

  it('Encabezados (final): Vida de Servicio y Bautismo también informan su estado propio, y el encabezado no contradice lo de abajo', () => {
    const conVn = { completas: { vida_nueva: 'sistema' as const } };
    // Vida de Servicio: pedido pendiente → "En revisión"; inscripta en una edición → en curso, sin "Ya lo hice".
    expect(estadoDeEtapa('vida_de_servicio', con({ ...conVn, propios: { vida_de_servicio: { estado: 'solicitud_en_revision', desde: '2026-10-05T12:00:00Z' } } }))).toMatchObject({
      estado: 'solicitud_en_revision',
      desde: '2026-10-05T12:00:00Z',
    });
    const vsEnCurso = con({ ...conVn, propios: { vida_de_servicio: { estado: 'en_curso' } } });
    expect(estadoDeEtapa('vida_de_servicio', vsEnCurso)).toEqual({ etapa: 'vida_de_servicio', estado: 'en_curso' });
    expect(puedeDeclarar('vida_de_servicio', vsEnCurso)).toBe(false);

    // Bautismo: pedido en revisión → "En revisión".
    expect(estadoDeEtapa('bautismo', con({ ...conVn, propios: { bautismo: { estado: 'solicitud_en_revision', desde: '2026-10-05T12:00:00Z' } } })).estado).toBe('solicitud_en_revision');
    // Aceptado, sin fecha o con fecha: lo refleja, y no ofrece "Ya lo hice".
    for (const [fecha, yaPaso] of [[null, false], ['2026-11-15T13:00:00Z', false], ['2026-10-01T13:00:00Z', true]] as const) {
      const aceptado = con({ ...conVn, propios: { bautismo: { estado: 'aceptada', fecha, yaPaso } } });
      expect(estadoDeEtapa('bautismo', aceptado)).toEqual({ etapa: 'bautismo', estado: 'solicitud_aceptada', fecha, yaPaso });
      expect(puedeDeclarar('bautismo', aceptado)).toBe(false);
    }
    // Habilitada por el Admin sin Vida Nueva: la puede pedir (no "Todavía no se habilita").
    expect(estadoDeEtapa('bautismo', con({ propios: { bautismo: { estado: 'habilitada' } } }))).toMatchObject({ estado: 'disponible', puedeDeclarar: true });
    expect(estadoDeEtapa('bautismo', base).estado).toBe('bloqueada');
    // Completa o "Ya lo hice" pendiente siguen ganando.
    expect(estadoDeEtapa('bautismo', con({ completas: { bautismo: 'sistema' }, propios: { bautismo: { estado: 'aceptada', fecha: null, yaPaso: false } } })).estado).toBe('completada');
    expect(estadoDeEtapa('vida_de_servicio', con({ ultimaDeclaracion: { vida_de_servicio: declaracion('pendiente') }, propios: { vida_de_servicio: { estado: 'en_curso' } } })).estado).toBe('en_revision');
  });

  it('menor de 12: Vida Nueva disponible pero sin "Ya lo hice" (la card muestra el texto del tutor, FR-044)', () => {
    expect(estadoDeEtapa('vida_nueva', con({ edad: 10, vidaNueva: VN.lo_pide_su_tutor }))).toEqual({
      etapa: 'vida_nueva',
      estado: 'disponible',
      puedeDeclarar: false,
    });
  });

  it('declaración no confirmada: acompaña al estado de fondo SOLO si la última está rechazada, con el motivo', () => {
    for (const etapa of ETAPAS_CAMINO) {
      const rechazada = estadoDeEtapa(etapa, con({ ultimaDeclaracion: { [etapa]: declaracion('rechazada', 'Traenos el certificado') } }));
      expect(rechazada).toMatchObject({
        puedeDeclarar: true,
        declaracion: { estado: 'no_confirmada', motivo: 'Traenos el certificado', en: '2026-10-02T15:00:00Z' },
      });
      // Rechazada y después retirada (o vuelta a declarar y confirmada): sin mensaje.
      for (const despues of ['retirada', 'confirmada'] as const) {
        expect(estadoDeEtapa(etapa, con({ ultimaDeclaracion: { [etapa]: declaracion(despues) } }))).not.toHaveProperty('declaracion');
      }
    }
    expect(estadoDeEtapa('bautismo', con({ ultimaDeclaracion: { bautismo: declaracion('rechazada') } }))).toMatchObject({
      declaracion: { estado: 'no_confirmada', motivo: null },
    });
  });
});

describe('Mi camino — reglaDeEtapa y etapasEnCurso (FR-003, D147)', () => {
  it('Vida Nueva siempre; VS con VN completa por cualquier camino; Ministerio con VS completa', () => {
    expect(reglaDeEtapa('vida_nueva', {}, [])).toBe(true);
    expect(reglaDeEtapa('vida_de_servicio', { vida_nueva: 'historial' }, [])).toBe(true);
    expect(reglaDeEtapa('vida_de_servicio', {}, ['vida_nueva'])).toBe(false);
    expect(reglaDeEtapa('ministerio', { vida_de_servicio: 'sistema' }, [])).toBe(true);
    expect(reglaDeEtapa('ministerio', { vida_nueva: 'sistema', bautismo: 'sistema' }, [])).toBe(false);
  });

  it('Bautismo: VN en curso o completa por sistema o historial', () => {
    expect(reglaDeEtapa('bautismo', { vida_nueva: 'sistema' }, [])).toBe(true);
    expect(reglaDeEtapa('bautismo', { vida_nueva: 'historial' }, [])).toBe(true);
    expect(reglaDeEtapa('bautismo', {}, ['vida_nueva'])).toBe(true);
    expect(reglaDeEtapa('bautismo', {}, [])).toBe(false);
  });

  it('"en curso" para D147 es solo un discipulado en marcha (`en_curso`), no un pedido `buscando`', () => {
    expect(etapasEnCurso({ vidaNueva: VN.en_curso })).toEqual(['vida_nueva']);
    for (const estado of ['buscando', 'puede_pedir', 'finalizado', 'baja', 'lo_pide_su_tutor'] as const) {
      expect(etapasEnCurso({ vidaNueva: VN[estado] })).toEqual([]);
    }
  });

  it('cada etapa dice su requisito para mostrarlo en pantalla', () => {
    expect(requisitoDeEtapa('vida_nueva')).toEqual({ tipo: 'ninguno' });
    expect(requisitoDeEtapa('vida_de_servicio')).toEqual({ tipo: 'etapa_completa', etapa: 'vida_nueva' });
    expect(requisitoDeEtapa('ministerio')).toEqual({ tipo: 'etapa_completa', etapa: 'vida_de_servicio' });
    expect(requisitoDeEtapa('bautismo')).toEqual({ tipo: 'etapa_en_curso_o_completa', etapa: 'vida_nueva' });
  });
});

describe('Mi camino — puedeDeclarar (FR-008)', () => {
  it('edad: 12 sí, 11 no, para todas las etapas', () => {
    for (const etapa of ETAPAS_CAMINO) {
      expect(puedeDeclarar(etapa, con({ edad: 12 }))).toBe(true);
      expect(puedeDeclarar(etapa, con({ edad: 11 }))).toBe(false);
    }
  });

  it('completa o con una pendiente no; rechazada o retirada sí (se puede volver a contar)', () => {
    for (const etapa of ETAPAS_CAMINO) {
      expect(puedeDeclarar(etapa, con({ completas: { [etapa]: 'historial' } }))).toBe(false);
      expect(puedeDeclarar(etapa, con({ ultimaDeclaracion: { [etapa]: declaracion('pendiente') } }))).toBe(false);
      expect(puedeDeclarar(etapa, con({ ultimaDeclaracion: { [etapa]: declaracion('rechazada') } }))).toBe(true);
      expect(puedeDeclarar(etapa, con({ ultimaDeclaracion: { [etapa]: declaracion('retirada') } }))).toBe(true);
    }
  });

  it('Vida Nueva: solo sin pedido ni Grupo (puede_pedir) o después de una baja', () => {
    const esperado: Record<EstadoMiDiscipulado['estado'], boolean> = {
      puede_pedir: true,
      baja: true,
      buscando: false,
      en_curso: false,
      finalizado: false,
      lo_pide_su_tutor: false,
    };
    for (const [estado, puede] of Object.entries(esperado) as [EstadoMiDiscipulado['estado'], boolean][]) {
      expect({ estado, puede: puedeDeclarar('vida_nueva', con({ vidaNueva: VN[estado] })) }).toEqual({ estado, puede });
    }
  });

  it('D235: con Vida Nueva pedida o en curso, Vida de Servicio y Ministerio no ofrecen "Ya lo hice"; Bautismo sí', () => {
    for (const estado of ['buscando', 'en_curso'] as const) {
      expect(puedeDeclarar('vida_de_servicio', con({ vidaNueva: VN[estado] }))).toBe(false);
      expect(puedeDeclarar('ministerio', con({ vidaNueva: VN[estado] }))).toBe(false);
      expect(puedeDeclarar('bautismo', con({ vidaNueva: VN[estado] }))).toBe(true);
    }
  });

  it('sin Vida Nueva en marcha, las otras etapas se pueden contar aunque estén bloqueadas o próximamente', () => {
    for (const estado of ['puede_pedir', 'baja', 'finalizado'] as const) {
      for (const etapa of ETAPAS_CAMINO.filter((e): e is Exclude<EtapaCamino, 'vida_nueva'> => e !== 'vida_nueva')) {
        expect(puedeDeclarar(etapa, con({ vidaNueva: VN[estado] }))).toBe(true);
      }
    }
  });
});

describe('Mi camino — comentario de "Ya lo hice" (FR-009)', () => {
  it('opcional: vacío o espacios = sin comentario; hasta 500 con tildes; 501 es error de campo', () => {
    expect(normalizarComentario(undefined)).toBeNull();
    expect(normalizarComentario('   ')).toBeNull();
    expect(normalizarComentario('  Lo hice en 2019  ')).toBe('Lo hice en 2019');
    expect(normalizarComentario('á'.repeat(500))).toHaveLength(500);
    try {
      normalizarComentario('a'.repeat(501));
      throw new Error('tenía que fallar');
    } catch (error) {
      expect(error).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'comentario', code: 'COMENTARIO_DEMASIADO_LARGO' }] });
    }
  });
});

describe('Permisos de la 006 (FR-028, T008)', () => {
  it('la matriz de FR-028', () => {
    const soloAdmin = ['personas.alta', 'personas.editar_email', 'historial.resolver', 'completitud_manual.gestionar'] as const;
    for (const permiso of soloAdmin) expect({ permiso, roles: CATALOGO_PERMISOS[permiso] }).toEqual({ permiso, roles: ['admin'] });

    expect(CATALOGO_PERMISOS['solicitudes.ver']).toEqual(expect.arrayContaining(['admin', 'pastor']));
    expect(CATALOGO_PERMISOS['solicitudes.crear_en_nombre']).toEqual(expect.arrayContaining(['admin', 'discipulador']));
    expect(CATALOGO_PERMISOS['personas.buscar']).toEqual(expect.arrayContaining(['admin', 'discipulador']));
    for (const permiso of ['mis_discipulados.ver', 'mis_discipulados.gestionar', 'mi_disponibilidad.ver', 'mi_disponibilidad.gestionar'] as const) {
      expect(tienePermiso(['miembro_registrado', 'discipulador'], permiso)).toBe(true);
      expect(tienePermiso(['miembro_registrado'], permiso)).toBe(false);
    }
    // FR-029: el Discipulador nunca da de alta; el Pastor tampoco resuelve historial.
    const discipulador = ['miembro_registrado', 'discipulador'];
    expect(tienePermiso(discipulador, 'personas.alta')).toBe(false);
    expect(tienePermiso(discipulador, 'historial.resolver')).toBe(false);
    expect(tienePermiso(['miembro_registrado', 'pastor'], 'completitud_manual.gestionar')).toBe(false);
    expect(tienePermiso(['miembro_registrado', 'pastor'], 'solicitudes.ver')).toBe(true);
  });
});
