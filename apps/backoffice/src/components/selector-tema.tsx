'use client';

import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button, MenuUsuario as MenuUsuarioCompartido } from '@vida-sobrenatural/ui';
import {
  type TemaPreferido,
  type TemaPreferidoVisible,
  TEMA_A_NEXT_THEMES,
} from '@vida-sobrenatural/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

const OPCIONES: { value: TemaPreferidoVisible; label: string; Icono: typeof Sun }[] = [
  { value: 'claro', label: 'Claro', Icono: Sun },
  { value: 'oscuro', label: 'Oscuro', Icono: Moon },
];

/**
 * Menú de usuario del backoffice — colores de la app (Historia 5, FR-027;
 * D116: sin "Sistema") y cerrar sesión. Sin ítem "Perfil": el backoffice no
 * tiene pantalla propia (docs/14-navegacion.md sección 3).
 *
 * H-58 (revisión manual): pasa a usar el `MenuUsuario` compartido de
 * packages/ui (ya lo usaban el header público y la barra de la app,
 * H-38/H-47) en vez de su propia estructura — acá era la única de las tres
 * que todavía dejaba "Cerrar sesión" afuera del desplegable, como botón
 * suelto (contradice docs/14-navegacion.md sección 1).
 */
export function MenuUsuario() {
  const { setTheme } = useTheme();
  const { data: session, update } = useSession();
  const [seleccionado, setSeleccionado] = useState<TemaPreferido>(
    (session?.user.temaPreferido as TemaPreferido) ?? 'claro',
  );

  if (!session) return null;

  async function elegir(tema: TemaPreferido) {
    setSeleccionado(tema);
    setTheme(TEMA_A_NEXT_THEMES[tema]);
    try {
      const response = await fetch(`${API_BASE_URL}/personas/me/preferencias`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.apiToken}`,
        },
        body: JSON.stringify({ temaPreferido: tema }),
      });
      if (!response.ok) throw new Error();
      await update({ temaPreferido: tema });
    } catch {
      toast.error('No pudimos guardar tu preferencia de tema.');
    }
  }

  return (
    <MenuUsuarioCompartido
      trigger={
        <Button variant="ghost" size="sm">
          {session.user.name}
        </Button>
      }
      labelColoresDeLaApp="Colores de la app"
      opcionesTema={OPCIONES}
      temaSeleccionado={seleccionado}
      onElegirTema={(value) => elegir(value as TemaPreferido)}
      labelCerrarSesion="Cerrar sesión"
      onCerrarSesion={() => signOut({ callbackUrl: '/?sesion=cerrada' })}
    />
  );
}
