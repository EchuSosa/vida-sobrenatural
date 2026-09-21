'use client';

import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button, useEnvio } from '@vida-sobrenatural/ui';
import {
  type TemaPreferido,
  type TemaPreferidoVisible,
  TEMA_A_NEXT_THEMES,
  apiFetch,
  ApiError,
} from '@vida-sobrenatural/shared-types';

const OPCIONES: { value: TemaPreferidoVisible; label: string; Icono: typeof Sun }[] = [
  { value: 'claro', label: 'Claro', Icono: Sun },
  { value: 'oscuro', label: 'Oscuro', Icono: Moon },
];

/** Selector Claro/Oscuro — Historia 5, FR-027/FR-028 (D116: sin "Sistema"). */
export function SelectorTema({ valorInicial }: { valorInicial: TemaPreferido }) {
  const { setTheme } = useTheme();
  const { data: session, update } = useSession();
  const [seleccionado, setSeleccionado] = useState(valorInicial);

  // H-57: persiste contra la API — mismo guard que el resto de los envíos.
  const { enviando, ejecutar: elegir } = useEnvio(async (tema: TemaPreferido) => {
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
  });

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Colores de la app</legend>
      <div className="flex gap-2">
        {OPCIONES.map(({ value, label, Icono }) => (
          <Button
            key={value}
            type="button"
            variant={seleccionado === value ? 'default' : 'outline'}
            size="sm"
            disabled={enviando}
            onClick={() => void elegir(value)}
          >
            <Icono className="size-4" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
