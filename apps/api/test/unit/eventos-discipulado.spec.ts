import { Logger } from '@nestjs/common';
import type { EventoDiscipulado } from '@vida-sobrenatural/shared-types';
import { EventosDiscipuladoService } from '../../src/discipulado/eventos.js';

/**
 * specs/004, T011b (Principio X): el evento se loguea sin datos personales —
 * solo el nombre, el tipo de destinatario y los ids que ya trae `datos`. Nada
 * de nombres, teléfonos ni motivos.
 */
describe('EventosDiscipuladoService', () => {
  it('loguea solo el nombre, el tipo de destinatario y los ids de datos', () => {
    const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const servicio = new EventosDiscipuladoService();

    const evento: EventoDiscipulado = {
      nombre: 'propuesta_aceptada',
      a: { tipo: 'persona', personaId: 'per-1' },
      datos: { solicitudId: 'sol-1', grupoId: 'gru-1', discipuladorId: 'dis-1' },
    };
    servicio.emitir(evento);

    expect(spy).toHaveBeenCalledTimes(1);
    const registrado = spy.mock.calls[0][0] as Record<string, unknown>;
    // Solo estas claves; ningún dato personal (el personaId del destinatario no viaja).
    expect(Object.keys(registrado).sort()).toEqual(['destinatario', 'discipuladorId', 'evento', 'grupoId', 'solicitudId']);
    expect(registrado).toEqual({ evento: 'propuesta_aceptada', destinatario: 'persona', solicitudId: 'sol-1', grupoId: 'gru-1', discipuladorId: 'dis-1' });

    spy.mockRestore();
  });
});
