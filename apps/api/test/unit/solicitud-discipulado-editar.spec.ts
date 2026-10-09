import { MARTES_19_A_21, crearServicio, errorDe, propuesta, solicitud } from './solicitud-discipulado-de-test.js';

const SABADO_10_A_13 = { diaSemana: 6, inicio: 600, fin: 780 };

/**
 * specs/004, T016a — FR-039: la Persona edita sus franjas o retira su pedido
 * mientras nadie aceptó. Transiciones de data-model.md → SolicitudDiscipulado:
 *   propuesta ──editar franjas (Persona)──▶ pendiente (Propuesta → retirada, por persona)
 *   pendiente | propuesta ──retirar (Persona)──▶ retirada
 */
describe('SolicitudDiscipuladoService — editar y retirar el pedido propio (T016a)', () => {
  describe('editarFranjas', () => {
    it('pendiente: reemplaza las franjas y sigue pendiente, sin evento', async () => {
      const s = solicitud('ana', 'pendiente');
      const { service, base, emitir } = await crearServicio({
        personas: [{ id: 'ana' }],
        solicitudes: [s],
        franjas: [{ ...MARTES_19_A_21, solicitudId: s.id }],
      });

      const estado = await service.editarFranjas('ana', [SABADO_10_A_13]);

      expect(base.franjas).toEqual([{ ...SABADO_10_A_13, solicitudId: s.id }]);
      expect(s.estado).toBe('pendiente');
      expect(estado).toMatchObject({ estado: 'buscando', franjas: [SABADO_10_A_13] });
      expect(emitir).not.toHaveBeenCalled();
    });

    it('propuesta: retira la Propuesta pendiente (por persona), vuelve a pendiente y avisa al Admin', async () => {
      const s = solicitud('ana', 'propuesta');
      const p = propuesta(s.id, 'disc-1');
      const { service, emitir } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [s], propuestas: [p] });

      await service.editarFranjas('ana', [SABADO_10_A_13]);

      expect(p).toMatchObject({ estado: 'retirada', retiradaPor: 'persona' });
      expect(p.respondidaEn).toBeInstanceOf(Date);
      expect(s.estado).toBe('pendiente');
      expect(emitir).toHaveBeenCalledWith(expect.anything(), { nombre: 'discipulado.propuesta_retirada', a: { tipo: 'admin' }, datos: { propuestaId: p.id, retiradaPor: 'persona' } });
      expect(emitir).toHaveBeenCalledWith(expect.anything(), {
        nombre: 'discipulado.propuesta_nueva_retirada',
        a: { tipo: 'discipulador', personaId: 'disc-1' },
        datos: { propuestaId: p.id, solicitudId: s.id },
      });
    });

    it('sin franjas → error de campo y no toca nada', async () => {
      const s = solicitud('ana', 'propuesta');
      const p = propuesta(s.id, 'disc-1');
      const { service } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [s], propuestas: [p] });

      expect((await errorDe(service.editarFranjas('ana', []))).errors).toEqual([{ campo: 'franjas', code: 'FRANJAS_REQUERIDAS' }]);
      expect(p.estado).toBe('pendiente');
    });

    it.each(['aprobada', 'rechazada', 'retirada'] as const)('sin pedido abierto (solo una %s) → NO_ENCONTRADO', async (estado) => {
      const { service } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [solicitud('ana', estado)] });

      expect((await errorDe(service.editarFranjas('ana', [MARTES_19_A_21]))).code).toBe('NO_ENCONTRADO');
    });
  });

  describe('retirar', () => {
    it('pendiente → retirada, sin evento (no había propuesta)', async () => {
      const s = solicitud('ana', 'pendiente');
      const { service, emitir } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [s] });

      await service.retirar('ana');

      expect(s.estado).toBe('retirada');
      expect(emitir).not.toHaveBeenCalled();
    });

    it('propuesta → retirada, con la Propuesta retirada por persona', async () => {
      const s = solicitud('ana', 'propuesta');
      const p = propuesta(s.id, 'disc-1');
      const { service, emitir } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [s], propuestas: [p] });

      await service.retirar('ana');

      expect(s.estado).toBe('retirada');
      expect(p).toMatchObject({ estado: 'retirada', retiradaPor: 'persona' });
      expect(emitir).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ nombre: 'discipulado.propuesta_retirada' }));
    });

    it('después de retirar puede volver a pedir', async () => {
      const s = solicitud('ana', 'pendiente');
      const { service, base } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [s] });

      await service.retirar('ana');
      await service.crearPropia('ana', [MARTES_19_A_21]);

      expect(base.solicitudes.map((x) => x.estado)).toEqual(['retirada', 'pendiente']);
    });

    it('sin pedido abierto → NO_ENCONTRADO', async () => {
      const { service } = await crearServicio({ personas: [{ id: 'ana' }] });

      expect((await errorDe(service.retirar('ana'))).code).toBe('NO_ENCONTRADO');
    });
  });
});
