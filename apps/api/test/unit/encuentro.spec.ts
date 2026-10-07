import { EncuentrosService } from '../../src/discipulado/encuentros.service.js';
import { asistenciasCompletas, contactoDe, validarEncuentro, type PersonaParaContacto } from '../../src/discipulado/validaciones.js';
import { codigoDe, comoPrisma, erroresDeCampo, prismaFalso } from './discipulado-tx-falso.js';

/**
 * specs/004, T042 (FR-009, FR-013, FR-013a, FR-041, FR-044): la validación de
 * un Encuentro, la Asistencia por defecto, el estado del Grupo al registrar y
 * editar, y el contacto (con el del tutor) que ve el Discipulador.
 */
const HOY = '2026-09-28';
const INSCRIPCIONES = new Set(['i-1', 'i-2']);

function campos(fn: () => unknown): Array<{ campo: string; code: string }> | undefined {
  try {
    fn();
  } catch (e) {
    return (e as { errors?: Array<{ campo: string; code: string }> }).errors;
  }
  return undefined;
}

describe('validarEncuentro', () => {
  it('fecha futura → FECHA_FUTURA; hoy sí se acepta', () => {
    expect(campos(() => validarEncuentro({ fecha: '2026-09-29', capitulos: '1' }, HOY, INSCRIPCIONES, false))).toEqual([{ campo: 'fecha', code: 'FECHA_FUTURA' }]);
    expect(validarEncuentro({ fecha: HOY, capitulos: '1' }, HOY, INSCRIPCIONES, false).fecha).toBe(HOY);
  });

  it('capítulos vacío o de más de 200 → CAPITULOS_REQUERIDO', () => {
    expect(campos(() => validarEncuentro({ fecha: HOY, capitulos: '   ' }, HOY, INSCRIPCIONES, false))).toEqual([{ campo: 'capitulos', code: 'CAPITULOS_REQUERIDO' }]);
    expect(campos(() => validarEncuentro({ fecha: HOY, capitulos: 'x'.repeat(201) }, HOY, INSCRIPCIONES, false))).toEqual([
      { campo: 'capitulos', code: 'CAPITULOS_REQUERIDO' },
    ]);
  });

  it('notas de más de 2000 → error en el campo notas', () => {
    expect(campos(() => validarEncuentro({ fecha: HOY, capitulos: '1', notas: 'x'.repeat(2001) }, HOY, INSCRIPCIONES, false))).toEqual([
      { campo: 'notas', code: 'NOTAS_DEMASIADO_LARGAS' },
    ]);
  });

  it('junta todos los errores de una vez (H-50), no de a uno', () => {
    expect(campos(() => validarEncuentro({}, HOY, INSCRIPCIONES, false))).toEqual([
      { campo: 'fecha', code: 'FECHA_REQUERIDA' },
      { campo: 'capitulos', code: 'CAPITULOS_REQUERIDO' },
    ]);
  });

  it('una inscripcionId de otro Grupo → error de campo', () => {
    expect(
      campos(() => validarEncuentro({ fecha: HOY, capitulos: '1', asistencias: [{ inscripcionId: 'ajena', presente: false }] }, HOY, INSCRIPCIONES, false)),
    ).toEqual([{ campo: 'asistencias', code: 'INSCRIPCION_DE_OTRO_GRUPO' }]);
  });

  it('al editar (parcial) no exige fecha ni capítulos', () => {
    expect(validarEncuentro({ notas: 'otra nota' }, HOY, INSCRIPCIONES, true)).toEqual({ notas: 'otra nota' });
  });
});

describe('asistenciasCompletas (FR-013a)', () => {
  it('sin asistencias en el pedido → todas presentes', () => {
    expect(asistenciasCompletas(['i-1', 'i-2'], undefined)).toEqual([
      { inscripcionId: 'i-1', presente: true },
      { inscripcionId: 'i-2', presente: true },
    ]);
  });

  it('las marcadas como falta quedan en false; el resto, presentes', () => {
    expect(asistenciasCompletas(['i-1', 'i-2'], new Map([['i-2', false]]))).toEqual([
      { inscripcionId: 'i-1', presente: true },
      { inscripcionId: 'i-2', presente: false },
    ]);
  });
});

describe('EncuentrosService — estado del Grupo y pertenencia', () => {
  function armar(grupoEstado: 'en_curso' | 'finalizado', conLiderazgo = true) {
    const prisma = prismaFalso({ grupo: { id: 'g-1', estado: grupoEstado, propuestaFinalizacionEn: null } });
    prisma.liderazgo.findFirst.mockResolvedValue(conLiderazgo ? { id: 'lid', desde: new Date() } : null);
    prisma.inscripcion.findMany.mockResolvedValue([{ id: 'i-1' }]);
    prisma.encuentro.findFirst.mockResolvedValue({ id: 'e-1' });
    const encuentroLeido = { id: 'e-1', fecha: new Date('2026-09-20T00:00:00Z'), capitulos: '1', notas: null, updatedAt: new Date(), asistencias: [] };
    prisma.encuentro.create.mockResolvedValue(encuentroLeido);
    prisma.encuentro.update.mockResolvedValue(encuentroLeido);
    return { prisma, servicio: new EncuentrosService(comoPrisma(prisma)) };
  }

  it('Grupo finalizado → DISCIPULADO_NO_EN_CURSO al crear y al editar', async () => {
    const { servicio } = armar('finalizado');
    expect(await codigoDe(servicio.registrar('d', 'g-1', { fecha: '2026-09-20', capitulos: '1' }))).toBe('DISCIPULADO_NO_EN_CURSO');
    expect(await codigoDe(servicio.editar('d', 'g-1', 'e-1', { capitulos: '2' }))).toBe('DISCIPULADO_NO_EN_CURSO');
  });

  it('sin Liderazgo vigente → 404 (Principio V), antes que cualquier validación', async () => {
    const { servicio } = armar('en_curso', false);
    expect(await codigoDe(servicio.registrar('d', 'g-1', {}))).toBe('NO_ENCONTRADO');
  });

  it('registrar crea una Asistencia por Inscripción activa', async () => {
    const { servicio, prisma } = armar('en_curso');
    await servicio.registrar('d', 'g-1', { fecha: '2026-09-20', capitulos: '1-3' });
    expect(prisma.encuentro.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ asistencias: { create: [{ inscripcionId: 'i-1', presente: true }] } }) }),
    );
  });

  it('editar siempre cambia updatedAt (FR-041), aunque solo cambie una asistencia', async () => {
    const { servicio, prisma } = armar('en_curso');
    await servicio.editar('d', 'g-1', 'e-1', { asistencias: [{ inscripcionId: 'i-1', presente: false }] });
    expect(prisma.asistencia.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.encuentro.update).toHaveBeenCalledWith(expect.objectContaining({ data: { updatedAt: expect.any(Date) } }));
  });

  it('la validación de campo corre en el servicio', async () => {
    const { servicio } = armar('en_curso');
    expect(await erroresDeCampo(servicio.registrar('d', 'g-1', { fecha: '2999-01-01', capitulos: '1' }))).toEqual([{ campo: 'fecha', code: 'FECHA_FUTURA' }]);
  });
});

describe('contactoDe (research #19, FR-044)', () => {
  const base: PersonaParaContacto = {
    telefono: '+54 221 555 0000',
    direccion: 'Calle 1',
    esMenor: false,
    tutorNombre: null,
    tutorApellido: null,
    tutorTelefono: null,
    tutorVinculado: null,
  };

  it('adulto → tutor null, aunque haya datos de tutor viejos', () => {
    expect(contactoDe({ ...base, tutorNombre: 'Ana', tutorTelefono: '+54 1' })).toEqual({ telefono: base.telefono, direccion: 'Calle 1', tutor: null });
  });

  it('menor con Relación Familiar `tutor` → los datos de esa Persona (el vínculo manda, D112)', () => {
    expect(
      contactoDe({ ...base, esMenor: true, tutorNombre: 'Texto', tutorTelefono: '+54 9', tutorVinculado: { nombre: 'Marta', apellido: 'Gómez', telefono: '+54 2' } }).tutor,
    ).toEqual({ nombre: 'Marta Gómez', telefono: '+54 2' });
  });

  it('menor sin vínculo → los campos de texto', () => {
    expect(contactoDe({ ...base, esMenor: true, tutorNombre: 'Luis', tutorApellido: 'Paz', tutorTelefono: '+54 3' }).tutor).toEqual({
      nombre: 'Luis Paz',
      telefono: '+54 3',
    });
  });
});
