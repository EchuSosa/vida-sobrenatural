import { Suspense } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, BookOpen, Inbox, MapPin, Route } from 'lucide-react';
import {
  apiFetch,
  pendientesDelDiscipulador,
  type CaminoDeLaPersona,
  type MisDiscipuladosRespuesta,
  type PersonaPerfil,
} from '@vida-sobrenatural/shared-types';
import { auth, tienePermisoSesion } from '../../../auth';
import { AvisoPorQuery } from '../../../components/aviso-por-query';

/**
 * spec 006, T059 (FR-022; ajustes-ux #38–#39): el Inicio de la app. Saluda con
 * el nombre que la Persona cargó (no el de Google), resume en una frase cómo
 * va su camino con el enlace a Mi camino, y suma Palabra Profética y
 * Visitanos (docs/14). A quien tiene Mis discipulados, si tiene pendientes,
 * un aviso con la cantidad; si esa llamada falla, el aviso no se muestra y el
 * Inicio sigue. Lo demás, si falla, lo atrapa `error.tsx`.
 */
export default async function InicioAppPage() {
  const session = await auth();
  const headers = { Authorization: `Bearer ${session?.apiToken}` };
  const t = await getTranslations('inicioApp');
  const tm = await getTranslations('miCamino');

  const [perfil, camino, pendientes] = await Promise.all([
    apiFetch<PersonaPerfil>('/personas/me', { headers, cache: 'no-store' }),
    apiFetch<CaminoDeLaPersona>('/camino/me', { headers, cache: 'no-store' }),
    session && tienePermisoSesion(session, 'mis_discipulados.ver')
      ? apiFetch<MisDiscipuladosRespuesta>('/discipulado/mis-discipulados', { headers, cache: 'no-store' })
          .then((datos) => pendientesDelDiscipulador(datos).total)
          .catch(() => 0)
      : Promise.resolve(0),
  ]);

  const vn = camino.vidaNueva;
  const resumen =
    vn.estado === 'buscando'
      ? tm('vidaNueva.buscandoTitulo')
      : vn.estado === 'en_curso'
        ? tm('vidaNueva.enCursoTitulo')
        : vn.estado === 'finalizado' || camino.etapas[0]?.estado === 'completada'
          ? t('caminoVidaNuevaHecha')
          : vn.estado === 'lo_pide_su_tutor'
            ? tm('vidaNueva.tutorTitulo')
            : camino.etapas[0]?.estado === 'en_revision'
              ? t('caminoEnRevision')
              : t('caminoEmpezar');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      {/* H-16: si llegó acá porque /registro la sacó (ya estaba registrada). */}
      <Suspense fallback={null}>
        <AvisoPorQuery param="ya_registrado" valor="1" mensaje={t('avisoYaRegistrado')} />
      </Suspense>
      <h1 className="text-3xl font-semibold tracking-tight">{t('saludo', { nombre: perfil.nombre })}</h1>

      {pendientes > 0 && (
        <Link
          href="/mis-discipulados"
          className="flex min-h-11 items-center gap-3 rounded-lg border border-primary p-4 text-base font-medium underline-offset-4 hover:underline"
        >
          <Inbox aria-hidden className="size-5 shrink-0 text-primary" />
          <span className="flex-1">{t('pendientesDiscipulador', { cantidad: pendientes })}</span>
          <ArrowRight aria-hidden className="size-5 shrink-0" />
        </Link>
      )}

      <section aria-labelledby="tu-camino" className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <h2 id="tu-camino" className="flex items-center gap-2 text-xl font-semibold">
          <Route aria-hidden className="size-5 shrink-0 text-primary" />
          {t('caminoTitulo')}
        </h2>
        <p className="text-base">{resumen}</p>
        <Link href="/mi-camino" className="inline-flex min-h-11 w-fit items-center text-base font-medium text-primary underline underline-offset-4">
          {t('caminoEnlace')}
        </Link>
      </section>

      <ul className="flex flex-col gap-3 sm:flex-row">
        <li className="flex-1">
          <Link href="/nosotros/palabra-profetica" className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-4 text-base font-medium underline underline-offset-4">
            <BookOpen aria-hidden className="size-5 shrink-0 text-primary" />
            {t('palabraProfetica')}
          </Link>
        </li>
        <li className="flex-1">
          <Link href="/visitanos" className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-4 text-base font-medium underline underline-offset-4">
            <MapPin aria-hidden className="size-5 shrink-0 text-primary" />
            {t('visitanos')}
          </Link>
        </li>
      </ul>
    </div>
  );
}
