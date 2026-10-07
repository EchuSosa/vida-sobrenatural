import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EstadoVacio } from '@vida-sobrenatural/ui';
import { aterrizajeDeSesion, requerirPermiso, requerirSesion, tienePermisoSesion } from '../auth';
import { TarjetaPendientes } from './tarjeta-pendientes';

/**
 * H-116 (revisión manual): el chequeo de sesión (y la pantalla de
 * "necesitás iniciar sesión" para cuando no la hay) ya lo resuelve
 * apps/backoffice/src/app/layout.tsx, para todo el backoffice.
 *
 * H-134: `/` cumple dos papeles. Como ítem del menú, "Inicio" es de quien
 * tiene `inicio.ver` (nav.ts, sin cambios). Como ruta de ATERRIZAJE, es
 * donde cae toda sesión que no pidió otra cosa (el callback de NextAuth, el
 * dominio a secas). Así que primero resuelve DESTINO:
 * - si el primer ítem del menú de esta sesión es `/`, es Inicio, y exige su
 *   permiso como cualquier pantalla (H-132, pantalla-declara-permiso);
 * - si es otro, redirige ahí — derivado de los roles, nunca fijo;
 * - si no tiene ninguno (una cuenta de Google que no es Persona entra con
 *   `rol = []`), pantalla TERMINAL, sin redirigir a ningún lado: un redirect
 *   acá sería un bucle infinito. Falla cerrada.
 */
export default async function InicioBackofficePage() {
  const session = await requerirSesion();
  const aterrizaje = aterrizajeDeSesion(session);

  if (!aterrizaje) {
    const t = await getTranslations('aterrizaje');
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t('sinAccesoTitulo')}</h1>
        <p className="text-muted-foreground">{t('sinAccesoDescripcion')}</p>
      </div>
    );
  }
  if (aterrizaje.href !== '/') {
    redirect(aterrizaje.href);
  }

  const sesion = await requerirPermiso('inicio.ver');
  // specs/004, T054g (FR-048): la tarjeta de Pendientes es de quien decide
  // sobre Solicitudes o Grupos — por permiso del catálogo (D132), nunca por rol.
  const vePendientes = tienePermisoSesion(sesion, 'solicitudes.aprobar') || tienePermisoSesion(sesion, 'grupos.gestionar');
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Inicio</h1>
      {vePendientes ? (
        <TarjetaPendientes apiToken={sesion.apiToken} />
      ) : (
        <EstadoVacio mensaje="Todavía no hay métricas ni pendientes para mostrar acá." />
      )}
    </div>
  );
}
