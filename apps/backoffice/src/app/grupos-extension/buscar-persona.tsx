'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, UserPlus } from 'lucide-react';
import { apiFetch } from '@vida-sobrenatural/shared-types';
import { Button, Input, useEnvio } from '@vida-sobrenatural/ui';

export interface PersonaElegibleGex {
  id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  genero: 'masculino' | 'femenino';
  menor: boolean;
}

/**
 * spec 014: buscar una Persona activa (por nombre, apellido o email) para
 * elegirla como líder o sumarla a un Grupo. Un buscador con botón, no un
 * combobox: se lee igual con lector de pantalla y en el celular (D150).
 * `bloquearMenores`: el menor aparece, pero sin "Elegir" y con el motivo (D133).
 */
export function BuscarPersonaGex({
  id,
  apiToken,
  textoElegir,
  ariaElegir,
  onElegir,
  excluir = [],
  bloquearMenores = false,
  deshabilitado = false,
}: {
  id: string;
  apiToken: string;
  textoElegir: string;
  ariaElegir: (nombre: string) => string;
  onElegir: (persona: PersonaElegibleGex) => void | Promise<void>;
  excluir?: string[];
  bloquearMenores?: boolean;
  deshabilitado?: boolean;
}) {
  const t = useTranslations('gruposExtension.form');
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<PersonaElegibleGex[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const buscar = useEnvio(async () => {
    if (q.trim().length < 2) {
      setAviso(t('buscarCorto'));
      setResultados(null);
      return;
    }
    setAviso(null);
    try {
      const personas = await apiFetch<PersonaElegibleGex[]>(`/grupos-extension/personas-elegibles?q=${encodeURIComponent(q.trim())}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      setResultados(personas.filter((p) => !excluir.includes(p.id)));
    } catch {
      setAviso(t('sinResultados'));
    }
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          {t('buscarPersona')}
        </label>
        <Input
          id={id}
          value={q}
          placeholder={t('buscarPersona')}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void buscar.ejecutar();
            }
          }}
          disabled={deshabilitado}
          className="h-10"
        />
        <Button type="button" variant="outline" loading={buscar.enviando} disabled={deshabilitado} onClick={() => void buscar.ejecutar()}>
          <Search aria-hidden />
          {t('buscar')}
        </Button>
      </div>
      {aviso && <p className="text-sm text-muted-foreground">{aviso}</p>}
      {resultados && (
        <ul aria-live="polite" className="flex flex-col gap-1">
          {resultados.length === 0 && <li className="text-sm text-muted-foreground">{t('sinResultados')}</li>}
          {resultados.map((p) => {
            const nombre = `${p.nombre} ${p.apellido}`;
            const bloqueada = bloquearMenores && p.menor;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <span className="flex flex-col">
                  <span className="font-medium break-words">{nombre}</span>
                  {p.email && <span className="text-muted-foreground break-all">{p.email}</span>}
                  {bloqueada && <span className="text-muted-foreground">{t('menor')}</span>}
                </span>
                {!bloqueada && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={ariaElegir(nombre)}
                    disabled={deshabilitado}
                    onClick={() => {
                      void onElegir(p);
                      setResultados(null);
                      setQ('');
                    }}
                  >
                    <UserPlus aria-hidden />
                    {textoElegir}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
