import { getTranslations } from 'next-intl/server';
import { CircleAlert, RotateCw } from 'lucide-react';
import { ButtonLink } from '@vida-sobrenatural/ui';
import { auth } from '../../../auth';
import { type PersonaPerfil, apiFetch } from '@vida-sobrenatural/shared-types';
import { SelectorTema } from '../../../components/selector-tema';
import { CerrarSesionBoton } from '../../../components/cerrar-sesion-boton';
import { PerfilFormulario } from '../../../components/perfil-formulario';
import { EnlaceContanos } from '../../../components/enlace-contanos';

/**
 * Perfil de la Persona. ajustes-ux: #50 jerarquía (nombre grande, "Entrás
 * con" y el email en segundo plano, "Mis datos" antes del formulario); #52
 * "Cerrar sesión" separado del selector de colores, con ícono; #53 si la API
 * no responde, se dice y se ofrece reintentar (antes no se mostraba nada).
 */
export default async function PerfilPage() {
  const t = await getTranslations('perfil');
  const session = await auth();
  const tc = await getTranslations('comentarios');
  const perfil = await apiFetch<PersonaPerfil>('/personas/me', {
    headers: { Authorization: `Bearer ${session?.apiToken}` },
    cache: 'no-store',
  }).catch(() => null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-medium text-foreground">
          {perfil ? `${perfil.nombre} ${perfil.apellido}` : session?.user.name}
        </p>
        <p className="text-muted-foreground [overflow-wrap:anywhere]">
          {t('entrasCon')} {perfil?.email ?? session?.user.email}
        </p>
      </div>

      <section aria-labelledby="perfil-mis-datos" className="flex flex-col gap-4">
        <h2 id="perfil-mis-datos" className="text-xl font-medium">
          {t('misDatos')}
        </h2>
        {/* H-35 (Flujo 11): sin datos de perfil no se muestra un formulario a
            medio llenar; #53: pero se dice qué pasó y cómo seguir (docs/15
            "Error: qué pasó + Reintentar"). Un <a> real: recarga la página y
            vuelve a pedir los datos. */}
        {perfil ? (
          <PerfilFormulario
            perfil={{
              telefono: perfil.telefono,
              direccion: perfil.direccion,
              estadoCivil: perfil.estadoCivil,
              profesion: perfil.profesion,
              profesionDetalle: perfil.profesionDetalle,
            }}
          />
        ) : (
          <div role="alert" className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <p className="flex gap-2">
              <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
              {t('errorCarga')}
            </p>
            <ButtonLink href="/perfil" variant="outline" size="xl" className="sm:self-start">
              <RotateCw aria-hidden />
              {t('reintentar')}
            </ButtonLink>
          </div>
        )}
      </section>

      <SelectorTema valorInicial={perfil?.temaPreferido ?? session?.user.temaPreferido ?? 'claro'} />
      {/* spec 013 (T064, FR-045): "Contanos qué te parece" desde Perfil (docs/14). */}
      <EnlaceContanos className="inline-flex min-h-11 items-center self-start underline underline-offset-4 hover:no-underline">{tc('abrir')}</EnlaceContanos>

      <section aria-labelledby="perfil-cuenta" className="mt-4 flex flex-col gap-3 border-t border-border pt-6">
        <h2 id="perfil-cuenta" className="text-xl font-medium">
          {t('cuenta')}
        </h2>
        <CerrarSesionBoton />
      </section>
    </div>
  );
}
