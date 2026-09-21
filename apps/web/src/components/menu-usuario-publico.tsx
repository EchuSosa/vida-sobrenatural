'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@vida-sobrenatural/ui';
import { apiFetch, ApiError } from '@vida-sobrenatural/shared-types';
import { CerrarSesionBoton } from './cerrar-sesion-boton';

type TemaPreferido = 'claro' | 'oscuro' | 'sistema';

const TEMA_A_NEXT_THEMES: Record<TemaPreferido, string> = {
  claro: 'light',
  oscuro: 'dark',
  sistema: 'system',
};

const OPCIONES_TEMA: { value: TemaPreferido; labelKey: string }[] = [
  { value: 'claro', labelKey: 'temaClaro' },
  { value: 'oscuro', labelKey: 'temaOscuro' },
  { value: 'sistema', labelKey: 'temaSistema' },
];

/**
 * H-38 (revisión manual ronda 3, docs/14-navegacion.md sección 1): con
 * sesión activa, el header público ofrece Perfil/tema/cerrar sesión — mismo
 * patrón que `apps/backoffice/src/components/selector-tema.tsx`
 * (`MenuUsuario`), incluido el trigger de cerrar sesión separado del
 * `DropdownMenu` (H-11: un `AlertDialog` anidado dentro de un
 * `DropdownMenuContent` de Base UI genera conflictos entre overlays).
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

/** Menú de usuario del header público (escritorio y celular) — Perfil, tema, cerrar sesión. */
export function MenuUsuarioPublico() {
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const elegirTema = useSincronizarTemaPropio();
  const [seleccionado, setSeleccionado] = useState<TemaPreferido>(
    (session?.user.temaPreferido as TemaPreferido) ?? 'claro',
  );

  if (!session) return null;

  function elegir(tema: TemaPreferido) {
    setSeleccionado(tema);
    elegirTema(tema);
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm">{session.user.name}</Button>} />
        <DropdownMenuContent align="end" aria-label={t('menuUsuario')}>
          <DropdownMenuItem render={<Link href="/perfil">{t('perfil')}</Link>} />
          <DropdownMenuSeparator />
          {OPCIONES_TEMA.map((opcion) => (
            <DropdownMenuItem
              key={opcion.value}
              data-active={seleccionado === opcion.value}
              onClick={() => elegir(opcion.value)}
            >
              {t(opcion.labelKey)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <CerrarSesionBoton />
    </div>
  );
}

/** Versión celular — mismos ítems, sin DropdownMenu (ya viven dentro del panel hamburguesa). */
export function ItemsUsuarioCelular({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const elegirTema = useSincronizarTemaPropio();
  const [seleccionado, setSeleccionado] = useState<TemaPreferido>(
    (session?.user.temaPreferido as TemaPreferido) ?? 'claro',
  );

  if (!session) return null;

  function elegir(tema: TemaPreferido) {
    setSeleccionado(tema);
    elegirTema(tema);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <Link href="/perfil" onClick={onNavigate} className="text-sm font-medium">
        {t('perfil')}
      </Link>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t('tema')}</legend>
        <div className="flex gap-2">
          {OPCIONES_TEMA.map((opcion) => (
            <Button
              key={opcion.value}
              type="button"
              variant={seleccionado === opcion.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => elegir(opcion.value)}
            >
              {t(opcion.labelKey)}
            </Button>
          ))}
        </div>
      </fieldset>
      <CerrarSesionBoton />
    </div>
  );
}
