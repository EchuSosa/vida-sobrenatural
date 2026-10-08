import { erroresDeFranjas } from '../../src/solicitud-discipulado/reglas-solicitud.js';
import { ADULTA, MARTES_19_A_21, crearServicio, errorDe, haceAnios, solicitud } from './solicitud-discipulado-de-test.js';

/** specs/004, T015 — las reglas de creación de una Solicitud (FR-001, FR-002, FR-008, FR-032, FR-042, FR-044). */
describe('SolicitudDiscipuladoService — pedir Vida Nueva (T015)', () => {
  describe('franjas (FR-032)', () => {
    it('sin franjas → FRANJAS_REQUERIDAS en el campo, y no crea nada', async () => {
      const { service, base } = await crearServicio({ personas: [{ id: 'ana' }] });

      const error = await errorDe(service.crearPropia('ana', []));

      expect(error.code).toBe('VALIDACION');
      expect(error.errors).toEqual([{ campo: 'franjas', code: 'FRANJAS_REQUERIDAS' }]);
      expect(base.solicitudes).toHaveLength(0);
    });

    it('cada franja con día 0..6 y fin posterior al inicio (FR-017)', () => {
      expect(erroresDeFranjas(undefined)).toEqual([{ campo: 'franjas', code: 'FRANJAS_REQUERIDAS' }]);
      expect(erroresDeFranjas([{ diaSemana: 7, inicio: 0, fin: 60 }])).toEqual([{ campo: 'franjas', code: 'DIA_SEMANA_INVALIDO' }]);
      expect(erroresDeFranjas([{ diaSemana: 2, inicio: 600, fin: 600 }])).toEqual([{ campo: 'franjas', code: 'FRANJA_FIN_ANTERIOR_AL_INICIO' }]);
      expect(erroresDeFranjas([{ diaSemana: 2, inicio: 600, fin: 1441 }])).toEqual([{ campo: 'franjas', code: 'FRANJAS_INVALIDO' }]);
      expect(erroresDeFranjas([MARTES_19_A_21, { diaSemana: 6, inicio: 0, fin: 1440 }])).toEqual([]);
    });

    it('ninguna de menos de 60 minutos, repetida o superpuesta con otra de la lista (FR-017a)', () => {
      expect(erroresDeFranjas([{ diaSemana: 2, inicio: 1350, fin: 1351 }])).toEqual([{ campo: 'franjas', code: 'FRANJA_MUY_CORTA' }]);
      expect(erroresDeFranjas([MARTES_19_A_21, { ...MARTES_19_A_21 }])).toEqual([{ campo: 'franjas', code: 'FRANJA_REPETIDA' }]);
      expect(erroresDeFranjas([MARTES_19_A_21, { diaSemana: 2, inicio: 1200, fin: 1320 }])).toEqual([{ campo: 'franjas', code: 'FRANJA_SUPERPUESTA' }]);
      expect(erroresDeFranjas([MARTES_19_A_21, { diaSemana: 2, inicio: 1260, fin: 1320 }])).toEqual([]);
    });

    it('con una franja crea la Solicitud pendiente con esa franja', async () => {
      const { service, base } = await crearServicio({ personas: [{ id: 'ana' }] });

      const creada = await service.crearPropia('ana', [MARTES_19_A_21]);

      expect(creada.estado).toBe('pendiente');
      expect(base.solicitudes).toEqual([expect.objectContaining({ id: creada.id, personaId: 'ana', estado: 'pendiente', creadoPorId: null })]);
      expect(base.franjas).toEqual([{ ...MARTES_19_A_21, solicitudId: creada.id }]);
    });
  });

  describe('edad (FR-044)', () => {
    it('menor de 12 pidiendo sola → EDAD_INSUFICIENTE_PARA_PEDIR_SOLO', async () => {
      const { service, base } = await crearServicio({ personas: [{ id: 'nina', fechaNacimiento: haceAnios(11) }] });

      expect((await errorDe(service.crearPropia('nina', [MARTES_19_A_21]))).code).toBe('EDAD_INSUFICIENTE_PARA_PEDIR_SOLO');
      expect(base.solicitudes).toHaveLength(0);
    });

    it('con 12 cumplidos pide sola como un adulto', async () => {
      const { service } = await crearServicio({ personas: [{ id: 'nina', fechaNacimiento: haceAnios(12) }] });

      await expect(service.crearPropia('nina', [MARTES_19_A_21])).resolves.toMatchObject({ estado: 'pendiente' });
    });

    it('menor de 12 en su nombre (Admin o Discipulador) → se crea', async () => {
      const { service } = await crearServicio({ personas: [{ id: 'nina', fechaNacimiento: haceAnios(8) }, { id: 'admin' }] });

      await expect(service.crearEnNombreDe('nina', [MARTES_19_A_21], 'admin')).resolves.toMatchObject({ estado: 'pendiente' });
    });
  });

  describe('historial previo (spec 006, FR-017)', () => {
    it('con un "Ya lo hice" de Vida Nueva en revisión → HISTORIAL_VIDA_NUEVA_EN_REVISION, propio o en nombre de', async () => {
      const { service, base } = await crearServicio({
        personas: [{ id: 'ana' }, { id: 'admin' }],
        declaraciones: [{ id: 'd1', personaId: 'ana', etapa: 'vida_nueva', estado: 'pendiente' }],
      });
      expect((await errorDe(service.crearPropia('ana', [MARTES_19_A_21]))).code).toBe('HISTORIAL_VIDA_NUEVA_EN_REVISION');
      expect((await errorDe(service.crearEnNombreDe('ana', [MARTES_19_A_21], 'admin'))).code).toBe('HISTORIAL_VIDA_NUEVA_EN_REVISION');
      expect(base.solicitudes).toHaveLength(0);
    });

    it('con Vida Nueva registrada por la iglesia → VIDA_NUEVA_COMPLETADA_POR_HISTORIAL; anulada, deja pedir', async () => {
      const { service } = await crearServicio({
        personas: [{ id: 'ana' }, { id: 'beto' }],
        completitudes: [
          { id: 'c1', personaId: 'ana', etapa: 'vida_nueva', anuladaEn: null },
          { id: 'c2', personaId: 'beto', etapa: 'vida_nueva', anuladaEn: new Date() },
        ],
      });
      expect((await errorDe(service.crearPropia('ana', [MARTES_19_A_21]))).code).toBe('VIDA_NUEVA_COMPLETADA_POR_HISTORIAL');
      await expect(service.crearPropia('beto', [MARTES_19_A_21])).resolves.toMatchObject({ estado: 'pendiente' });
    });

    it('un "Ya lo hice" de otra etapa o ya resuelto no traba el pedido', async () => {
      const { service } = await crearServicio({
        personas: [{ id: 'ana' }],
        declaraciones: [
          { id: 'd1', personaId: 'ana', etapa: 'bautismo', estado: 'pendiente' },
          { id: 'd2', personaId: 'ana', etapa: 'vida_nueva', estado: 'rechazada' },
        ],
      });
      await expect(service.crearPropia('ana', [MARTES_19_A_21])).resolves.toMatchObject({ estado: 'pendiente' });
    });
  });

  describe('sin duplicados (FR-001, FR-008, FR-042)', () => {
    it.each(['pendiente', 'propuesta'] as const)('con una Solicitud %s abierta → SOLICITUD_DISCIPULADO_YA_PENDIENTE', async (estado) => {
      const { service, base } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [solicitud('ana', estado)] });

      expect((await errorDe(service.crearPropia('ana', [MARTES_19_A_21]))).code).toBe('SOLICITUD_DISCIPULADO_YA_PENDIENTE');
      expect(base.solicitudes).toHaveLength(1);
    });

    it.each(['activa', 'completada'] as const)('con una Inscripción %s en Vida Nueva → VIDA_NUEVA_EN_CURSO_O_COMPLETADA', async (estado) => {
      const { service } = await crearServicio({
        personas: [{ id: 'ana' }],
        inscripciones: [{ personaId: 'ana', grupoId: 'g1', solicitudId: 'vieja', estado, createdAt: new Date(), cerradaEn: null }],
      });

      expect((await errorDe(service.crearPropia('ana', [MARTES_19_A_21]))).code).toBe('VIDA_NUEVA_EN_CURSO_O_COMPLETADA');
    });

    it('con una Inscripción en abandono → se crea (FR-042)', async () => {
      const { service } = await crearServicio({
        personas: [{ id: 'ana' }],
        solicitudes: [solicitud('ana', 'aprobada')],
        inscripciones: [{ personaId: 'ana', grupoId: 'g1', solicitudId: 'vieja', estado: 'abandono', createdAt: new Date(), cerradaEn: new Date() }],
      });

      await expect(service.crearPropia('ana', [MARTES_19_A_21])).resolves.toMatchObject({ estado: 'pendiente' });
    });

    it.each(['rechazada', 'retirada'] as const)('con la anterior %s → se crea (FR-008, FR-039)', async (estado) => {
      const { service, base } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [solicitud('ana', estado)] });

      await service.crearPropia('ana', [MARTES_19_A_21]);

      expect(base.solicitudes.map((s) => s.estado)).toEqual([estado, 'pendiente']);
    });
  });

  describe('en nombre de otra Persona (FR-002)', () => {
    it('deja creadoPorId = el autor', async () => {
      const { service, base } = await crearServicio({ personas: [{ id: 'ana' }, { id: 'admin', fechaNacimiento: ADULTA }] });

      await service.crearEnNombreDe('ana', [MARTES_19_A_21], 'admin');

      expect(base.solicitudes[0]).toMatchObject({ personaId: 'ana', creadoPorId: 'admin' });
    });

    it('una Persona inexistente o inactiva → NO_ENCONTRADO', async () => {
      const { service } = await crearServicio({ personas: [{ id: 'baja', activo: false }] });

      expect((await errorDe(service.crearEnNombreDe('nadie', [MARTES_19_A_21], 'admin'))).code).toBe('NO_ENCONTRADO');
      expect((await errorDe(service.crearEnNombreDe('baja', [MARTES_19_A_21], 'admin'))).code).toBe('NO_ENCONTRADO');
    });

    it('las mismas reglas de duplicado que el pedido propio', async () => {
      const { service } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [solicitud('ana', 'pendiente')] });

      expect((await errorDe(service.crearEnNombreDe('ana', [MARTES_19_A_21], 'admin'))).code).toBe('SOLICITUD_DISCIPULADO_YA_PENDIENTE');
    });
  });
});
