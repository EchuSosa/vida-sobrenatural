import { CATALOGO_AVISOS, NOMBRES_EVENTOS_AVISO, type NombreEventoAviso } from '@vida-sobrenatural/shared-types';
import { DATOS_EJEMPLO, IMPORTANTES_DOCS_16 } from './avisos-datos-ejemplo.js';

/**
 * spec 012, T004 (b)–(e) — FR-012, FR-014, US6-6. El (a) y el prefijo de
 * dominio viven en `lote-0-global.spec.ts`.
 */
const entrada = (n: NombreEventoAviso) => CATALOGO_AVISOS[n] as unknown as {
  destinatario: string;
  prioridad: string;
  destino: (d: unknown) => string;
  clave: (d: unknown) => string | null;
};

describe('Catálogo de avisos (spec 012, T004)', () => {
  it('(b) el destino de cada evento es una ruta de la web app, sin dominio', () => {
    for (const nombre of NOMBRES_EVENTOS_AVISO) {
      const destino = entrada(nombre).destino(DATOS_EJEMPLO[nombre]);
      expect({ nombre, destino }).toEqual({ nombre, destino: expect.stringMatching(/^\/(?!\/)[^:]*$/) });
    }
  });

  it('(c) los que no se repiten tienen clave, y la clave depende solo de ids', () => {
    const conClave: NombreEventoAviso[] = [
      'evento.proximo',
      'evento.recordatorio_inscripcion',
      'vida_servicio.contenido_liberado',
      'bautismo.fecha_asignada',
      'persona.cuenta_activada',
    ];
    for (const nombre of conClave) {
      const datos = DATOS_EJEMPLO[nombre] as Record<string, unknown>;
      const clave = entrada(nombre).clave(datos);
      expect({ nombre, clave }).toEqual({ nombre, clave: expect.any(String) });
      // Cambiar todo lo que no es un id no cambia la clave.
      const otros = Object.fromEntries(
        Object.entries(datos).map(([k, v]) => [k, k.endsWith('Id') ? v : typeof v === 'number' ? v + 1 : `${String(v)}-otro`]),
      );
      expect({ nombre, clave: entrada(nombre).clave(otros) }).toEqual({ nombre, clave });
    }
  });

  it('(d) cada importante le llega a una Persona puntual o al Discipulador, salvo la cancelación de un Evento (D193)', () => {
    for (const nombre of NOMBRES_EVENTOS_AVISO) {
      const e = entrada(nombre);
      if (e.prioridad !== 'importante' || nombre === 'evento.cancelado') continue;
      expect({ nombre, destinatario: e.destinatario }).toEqual({ nombre, destinatario: expect.stringMatching(/^(persona|discipulador)$/) });
    }
  });

  it('(e) los importantes son exactamente los de docs/16 §1', () => {
    const importantes = NOMBRES_EVENTOS_AVISO.filter((n) => entrada(n).prioridad === 'importante');
    expect([...importantes].sort()).toEqual([...IMPORTANTES_DOCS_16].sort());
  });
});
