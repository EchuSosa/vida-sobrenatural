import { CursoService } from '../../src/curso/curso.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';

/** spec 013, T072 (FR-056): la regla de alta de Cursos con una base falsa. */
function servicio(existente: { id: string; eliminadoEn: Date | null } | null) {
  const llamadas: string[] = [];
  const prisma = {
    curso: {
      findUnique: async () => existente,
      findFirst: async () => ({ id: 'c1', nombre: 'Vida Nueva', categoria: 'vida_nueva', tipo: 'grupal', modalidad: 'seguimiento_por_encuentros', activo: true, descripcion: null, createdAt: new Date(), updatedAt: new Date() }),
      create: async () => {
        llamadas.push('create');
        return { id: 'c1' };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        llamadas.push(`update:${data.eliminadoEn === null ? 'restaurar' : 'otro'}`);
        return { id: 'c1' };
      },
    },
    grupo: { groupBy: async () => [] },
  } as unknown as PrismaService;
  return { servicio: new CursoService(prisma), llamadas };
}

describe('CursoService.crear', () => {
  const dto = { categoria: 'vida_nueva' as const, tipo: 'grupal' as const, nombre: 'Vida Nueva grupal' };

  it('una combinación reconocida y libre se crea', async () => {
    const { servicio: s, llamadas } = servicio(null);
    await expect(s.crear(dto)).resolves.toMatchObject({ id: 'c1' });
    expect(llamadas).toEqual(['create']);
  });

  it('una que ya existe → CURSO_YA_EXISTE', async () => {
    await expect(servicio({ id: 'c1', eliminadoEn: null }).servicio.crear(dto)).rejects.toMatchObject({ code: 'CURSO_YA_EXISTE' });
  });

  it('una que está en la papelera se restaura', async () => {
    const { servicio: s, llamadas } = servicio({ id: 'c1', eliminadoEn: new Date() });
    await s.crear(dto);
    expect(llamadas).toEqual(['update:restaurar']);
  });

  it('una que el código no reconoce → CURSO_NO_RECONOCIDO', async () => {
    await expect(servicio(null).servicio.crear({ ...dto, categoria: 'vida_de_servicio', tipo: 'individual' })).rejects.toMatchObject({ code: 'CURSO_NO_RECONOCIDO' });
  });
});
