'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
} from '@vida-sobrenatural/ui';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

type TemaPreferido = 'claro' | 'oscuro' | 'sistema';

const OPCIONES: { value: TemaPreferido; label: string }[] = [
  { value: 'claro', label: 'Claro' },
  { value: 'oscuro', label: 'Oscuro' },
  { value: 'sistema', label: 'Sistema' },
];

const TEMA_A_NEXT_THEMES: Record<TemaPreferido, string> = {
  claro: 'light',
  oscuro: 'dark',
  sistema: 'system',
};

/** Menú de usuario — tema (Historia 5, FR-027) y cerrar sesión. */
export function MenuUsuario() {
  const { setTheme } = useTheme();
  const { data: session, update } = useSession();
  const [seleccionado, setSeleccionado] = useState<TemaPreferido>(
    (session?.user.temaPreferido as TemaPreferido) ?? 'sistema',
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
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm">{session.user.name}</Button>} />
      <DropdownMenuContent align="end">
        {OPCIONES.map((opcion) => (
          <DropdownMenuItem
            key={opcion.value}
            data-active={seleccionado === opcion.value}
            onClick={() => elegir(opcion.value)}
          >
            {opcion.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
