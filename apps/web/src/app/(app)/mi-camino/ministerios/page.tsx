import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronRight, GraduationCap, Info } from 'lucide-react';
import { apiFetch, type EstadoMiMinisterio, type MinisterioParaPostularse } from '@vida-sobrenatural/shared-types';
import { AvisoEstado, ButtonLink, EstadoVacio, MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../auth';

/**
 * spec 009, T019 (FR-009, docs/22): los Ministerios dentro de la app, con el
 * contenido completo de docs/22 — la introducción, primero los "para empezar a
 * servir ya" y después los que "requieren formación previa", cada uno con sus
 * áreas (Células). Cada uno lleva a su detalle, donde está el formulario.
 * Quien todavía no es apta los ve igual, con un aviso arriba (FR-010).
 * Cuatro estados: `loading.tsx`, `error.tsx`, vacío acá y éxito.
 */
export default async function MinisteriosAppPage() {
  const session = await auth();
  const headers = { Authorization: `Bearer ${session?.apiToken}` };
  const [t, tMiCamino] = await Promise.all([getTranslations('ministerios'), getTranslations('miCamino')]);
  const [ministerios, estado] = await Promise.all([
    apiFetch<MinisterioParaPostularse[]>('/ministerios/me/disponibles', { headers, cache: 'no-store' }),
    apiFetch<EstadoMiMinisterio>('/ministerios/me', { headers, cache: 'no-store' }),
  ]);
  const paraEmpezar = ministerios.filter((m) => !m.requiereFormacion);
  const conFormacion = ministerios.filter((m) => m.requiereFormacion);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: tMiCamino('titulo'), href: '/mi-camino' }, { label: t('titulo') }]} LinkComponente={Link} />
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>

      {ministerios.length === 0 ? (
        <div className="flex flex-col gap-4">
          <EstadoVacio mensaje={t('vacio')} />
          <ButtonLink render={<Link href="/mi-camino" />} variant="outline" size="xl" className="w-full text-base sm:w-fit">
            {t('volverMiCamino')}
          </ButtonLink>
        </div>
      ) : (
        <>
          {estado.estado === 'no_apta' && (
            <AvisoEstado role="note" icono={<Info className="text-primary" />} titulo={t('avisoNoAptaTitulo')} className="rounded-lg border border-border p-4">
              {t('avisoNoAptaTexto')}
            </AvisoEstado>
          )}
          <div className="flex flex-col gap-3 text-base text-muted-foreground">
            <p>{t('introduccion1')}</p>
            <p>{t('introduccion2')}</p>
          </div>
          {paraEmpezar.length > 0 && (
            <Seccion id="para-empezar" titulo={t('paraEmpezarTitulo')} texto={t('paraEmpezarTexto')} ministerios={paraEmpezar} />
          )}
          {conFormacion.length > 0 && (
            <Seccion id="con-formacion" titulo={t('conFormacionTitulo')} texto={t('conFormacionTexto')} ministerios={conFormacion} />
          )}
        </>
      )}
    </div>
  );
}

async function Seccion({ id, titulo, texto, ministerios }: { id: string; titulo: string; texto: string; ministerios: MinisterioParaPostularse[] }) {
  const t = await getTranslations('ministerios');
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <h2 id={`${id}-titulo`} className="text-2xl font-semibold">
        {titulo}
      </h2>
      <p className="text-base text-muted-foreground">{texto}</p>
      <ul className="flex flex-col gap-3">
        {ministerios.map((m) => (
          <li key={m.id}>
            <Link
              href={`/mi-camino/ministerios/${m.id}`}
              className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-4 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-lg font-semibold underline underline-offset-4">{m.nombre}</span>
                <span className="text-base text-muted-foreground">{m.lineaPublica ?? m.descripcion}</span>
                {m.celulas.length > 0 && (
                  <span className="text-base text-muted-foreground">
                    {t('areas')}: {m.celulas.map((c) => c.nombre).join(' · ')}
                  </span>
                )}
                {m.requiereFormacion && (
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <GraduationCap aria-hidden className="size-4 text-muted-foreground" />
                    {t('requiereFormacionEtiqueta')}
                  </span>
                )}
              </span>
              <ChevronRight aria-hidden className="mt-1 size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
