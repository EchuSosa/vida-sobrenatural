'use client';

import * as React from 'react';
import { Lock } from 'lucide-react';
import { campoDeRespuesta, RESPUESTA_TEXTO_MAX, VALORES_SI_NO, type PreguntaEvento } from '@vida-sobrenatural/shared-types';
import { MensajeErrorCampo } from './form-errors';
import { cn } from '../lib/utils';

/** Los textos, desde el next-intl de cada app (`packages/ui` no depende de Next). */
export interface EtiquetasCamposPreguntas {
  si: string;
  no: string;
  /** Se agrega a la etiqueta de las no obligatorias, p. ej. "(opcional)". */
  opcional: string;
  /** "Solo lo ve el equipo que organiza; se borra 30 días después del evento" (FR-068). */
  sensible: string;
}

export interface CamposPreguntasEventoProps {
  preguntas: readonly PreguntaEvento[];
  /** Respuesta por id de pregunta ('' = sin responder). */
  valores: Readonly<Record<string, string>>;
  onCambiar: (preguntaId: string, valor: string) => void;
  /** Mensajes por campo (`respuesta-<id>`), como los deja `useValidacionCampos`. */
  errores: Readonly<Record<string, string>>;
  etiquetas: EtiquetasCamposPreguntas;
  /** La web usa campos de 44 px y texto de 16 px (D150); el backoffice, los de siempre. */
  tactil?: boolean;
}

/**
 * spec 011, ampliación 2026-10-09 (FR-065, H-50) — las preguntas propias de
 * un Evento, para responderlas en el mismo paso de anotarse (web) o de anotar
 * en nombre de otra Persona (backoffice). Sí/No y "Una opción" son radios en
 * un `fieldset`; "Texto corto", un input de hasta 200. Cada una con su
 * `id="campo-respuesta-<id>"` (para el enlace del resumen de errores) y su
 * mensaje debajo, asociado por `aria-describedby`. Una pregunta sensible
 * lleva su aclaración con ícono (texto + ícono, D81).
 */
export function CamposPreguntasEvento({ preguntas, valores, onCambiar, errores, etiquetas, tactil = false }: CamposPreguntasEventoProps) {
  const texto = tactil ? 'text-base' : 'text-sm';
  return (
    <div className="flex flex-col gap-4">
      {preguntas.map((p) => {
        const campo = campoDeRespuesta(p.id);
        const id = `campo-${campo}`;
        const error = errores[campo];
        const idError = `${id}-error`;
        const idAyuda = `${id}-ayuda`;
        const describedby = [error ? idError : null, p.sensible ? idAyuda : null].filter(Boolean).join(' ') || undefined;
        const etiqueta = (
          <>
            {p.texto}
            {!p.obligatoria && <span className="font-normal text-muted-foreground"> {etiquetas.opcional}</span>}
          </>
        );
        const ayuda = p.sensible && (
          <p id={idAyuda} className={cn('flex items-start gap-1.5 text-muted-foreground', texto)}>
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {etiquetas.sensible}
          </p>
        );
        if (p.tipo === 'texto') {
          return (
            <div key={p.id} className="flex flex-col gap-1">
              <label htmlFor={id} className={cn('font-medium', texto)}>
                {etiqueta}
              </label>
              {ayuda}
              <input
                id={id}
                type="text"
                maxLength={RESPUESTA_TEXTO_MAX}
                value={valores[p.id] ?? ''}
                onChange={(e) => onCambiar(p.id, e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedby}
                aria-required={p.obligatoria || undefined}
                className={cn(
                  'rounded-md border border-input bg-transparent px-3 aria-invalid:border-destructive dark:bg-input/30',
                  tactil ? 'h-11 text-base' : 'h-10 text-sm',
                )}
              />
              <MensajeErrorCampo id={idError} mensaje={error} />
            </div>
          );
        }
        const opciones = p.tipo === 'si_no' ? VALORES_SI_NO.map((v) => ({ valor: v, texto: etiquetas[v] })) : p.opciones.map((o) => ({ valor: o, texto: o }));
        return (
          <fieldset key={p.id} className="flex flex-col gap-1" aria-describedby={describedby} aria-invalid={error ? true : undefined}>
            <legend className={cn('font-medium', texto)}>{etiqueta}</legend>
            {ayuda}
            <div className={cn('flex gap-x-6 gap-y-1', p.tipo === 'si_no' ? 'flex-wrap' : 'flex-col')}>
              {opciones.map((o, i) => (
                <label key={o.valor} className={cn('flex items-center gap-2', tactil ? 'min-h-11 text-base' : 'min-h-10 text-sm')}>
                  <input
                    type="radio"
                    id={i === 0 ? id : undefined}
                    name={id}
                    value={o.valor}
                    checked={valores[p.id] === o.valor}
                    onChange={() => onCambiar(p.id, o.valor)}
                    className={tactil ? 'size-5' : 'size-4'}
                  />
                  {o.texto}
                </label>
              ))}
            </div>
            <MensajeErrorCampo id={idError} mensaje={error} />
          </fieldset>
        );
      })}
    </div>
  );
}
