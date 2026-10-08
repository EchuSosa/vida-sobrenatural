import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ApiError, apiFetch, formatearDiaEnArgentina, formatearTamanio, type ContenidoParaLider, type MiGrupoDetalle } from '@vida-sobrenatural/shared-types';
import { ContenidoSemana, EstadoSemana, MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso, tienePermisoSesion } from '../../../../../../auth';
import { FormularioMaterial } from './formulario-material';

/**
 * spec 008, T041 (FR-020 a FR-023, FR-043): cargar o editar el material de
 * una semana, 360 px primero. Muestra el estado de la semana y quién cargó y
 * editó; el formulario (título, texto, archivos con texto alternativo para
 * las imágenes, enlaces con su texto) va con errores por campo (H-50) y
 * "Guardar material" en la zona del pulgar. En una edición terminada, solo
 * lectura. Una edición ajena o una semana que no existe: 404.
 */
export default async function MaterialSemanaPage({ params }: { params: Promise<{ grupoId: string; numero: string }> }) {
  const session = await requerirPermiso('mis_grupos.ver');
  const { grupoId, numero } = await params;
  const [t, tv, locale] = await Promise.all([getTranslations('misGrupos'), getTranslations('vidaDeServicio'), getLocale()]);
  const headers = { Authorization: `Bearer ${session.apiToken}` };
  let grupo: MiGrupoDetalle;
  let contenido: ContenidoParaLider;
  try {
    [grupo, contenido] = await Promise.all([
      apiFetch<MiGrupoDetalle>(`/vida-de-servicio/mis-grupos/${encodeURIComponent(grupoId)}`, { headers, cache: 'no-store' }),
      apiFetch<ContenidoParaLider>(`/vida-de-servicio/mis-grupos/${encodeURIComponent(grupoId)}/semanas/${encodeURIComponent(numero)}`, { headers, cache: 'no-store' }),
    ]);
  } catch (e) {
    if (e instanceof ApiError && ['GRUPO_NO_ENCONTRADO', 'SEMANA_NO_ENCONTRADA', 'VALIDACION'].includes(e.code)) notFound();
    throw e;
  }
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const puedeEditar = grupo.estado === 'en_curso' && tienePermisoSesion(session, 'mis_grupos.gestionar');
  const material = 'titulo' in contenido ? contenido : null;
  const estados = {
    liberada: tv('estadosSemana.liberada'),
    proxima: tv('estadosSemana.proxima'),
    sin_material: tv('estadosSemana.sin_material'),
    cargado_por_liberar: tv('estadosSemana.cargado_por_liberar'),
    vencida_sin_material: tv('estadosSemana.vencida_sin_material'),
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan
        tramos={[{ label: t('titulo'), href: '/mis-grupos' }, { label: grupo.nombre, href: `/mis-grupos/${grupo.grupoId}` }, { label: t('material.titulo', { numero: contenido.numero }) }]}
        LinkComponente={Link}
      />
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t('material.titulo', { numero: contenido.numero })}</h1>
        <p className="text-base text-muted-foreground">{t('material.fecha', { fecha: fecha(contenido.fechaLiberacion) })}</p>
        <EstadoSemana estado={contenido.estado} textos={estados} className="text-base" />
        {material?.cargadoPor && (
          <p className="text-base text-muted-foreground">{t('material.cargadoPor', { nombre: `${material.cargadoPor.nombre} ${material.cargadoPor.apellido}`, fecha: fecha(material.cargadoEn) })}</p>
        )}
        {material?.editadoPor && material.editadoEn && (
          <p className="text-base text-muted-foreground">{t('material.editadoPor', { nombre: `${material.editadoPor.nombre} ${material.editadoPor.apellido}`, fecha: fecha(material.editadoEn) })}</p>
        )}
      </div>

      {puedeEditar ? (
        <FormularioMaterial
          grupoId={grupo.grupoId}
          numero={contenido.numero}
          inicial={
            material
              ? { titulo: material.titulo, texto: material.texto ?? '', archivos: material.archivos, enlaces: material.enlaces }
              : { titulo: '', texto: '', archivos: [], enlaces: [] }
          }
        />
      ) : (
        <>
          {grupo.estado !== 'en_curso' && <p role="note" className="rounded-md border border-border p-3 text-base">{t('material.terminada')}</p>}
          {material && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold break-words">{material.titulo}</h2>
              <ContenidoSemana
                contenido={material}
                hrefArchivo={(id) => `/mi-camino/vida-de-servicio/archivos/${id}`}
                textos={{
                  archivosTitulo: tv('contenido.archivosTitulo'),
                  enlacesTitulo: tv('contenido.enlacesTitulo'),
                  abrirArchivo: (a) => tv('contenido.abrirArchivo', { nombre: a.nombre, tamanio: formatearTamanio(a.tamanioBytes, locale) }),
                }}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
