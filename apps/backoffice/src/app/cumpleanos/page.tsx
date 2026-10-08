import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Cake } from 'lucide-react';
import { CUMPLEANOS_PAGINA, apiFetch, hoyEnArgentina, type Cumpleanero, type Pagina } from '@vida-sobrenatural/shared-types';
import { AvatarPersona } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../auth';
import { EnlacePersona } from '../../components/enlace-persona';
import { PaginacionCumpleanos } from './paginacion-cumpleanos';

const MES_VALIDO = /^(?:[1-9]|1[0-2])$/;
const PAGINA_VALIDA = /^[1-9]\d*$/;
const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * spec 013, Historia 4 (T052, FR-030): quién cumple años en un mes (por
 * defecto el actual, en Argentina), del año en curso. Mes y página en la URL
 * con enlaces reales; `?mes=` o `?pagina=` inválidos → redirect (docs/15).
 */
export default async function CumpleanosPage({ searchParams }: { searchParams: Promise<{ mes?: string; pagina?: string }> }) {
  const session = await requerirPermiso('personas.ver');
  const { mes: mesParam, pagina: paginaParam } = await searchParams;
  const mesActual = Number(hoyEnArgentina().slice(5, 7));
  if (mesParam !== undefined && !MES_VALIDO.test(mesParam)) redirect('/cumpleanos');
  const mes = mesParam ? Number(mesParam) : mesActual;
  const paginaValida = paginaParam === undefined || PAGINA_VALIDA.test(paginaParam);
  const pagina = paginaParam && paginaValida ? Number(paginaParam) : 1;

  const datos = await apiFetch<Pagina<Cumpleanero>>(`/personas/cumpleanos?mes=${mes}&skip=${(pagina - 1) * CUMPLEANOS_PAGINA}&take=${CUMPLEANOS_PAGINA}`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });
  const totalPaginas = Math.max(1, Math.ceil(datos.total / CUMPLEANOS_PAGINA));
  if (!paginaValida || pagina > totalPaginas) {
    const final = Math.min(pagina, totalPaginas);
    redirect(`/cumpleanos?mes=${mes}${final > 1 ? `&pagina=${final}` : ''}`);
  }

  const t = await getTranslations('cumpleanos');
  const nombreMes = t(`meses.${mes}` as 'meses.1');

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('tituloMes', { mes: nombreMes })}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </div>

      <nav aria-label={t('elegirMes')}>
        <ul className="flex flex-wrap gap-2">
          {MESES.map((m) => (
            <li key={m}>
              <Link
                href={`/cumpleanos?mes=${m}`}
                aria-current={m === mes ? 'page' : undefined}
                className="inline-flex min-h-11 items-center rounded-md border border-border px-3 underline-offset-4 hover:underline aria-[current=page]:border-primary aria-[current=page]:font-semibold aria-[current=page]:underline"
              >
                {t(`meses.${m}` as 'meses.1')}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {datos.items.length === 0 ? (
        <p className="text-muted-foreground">{t('vacioMes', { mes: nombreMes })}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t('tituloMes', { mes: nombreMes })}</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('columnas.nombre')}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('columnas.dia')}
                </th>
                <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                  {t('columnas.telefono')}
                </th>
              </tr>
            </thead>
            <tbody>
              {datos.items.map((c) => (
                <tr key={c.persona.id} className="border-b border-border last:border-0">
                  <th scope="row" className="px-3 py-3 text-left font-normal">
                    <span className="flex items-start gap-2">
                      <AvatarPersona nombre={c.persona.nombre} apellido={c.persona.apellido} fotoUrl={c.persona.fotoUrl} tamanio="sm" className="max-sm:hidden" />
                      <span className="flex flex-col gap-0.5">
                        <EnlacePersona persona={c.persona} className="font-medium" />
                        <span className="text-muted-foreground">{t(c.yaPaso ? 'cumplio' : 'cumple', { anios: c.cumple })}</span>
                        <a href={`tel:${c.telefono.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-11 items-center underline underline-offset-2 sm:hidden">
                          {c.telefono}
                        </a>
                      </span>
                    </span>
                  </th>
                  <td className="px-3 py-3 align-top">
                    <span className="flex flex-col gap-0.5">
                      <span>{c.dia}</span>
                      {c.esHoy && (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Cake aria-hidden className="size-4" />
                          {t('hoy')}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 align-top sm:table-cell">
                    <a href={`tel:${c.telefono.replace(/[^\d+]/g, '')}`} className="underline underline-offset-2">
                      {c.telefono}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PaginacionCumpleanos mes={mes} paginaActual={pagina} totalPaginas={totalPaginas} etiqueta={t('paginado')} />
    </div>
  );
}
