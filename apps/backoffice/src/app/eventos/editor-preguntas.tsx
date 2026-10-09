'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Info, Lock, Plus, Trash2 } from 'lucide-react';
import {
  PREGUNTA_OPCION_MAX,
  PREGUNTA_TEXTO_MAX,
  PREGUNTAS_EVENTO_MAX,
  TIPOS_PREGUNTA_EVENTO,
  campoDePregunta,
  type DatosPreguntaEvento,
  type PreguntaEventoGestion,
  type TipoPreguntaEvento,
} from '@vida-sobrenatural/shared-types';
import { Button, MensajeErrorCampo } from '@vida-sobrenatural/ui';

/** Una pregunta mientras se edita (las opciones, una por renglón). */
export interface PreguntaEnEdicion {
  /** Clave estable para React (el id si ya existe). */
  clave: string;
  id?: string;
  texto: string;
  tipo: TipoPreguntaEvento;
  opciones: string;
  obligatoria: boolean;
  sensible: boolean;
  /** Cuántas respuestas tiene (FR-066: con respuestas no se borra ni cambia de tipo). */
  respuestas: number;
  textoOriginal: string;
  /** Con respuestas, una sensible no deja de serlo (FR-066). */
  sensibleOriginal: boolean;
}

export function preguntasEnEdicion(preguntas: readonly PreguntaEventoGestion[]): PreguntaEnEdicion[] {
  return preguntas.map((p) => ({
    clave: p.id,
    id: p.id,
    texto: p.texto,
    tipo: p.tipo,
    opciones: p.opciones.join('\n'),
    obligatoria: p.obligatoria,
    sensible: p.sensible,
    respuestas: p.respuestas,
    textoOriginal: p.texto,
    sensibleOriginal: p.sensible,
  }));
}

export function preguntasParaEnviar(preguntas: readonly PreguntaEnEdicion[]): DatosPreguntaEvento[] {
  return preguntas.map((p) => ({
    ...(p.id ? { id: p.id } : {}),
    texto: p.texto,
    tipo: p.tipo,
    opciones: p.tipo === 'opcion' ? p.opciones.split('\n').map((o) => o.trim()).filter((o) => o !== '') : [],
    obligatoria: p.obligatoria,
    sensible: p.sensible,
  }));
}

const CLASE_CAMPO = 'rounded-md border border-input bg-transparent px-3 text-sm aria-invalid:border-destructive dark:bg-input/30';

let siguiente = 0;
const claveNueva = () => `nueva-${Date.now()}-${siguiente++}`;

/**
 * spec 011, ampliación 2026-10-09 (FR-064, FR-066, FR-068) — "Preguntas para
 * la inscripción": agregar (hasta 10), ordenar y quitar; tipo Sí/No, Una
 * opción (una por renglón) o Texto corto; obligatoria y "Dato sensible". Con
 * respuestas, el tipo queda fijo, no se puede quitar y editar el texto avisa.
 * Los errores llegan por campo (`pregunta-<i>-texto|tipo|opciones`).
 */
export function EditorPreguntas({
  preguntas,
  onCambiar,
  mensajes,
  onLimpiar,
}: {
  preguntas: PreguntaEnEdicion[];
  onCambiar: (preguntas: PreguntaEnEdicion[]) => void;
  mensajes: Record<string, string>;
  onLimpiar: (campo: string) => void;
}) {
  const t = useTranslations('eventos.gestion.formulario.preguntas');

  function cambiar(i: number, cambios: Partial<PreguntaEnEdicion>, campo?: 'texto' | 'tipo' | 'opciones') {
    onCambiar(preguntas.map((p, j) => (j === i ? { ...p, ...cambios } : p)));
    if (campo) onLimpiar(campoDePregunta(i, campo));
  }
  function mover(i: number, delta: -1 | 1) {
    const nuevas = [...preguntas];
    [nuevas[i], nuevas[i + delta]] = [nuevas[i + delta], nuevas[i]];
    onCambiar(nuevas);
  }
  const lleno = preguntas.length >= PREGUNTAS_EVENTO_MAX;

  return (
    <fieldset className="flex flex-col gap-4" aria-describedby="campo-preguntas-ayuda">
      <legend className="mb-2 text-lg font-semibold">{t('titulo')}</legend>
      <p id="campo-preguntas-ayuda" className="text-sm text-muted-foreground">
        {t('ayuda')}
      </p>
      {preguntas.length === 0 && <p className="text-sm">{t('vacio')}</p>}
      <ol className="flex flex-col gap-4">
        {preguntas.map((p, i) => {
          const id = (parte: 'texto' | 'tipo' | 'opciones') => `campo-${campoDePregunta(i, parte)}`;
          const m = (parte: 'texto' | 'tipo' | 'opciones') => mensajes[campoDePregunta(i, parte)];
          const conRespuestas = p.respuestas > 0;
          return (
            <li key={p.clave} className="flex flex-col gap-3 rounded-md border border-border p-4" data-testid="pregunta-evento">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t('numero', { n: i + 1 })}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={t('subir', { n: i + 1 })}>
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={i === preguntas.length - 1} onClick={() => mover(i, 1)} aria-label={t('bajar', { n: i + 1 })}>
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={conRespuestas}
                    onClick={() => onCambiar(preguntas.filter((_, j) => j !== i))}
                    aria-describedby={conRespuestas ? `pregunta-${p.clave}-con-respuestas` : undefined}
                  >
                    <Trash2 aria-hidden="true" />
                    {t('quitar')}
                  </Button>
                </div>
              </div>
              {conRespuestas && (
                <p id={`pregunta-${p.clave}-con-respuestas`} className="flex items-start gap-2 text-sm">
                  <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {t('conRespuestas', { cantidad: p.respuestas })}
                </p>
              )}

              <div className="flex flex-col gap-1">
                <label htmlFor={id('texto')} className="text-sm font-medium">
                  {t('texto')}
                </label>
                <input
                  id={id('texto')}
                  className={`${CLASE_CAMPO} h-10`}
                  value={p.texto}
                  maxLength={PREGUNTA_TEXTO_MAX}
                  onChange={(e) => cambiar(i, { texto: e.target.value }, 'texto')}
                  aria-invalid={m('texto') ? true : undefined}
                  aria-describedby={[m('texto') ? `${id('texto')}-error` : null, conRespuestas && p.texto !== p.textoOriginal ? `${id('texto')}-aviso` : null].filter(Boolean).join(' ') || undefined}
                />
                {conRespuestas && p.texto !== p.textoOriginal && (
                  <p id={`${id('texto')}-aviso`} className="flex items-start gap-2 text-sm">
                    <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    {t('avisoTexto', { cantidad: p.respuestas })}
                  </p>
                )}
                <MensajeErrorCampo id={`${id('texto')}-error`} mensaje={m('texto')} />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={id('tipo')} className="text-sm font-medium">
                  {t('tipo')}
                </label>
                <select
                  id={id('tipo')}
                  className={`${CLASE_CAMPO} h-10 w-fit`}
                  value={p.tipo}
                  disabled={conRespuestas}
                  onChange={(e) => cambiar(i, { tipo: e.target.value as TipoPreguntaEvento }, 'tipo')}
                  aria-invalid={m('tipo') ? true : undefined}
                  aria-describedby={m('tipo') ? `${id('tipo')}-error` : undefined}
                >
                  {TIPOS_PREGUNTA_EVENTO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {t(`tipos.${tipo}`)}
                    </option>
                  ))}
                </select>
                <MensajeErrorCampo id={`${id('tipo')}-error`} mensaje={m('tipo')} />
              </div>

              {p.tipo === 'opcion' && (
                <div className="flex flex-col gap-1">
                  <label htmlFor={id('opciones')} className="text-sm font-medium">
                    {t('opciones')}
                  </label>
                  <p id={`${id('opciones')}-ayuda`} className="text-sm text-muted-foreground">
                    {t('opcionesAyuda', { max: PREGUNTA_OPCION_MAX })}
                  </p>
                  <textarea
                    id={id('opciones')}
                    rows={3}
                    className={`${CLASE_CAMPO} py-2`}
                    value={p.opciones}
                    onChange={(e) => cambiar(i, { opciones: e.target.value }, 'opciones')}
                    aria-invalid={m('opciones') ? true : undefined}
                    aria-describedby={[m('opciones') ? `${id('opciones')}-error` : null, `${id('opciones')}-ayuda`].filter(Boolean).join(' ')}
                  />
                  <MensajeErrorCampo id={`${id('opciones')}-error`} mensaje={m('opciones')} />
                </div>
              )}

              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" checked={p.obligatoria} onChange={(e) => cambiar(i, { obligatoria: e.target.checked })} />
                {t('obligatoria')}
              </label>
              <div className="flex flex-col gap-1">
                <label className="flex min-h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={p.sensible}
                    disabled={conRespuestas && p.sensibleOriginal}
                    onChange={(e) => cambiar(i, { sensible: e.target.checked })}
                    aria-describedby={`pregunta-${p.clave}-sensible-ayuda`}
                  />
                  {t('sensible')}
                </label>
                <p id={`pregunta-${p.clave}-sensible-ayuda`} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {t('sensibleAyuda')}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-1">
        <Button
          id="campo-preguntas"
          type="button"
          variant="outline"
          className="w-fit"
          disabled={lleno}
          aria-describedby={lleno ? 'campo-preguntas-lleno' : mensajes.preguntas ? 'campo-preguntas-error' : undefined}
          onClick={() =>
            onCambiar([
              ...preguntas,
              { clave: claveNueva(), texto: '', tipo: 'si_no', opciones: '', obligatoria: false, sensible: false, respuestas: 0, textoOriginal: '', sensibleOriginal: false },
            ])
          }
        >
          <Plus aria-hidden="true" />
          {t('agregar')}
        </Button>
        {lleno && (
          <p id="campo-preguntas-lleno" className="text-sm text-muted-foreground">
            {t('lleno', { max: PREGUNTAS_EVENTO_MAX })}
          </p>
        )}
        <MensajeErrorCampo id="campo-preguntas-error" mensaje={mensajes.preguntas} />
      </div>
    </fieldset>
  );
}
