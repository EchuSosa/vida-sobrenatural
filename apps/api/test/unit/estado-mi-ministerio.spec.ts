import {
  estadoMiMinisterio,
  type PostulacionParaEstado,
} from '../../src/ministerio/estado-mi-ministerio.js';

/**
 * spec 009, T034 (FR-011, FR-012, FR-014, SC-005): la precedencia de la card
 * de Ministerio de Mi camino, rama por rama. Nunca viaja un motivo.
 */
const APTA = ['miembro_registrado', 'apto_ministerio'];
const dia = (n: number) => new Date(Date.UTC(2026, 9, n));
let seq = 0;
function postulacion(
  parcial: Partial<PostulacionParaEstado>,
): PostulacionParaEstado {
  seq += 1;
  return {
    id: `p${seq}`,
    estado: 'pendiente',
    motivoInactivacion: null,
    requiereFormacion: false,
    enParalelo: false,
    ministerio: { id: 'm1', nombre: 'Bienvenida', activo: true },
    celula: null,
    createdAt: dia(1),
    revisadaEn: null,
    retiradaEn: null,
    inactivadaEn: null,
    ...parcial,
  };
}

describe('estadoMiMinisterio (contracts/postulaciones-api.md, precedencia)', () => {
  it('sin el rol apto y sin postulaciones → no_apta', () => {
    expect(estadoMiMinisterio(['miembro_registrado'], [])).toEqual({
      estado: 'no_apta',
    });
  });

  it('apta sin historia → puede_postularse sin último desenlace', () => {
    expect(estadoMiMinisterio(APTA, [])).toEqual({
      estado: 'puede_postularse',
    });
  });

  it('puede_postularse con el desenlace MÁS RECIENTE: rechazada, retirada o baja; una inactiva por cambio no cuenta', () => {
    const rechazada = postulacion({
      estado: 'rechazada',
      revisadaEn: dia(2),
      ministerio: { id: 'm1', nombre: 'Ceremonial', activo: true },
    });
    const retirada = postulacion({ estado: 'retirada', retiradaEn: dia(5) });
    const cambio = postulacion({
      estado: 'inactiva',
      motivoInactivacion: 'cambio_de_ministerio',
      inactivadaEn: dia(9),
    });
    expect(estadoMiMinisterio(APTA, [rechazada, retirada, cambio])).toEqual({
      estado: 'puede_postularse',
      ultimo: {
        tipo: 'retirada',
        ministerio: { nombre: 'Bienvenida' },
        en: dia(5).toISOString(),
      },
    });
    expect(estadoMiMinisterio(APTA, [rechazada])).toMatchObject({
      ultimo: { tipo: 'rechazada', ministerio: { nombre: 'Ceremonial' } },
    });
    const baja = postulacion({
      estado: 'inactiva',
      motivoInactivacion: 'baja',
      inactivadaEn: dia(7),
    });
    expect(estadoMiMinisterio(APTA, [rechazada, baja, cambio])).toMatchObject({
      ultimo: { tipo: 'baja', en: dia(7).toISOString() },
    });
    expect(estadoMiMinisterio(APTA, [cambio])).toEqual({
      estado: 'puede_postularse',
    });
  });

  it('una pendiente → pendiente (con la marca de formación de docs/22), aunque ya no sea apta', () => {
    const p = postulacion({
      requiereFormacion: true,
      celula: { id: 'c1', nombre: 'Voces', activo: true },
    });
    expect(estadoMiMinisterio([], [p])).toEqual({
      estado: 'pendiente',
      pendiente: {
        postulacionId: p.id,
        ministerio: { id: 'm1', nombre: 'Bienvenida' },
        celula: { id: 'c1', nombre: 'Voces' },
        requiereFormacion: true,
        enParalelo: false,
        createdAt: dia(1).toISOString(),
      },
    });
  });

  it('aprobada → miembro, sin y con una pendiente a otro Ministerio; desde = cuándo se aprobó', () => {
    const aprobada = postulacion({
      estado: 'aprobada',
      revisadaEn: dia(3),
      celula: { id: 'c1', nombre: 'Seguridad', activo: true },
    });
    expect(estadoMiMinisterio(APTA, [aprobada])).toEqual({
      estado: 'miembro',
      membresia: {
        postulacionId: aprobada.id,
        ministerio: { id: 'm1', nombre: 'Bienvenida', activo: true },
        celula: { id: 'c1', nombre: 'Seguridad', activo: true },
        desde: dia(3).toISOString(),
        enParalelo: false,
      },
      pendiente: null,
    });
    const otra = postulacion({
      ministerio: { id: 'm2', nombre: 'Adoración', activo: true },
    });
    expect(estadoMiMinisterio(APTA, [aprobada, otra])).toMatchObject({
      estado: 'miembro',
      pendiente: {
        postulacionId: otra.id,
        ministerio: { nombre: 'Adoración' },
      },
    });
  });

  it('D217: con la membresía de un Ministerio y una en paralelo ("Discipulados Vida Nueva"), la card muestra la del Ministerio; con solo la en paralelo, esa', () => {
    const discipulados = postulacion({
      estado: 'aprobada',
      enParalelo: true,
      revisadaEn: dia(5),
      ministerio: { id: 'm2', nombre: 'Enseñanza', activo: true },
      celula: { id: 'c2', nombre: 'Discipulados Vida Nueva', activo: true },
    });
    const adoracion = postulacion({
      estado: 'aprobada',
      revisadaEn: dia(3),
      ministerio: { id: 'm3', nombre: 'Adoración', activo: true },
    });
    expect(estadoMiMinisterio(APTA, [discipulados, adoracion])).toMatchObject({
      estado: 'miembro',
      membresia: { postulacionId: adoracion.id, ministerio: { id: 'm3' } },
    });
    expect(estadoMiMinisterio(APTA, [discipulados])).toMatchObject({
      estado: 'miembro',
      membresia: { postulacionId: discipulados.id, ministerio: { id: 'm2' }, enParalelo: true },
    });
    // Miembro de Adoración con una pendiente a Discipulados: la pendiente avisa que es en paralelo.
    const pendienteDisc = postulacion({ enParalelo: true, ministerio: { id: 'm2', nombre: 'Enseñanza', activo: true } });
    expect(estadoMiMinisterio(APTA, [adoracion, pendienteDisc])).toMatchObject({
      membresia: { enParalelo: false },
      pendiente: { postulacionId: pendienteDisc.id, enParalelo: true },
    });
  });

  it('FR-012: el Ministerio o la Célula inactivos llegan marcados', () => {
    const aprobada = postulacion({
      estado: 'aprobada',
      revisadaEn: dia(3),
      ministerio: { id: 'm1', nombre: 'Bienvenida', activo: false },
      celula: { id: 'c1', nombre: 'Seguridad', activo: false },
    });
    expect(estadoMiMinisterio(APTA, [aprobada])).toMatchObject({
      membresia: { ministerio: { activo: false }, celula: { activo: false } },
    });
  });

  it('FR-014: ningún estado trae un motivo', () => {
    const todos = [
      estadoMiMinisterio(APTA, [
        postulacion({ estado: 'rechazada', revisadaEn: dia(2) }),
      ]),
      estadoMiMinisterio(APTA, [
        postulacion({
          estado: 'inactiva',
          motivoInactivacion: 'baja',
          inactivadaEn: dia(2),
        }),
      ]),
      estadoMiMinisterio(APTA, [postulacion({})]),
    ];
    for (const e of todos) expect(JSON.stringify(e)).not.toMatch(/motivo/i);
  });
});
