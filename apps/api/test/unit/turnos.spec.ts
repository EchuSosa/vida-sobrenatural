import {
  cumpleRegla,
  cupoTurnoValido,
  diaSemanaDe,
  erroresDeReglaDiaDeServicio,
  fechasDeServicio,
  tienePermiso,
  type ReglaDiaDeServicio,
} from '@vida-sobrenatural/shared-types';

/** spec 017, T002 (D250, D251): días de servicio y cupos, en el calendario de Argentina. */
const DOMINGOS: ReglaDiaDeServicio = { frecuencia: 'semanal', diaSemana: 0 };
const SANTA_CENA: ReglaDiaDeServicio = { frecuencia: 'mensual', diaSemana: 0, posicionEnMes: 2 };
const SABADOS: ReglaDiaDeServicio = { frecuencia: 'semanal', diaSemana: 6 };
const ULTIMO_VIERNES: ReglaDiaDeServicio = { frecuencia: 'mensual', diaSemana: 5, posicionEnMes: -1 };

describe('fechasDeServicio (D250)', () => {
  it('todos los domingos, desde un lunes', () => {
    expect(fechasDeServicio([DOMINGOS], 3, '2026-11-02')).toEqual(['2026-11-08', '2026-11-15', '2026-11-22']);
  });

  it('el día de hoy cuenta si es día de servicio', () => {
    expect(fechasDeServicio([DOMINGOS], 1, '2026-11-08')).toEqual(['2026-11-08']);
  });

  it('el segundo domingo del mes (Santa Cena), cruzando de año', () => {
    expect(fechasDeServicio([SANTA_CENA], 3, '2026-11-02')).toEqual(['2026-11-08', '2026-12-13', '2027-01-10']);
  });

  it('el último viernes del mes, con meses de 30 y 31 días y febrero', () => {
    expect(fechasDeServicio([ULTIMO_VIERNES], 4, '2026-11-01')).toEqual(['2026-11-27', '2026-12-25', '2027-01-29', '2027-02-26']);
  });

  it('dos reglas se juntan en orden y sin repetir', () => {
    expect(fechasDeServicio([SANTA_CENA, DOMINGOS], 3, '2026-11-02')).toEqual(['2026-11-08', '2026-11-15', '2026-11-22']);
    expect(fechasDeServicio([DOMINGOS, SABADOS], 4, '2026-11-02')).toEqual(['2026-11-07', '2026-11-08', '2026-11-14', '2026-11-15']);
  });

  it('sin reglas no hay fechas', () => {
    expect(fechasDeServicio([], 8, '2026-11-02')).toEqual([]);
  });
});

describe('cumpleRegla y diaSemanaDe', () => {
  it('el día de la semana sale de la fecha civil, no de la zona del servidor', () => {
    expect(diaSemanaDe('2026-11-08')).toBe(0);
    expect(diaSemanaDe('2026-02-28')).toBe(6);
  });

  it('el primer domingo no es el segundo', () => {
    expect(cumpleRegla('2026-11-01', SANTA_CENA)).toBe(false);
    expect(cumpleRegla('2026-11-08', SANTA_CENA)).toBe(true);
  });
});

describe('validaciones (D250, D251)', () => {
  it('una regla bien no tiene errores', () => {
    expect(erroresDeReglaDiaDeServicio(DOMINGOS)).toEqual([]);
    expect(erroresDeReglaDiaDeServicio(SANTA_CENA)).toEqual([]);
  });

  it('dice qué está mal', () => {
    expect(erroresDeReglaDiaDeServicio({ frecuencia: 'diaria', diaSemana: 0 })).toEqual(['FRECUENCIA_INVALIDA']);
    expect(erroresDeReglaDiaDeServicio({ frecuencia: 'semanal', diaSemana: 7 })).toEqual(['DIA_SEMANA_INVALIDO']);
    expect(erroresDeReglaDiaDeServicio({ frecuencia: 'mensual', diaSemana: 0, posicionEnMes: 5 })).toEqual(['POSICION_EN_MES_INVALIDA']);
    expect(erroresDeReglaDiaDeServicio({ frecuencia: 'semanal', diaSemana: 0, posicionEnMes: 2 })).toEqual(['POSICION_EN_MES_INVALIDA']);
  });

  it('el cupo va de 1 a 20, entero', () => {
    expect([1, 20].every(cupoTurnoValido)).toBe(true);
    expect([0, 21, 1.5, '2', null].some(cupoTurnoValido)).toBe(false);
  });
});

describe('permisos de turnos (D253)', () => {
  it('el Admin gestiona; el Pastor ve sin gestionar; un miembro, nada', () => {
    expect(tienePermiso(['admin'], 'turnos.gestionar')).toBe(true);
    expect(tienePermiso(['pastor'], 'turnos.ver')).toBe(true);
    expect(tienePermiso(['pastor'], 'turnos.gestionar')).toBe(false);
    expect(tienePermiso(['miembro_registrado', 'lider_ministerio'], 'turnos.gestionar')).toBe(false);
  });
});
