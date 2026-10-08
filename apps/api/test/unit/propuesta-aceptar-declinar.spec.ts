import { PropuestasService } from '../../src/discipulado/propuestas.service.js';
import { codigoDe, comoPrisma, erroresDeCampo, eventosEspia, prismaFalso, type FilasBloqueadas } from './discipulado-tx-falso.js';

/**
 * specs/004, T037a (FR-036/FR-037, FR-045, FR-030): aceptar y declinar una
 * propuesta, rama por rama. El flujo contra la base real (y las carreras de
 * D137) está en test/integration/discipulado-aceptar.integration-spec.ts.
 */
const DISCIPULADOR = 'disc-1';
const discipuladorOk = { id: DISCIPULADOR, rol: ['miembro_registrado', 'discipulador'], activo: true, disponibleDiscipulado: true, maxPersonasPorGrupo: 1 };

function propuestaNueva(over: Record<string, unknown> = {}) {
  return {
    id: 'prop-1',
    tipo: 'nueva',
    solicitudId: 'sol-1',
    grupoId: null,
    discipuladorId: DISCIPULADOR,
    grupoDestinoId: null,
    propuestaPorId: 'admin-1',
    estado: 'pendiente',
    ...over,
  };
}

function armar(filas: FilasBloqueadas) {
  const prisma = prismaFalso({ persona: discipuladorOk, ...filas });
  const leida = filas.propuesta ?? null;
  prisma.propuestaDiscipulado.findUnique.mockResolvedValue(leida);
  prisma.solicitudDiscipulado.findUnique.mockResolvedValue({ id: 'sol-1', personaId: 'persona-1', estado: 'propuesta' });
  prisma.curso.findUnique.mockResolvedValue({ id: 'curso-vn' });
  prisma.persona.findUnique.mockResolvedValue({ sedeId: 'sede-1' });
  prisma.grupo.create.mockResolvedValue({ id: 'grupo-nuevo' });
  const { eventos, emitir } = eventosEspia();
  // 013 FR-054: el Curso activo lo decide CursoService (acá, siempre activo salvo que el test diga otra cosa).
  const cursos = { exigirActivo: jest.fn().mockResolvedValue(undefined) };
  return { prisma, emitir, cursos, servicio: new PropuestasService(comoPrisma(prisma), eventos, cursos as never) };
}

describe('PropuestasService.aceptar', () => {
  it('una propuesta ya respondida o retirada → PROPUESTA_NO_VIGENTE, sin escribir', async () => {
    const { servicio, prisma } = armar({ propuesta: propuestaNueva({ estado: 'retirada' }) });
    expect(await codigoDe(servicio.aceptar('prop-1', DISCIPULADOR))).toBe('PROPUESTA_NO_VIGENTE');
    expect(prisma.grupo.create).not.toHaveBeenCalled();
    expect(prisma.propuestaDiscipulado.update).not.toHaveBeenCalled();
  });

  it('una propuesta de otro Discipulador → 404, igual que si no existiera (Principio V)', async () => {
    const { servicio } = armar({ propuesta: propuestaNueva({ discipuladorId: 'otro' }) });
    expect(await codigoDe(servicio.aceptar('prop-1', DISCIPULADOR))).toBe('NO_ENCONTRADO');
  });

  it('si ya no tiene el rol (D137, fila bloqueada) → SIN_PERMISO, sin crear nada', async () => {
    const { servicio, prisma } = armar({ propuesta: propuestaNueva(), persona: { ...discipuladorOk, rol: ['miembro_registrado'] } });
    expect(await codigoDe(servicio.aceptar('prop-1', DISCIPULADOR))).toBe('SIN_PERMISO');
    expect(prisma.liderazgo.create).not.toHaveBeenCalled();
  });

  it('`nueva` crea Grupo + Liderazgo (con propuestaId) + Inscripción (con solicitudId), Solicitud aprobada y emite propuesta_aceptada', async () => {
    const { servicio, prisma, emitir } = armar({ propuesta: propuestaNueva() });
    await expect(servicio.aceptar('prop-1', DISCIPULADOR)).resolves.toEqual({ grupoId: 'grupo-nuevo' });

    expect(prisma.grupo.create).toHaveBeenCalledWith(expect.objectContaining({ data: { cursoId: 'curso-vn', sedeId: 'sede-1', estado: 'en_curso' } }));
    expect(prisma.liderazgo.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { personaId: DISCIPULADOR, grupoId: 'grupo-nuevo', propuestaId: 'prop-1' } }),
    );
    expect(prisma.inscripcion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { personaId: 'persona-1', grupoId: 'grupo-nuevo', solicitudId: 'sol-1', estado: 'activa' } }),
    );
    expect(prisma.solicitudDiscipulado.update).toHaveBeenCalledWith(expect.objectContaining({ data: { estado: 'aprobada', grupoId: 'grupo-nuevo' } }));
    expect(prisma.propuestaDiscipulado.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ estado: 'aceptada' }) }));
    expect(emitir).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'propuesta_aceptada', a: { tipo: 'persona', personaId: 'persona-1' } }));
  });

  it('`nueva` con el Curso inactivo → CURSO_INACTIVO, sin Grupo ni Liderazgo y la Propuesta sigue pendiente (013 FR-054)', async () => {
    const { servicio, prisma, cursos, emitir } = armar({ propuesta: propuestaNueva() });
    cursos.exigirActivo.mockRejectedValue(Object.assign(new Error('inactivo'), { code: 'CURSO_INACTIVO' }));
    expect(await codigoDe(servicio.aceptar('prop-1', DISCIPULADOR))).toBe('CURSO_INACTIVO');
    expect(cursos.exigirActivo).toHaveBeenCalledWith('curso-vn', expect.anything());
    expect(prisma.grupo.create).not.toHaveBeenCalled();
    expect(prisma.liderazgo.create).not.toHaveBeenCalled();
    expect(prisma.propuestaDiscipulado.update).not.toHaveBeenCalled();
    expect(emitir).not.toHaveBeenCalled();
  });

  it('`nueva` si la Persona ya cursa o completó Vida Nueva → VIDA_NUEVA_EN_CURSO_O_COMPLETADA', async () => {
    const { servicio, prisma } = armar({ propuesta: propuestaNueva() });
    prisma.inscripcion.findFirst.mockResolvedValue({ id: 'otra' });
    expect(await codigoDe(servicio.aceptar('prop-1', DISCIPULADOR))).toBe('VIDA_NUEVA_EN_CURSO_O_COMPLETADA');
    expect(prisma.grupo.create).not.toHaveBeenCalled();
  });

  it('con grupoDestinoId y el Grupo lleno → GRUPO_SIN_LUGAR y la Propuesta sigue pendiente (no se escribe)', async () => {
    const { servicio, prisma, emitir } = armar({
      propuesta: propuestaNueva({ grupoDestinoId: 'g-dest' }),
      grupo: { id: 'g-dest', estado: 'en_curso', propuestaFinalizacionEn: null },
      persona: { ...discipuladorOk, maxPersonasPorGrupo: 2 },
    });
    prisma.liderazgo.findFirst.mockResolvedValue({ id: 'lid' });
    prisma.inscripcion.count.mockResolvedValue(2);
    expect(await codigoDe(servicio.aceptar('prop-1', DISCIPULADOR))).toBe('GRUPO_SIN_LUGAR');
    expect(prisma.propuestaDiscipulado.update).not.toHaveBeenCalled();
    expect(prisma.inscripcion.create).not.toHaveBeenCalled();
    expect(emitir).not.toHaveBeenCalled();
  });

  it('con grupoDestinoId y lugar → suma la Inscripción al Grupo destino, sin Grupo ni Liderazgo nuevos (FR-045); un Grupo ya en curso sigue aunque el Curso esté inactivo (013 FR-054)', async () => {
    const { servicio, prisma, cursos } = armar({
      propuesta: propuestaNueva({ grupoDestinoId: 'g-dest' }),
      grupo: { id: 'g-dest', estado: 'en_curso', propuestaFinalizacionEn: null },
      persona: { ...discipuladorOk, maxPersonasPorGrupo: 3 },
    });
    prisma.liderazgo.findFirst.mockResolvedValue({ id: 'lid' });
    prisma.inscripcion.count.mockResolvedValue(1);
    await expect(servicio.aceptar('prop-1', DISCIPULADOR)).resolves.toEqual({ grupoId: 'g-dest' });
    expect(prisma.grupo.create).not.toHaveBeenCalled();
    expect(prisma.liderazgo.create).not.toHaveBeenCalled();
    expect(prisma.inscripcion.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ grupoId: 'g-dest' }) }));
    expect(cursos.exigirActivo).not.toHaveBeenCalled();
  });

  it('`reasignacion` cierra el Liderazgo vigente (cerradoPorId = quien propuso) y abre otro', async () => {
    const { servicio, prisma } = armar({
      propuesta: propuestaNueva({ tipo: 'reasignacion', solicitudId: null, grupoId: 'g-1' }),
      grupo: { id: 'g-1', estado: 'en_curso', propuestaFinalizacionEn: null },
    });
    await expect(servicio.aceptar('prop-1', DISCIPULADOR)).resolves.toEqual({ grupoId: 'g-1' });
    expect(prisma.liderazgo.updateMany).toHaveBeenCalledWith({
      where: { grupoId: 'g-1', hasta: null },
      data: { hasta: expect.any(Date), cerradoPorId: 'admin-1' },
    });
    expect(prisma.liderazgo.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ personaId: DISCIPULADOR, grupoId: 'g-1', propuestaId: 'prop-1' }) }));
    expect(prisma.inscripcion.create).not.toHaveBeenCalled();
  });

  it('`reasignacion` sobre un Grupo ya cerrado → DISCIPULADO_NO_EN_CURSO', async () => {
    const { servicio } = armar({
      propuesta: propuestaNueva({ tipo: 'reasignacion', solicitudId: null, grupoId: 'g-1' }),
      grupo: { id: 'g-1', estado: 'finalizado', propuestaFinalizacionEn: null },
    });
    expect(await codigoDe(servicio.aceptar('prop-1', DISCIPULADOR))).toBe('DISCIPULADO_NO_EN_CURSO');
  });
});

describe('PropuestasService.declinar', () => {
  it('deja la Propuesta `declinada` con el motivo y la Solicitud en `pendiente`; avisa al Admin', async () => {
    const { servicio, prisma, emitir } = armar({ propuesta: propuestaNueva() });
    await servicio.declinar('prop-1', DISCIPULADOR, '  No tengo ese horario  ');
    expect(prisma.propuestaDiscipulado.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: 'declinada', motivoDeclinacion: 'No tengo ese horario' }) }),
    );
    expect(prisma.solicitudDiscipulado.update).toHaveBeenCalledWith(expect.objectContaining({ data: { estado: 'pendiente' } }));
    expect(emitir).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'propuesta_declinada', a: { tipo: 'admin' } }));
  });

  it('declinar una reasignación no toca ni la Solicitud ni el Grupo', async () => {
    const { servicio, prisma } = armar({
      propuesta: propuestaNueva({ tipo: 'reasignacion', solicitudId: null, grupoId: 'g-1' }),
      grupo: { id: 'g-1', estado: 'en_curso', propuestaFinalizacionEn: null },
    });
    await servicio.declinar('prop-1', DISCIPULADOR, undefined);
    expect(prisma.solicitudDiscipulado.update).not.toHaveBeenCalled();
    expect(prisma.grupo.update).not.toHaveBeenCalled();
    expect(prisma.liderazgo.updateMany).not.toHaveBeenCalled();
  });

  it('motivo de más de 500 caracteres → error de campo MOTIVO_DEMASIADO_LARGO, antes de tocar la base', async () => {
    const { servicio, prisma } = armar({ propuesta: propuestaNueva() });
    expect(await erroresDeCampo(servicio.declinar('prop-1', DISCIPULADOR, 'x'.repeat(501)))).toEqual([{ campo: 'motivo', code: 'MOTIVO_DEMASIADO_LARGO' }]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('una propuesta ya no vigente → PROPUESTA_NO_VIGENTE', async () => {
    const { servicio } = armar({ propuesta: propuestaNueva({ estado: 'aceptada' }) });
    expect(await codigoDe(servicio.declinar('prop-1', DISCIPULADOR, undefined))).toBe('PROPUESTA_NO_VIGENTE');
  });
});
