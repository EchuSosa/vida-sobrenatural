import {
  CATALOGO_PERMISOS,
  POSTULACION_TEXTO_MAX,
  confirmaNombre,
  esAptaParaMinisterio,
  normalizarNombre,
} from '@vida-sobrenatural/shared-types';
import {
  validarNuevaPostulacion,
  type ContextoNuevaPostulacion,
} from '../../src/ministerio/reglas-postulacion.js';
import {
  erroresCelula,
  erroresMinisterio,
} from '../../src/ministerio/validar-catalogo.js';

/**
 * spec 009, T007 y T010: las reglas puras de crear una Postulación
 * (data-model.md "Reglas al crear": el primer fallo gana) y los compartidos
 * de la spec. Cada regla falla sola, y la precedencia está probada.
 */
const M = 'ministerio-1';
const valido: ContextoNuevaPostulacion = {
  persona: { activa: true, roles: ['miembro_registrado', 'apto_ministerio'] },
  ministerio: { id: M, activo: true },
  motivacion: null,
  disponibilidad: null,
  ministerioAprobadoId: null,
  tienePendiente: false,
};

describe('validarNuevaPostulacion (FR-001 a FR-007)', () => {
  it('sin problemas → null, con o sin Célula', () => {
    expect(validarNuevaPostulacion(valido)).toBeNull();
    expect(
      validarNuevaPostulacion({
        ...valido,
        celula: { ministerioId: M, activo: true },
      }),
    ).toBeNull();
  });

  it('1. no apta (sin el rol, o Persona no activa) → NO_APTA_PARA_MINISTERIO (FR-002)', () => {
    expect(
      validarNuevaPostulacion({
        ...valido,
        persona: { activa: true, roles: ['miembro_registrado', 'admin'] },
      }),
    ).toEqual({ code: 'NO_APTA_PARA_MINISTERIO' });
    expect(
      validarNuevaPostulacion({
        ...valido,
        persona: { activa: false, roles: ['apto_ministerio'] },
      }),
    ).toEqual({ code: 'NO_APTA_PARA_MINISTERIO' });
  });

  it('2. Ministerio inexistente o eliminado → NO_ENCONTRADO; inactivo → MINISTERIO_NO_DISPONIBLE', () => {
    expect(validarNuevaPostulacion({ ...valido, ministerio: null })).toEqual({
      code: 'NO_ENCONTRADO',
    });
    expect(
      validarNuevaPostulacion({
        ...valido,
        ministerio: { id: M, activo: false },
      }),
    ).toEqual({ code: 'MINISTERIO_NO_DISPONIBLE' });
  });

  it('3. Célula de otro Ministerio, inactiva o inexistente → VALIDACION en celulaId (FR-007)', () => {
    const fallo = {
      code: 'VALIDACION',
      errors: [{ campo: 'celulaId', code: 'CELULA_NO_DISPONIBLE' }],
    };
    expect(
      validarNuevaPostulacion({
        ...valido,
        celula: { ministerioId: 'otro', activo: true },
      }),
    ).toEqual(fallo);
    expect(
      validarNuevaPostulacion({
        ...valido,
        celula: { ministerioId: M, activo: false },
      }),
    ).toEqual(fallo);
    expect(validarNuevaPostulacion({ ...valido, celula: null })).toEqual(fallo);
  });

  it('4. textos de 501 → TEXTO_DEMASIADO_LARGO en su campo; 500 pasa; los errores de campo salen juntos (H-50)', () => {
    const largo = 'a'.repeat(POSTULACION_TEXTO_MAX + 1);
    expect(
      validarNuevaPostulacion({
        ...valido,
        motivacion: 'a'.repeat(POSTULACION_TEXTO_MAX),
      }),
    ).toBeNull();
    expect(
      validarNuevaPostulacion({
        ...valido,
        motivacion: largo,
        disponibilidad: largo,
        celula: null,
      }),
    ).toEqual({
      code: 'VALIDACION',
      errors: [
        { campo: 'celulaId', code: 'CELULA_NO_DISPONIBLE' },
        { campo: 'motivacion', code: 'TEXTO_DEMASIADO_LARGO' },
        { campo: 'disponibilidad', code: 'TEXTO_DEMASIADO_LARGO' },
      ],
    });
  });

  it('5. ya es miembro de ESE Ministerio → YA_ES_MIEMBRO_DEL_MINISTERIO; miembro de otro puede postularse (FR-004)', () => {
    expect(
      validarNuevaPostulacion({ ...valido, ministerioAprobadoId: M }),
    ).toEqual({ code: 'YA_ES_MIEMBRO_DEL_MINISTERIO' });
    expect(
      validarNuevaPostulacion({ ...valido, ministerioAprobadoId: 'otro' }),
    ).toBeNull();
  });

  it('6. con una pendiente → POSTULACION_YA_PENDIENTE (FR-003)', () => {
    expect(
      validarNuevaPostulacion({ ...valido, tienePendiente: true }),
    ).toEqual({ code: 'POSTULACION_YA_PENDIENTE' });
  });

  it('precedencia: no apta gana a todo; Ministerio antes que campos; campos antes que membresía y pendiente', () => {
    const todoMal: ContextoNuevaPostulacion = {
      persona: { activa: true, roles: [] },
      ministerio: { id: M, activo: false },
      celula: null,
      motivacion: 'a'.repeat(600),
      disponibilidad: null,
      ministerioAprobadoId: M,
      tienePendiente: true,
    };
    expect(validarNuevaPostulacion(todoMal)?.code).toBe(
      'NO_APTA_PARA_MINISTERIO',
    );
    const apta = { ...todoMal, persona: valido.persona };
    expect(validarNuevaPostulacion(apta)?.code).toBe(
      'MINISTERIO_NO_DISPONIBLE',
    );
    expect(
      validarNuevaPostulacion({ ...apta, ministerio: { id: M, activo: true } })
        ?.code,
    ).toBe('VALIDACION');
    expect(
      validarNuevaPostulacion({
        ...apta,
        ministerio: { id: M, activo: true },
        celula: undefined,
        motivacion: null,
      })?.code,
    ).toBe('YA_ES_MIEMBRO_DEL_MINISTERIO');
  });
});

describe('compartidos de la spec 009 (T007)', () => {
  it('esAptaParaMinisterio lee solo el rol de estado de la 008 (un rol de cargo no alcanza)', () => {
    expect(esAptaParaMinisterio(['apto_ministerio'])).toBe(true);
    expect(
      esAptaParaMinisterio([
        'admin',
        'pastor',
        'discipulador',
        'miembro_ministerio',
      ]),
    ).toBe(false);
  });

  it('normalizarNombre: "Vida en Acción" ≡ " vida en accion " (FR-026)', () => {
    expect(normalizarNombre('Vida en Acción')).toBe(
      normalizarNombre(' vida  en accion '),
    );
  });

  it('confirmaNombre: el nombre exacto, sin espacios a los costados (D38)', () => {
    expect(confirmaNombre(' Bienvenida ', 'Bienvenida')).toBe(true);
    expect(confirmaNombre('bienvenida', 'Bienvenida')).toBe(false);
    expect(confirmaNombre(undefined, 'Bienvenida')).toBe(false);
  });

  it('permisos: gestionar y papelera solo Admin; ver también el Pastor (FR-023)', () => {
    expect(CATALOGO_PERMISOS['ministerios.gestionar']).toEqual(['admin']);
    expect(CATALOGO_PERMISOS['ministerios.papelera.ver']).toEqual(['admin']);
    expect(CATALOGO_PERMISOS['postulaciones.crear_en_nombre']).toEqual([
      'admin',
    ]);
    expect(CATALOGO_PERMISOS['ministerios.ver']).toEqual(
      expect.arrayContaining(['admin', 'pastor']),
    );
  });
});

describe('campos del catálogo (FR-026, FR-027, docs/22)', () => {
  it('Ministerio: nombre y descripción obligatorios y con largo; línea pública opcional ≤ 140', () => {
    expect(erroresMinisterio({ nombre: ' ', descripcion: '' }, false)).toEqual([
      { campo: 'nombre', code: 'NOMBRE_REQUERIDO' },
      { campo: 'descripcion', code: 'DESCRIPCION_REQUERIDA' },
    ]);
    expect(
      erroresMinisterio(
        {
          nombre: 'a'.repeat(81),
          descripcion: 'b'.repeat(601),
          lineaPublica: 'c'.repeat(141),
        },
        false,
      ),
    ).toEqual([
      { campo: 'nombre', code: 'NOMBRE_DEMASIADO_LARGO' },
      { campo: 'descripcion', code: 'DESCRIPCION_DEMASIADO_LARGA' },
      { campo: 'lineaPublica', code: 'LINEA_PUBLICA_DEMASIADO_LARGA' },
    ]);
    expect(
      erroresMinisterio(
        { nombre: 'Ñandú Ministerio', descripcion: 'ok', lineaPublica: null },
        false,
      ),
    ).toEqual([]);
    expect(erroresMinisterio({}, true)).toEqual([]);
  });

  it('Célula: nombre obligatorio ≤ 80; descripción opcional ≤ 400', () => {
    expect(erroresCelula({}, false)).toEqual([
      { campo: 'nombre', code: 'NOMBRE_REQUERIDO' },
    ]);
    expect(
      erroresCelula(
        { nombre: 'a'.repeat(81), descripcion: 'b'.repeat(401) },
        false,
      ),
    ).toEqual([
      { campo: 'nombre', code: 'NOMBRE_DEMASIADO_LARGO' },
      { campo: 'descripcion', code: 'DESCRIPCION_DEMASIADO_LARGA' },
    ]);
    expect(erroresCelula({ descripcion: null }, true)).toEqual([]);
  });
});
