'use client';

import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
  ConfirmDestructiveDialog,
} from '@vida-sobrenatural/ui';
import { type TemaPreferido, type TemaPreferidoVisible, TEMA_A_NEXT_THEMES } from '@vida-sobrenatural/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

const OPCIONES: { value: TemaPreferidoVisible; label: string; Icono: typeof Sun }[] = [
  { value: 'claro', label: 'Claro', Icono: Sun },
  { value: 'oscuro', label: 'Oscuro', Icono: Moon },
];

/** Menú de usuario — colores de la app (Historia 5, FR-027; D116: sin "Sistema") y cerrar sesión. */
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
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm">{session.user.name}</Button>} />
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Colores de la app</div>
          {OPCIONES.map(({ value, label, Icono }) => (
            <DropdownMenuItem key={value} data-active={seleccionado === value} onClick={() => elegir(value)}>
              <Icono className="size-4" aria-hidden="true" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/*
        H-11 (actualización 2026-09-18): trigger separado del DropdownMenu de
        arriba a propósito — anidar un AlertDialog dentro de un
        DropdownMenuContent de Base UI genera conflictos conocidos entre
        overlays (el menú se desmonta antes de que el diálogo termine de
        abrir).
      */}
      <ConfirmDestructiveDialog
        trigger={
          <Button variant="ghost" size="sm">
            Cerrar sesión
          </Button>
        }
        titulo="¿Cerrar sesión?"
        descripcion="Vas a tener que volver a autorizar el acceso con tu cuenta de Google para entrar de nuevo."
        textoConfirmar="Sí, cerrar sesión"
        textoCancelar="Volver"
        onConfirmar={() => signOut({ callbackUrl: '/?sesion=cerrada' })}
      />
    </div>
  );
}
