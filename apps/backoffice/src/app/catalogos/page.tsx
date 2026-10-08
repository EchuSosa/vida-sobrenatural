import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Building2, ChevronRight, GraduationCap } from 'lucide-react';
import type { ReactNode } from 'react';
import { apiFetch, type ResumenCatalogos } from '@vida-sobrenatural/shared-types';
import { requerirPermiso } from '../../auth';

/**
 * spec 013, Historia 6 (T074, FR-050): el índice de los catálogos — una
 * tarjeta por catálogo con cuántos activos tiene y enlace a su pantalla.
 * Nunca una tarjeta de algo que todavía no existe (Principio IV). Si el
 * resumen no carga, las tarjetas siguen (solo sin el número).
 */
export default async function CatalogosPage() {
  // H-132: exige el mismo permiso que le asigna NAV_BACKOFFICE.
  const session = await requerirPermiso('catalogos.ver');
  const t = await getTranslations('catalogos');
  let resumen: ResumenCatalogos | null = null;
  try {
    resumen = await apiFetch<ResumenCatalogos>('/catalogos/resumen', { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' });
  } catch {
    resumen = null;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </div>
      {!resumen && <p role="status">{t('error')}</p>}
      <ul className="grid gap-4 sm:grid-cols-2">
        <Tarjeta href="/sedes" icono={<Building2 aria-hidden className="size-5" />} titulo={t('sedes.titulo')} texto={t('sedes.texto')}>
          {resumen && t('cantidadSedes', resumen.sedes)}
        </Tarjeta>
        <Tarjeta href="/cursos" icono={<GraduationCap aria-hidden className="size-5" />} titulo={t('cursos.titulo')} texto={t('cursos.texto')}>
          {resumen && t('cantidad', resumen.cursos)}
        </Tarjeta>
        {/* spec 009 (lote C): la tarjeta de Ministerios y Células va acá, en su propia línea. */}
      </ul>
    </div>
  );
}

function Tarjeta({ href, icono, titulo, texto, children }: { href: string; icono: ReactNode; titulo: string; texto: string; children?: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex h-full items-start gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground hover:bg-muted/50">
        {icono}
        <span className="flex flex-1 flex-col gap-1">
          <span className="font-semibold underline underline-offset-4">{titulo}</span>
          <span className="text-muted-foreground">{texto}</span>
          {children && <span className="text-sm">{children}</span>}
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 self-center" />
      </Link>
    </li>
  );
}
