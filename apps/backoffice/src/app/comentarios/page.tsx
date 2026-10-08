import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Phone } from 'lucide-react';
import { apiFetch, formatearFechaHora, type ComentarioResumen, type FiltroRevisado, type Pagina, type TipoComentario } from '@vida-sobrenatural/shared-types';
import { requerirPermiso } from '../../auth';
import { EnlacePersona } from '../../components/enlace-persona';
import { PaginacionComentarios } from './paginacion-comentarios';
import { hrefComentarios } from './href';
import { Estado, TipoConIcono } from './marcas';

const POR_PAGINA = 20;
const REVISADOS: readonly FiltroRevisado[] = ['no', 'si', 'todos'];
const TIPOS: readonly TipoComentario[] = ['problema', 'sugerencia'];
const PAGINA_VALIDA = /^[1-9]\d*$/;

/**
 * spec 013, Historia 5 (T065; FR-046, FR-047): los comentarios de "Contanos
 * qué te parece". Filtro por estado (por defecto "Sin revisar") y por tipo,
 * con enlaces reales en la URL; paginado de a 20. Admin y Pastor
 * (`comentarios.ver`); marcar revisado se hace en el detalle. Cargando y
 * error: loading.tsx/error.tsx. Un filtro inválido → redirect.
 */
export default async function ComentariosPage({ searchParams }: { searchParams: Promise<{ revisado?: string; tipo?: string; pagina?: string }> }) {
  const session = await requerirPermiso('comentarios.ver');
  const q = await searchParams;
  const revisado = (q.revisado ?? 'no') as FiltroRevisado;
  const tipo = q.tipo as TipoComentario | undefined;
  if (!REVISADOS.includes(revisado) || (tipo !== undefined && !TIPOS.includes(tipo)) || (q.pagina !== undefined && !PAGINA_VALIDA.test(q.pagina))) {
    redirect('/comentarios');
  }
  const pagina = q.pagina ? Number(q.pagina) : 1;
  const datos = await apiFetch<Pagina<ComentarioResumen>>(
    `/comentarios?revisado=${revisado}${tipo ? `&tipo=${tipo}` : ''}&skip=${(pagina - 1) * POR_PAGINA}&take=${POR_PAGINA}`,
    { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' },
  );
  const totalPaginas = Math.max(1, Math.ceil(datos.total / POR_PAGINA));
  if (pagina > totalPaginas) redirect(hrefComentarios({ revisado, tipo, pagina: totalPaginas }));

  const t = await getTranslations('comentarios');
  const locale = await getLocale();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Filtro etiqueta={t('filtros.revisado')}>
          {REVISADOS.map((r) => (
            <EnlaceFiltro key={r} href={hrefComentarios({ revisado: r, tipo })} actual={r === revisado}>
              {t(`filtros.${r}`)}
            </EnlaceFiltro>
          ))}
        </Filtro>
        <Filtro etiqueta={t('filtros.tipo')}>
          <EnlaceFiltro href={hrefComentarios({ revisado })} actual={!tipo}>
            {t('filtros.todosLosTipos')}
          </EnlaceFiltro>
          {TIPOS.map((tp) => (
            <EnlaceFiltro key={tp} href={hrefComentarios({ revisado, tipo: tp })} actual={tp === tipo}>
              {t(`filtros.${tp}`)}
            </EnlaceFiltro>
          ))}
        </Filtro>
      </div>

      {datos.items.length === 0 ? (
        <p className="text-muted-foreground">{tipo ? t('vacioTipo') : t(`vacio.${revisado}`)}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {datos.items.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <TipoConIcono tipo={c.tipo} texto={t(`tipo.${c.tipo}`)} />
                <span className="text-muted-foreground">{formatearFechaHora(c.createdAt, locale)}</span>
                <span className="text-muted-foreground">{t('desde', { app: t(`apps.${c.app}`), pagina: c.paginaOrigen })}</span>
              </div>
              <Link href={`/comentarios/${c.id}`} className="w-fit break-words underline underline-offset-4">
                {c.extracto}
              </Link>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  {t('columnas.quien')}: {c.persona ? <EnlacePersona persona={c.persona} /> : t('sinSesion')}
                </span>
                {c.aceptaContacto && (
                  <span className="inline-flex items-center gap-1">
                    <Phone aria-hidden className="size-4" />
                    {t('aceptaContacto')}
                  </span>
                )}
                <Estado revisado={c.revisado !== null} textoRevisado={t('revisado')} textoSinRevisar={t('sinRevisar')} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <PaginacionComentarios revisado={revisado} tipo={tipo} paginaActual={pagina} totalPaginas={totalPaginas} etiqueta={t('paginado')} />
    </div>
  );
}

function Filtro({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <nav aria-label={etiqueta} className="flex flex-col gap-1">
      <span className="text-sm font-medium">{etiqueta}</span>
      <ul className="flex flex-wrap gap-2">{children}</ul>
    </nav>
  );
}

function EnlaceFiltro({ href, actual, children }: { href: string; actual: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={actual ? 'page' : undefined}
        className="inline-flex min-h-11 items-center rounded-md border border-border px-3 underline-offset-4 hover:underline aria-[current=page]:border-primary aria-[current=page]:font-semibold aria-[current=page]:underline"
      >
        {children}
      </Link>
    </li>
  );
}
