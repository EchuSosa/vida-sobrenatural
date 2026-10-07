'use client';

import * as React from 'react';
import { useState } from 'react';
import { useEnvio } from '../hooks/use-envio';
import { Button } from './ui/button';

/**
 * H-R13 (revisión manual de la 004): entrar como otra persona para probar, sin
 * pegar código en la consola (Safari no acepta `await` suelto; Chrome bloquea
 * el pegado). Un campo de email, un botón y botones rápidos. Solo la muestran
 * `/dev/entrar` de apps/web y apps/backoffice (y la pantalla sin sesión del
 * backoffice) cuando el login de prueba está habilitado — `testLoginHabilitado()`,
 * que excluye producción. Cada app decide qué hace `onEntrar` (el proveedor
 * `test-login` de Auth.js y a dónde va después). Todo texto por prop (D84).
 */
/** Las cuentas de la revisión manual de la 004 (`specs/revision-manual/COMO-ARRANCAR.md`). */
export const EMAILS_DE_PRUEBA = [
  'demo-vn-persona@example.com',
  'demo-vn-persona-2@example.com',
  'demo-vn-disc-1@example.com',
  'demo-vn-disc-2@example.com',
  'demo-vn-menor@example.com',
] as const;

export interface EtiquetasEntrarDePrueba {
  titulo: string;
  descripcion: string;
  email: string;
  entrar: string;
  entrando: string;
  rapidos: string;
}

export function EntrarDePrueba({
  etiquetas,
  emailsRapidos,
  onEntrar,
  nivelTitulo = 'h2',
}: {
  etiquetas: EtiquetasEntrarDePrueba;
  emailsRapidos: readonly string[];
  onEntrar: (email: string) => Promise<void>;
  /** `h1` cuando es lo único de la página (`/dev/entrar`); `h2` dentro de otra pantalla. */
  nivelTitulo?: 'h1' | 'h2';
}) {
  const Titulo = nivelTitulo;
  const [email, setEmail] = useState('');
  const { enviando, ejecutar } = useEnvio(async (destino: string) => {
    if (destino.trim()) await onEntrar(destino.trim());
  });

  return (
    <section aria-labelledby="titulo-entrar-de-prueba" className="flex w-full flex-col gap-4 rounded-lg border border-border p-4 text-left">
      <div className="flex flex-col gap-1">
        <Titulo id="titulo-entrar-de-prueba" className="text-lg font-semibold">
          {etiquetas.titulo}
        </Titulo>
        <p className="text-sm text-muted-foreground">{etiquetas.descripcion}</p>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void ejecutar(email);
        }}
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="entrar-de-prueba-email" className="text-sm font-medium">
            {etiquetas.email}
          </label>
          <input
            id="entrar-de-prueba-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-md border border-input bg-transparent px-3 text-base sm:text-sm dark:bg-input/30"
          />
        </div>
        <Button type="submit" className="h-11" loading={enviando} loadingText={etiquetas.entrando}>
          {etiquetas.entrar}
        </Button>
      </form>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{etiquetas.rapidos}</p>
        <ul className="flex flex-wrap gap-2">
          {emailsRapidos.map((rapido) => (
            <li key={rapido}>
              <Button type="button" variant="outline" className="h-11" disabled={enviando} onClick={() => void ejecutar(rapido)}>
                {rapido}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
