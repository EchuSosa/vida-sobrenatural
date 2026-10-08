import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ApiError, apiFetch, formatearDiaEnArgentina, formatearTamanio, type ContenidoParaLider, type EdicionAdminDetalle } from '@vida-sobrenatural/shared-types';
import { ContenidoSemana, EstadoSemana, MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../../../../../auth';

/**
 * spec 008, T061 (FR-038): el material de una semana en lectura, para el
 * Admin y el Pastor, con los archivos abiertos por la API con la sesión.
 */
export default async function MaterialEdicionPage({ params }: { params: Promise<{ id: string; numero: string }> }) {
  const session = await requerirPermiso('grupos.ver');
  const { id, numero } = await params;
  const [t, tg, locale] = await Promise.all([getTranslations('edicionesServicio.material'), getTranslations('grupos'), getLocale()]);
  const headers = { Authorization: `Bearer ${session.apiToken}` };
  let edicion: EdicionAdminDetalle;
  let contenido: ContenidoParaLider;
  try {
    [edicion, contenido] = await Promise.all([
      apiFetch<EdicionAdminDetalle>(`/grupos/vida-de-servicio/${encodeURIComponent(id)}`, { headers, cache: 'no-store' }),
      apiFetch<ContenidoParaLider>(`/grupos/vida-de-servicio/${encodeURIComponent(id)}/semanas/${encodeURIComponent(numero)}`, { headers, cache: 'no-store' }),
    ]);
  } catch (e) {
    if (e instanceof ApiError && ['GRUPO_NO_ENCONTRADO', 'SEMANA_NO_ENCONTRADA', 'VALIDACION'].includes(e.code)) notFound();
    throw e;
  }
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const material = 'titulo' in contenido ? contenido : null;
  const estados = {
    liberada: t('estados.liberada'),
    proxima: t('estados.proxima'),
    sin_material: t('estados.sin_material'),
    cargado_por_liberar: t('estados.cargado_por_liberar'),
    vencida_sin_material: t('estados.vencida_sin_material'),
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan
        tramos={[{ label: tg('titulo'), href: '/grupos?curso=vida_de_servicio' }, { label: edicion.nombre, href: `/grupos/vida-de-servicio/${edicion.grupoId}` }, { label: `${contenido.numero}` }]}
        LinkComponente={Link}
      />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold break-words">{t('titulo', { edicion: edicion.nombre, numero: contenido.numero })}</h1>
        <p className="text-muted-foreground">{t('fecha', { fecha: fecha(contenido.fechaLiberacion) })}</p>
        <EstadoSemana estado={contenido.estado} textos={estados} />
        {material?.cargadoPor && <p className="text-sm text-muted-foreground">{t('cargadoPor', { nombre: `${material.cargadoPor.nombre} ${material.cargadoPor.apellido}`, fecha: fecha(material.cargadoEn) })}</p>}
        {material?.editadoPor && material.editadoEn && (
          <p className="text-sm text-muted-foreground">{t('editadoPor', { nombre: `${material.editadoPor.nombre} ${material.editadoPor.apellido}`, fecha: fecha(material.editadoEn) })}</p>
        )}
      </div>
      {material ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold break-words">{material.titulo}</h2>
          <ContenidoSemana
            contenido={material}
            hrefArchivo={(archivoId) => `/grupos/vida-de-servicio/archivos/${archivoId}`}
            textos={{
              archivosTitulo: t('archivosTitulo'),
              enlacesTitulo: t('enlacesTitulo'),
              abrirArchivo: (a) => t('abrirArchivo', { nombre: a.nombre, tamanio: formatearTamanio(a.tamanioBytes, locale) }),
            }}
          />
        </section>
      ) : (
        <p className="text-muted-foreground">{t('sinMaterial')}</p>
      )}
    </div>
  );
}
