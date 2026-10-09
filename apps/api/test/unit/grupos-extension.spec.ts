import {
  consultasDeGeocodificacion,
  direccionDelGrupo,
  distanciaKm,
  edadEn,
  enlaceComoLlegar,
  esCompatible,
  esHoraDeGrupoValida,
  formatearDistanciaKm,
  generoDelGrupo,
  ordenarDias,
  ordenarPorDistancia,
  validarDatosGrupo,
  type DatosGrupoExtension,
} from '@vida-sobrenatural/shared-types';
import {
  CadenaGeocodificadores,
  GeocodificadorFalso,
  GeorefGeocodificador,
  NominatimGeocodificador,
  limpiarParaGeoref,
  normalizarDireccionLaPlata,
  ubicarPrimera,
} from '../../src/grupo-extension/geocodificador.js';

/** spec 014 — reglas puras de Grupos de Extensión (D220–D223) y el geocodificador (D222). */
describe('Grupos de Extensión — reglas', () => {
  it('D221: el género sale de los líderes', () => {
    expect(generoDelGrupo(['femenino'])).toBe('femenino');
    expect(generoDelGrupo(['masculino', 'masculino'])).toBe('masculino');
    expect(generoDelGrupo(['femenino', 'masculino'])).toBe('mixto');
    expect(generoDelGrupo([])).toBeNull();
  });

  it('edad cumplida con la fecha civil', () => {
    expect(edadEn('1990-10-10', '2026-10-09')).toBe(35);
    expect(edadEn('1990-10-09', '2026-10-09')).toBe(36);
  });

  it('D223: compatibilidad por género y edad', () => {
    const mujer30 = { genero: 'femenino' as const, edad: 30 };
    expect(esCompatible({ genero: 'femenino', edadMinima: null, edadMaxima: null }, mujer30)).toBe(true);
    expect(esCompatible({ genero: 'mixto', edadMinima: null, edadMaxima: null }, mujer30)).toBe(true);
    expect(esCompatible({ genero: 'masculino', edadMinima: null, edadMaxima: null }, mujer30)).toBe(false);
    expect(esCompatible({ genero: 'femenino', edadMinima: 18, edadMaxima: 30 }, mujer30)).toBe(true);
    expect(esCompatible({ genero: 'femenino', edadMinima: 31, edadMaxima: null }, mujer30)).toBe(false);
    expect(esCompatible({ genero: 'femenino', edadMinima: null, edadMaxima: 29 }, mujer30)).toBe(false);
    expect(esCompatible({ genero: null, edadMinima: null, edadMaxima: null }, mujer30)).toBe(false);
  });

  it('distancia en km, con coma, y orden con los sin distancia al final', () => {
    const plaza = { latitud: -34.9214, longitud: -57.9545 };
    const tolosa = { latitud: -34.8975, longitud: -57.976 };
    const km = distanciaKm(plaza, tolosa);
    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(3.5);
    expect(formatearDistanciaKm(1.234)).toBe('1,2');
    expect(formatearDistanciaKm(0.01)).toBe('0,1');
    const orden = ordenarPorDistancia([
      { nombre: 'C', distanciaKm: null },
      { nombre: 'B', distanciaKm: 2 },
      { nombre: 'A', distanciaKm: 0.5 },
    ]);
    expect(orden.map((g) => g.nombre)).toEqual(['A', 'B', 'C']);
  });

  it('D220: hora en pasos de 15 minutos y días en orden', () => {
    expect(esHoraDeGrupoValida('18:30')).toBe(true);
    expect(esHoraDeGrupoValida('18:10')).toBe(false);
    expect(esHoraDeGrupoValida('24:00')).toBe(false);
    expect(ordenarDias(['sabado', 'lunes', 'lunes'])).toEqual(['lunes', 'sabado']);
  });

  it('D220: la dirección al estilo de La Plata y sus consultas', () => {
    const lugar = { enLaIglesia: false, calle: '64', numero: '820', entreCalle1: '11', entreCalle2: '12', direccionSede: null };
    expect(direccionDelGrupo(lugar)).toBe('64 nro 820 e/ 11 y 12');
    expect(direccionDelGrupo({ ...lugar, numero: null })).toBe('64 e/ 11 y 12');
    expect(direccionDelGrupo({ ...lugar, enLaIglesia: true, direccionSede: 'Calle 7 1200' })).toBe('Calle 7 1200');
    expect(consultasDeGeocodificacion(lugar)).toEqual(['64 820', '64 e/ 11 y 12', '64 y 11']);
    expect(consultasDeGeocodificacion({ ...lugar, calle: 'Diagonal 74', numero: null })).toEqual(['Diagonal 74 e/ 11 y 12', 'Diagonal 74 y 11']);
    expect(enlaceComoLlegar('64 nro 820 e/ 11 y 12')).toBe(
      'https://www.google.com/maps/search/?api=1&query=64%20nro%20820%20e%2F%2011%20y%2012%2C%20La%20Plata%2C%20Buenos%20Aires',
    );
  });

  it('D220: validación del formulario, por campo', () => {
    const base: DatosGrupoExtension = {
      nombre: 'Mujeres de Tolosa',
      lideres: ['p1'],
      dias: ['martes'],
      horaInicio: '19:00',
      cupo: 12,
      edadMinima: 18,
      edadMaxima: 40,
      enLaIglesia: false,
      sedeId: null,
      calle: '528',
      numero: '1500',
      entreCalle1: '2',
      entreCalle2: '3',
      zona: 'Tolosa',
    };
    expect(validarDatosGrupo(base)).toEqual([]);
    expect(validarDatosGrupo({ ...base, nombre: ' ', lideres: [], dias: [], horaInicio: '19:05' }).map((e) => e.code)).toEqual([
      'NOMBRE_REQUERIDO',
      'LIDERES_REQUERIDOS',
      'DIAS_REQUERIDOS',
      'HORA_INVALIDA',
    ]);
    expect(validarDatosGrupo({ ...base, edadMinima: 40, edadMaxima: 18 })).toEqual([{ campo: 'edadMaxima', code: 'EDADES_INVERTIDAS' }]);
    expect(validarDatosGrupo({ ...base, cupo: 0 })).toEqual([{ campo: 'cupo', code: 'CUPO_INVALIDO' }]);
    expect(validarDatosGrupo({ ...base, calle: null, zona: null }).map((e) => e.code)).toEqual(['CALLE_REQUERIDA', 'ZONA_REQUERIDA']);
    expect(validarDatosGrupo({ ...base, entreCalle2: null })).toEqual([{ campo: 'entreCalle2', code: 'ENTRE_CALLES_INCOMPLETAS' }]);
    expect(validarDatosGrupo({ ...base, enLaIglesia: true, calle: null, zona: null })).toEqual([{ campo: 'sedeId', code: 'SEDE_INVALIDA' }]);
    expect(validarDatosGrupo({ ...base, enLaIglesia: true, sedeId: 's1', calle: null, zona: null })).toEqual([]);
  });
});

describe('Geocodificador (D222)', () => {
  const fetchOriginal = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
  });

  function responder(cuerpo: unknown, ok = true) {
    const fn = jest.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => cuerpo }) as unknown as Response);
    globalThis.fetch = fn as unknown as typeof fetch;
    return fn;
  }

  it('normaliza las direcciones de La Plata', () => {
    expect(normalizarDireccionLaPlata('7 nro 1200')).toBe('calle 7 1200');
    expect(normalizarDireccionLaPlata('64 n° 820')).toBe('calle 64 820');
    expect(normalizarDireccionLaPlata('64 e/ 11 y 12')).toBe('calle 64 entre calle 11 y calle 12');
    expect(normalizarDireccionLaPlata('calle 64 y calle 11')).toBe('calle 64 y calle 11');
    expect(normalizarDireccionLaPlata('Diagonal 74 1500')).toBe('Diagonal 74 1500');
  });

  it('Georef: manda el texto como se escribe en La Plata, también como avenida, y gana el candidato más cercano al centro', async () => {
    const fn = jest.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        url.includes('avenida')
          ? { direcciones: [{ ubicacion: { lat: -34.9185, lon: -57.9448 } }] } // Avenida 7 del casco
          : { direcciones: [{ ubicacion: { lat: -34.8534, lon: -58.0836 } }] }, // Calle 7 de Villa Elisa
    }));
    globalThis.fetch = fn as unknown as typeof fetch;
    await expect(new GeorefGeocodificador('Buenos Aires', 'La Plata', { latitud: -34.9214, longitud: -57.9545 }).ubicar('7 nro 1200, La Plata')).resolves.toEqual({ latitud: -34.9185, longitud: -57.9448 });
    const urls = fn.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain('apis.datos.gob.ar/georef/api/direcciones');
    expect(urls[0]).toContain('direccion=7+1200&');
    expect(urls[0]).toContain('departamento=La+Plata');
    expect(urls[1]).toContain('direccion=avenida+7+1200&');
  });

  it('limpia la dirección para Georef sin cambiar cómo se escribe', () => {
    expect(limpiarParaGeoref('64 nro 820')).toBe('64 820');
    expect(limpiarParaGeoref('64 e/ 11 y 12, La Plata')).toBe('64 e/ 11 y 12');
  });

  it('Georef sin resultado → null; coordenadas fuera de Argentina → null', async () => {
    responder({ direcciones: [] });
    await expect(new GeorefGeocodificador().ubicar('x')).resolves.toBeNull();
    responder({ direcciones: [{ ubicacion: { lat: 40.4, lon: -3.7 } }] });
    await expect(new GeorefGeocodificador().ubicar('x')).resolves.toBeNull();
  });

  it('Nominatim: manda User-Agent propio y agrega la localidad', async () => {
    const fn = responder([{ lat: '-34.9', lon: '-57.9' }]);
    await expect(new NominatimGeocodificador('VS-test/1.0').ubicar('64 nro 820')).resolves.toEqual({ latitud: -34.9, longitud: -57.9 });
    const [url, init] = fn.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toContain('nominatim.openstreetmap.org/search');
    expect(url).toContain('La+Plata');
    expect(init.headers['User-Agent']).toBe('VS-test/1.0');
  });

  it('la cadena pasa al siguiente si el primero no encuentra o falla, y lanza si ninguno respondió', async () => {
    const nada = { ubicar: async () => null };
    const roto = { ubicar: async () => { throw new Error('caído'); } };
    const ok = { ubicar: async () => ({ latitud: -34.9, longitud: -57.9 }) };
    await expect(new CadenaGeocodificadores([{ nombre: 'a', servicio: nada }, { nombre: 'b', servicio: ok }]).ubicar('x')).resolves.toEqual({ latitud: -34.9, longitud: -57.9 });
    await expect(new CadenaGeocodificadores([{ nombre: 'a', servicio: roto }, { nombre: 'b', servicio: ok }]).ubicar('x')).resolves.toEqual({ latitud: -34.9, longitud: -57.9 });
    await expect(new CadenaGeocodificadores([{ nombre: 'a', servicio: roto }, { nombre: 'b', servicio: nada }]).ubicar('x')).resolves.toBeNull();
    await expect(new CadenaGeocodificadores([{ nombre: 'a', servicio: roto }]).ubicar('x')).rejects.toThrow();
  });

  it('el falso resuelve las direcciones de prueba sin red', async () => {
    const falso = new GeocodificadorFalso();
    await expect(falso.ubicar('7 nro 1200, La Plata')).resolves.toEqual({ latitud: -34.9214, longitud: -57.9545 });
    await expect(falso.ubicar('calle que no existe 1')).resolves.toBeNull();
    await expect(falso.ubicar('sin servicio')).rejects.toThrow();
    await expect(ubicarPrimera(falso, ['calle 64 999', 'calle 64 y calle 11'])).resolves.toEqual({ latitud: -34.9298, longitud: -57.942 });
  });
});
