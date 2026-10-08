import { Injectable } from '@nestjs/common';
import {
  CURSOS_RECONOCIDOS,
  cursoReconocido,
  type CursoDetalle,
  type CursoDisponible,
  type CursoEnPapelera,
  type CursoListado,
  type ResumenCatalogos,
} from '@vida-sobrenatural/shared-types';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import type { ActualizarCursoDto, CrearCursoDto } from './dto/curso.dto.js';

type Tx = Prisma.TransactionClient;

const CURSO_SELECT = {
  id: true,
  nombre: true,
  categoria: true,
  tipo: true,
  modalidad: true,
  activo: true,
  descripcion: true,
  createdAt: true,
  updatedAt: true,
} as const;

type CursoFila = Prisma.CursoGetPayload<{ select: typeof CURSO_SELECT }>;

/**
 * spec 013, Historia 6 (T070, contracts/cursos-api.md, D212): el catálogo de
 * Cursos con el patrón de Sedes (D117, D119). Las combinaciones las fija el
 * código (`CURSOS_RECONOCIDOS`): se puede editar el nombre y la descripción,
 * inactivar, eliminar (si no tiene Grupos) y restaurar — nunca la categoría,
 * el tipo ni la modalidad.
 */
@Injectable()
export class CursoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(incluirInactivos: boolean): Promise<CursoListado[]> {
    const cursos = await this.prisma.curso.findMany({
      where: { eliminadoEn: null, ...(incluirInactivos ? {} : { activo: true }) },
      select: CURSO_SELECT,
      orderBy: [{ categoria: 'asc' }, { tipo: 'asc' }],
    });
    const grupos = await this.contarGrupos(cursos.map((c) => c.id));
    return cursos.map((c) => listado(c, grupos.get(c.id)));
  }

  async detalle(id: string): Promise<CursoDetalle> {
    const curso = await this.prisma.curso.findFirst({ where: { id, eliminadoEn: null }, select: CURSO_SELECT });
    if (!curso) throw noEncontrado();
    const grupos = await this.contarGrupos([id]);
    return { ...listado(curso, grupos.get(id)), descripcion: curso.descripcion, createdAt: curso.createdAt.toISOString(), updatedAt: curso.updatedAt.toISOString() };
  }

  async disponiblesParaAlta(): Promise<CursoDisponible[]> {
    const existentes = await this.prisma.curso.findMany({ select: { categoria: true, tipo: true, eliminadoEn: true } });
    return CURSOS_RECONOCIDOS.flatMap((r) => {
      const existente = existentes.find((e) => e.categoria === r.categoria && e.tipo === r.tipo);
      if (existente && !existente.eliminadoEn) return [];
      return [{ categoria: r.categoria, tipo: r.tipo, modalidad: r.modalidad, restaurar: !!existente }];
    });
  }

  /** FR-056: solo combinaciones reconocidas; una que está en la papelera se restaura con los datos nuevos. */
  async crear(dto: CrearCursoDto): Promise<CursoDetalle> {
    const reconocido = cursoReconocido(dto.categoria, dto.tipo);
    if (!reconocido) {
      throw new AppException('CURSO_NO_RECONOCIDO', 400, 'Esa combinación de categoría y tipo no es un Curso que la app sepa llevar.', [
        { campo: 'tipo', code: 'CURSO_NO_RECONOCIDO' },
      ]);
    }
    const existente = await this.prisma.curso.findUnique({ where: { categoria_tipo: { categoria: reconocido.categoria, tipo: reconocido.tipo } }, select: { id: true, eliminadoEn: true } });
    if (existente && !existente.eliminadoEn) throw new AppException('CURSO_YA_EXISTE', 409, 'Ese Curso ya existe.', [{ campo: 'tipo', code: 'CURSO_YA_EXISTE' }]);
    const datos = { nombre: dto.nombre.trim(), descripcion: dto.descripcion?.trim() || null };
    const id = existente
      ? (await this.prisma.curso.update({ where: { id: existente.id }, data: { ...datos, activo: true, eliminadoEn: null, eliminadoPor: null }, select: { id: true } })).id
      : (
          await this.prisma.curso.create({
            data: { ...datos, categoria: reconocido.categoria, tipo: reconocido.tipo, modalidad: reconocido.modalidad, prerequisitoCategoria: reconocido.prerequisitoCategoria },
            select: { id: true },
          })
        ).id;
    return this.detalle(id);
  }

  async actualizar(id: string, dto: ActualizarCursoDto): Promise<CursoDetalle> {
    await this.exigirNoEliminado(id);
    await this.prisma.curso.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion?.trim() || null } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });
    return this.detalle(id);
  }

  /** D119: borrado lógico; no se puede con Grupos (en curso o terminados) — se ofrece inactivar. */
  async eliminar(id: string, eliminadoPor: string): Promise<void> {
    await this.exigirNoEliminado(id);
    const grupos = await this.prisma.grupo.count({ where: { cursoId: id } });
    if (grupos > 0) {
      throw new AppException('CURSO_TIENE_GRUPOS', 409, `No se puede eliminar: tiene ${grupos} Grupo(s). Inactivalo en su lugar.`, undefined, { grupos });
    }
    await this.prisma.curso.update({ where: { id }, data: { eliminadoEn: new Date(), eliminadoPor } });
  }

  async papelera(): Promise<CursoEnPapelera[]> {
    const cursos = await this.prisma.curso.findMany({
      where: { eliminadoEn: { not: null } },
      select: { id: true, nombre: true, categoria: true, tipo: true, eliminadoEn: true },
      orderBy: { eliminadoEn: 'desc' },
    });
    return cursos.map((c) => ({ ...c, eliminadoEn: c.eliminadoEn!.toISOString() }));
  }

  async restaurar(id: string): Promise<CursoDetalle> {
    const curso = await this.prisma.curso.findUnique({ where: { id }, select: { eliminadoEn: true } });
    if (!curso || !curso.eliminadoEn) throw new AppException('NO_ENCONTRADO', 404, 'Ese Curso no está en la papelera.');
    await this.prisma.curso.update({ where: { id }, data: { eliminadoEn: null, eliminadoPor: null } });
    return this.detalle(id);
  }

  async resumen(): Promise<ResumenCatalogos> {
    const [sedesActivas, sedes, cursosActivos, cursos] = await Promise.all([
      this.prisma.sede.count({ where: { eliminadoEn: null, activo: true } }),
      this.prisma.sede.count({ where: { eliminadoEn: null } }),
      this.prisma.curso.count({ where: { eliminadoEn: null, activo: true } }),
      this.prisma.curso.count({ where: { eliminadoEn: null } }),
    ]);
    return { sedes: { activos: sedesActivas, total: sedes }, cursos: { activos: cursosActivos, total: cursos } };
  }

  /**
   * FR-054 (research #12): un Curso inactivo o eliminado no abre Grupos
   * nuevos. Lo llama, dentro de su transacción, quien crea un Grupo (la
   * aceptación de una propuesta de la 004; la 008 al abrir un Grupo de Vida de
   * Servicio). Sumar a un Grupo que ya está en curso no pasa por acá.
   */
  async exigirActivo(cursoId: string, tx: Tx | PrismaService = this.prisma): Promise<void> {
    const curso = await tx.curso.findUnique({ where: { id: cursoId }, select: { activo: true, eliminadoEn: true } });
    if (!curso || !curso.activo || curso.eliminadoEn) {
      throw new AppException('CURSO_INACTIVO', 409, 'Ese Curso está inactivo: no se pueden abrir Grupos nuevos. Reactivalo desde Catálogos › Cursos.');
    }
  }

  private async exigirNoEliminado(id: string) {
    const curso = await this.prisma.curso.findUnique({ where: { id }, select: { eliminadoEn: true } });
    if (!curso || curso.eliminadoEn) throw noEncontrado();
  }

  /** Grupos en curso y en total por Curso, en una consulta. */
  private async contarGrupos(ids: string[]): Promise<Map<string, { enCurso: number; total: number }>> {
    if (ids.length === 0) return new Map();
    const filas = await this.prisma.grupo.groupBy({ by: ['cursoId', 'estado'], where: { cursoId: { in: ids } }, _count: { _all: true } });
    const mapa = new Map<string, { enCurso: number; total: number }>();
    for (const f of filas) {
      const actual = mapa.get(f.cursoId) ?? { enCurso: 0, total: 0 };
      actual.total += f._count._all;
      if (f.estado === 'en_curso') actual.enCurso += f._count._all;
      mapa.set(f.cursoId, actual);
    }
    return mapa;
  }
}

function listado(c: CursoFila, grupos?: { enCurso: number; total: number }): CursoListado {
  return {
    id: c.id,
    nombre: c.nombre,
    categoria: c.categoria,
    tipo: c.tipo,
    modalidad: c.modalidad,
    activo: c.activo,
    gruposEnCurso: grupos?.enCurso ?? 0,
    tieneGrupos: (grupos?.total ?? 0) > 0,
  };
}

function noEncontrado() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe un Curso con ese id.');
}
