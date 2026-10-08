import {
  CATALOGO_AVISOS,
  CATALOGO_PERMISOS,
  ESTADOS_ABIERTOS,
  ESTADOS_POR_TIPO,
  ETAPAS_CAMINO,
  NOMBRES_EVENTOS_AVISO,
  TIPOS_SOLICITUD,
  aniosCongregando,
  congregaDesdeValido,
  destinoSeguro,
  esAbierta,
  estadoDeEtapa,
  normalizarNombre,
  normalizarTelefono,
  opcionesAnioCongregaDesde,
  puedeDeclarar,
  rangoCongregacion,
  reglaDeEtapa,
  type HechosCamino,
} from '@vida-sobrenatural/shared-types';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

const mensajes = (app: 'web' | 'backoffice') =>
  JSON.parse(readFileSync(join(repoRoot, 'apps', app, 'src/messages/es.json'), 'utf8')) as Record<string, any>;

// Lote 0 global (specs 006–013): las reglas puras compartidas que ya usan
// varias specs. Cada spec suma sus casos en su propio archivo de test.

describe('congregaDesde (D214)', () => {
  it('ofrece el año actual primero y 80 años hacia atrás', () => {
    const opciones = opcionesAnioCongregaDesde(2026);
    expect(opciones[0]).toBe(2026);
    expect(opciones).toHaveLength(80);
    expect(opciones.at(-1)).toBe(1947);
  });

  it('valida años enteros entre 1900 y el actual', () => {
    expect(congregaDesdeValido(2026, 2026)).toBe(true);
    expect(congregaDesdeValido(1900, 2026)).toBe(true);
    expect(congregaDesdeValido(2027, 2026)).toBe(false);
    expect(congregaDesdeValido(1899, 2026)).toBe(false);
    expect(congregaDesdeValido(2020.5, 2026)).toBe(false);
    expect(congregaDesdeValido('2020', 2026)).toBe(false);
  });

  it('calcula los años y el rango al mostrar, nunca negativos', () => {
    expect(aniosCongregando(2026, 2026)).toBe(0);
    expect(aniosCongregando(2027, 2026)).toBe(0);
    expect(rangoCongregacion(2026, 2026)).toBe('este_anio');
    expect(rangoCongregacion(2025, 2026)).toBe('de_1_a_2_anios');
    expect(rangoCongregacion(2024, 2026)).toBe('de_1_a_2_anios');
    expect(rangoCongregacion(2023, 2026)).toBe('de_3_a_5_anios');
    expect(rangoCongregacion(2021, 2026)).toBe('de_3_a_5_anios');
    expect(rangoCongregacion(2020, 2026)).toBe('mas_de_5_anios');
  });
});

describe('normalizarTelefono / normalizarNombre (spec 006, research #7)', () => {
  it('deja solo dígitos y saca el 9 de celular de Argentina', () => {
    expect(normalizarTelefono('+54 9 221 555-1234')).toBe('542215551234');
    expect(normalizarTelefono('+54 221 555 1234')).toBe('542215551234');
    expect(normalizarTelefono('+598 99 123 456')).toBe('59899123456');
  });

  it('compara nombres sin tildes, mayúsculas ni espacios de más', () => {
    expect(normalizarNombre('  José   PÉREZ ')).toBe('jose perez');
  });
});

describe('destinoSeguro (specs 007 y 011)', () => {
  it('acepta rutas internas', () => {
    expect(destinoSeguro('/eventos/retiro-2026/inscribirme')).toBe('/eventos/retiro-2026/inscribirme');
  });

  it.each([null, undefined, '', 'https://otro.com', '//otro.com', '/\\otro.com', 'javascript:alert(1)', '/a\nb'])(
    'manda a /inicio lo que no es una ruta interna (%p)',
    (valor) => {
      expect(destinoSeguro(valor as string | null | undefined)).toBe('/inicio');
    },
  );
});

describe('Mi camino — reglas por etapa (spec 006, D153, D155, D147)', () => {
  const base: HechosCamino = { edad: 30, vidaNueva: { estado: 'puede_pedir' }, completas: {}, ultimaDeclaracion: {} };

  it('VS pide VN completa; Ministerio pide VS; Bautismo acepta VN en curso', () => {
    expect(reglaDeEtapa('vida_de_servicio', {}, [])).toBe(false);
    expect(reglaDeEtapa('vida_de_servicio', { vida_nueva: 'sistema' }, [])).toBe(true);
    expect(reglaDeEtapa('ministerio', { vida_nueva: 'sistema' }, [])).toBe(false);
    expect(reglaDeEtapa('ministerio', { vida_de_servicio: 'historial' }, [])).toBe(true);
    expect(reglaDeEtapa('bautismo', {}, ['vida_nueva'])).toBe(true);
    expect(reglaDeEtapa('bautismo', {}, [])).toBe(false);
  });

  it('una etapa todavía no construida se ve "Próximamente" pero se puede declarar', () => {
    const estado = estadoDeEtapa('ministerio', base);
    expect(estado.estado).toBe('proximamente');
    expect(estado).toMatchObject({ puedeDeclarar: true });
  });

  it('completa gana a todo, y una declaración pendiente se ve en revisión', () => {
    expect(estadoDeEtapa('vida_nueva', { ...base, completas: { vida_nueva: 'historial' } })).toEqual({
      etapa: 'vida_nueva',
      estado: 'completada',
      como: 'historial',
    });
    const pendiente = { ...base, ultimaDeclaracion: { bautismo: { id: 'd1', estado: 'pendiente' as const, fecha: '2026-10-01', motivo: null } } };
    expect(estadoDeEtapa('bautismo', pendiente).estado).toBe('en_revision');
    expect(puedeDeclarar('bautismo', pendiente)).toBe(false);
  });

  it('menor de 12 no declara; Vida Nueva en curso no se declara', () => {
    expect(puedeDeclarar('bautismo', { ...base, edad: 11 })).toBe(false);
    const enCurso: HechosCamino = {
      ...base,
      vidaNueva: { estado: 'en_curso', grupoId: 'g', discipulador: { nombre: 'A', apellido: 'B', telefono: '1' }, desde: '2026-01-01' },
    };
    expect(puedeDeclarar('vida_nueva', enCurso)).toBe(false);
    expect(estadoDeEtapa('vida_nueva', enCurso).estado).toBe('en_curso');
  });

  it('siempre hay cuatro etapas en orden', () => {
    expect(ETAPAS_CAMINO).toEqual(['vida_nueva', 'vida_de_servicio', 'ministerio', 'bautismo']);
  });
});

describe('Bandeja unificada (D178, D208)', () => {
  it('los estados abiertos de cada tipo son estados de ese tipo', () => {
    for (const tipo of TIPOS_SOLICITUD) {
      for (const estado of ESTADOS_ABIERTOS[tipo]) expect(ESTADOS_POR_TIPO[tipo]).toContain(estado);
    }
  });

  it('aceptada de Bautismo e Inscripción confirmada no son abiertas (D186, D196)', () => {
    expect(esAbierta('bautismo', 'aprobada')).toBe(false);
    expect(esAbierta('inscripcion_evento', 'confirmada')).toBe(false);
    expect(esAbierta('pago', 'pendiente_verificacion')).toBe(true);
  });
});

describe('Catálogo de avisos (spec 012, D197–D206)', () => {
  it('lo que va al Admin no tiene disparador (D201) y lo demás sí', () => {
    for (const nombre of NOMBRES_EVENTOS_AVISO) {
      const entrada = CATALOGO_AVISOS[nombre];
      if (entrada.destinatario === 'admin') expect(entrada.disparador).toBeNull();
      else expect(entrada.disparador).not.toBeNull();
    }
  });

  it('cada nombre empieza con el prefijo de su dominio', () => {
    for (const nombre of NOMBRES_EVENTOS_AVISO) {
      expect(nombre).toMatch(/^(discipulado|persona|historial|vida_servicio|ministerio|bautismo|evento)\.[a-z_]+$/);
    }
  });
});

describe('Permisos nuevos del lote 0 (D132, D142)', () => {
  it('el Pastor no gestiona ni edita nada nuevo', () => {
    const nuevos = [
      'personas.alta', 'personas.editar_email', 'historial.resolver', 'completitud_manual.gestionar',
      'vida_servicio.inscribir_en_nombre', 'ministerios.gestionar', 'postulaciones.crear_en_nombre',
      'bautismo.habilitar', 'bautismo.crear_en_nombre', 'eventos.gestionar', 'inscripciones_evento.gestionar',
      'pagos.verificar', 'notificaciones.enviar', 'comentarios.gestionar', 'cursos.gestionar', 'personas.editar',
    ] as const;
    for (const permiso of nuevos) expect({ permiso, roles: CATALOGO_PERMISOS[permiso] }).toEqual({ permiso, roles: ['admin'] });
    // Lo que el Pastor sí ve (D142: lee todo el backoffice).
    for (const permiso of ['ministerios.ver', 'comentarios.ver'] as const) expect(CATALOGO_PERMISOS[permiso]).toContain('pastor');
  });
});

describe('Textos del lote 0 (D84)', () => {
  it('la bandeja tiene el nombre de cada tipo y de cada uno de sus estados', () => {
    const { bandeja } = mensajes('backoffice');
    for (const tipo of TIPOS_SOLICITUD) {
      expect(typeof bandeja.tipos[tipo]).toBe('string');
      expect(Object.keys(bandeja.estados[tipo]).sort()).toEqual([...ESTADOS_POR_TIPO[tipo]].sort());
    }
  });

  it('cada aviso que le llega a una Persona tiene título y detalle, sin nombres de Personas', () => {
    const { avisos } = mensajes('web');
    for (const nombre of NOMBRES_EVENTOS_AVISO) {
      if (CATALOGO_AVISOS[nombre].destinatario === 'admin') continue;
      const [dominio, evento] = nombre.split('.');
      const textos = avisos.eventos[dominio]?.[evento];
      expect({ nombre, titulo: typeof textos?.titulo, detalle: typeof textos?.detalle }).toEqual({ nombre, titulo: 'string', detalle: 'string' });
      expect(`${textos.titulo} ${textos.detalle}`).not.toMatch(/\{(nombre|apellido|persona)\}/);
    }
  });
});
