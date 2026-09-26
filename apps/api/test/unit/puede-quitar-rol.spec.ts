import { puedeQuitarRol } from '@vida-sobrenatural/shared-types';

/**
 * specs/005, T062 (D132): la única respuesta a "¿se le puede quitar este rol a
 * esta Persona, pedido por este autor?" — la usan RolesService.quitarRol (para
 * rechazar) y el listado de Personas (para que la pantalla no ofrezca lo que
 * va a fallar). Los tres casos que el modal ofrecía y la API rechazaba.
 */
describe('puedeQuitarRol', () => {
  const comun = { id: 'p1', adminSembrado: false };
  const sembrada = { id: 's1', adminSembrado: true };

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

  it('caso 3 — discipulador, para cualquiera, siempre, por ahora (FR-009/H-127, fallo cerrado hasta el spec 004)', () => {
    for (const persona of [comun, sembrada]) {
      for (const autor of ['otro-admin', persona.id]) {
        expect(puedeQuitarRol('discipulador', persona, autor)).toEqual({
          puede: false,
          motivo: 'DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS',
        });
      }
    }
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
});
