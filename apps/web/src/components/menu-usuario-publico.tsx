'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button, MenuUsuario, useEnvio } from '@vida-sobrenatural/ui';
import {
  type TemaPreferido,
  type TemaPreferidoVisible,
  TEMA_A_NEXT_THEMES,
  apiFetch,
  ApiError,
} from '@vida-sobrenatural/shared-types';
import { CerrarSesionBoton } from './cerrar-sesion-boton';

/** D116: dos opciones visibles, no tres — "sistema" se saca de la interfaz. */
/** Exportado: también lo usa `nav-app-perfil-menu.tsx` (H-47) — mismas dos opciones, mismo ícono. */
export const OPCIONES_TEMA: { value: TemaPreferidoVisible; labelKey: string; Icono: typeof Sun }[] = [
  { value: 'claro', labelKey: 'temaClaro', Icono: Sun },
  { value: 'oscuro', labelKey: 'temaOscuro', Icono: Moon },
];

/**
 * H-38/H-58 (revisión manual): sincroniza el tema elegido con next-themes y
 * lo persiste contra la API. `useSincronizarTemaPropio` en sí ya es una
 * pieza compartida (Principio XI) — la usan `MenuUsuario` acá y
 * `nav-app-perfil-menu.tsx` (H-47).
 */
export function useSincronizarTemaPropio() {
  const { setTheme } = useTheme();
  const { data: session, update } = useSession();

  async function elegir(tema: TemaPreferido) {
    setTheme(TEMA_A_NEXT_THEMES[tema]);
    try {
      await apiFetch('/personas/me/preferencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify({ temaPreferido: tema }),
      });
      await update({ temaPreferido: tema });
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No pudimos guardar tu preferencia.';
      toast.error(mensaje);
    }
  }

  return elegir;
}

/**
 * Menú de usuario del header público (escritorio) — Perfil, tema, cerrar
 * sesión. H-58: pasa a usar el `MenuUsuario` compartido de packages/ui (ya
 * lo usaba la barra de la app, H-47) en vez de repetir la misma estructura
 * a mano — antes tenía "Cerrar sesión" afuera del desplegable, como botón
 * suelto.
 */
export function MenuUsuarioPublico() {
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const elegirTema = useSincronizarTemaPropio();
  const [seleccionado, setSeleccionado] = useState<TemaPreferido>(
    (session?.user.temaPreferido as TemaPreferido) ?? 'claro',
  );

  if (!session) return null;

  return (
    <MenuUsuario
      trigger={
        <Button variant="ghost" size="sm">
          {session.user.name}
        </Button>
      }
      ariaLabel={t('menuUsuario')}
      perfil={<Link href="/perfil">{t('perfil')}</Link>}
      labelColoresDeLaApp={t('tema')}
      opcionesTema={OPCIONES_TEMA.map(({ value, labelKey, Icono }) => ({ value, label: t(labelKey), Icono }))}
      temaSeleccionado={seleccionado}
      onElegirTema={async (value) => {
        setSeleccionado(value as TemaPreferido);
        await elegirTema(value as TemaPreferido);
      }}
      labelCerrarSesion={t('cerrarSesion')}
      onCerrarSesion={() => signOut({ callbackUrl: '/?sesion=cerrada' })}
    />
  );
}

/** Versión celular — mismos ítems, sin DropdownMenu (ya viven dentro del panel hamburguesa). */
export function ItemsUsuarioCelular({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const elegirTemaBase = useSincronizarTemaPropio();
  const [seleccionado, setSeleccionado] = useState<TemaPreferido>(
    (session?.user.temaPreferido as TemaPreferido) ?? 'claro',
  );
  // H-57: el selector de tema persiste contra la API — mismo guard que
  // el resto de los envíos, para no disparar dos PATCH si se toca rápido.
  const { enviando: eligiendoTema, ejecutar: elegirTema } = useEnvio(elegirTemaBase);

  if (!session) return null;

  function elegir(tema: TemaPreferido) {
    setSeleccionado(tema);
    void elegirTema(tema);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <Link href="/perfil" onClick={onNavigate} className="text-sm font-medium">
        {t('perfil')}
      </Link>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t('tema')}</legend>
        <div className="flex gap-2">
          {OPCIONES_TEMA.map(({ value, labelKey, Icono }) => (
            <Button
              key={value}
              type="button"
              variant={seleccionado === value ? 'default' : 'outline'}
              size="sm"
              aria-disabled={eligiendoTema || undefined}
              onClick={() => {
                if (eligiendoTema) return;
                elegir(value);
              }}
            >
              <Icono className="size-4" aria-hidden="true" />
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </fieldset>
      <CerrarSesionBoton />
    </div>
  );
}
