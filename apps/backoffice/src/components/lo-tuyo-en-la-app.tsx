import { getTranslations } from 'next-intl/server';
import type { Session } from 'next-auth';
import { ButtonLink } from '@vida-sobrenatural/ui';
import { tienePermisoSesion } from '../auth';
import { urlDeLaWebApp } from '../config/web-app';

/**
 * spec 006, T061 (FR-025, D142, H-134): la pantalla TERMINAL de quien no tiene
 * ninguna pantalla del backoffice. Si lo suyo está en la web app (Mis
 * discipulados del Discipulador, Mis grupos del Líder de curso), se lo dice y
 * lo lleva — decidido POR PERMISO del catálogo, nunca por rol literal
 * (`sin-rol-de-sesion-en-pantallas`). Si no, la explicación de siempre. Nunca
 * redirige (sería un bucle).
 */
export async function PantallaSinBackoffice({ session }: { session: Session }) {
  const t = await getTranslations('loTuyoEnLaApp');
  const ta = await getTranslations('aterrizaje');
  const discipulador = tienePermisoSesion(session, 'mis_discipulados.ver');
  const lider = tienePermisoSesion(session, 'mis_grupos.ver');

  if (!discipulador && !lider) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{ta('sinAccesoTitulo')}</h1>
        <p className="text-muted-foreground">{ta('sinAccesoDescripcion')}</p>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <p className="text-muted-foreground">{discipulador ? t('descripcionDiscipulador') : t('descripcionLider')}</p>
      <ButtonLink href={urlDeLaWebApp(discipulador ? '/mis-discipulados' : '/mi-camino')} size="xl" className="mx-auto">
        {t('irALaApp')}
      </ButtonLink>
    </div>
  );
}
