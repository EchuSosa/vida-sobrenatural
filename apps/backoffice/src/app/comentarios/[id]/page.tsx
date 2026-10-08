import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ApiError, apiFetch, formatearFechaHora, type ComentarioDetalle } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { EnlacePersona } from '../../../components/enlace-persona';
import { Estado, TipoConIcono } from '../marcas';
import { AccionRevisado } from './accion-revisado';

/**
 * spec 013, Historia 5 (T065; FR-046–FR-048): un comentario entero. El texto
 * se muestra como texto plano (React lo escapa: `<b>` se ve literal, FR-048),
 * con los datos técnicos y el contacto solo si aceptó que la contacten.
 * "Marcar como revisado"/"Deshacer" solo con `comentarios.gestionar` (el
 * Pastor lo lee sin el botón, H5.8).
 */
export default async function ComentarioPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('comentarios.ver');
  const { id } = await params;
  let c: ComentarioDetalle;
  try {
    c = await apiFetch<ComentarioDetalle>(`/comentarios/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const t = await getTranslations('comentarios');
  const locale = await getLocale();
  const fecha = formatearFechaHora(c.createdAt, locale);
  const puedeMarcar = tienePermisoSesion(session, 'comentarios.gestionar');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('miga'), href: '/comentarios' }, { label: fecha }]} LinkComponente={Link} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('detalleTitulo', { tipo: t(`tipo.${c.tipo}`), fecha })}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <TipoConIcono tipo={c.tipo} texto={t(`tipo.${c.tipo}`)} />
          <Estado revisado={c.revisado !== null} textoRevisado={t('revisado')} textoSinRevisar={t('sinRevisar')} />
        </div>
        {c.revisado && (
          <p className="text-muted-foreground">
            {t('revisadoPor', { nombre: `${c.revisado.por.nombre} ${c.revisado.por.apellido}`, fecha: formatearFechaHora(c.revisado.en, locale) })}
          </p>
        )}
      </div>

      {puedeMarcar && <AccionRevisado id={c.id} revisado={c.revisado !== null} />}

      <Seccion id="texto" titulo={t('texto')}>
        <p className="whitespace-pre-wrap break-words rounded-lg border border-border p-4">{c.texto}</p>
      </Seccion>

      <Seccion id="datos" titulo={t('datos')}>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Dato termino={t('campos.quien')}>{c.persona ? <EnlacePersona persona={c.persona} /> : t('sinSesion')}</Dato>
          <Dato termino={t('campos.fecha')}>{fecha}</Dato>
          <Dato termino={t('campos.app')}>{t(`apps.${c.app}`)}</Dato>
          <Dato termino={t('campos.pagina')}>
            <code className="break-all">{c.paginaOrigen}</code>
          </Dato>
        </dl>
      </Seccion>

      <Seccion id="contacto" titulo={t('contacto')}>
        {!c.contacto ? (
          <p>{t('noAceptaContacto')}</p>
        ) : !c.contacto.email && !c.contacto.telefono ? (
          <p>{t('contactoSinDatos')}</p>
        ) : (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {c.contacto.email && (
              <Dato termino={t('contactoEmail')}>
                <a href={`mailto:${c.contacto.email}`} className="inline-flex min-h-11 items-center break-all underline underline-offset-2">
                  {c.contacto.email}
                </a>
              </Dato>
            )}
            {c.contacto.telefono && (
              <Dato termino={t('contactoTelefono')}>
                <a href={`tel:${c.contacto.telefono.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-11 items-center underline underline-offset-2">
                  {c.contacto.telefono}
                </a>
              </Dato>
            )}
          </dl>
        )}
      </Seccion>

      <Seccion id="tecnicos" titulo={t('datosTecnicos')}>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Dato termino={t('campos.navegador')}>{c.navegador ?? t('sinDato')}</Dato>
          <Dato termino={t('campos.requestId')}>{c.ultimoRequestId ? <code className="break-all">{c.ultimoRequestId}</code> : t('sinDato')}</Dato>
        </dl>
      </Seccion>
    </div>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`seccion-${id}`} className="flex flex-col gap-3">
      <h2 id={`seccion-${id}`} className="text-xl font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{termino}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}
