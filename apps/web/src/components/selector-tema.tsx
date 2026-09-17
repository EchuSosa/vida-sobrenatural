'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@vida-sobrenatural/ui';
import { apiFetch, ApiError } from '../lib/api-client';

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

/** Selector Claro/Oscuro/Sistema — Historia 5, FR-027/FR-028. */
export function SelectorTema({ valorInicial }: { valorInicial: TemaPreferido }) {
  const { setTheme } = useTheme();
  const { data: session, update } = useSession();
  const [seleccionado, setSeleccionado] = useState(valorInicial);

  async function elegir(tema: TemaPreferido) {
    // Optimista: se aplica al instante en el cliente, se persiste en paralelo.
    setSeleccionado(tema);
    setTheme(TEMA_A_NEXT_THEMES[tema]);
    try {
      await apiFetch(`/personas/me/preferencias`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.apiToken}`,
        },
        body: JSON.stringify({ temaPreferido: tema }),
      });
      // Pasa el valor nuevo directo al callback jwt (trigger "update") — sin
      // esto, la sesión seguiría mostrando el tema viejo hasta el próximo
      // login real (jwt solo resuelve contra apps/api cuando hay `account`).
      await update({ temaPreferido: tema });
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No pudimos guardar tu preferencia.';
      toast.error(mensaje);
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Tema</legend>
      <div className="flex gap-2">
        {OPCIONES.map((opcion) => (
          <Button
            key={opcion.value}
            type="button"
            variant={seleccionado === opcion.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => elegir(opcion.value)}
          >
            {opcion.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
