import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ApiError, apiFetch, formatearDiaEnArgentina, formatearTamanio, type ContenidoParaPersona } from '@vida-sobrenatural/shared-types';
import { ButtonLink, ContenidoSemana, EstadoVacio, MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../../../auth';

/**
 * spec 008, T046 (FR-020, FR-021, FR-024, FR-034, D83): el material de una
 * semana para la Persona. Si no la puede ver (todavía no es su fecha, o ya no
 * tiene acceso), la API responde 404 sin decir por qué y la pantalla lo
 * explica con amabilidad (no es un error). Los archivos se abren por
 * `../../archivos/[archivoId]`, que los pide a la API con la sesión.
 */
export default async function SemanaVidaDeServicioPage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const session = await auth();
  const [t, tMiCamino, locale] = await Promise.all([getTranslations('vidaDeServicio'), getTranslations('miCamino'), getLocale()]);

  let contenido: ContenidoParaPersona | null = null;
  try {
    contenido = await apiFetch<ContenidoParaPersona>(`/vida-de-servicio/me/semanas/${encodeURIComponent(numero)}`, {
      headers: { Authorization: `Bearer ${session?.apiToken}` },
      cache: 'no-store',
    });
  } catch (error) {
    // 404 (y un número inválido, 400) = "no disponible"; lo demás lo atrapa error.tsx.
    if (!(error instanceof ApiError) || !['CONTENIDO_NO_DISPONIBLE', 'VALIDACION'].includes(error.code)) throw error;
  }

  const miga = [
    { label: tMiCamino('titulo'), href: '/mi-camino' },
    { label: t('titulo'), href: '/mi-camino/vida-de-servicio' },
    { label: t('semana', { numero }) },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={miga} LinkComponente={Link} />
      {contenido ? (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-base text-muted-foreground">
              {t('semana', { numero: contenido.numero })} · {formatearDiaEnArgentina(contenido.fechaLiberacion, locale)}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight break-words">{contenido.titulo}</h1>
          </div>
          <ContenidoSemana
            contenido={contenido}
            hrefArchivo={(id) => `/mi-camino/vida-de-servicio/archivos/${id}`}
            textos={{
              archivosTitulo: t('contenido.archivosTitulo'),
              enlacesTitulo: t('contenido.enlacesTitulo'),
              abrirArchivo: (a) => t('contenido.abrirArchivo', { nombre: a.nombre, tamanio: formatearTamanio(a.tamanioBytes, locale) }),
            }}
          />
          <ButtonLink render={<Link href="/mi-camino/vida-de-servicio" />} variant="outline" size="xl" className="w-fit text-base">
            {t('contenido.volverASemanas')}
          </ButtonLink>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">{t('contenido.noDisponibleTitulo')}</h1>
          <EstadoVacio
            mensaje={t('contenido.noDisponibleTexto')}
            accion={
              <ButtonLink render={<Link href="/mi-camino/vida-de-servicio" />} size="xl" className="text-base">
                {t('contenido.volverASemanas')}
              </ButtonLink>
            }
          />
        </>
      )}
    </div>
  );
}
