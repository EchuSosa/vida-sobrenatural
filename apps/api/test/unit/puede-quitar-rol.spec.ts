import { puedeQuitarRol } from '@vida-sobrenatural/shared-types';

/**
 * specs/005, T062 (D132): la única respuesta a "¿se le puede quitar este rol a
 * esta Persona, pedido por este autor?" — la usan RolesService.quitarRol (para
 * rechazar) y el listado de Personas (para que la pantalla no ofrezca lo que
 * va a fallar). Los tres casos que el modal ofrecía y la API rechazaba.
 */
describe('puedeQuitarRol', () => {
  // specs/004 (D137): sin discipulados activos ni propuestas pendientes.
  const libre = { discipuladosActivos: [], propuestasPendientes: [], gruposServicioActivos: [] };
  const comun = { id: 'p1', adminSembrado: false, ...libre };
  const sembrada = { id: 's1', adminSembrado: true, ...libre };
  const discipulado = { grupoId: 'g1', persona: { nombre: 'Ana', apellido: 'Pérez' } };
  const propuesta = { propuestaId: 'prop-1', persona: { nombre: 'Juan', apellido: 'Gómez' }, solicitudId: 's-1', grupoId: null };

  it('caso 1 — el admin del Admin sembrado, pedido por cualquiera (FR-002)', () => {
    expect(puedeQuitarRol('admin', sembrada, 'otro-admin')).toEqual({ puede: false, motivo: 'NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO' });
    expect(puedeQuitarRol('admin', sembrada, 's1')).toEqual({ puede: false, motivo: 'NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO' });
    // Sus otros roles de cargo, sí.
    expect(puedeQuitarRol('pastor', sembrada, 'otro-admin')).toEqual({ puede: true });
  });

  it('caso 2 — el admin propio (FR-010); otro rol de cargo propio, sí', () => {
    expect(puedeQuitarRol('admin', comun, 'p1')).toEqual({ puede: false, motivo: 'ADMIN_NO_PUEDE_AUTO_REVOCARSE' });
    expect(puedeQuitarRol('lider_curso', comun, 'p1')).toEqual({ puede: true });
    expect(puedeQuitarRol('admin', comun, 'otro-admin')).toEqual({ puede: true });
  });

  // specs/004, D137/FR-043 — cierra H-127: hasta la 004 este caso decía
  // SIEMPRE que no (fallo cerrado, porque la consulta no existía).
  describe('caso 3 — discipulador (FR-009 del 005, FR-043 de la 004)', () => {
    it('sin discipulados ni propuestas: se puede, también para la sembrada y para uno mismo', () => {
      for (const persona of [comun, sembrada]) {
        for (const autor of ['otro-admin', persona.id]) {
          expect(puedeQuitarRol('discipulador', persona, autor)).toEqual({ puede: true });
        }
      }
    });

    it('con un discipulado activo: no, y lo nombra', () => {
      expect(puedeQuitarRol('discipulador', { ...comun, discipuladosActivos: [discipulado] }, 'otro-admin')).toEqual({
        puede: false,
        motivo: 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS',
        discipulados: [discipulado],
        propuestas: [],
      });
    });

    it('con solo una propuesta pendiente: tampoco, y la nombra', () => {
      expect(puedeQuitarRol('discipulador', { ...comun, propuestasPendientes: [propuesta] }, 'otro-admin')).toEqual({
        puede: false,
        motivo: 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS',
        discipulados: [],
        propuestas: [propuesta],
      });
    });

    it('los discipulados no traban los otros roles', () => {
      const conDiscipulado = { ...comun, discipuladosActivos: [discipulado], propuestasPendientes: [propuesta] };
      expect(puedeQuitarRol('pastor', conDiscipulado, 'otro-admin')).toEqual({ puede: true });
      expect(puedeQuitarRol('admin', conDiscipulado, 'otro-admin')).toEqual({ puede: true });
    });
  });

  it('el orden es el de la API: sin autor antes que discipulados; discipulados antes que FR-010', () => {
    const conDiscipulado = { ...comun, discipuladosActivos: [discipulado] };
    expect(puedeQuitarRol('discipulador', conDiscipulado, null)).toEqual({ puede: false, motivo: 'SESION_SIN_PERSONA' });
    // Quitarse discipulador a uno mismo: FR-010 es solo de `admin`, así que lo traba FR-009.
    expect(puedeQuitarRol('discipulador', conDiscipulado, 'p1')).toMatchObject({ motivo: 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS' });
  });

  it('sin autor identificable, nada — antes que cualquier otra regla (H-140)', () => {
    for (const rol of ['admin', 'pastor', 'discipulador', 'lider_curso'] as const) {
      expect(puedeQuitarRol(rol, comun, null)).toEqual({ puede: false, motivo: 'SESION_SIN_PERSONA' });
    }
  });

  it('pastor y lider_curso de otra Persona, pedidos por un Admin identificado: sí', () => {
    expect(puedeQuitarRol('pastor', comun, 'otro-admin')).toEqual({ puede: true });
    expect(puedeQuitarRol('lider_curso', comun, 'otro-admin')).toEqual({ puede: true });
  });

  // spec 008 (D167, FR-040): quitar `lider_curso` a quien lidera ediciones de
  // Vida de Servicio en curso se bloquea, nombrándolas.
  describe('caso 4 — lider_curso con ediciones en curso (spec 008)', () => {
    const edicion = { grupoId: 'vs-1', nombre: 'Edición otoño' };
    const conEdicion = { ...comun, gruposServicioActivos: [edicion] };
    it('con una edición en curso no se puede, y la nombra', () => {
      expect(puedeQuitarRol('lider_curso', conEdicion, 'otro-admin')).toEqual({
        puede: false,
        motivo: 'LIDER_TIENE_GRUPOS_ACTIVOS',
        grupos: [edicion],
      });
    });
    it('sin ediciones en curso se puede', () => {
      expect(puedeQuitarRol('lider_curso', comun, 'otro-admin')).toEqual({ puede: true });
    });
    it('no afecta a los otros roles', () => {
      expect(puedeQuitarRol('discipulador', conEdicion, 'otro-admin')).toEqual({ puede: true });
    });
  });
});
