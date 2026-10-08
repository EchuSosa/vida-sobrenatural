'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  CELULA_DESCRIPCION_MAX,
  CELULA_NOMBRE_MAX,
  MINISTERIO_DESCRIPCION_MAX,
  MINISTERIO_LINEA_PUBLICA_MAX,
  MINISTERIO_NOMBRE_MAX,
  erroresPorCampo,
  type DatosCelula,
  type DatosMinisterio,
} from '@vida-sobrenatural/shared-types';
import { Button, MensajeErrorCampo, ResumenErrores, cn, useEnvio, useValidacionCampos } from '@vida-sobrenatural/ui';

const CLASE_CAMPO =
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30';

/** Traduce los `{campo, code}` de la API (H-50) con los textos de `errors.campos`. */
function useMensajesDeCampo() {
  const te = useTranslations('errors');
  const t = useTranslations('ministerios');
  return (error: unknown): Record<string, string> | null => {
    const campos = erroresPorCampo(error);
    if (!campos) return null;
    return Object.fromEntries(campos.map(({ campo, code }) => [campo, te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errorGenerico')]));
  };
}

function Campo({
  campo,
  etiqueta,
  ayuda,
  error,
  children,
}: {
  campo: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`campo-${campo}`} className="font-medium">
        {etiqueta}
      </label>
      {ayuda && (
        <p id={`campo-${campo}-ayuda`} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      {children}
      <MensajeErrorCampo id={`campo-${campo}-error`} mensaje={error} />
    </div>
  );
}

function describe(campo: string, ayuda: boolean, error?: string): string | undefined {
  return cn(ayuda && `campo-${campo}-ayuda`, `campo-${campo}-contador`, error && `campo-${campo}-error`) || undefined;
}

/**
 * spec 009, T041/T042 (FR-026, FR-033, docs/22): alta y edición de un
 * Ministerio, en panel. Errores por campo con resumen y foco (H-50), un solo
 * envío (H-57). `enviar` lanza el error de la API para que se muestre en su
 * campo; cualquier otro error lo maneja quien llama.
 */
export function FormularioMinisterio({
  inicial,
  textoEnviar,
  enviar,
  onCancelar,
}: {
  inicial: DatosMinisterio;
  textoEnviar: string;
  enviar: (datos: DatosMinisterio) => Promise<void>;
  onCancelar: () => void;
}) {
  const t = useTranslations('ministerios');
  const tc = useTranslations('errors.campos');
  const validacion = useValidacionCampos();
  const mensajesDeCampo = useMensajesDeCampo();
  const [v, setV] = useState({ ...inicial, lineaPublica: inicial.lineaPublica ?? '', requiereFormacion: inicial.requiereFormacion ?? false });

  const { enviando, ejecutar } = useEnvio(async () => {
    const locales: Record<string, string> = {};
    if (!v.nombre.trim()) locales.nombre = tc('NOMBRE_REQUERIDO');
    else if (v.nombre.trim().length > MINISTERIO_NOMBRE_MAX) locales.nombre = tc('NOMBRE_DEMASIADO_LARGO');
    if (!v.descripcion.trim()) locales.descripcion = tc('DESCRIPCION_REQUERIDA');
    else if (v.descripcion.trim().length > MINISTERIO_DESCRIPCION_MAX) locales.descripcion = tc('DESCRIPCION_DEMASIADO_LARGA');
    if (v.lineaPublica.trim().length > MINISTERIO_LINEA_PUBLICA_MAX) locales.lineaPublica = tc('LINEA_PUBLICA_DEMASIADO_LARGA');
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    try {
      await enviar({ nombre: v.nombre, descripcion: v.descripcion, lineaPublica: v.lineaPublica.trim() || null, requiereFormacion: v.requiereFormacion });
    } catch (error) {
      const campos = mensajesDeCampo(error);
      if (campos) {
        validacion.reemplazar(campos);
        return;
      }
      throw error;
    }
  });

  const m = validacion.mensajes;
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
      className="flex flex-col gap-4"
    >
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('form.resumenErrores')} />
      <Campo campo="nombre" etiqueta={t('form.nombre')} error={m.nombre}>
        <input
          id="campo-nombre"
          value={v.nombre}
          onChange={(e) => {
            setV({ ...v, nombre: e.target.value });
            validacion.limpiar('nombre');
          }}
          aria-invalid={m.nombre ? true : undefined}
          aria-describedby={m.nombre ? 'campo-nombre-error' : undefined}
          disabled={enviando}
          className={cn(CLASE_CAMPO, 'h-10')}
        />
      </Campo>
      <Campo campo="descripcion" etiqueta={t('form.descripcion')} ayuda={t('form.descripcionAyuda')} error={m.descripcion}>
        <textarea
          id="campo-descripcion"
          rows={4}
          value={v.descripcion}
          onChange={(e) => {
            setV({ ...v, descripcion: e.target.value });
            validacion.limpiar('descripcion');
          }}
          aria-invalid={m.descripcion ? true : undefined}
          aria-describedby={describe('descripcion', true, m.descripcion)}
          disabled={enviando}
          className={cn(CLASE_CAMPO, 'min-h-24')}
        />
        <p id="campo-descripcion-contador" className="text-sm text-muted-foreground">
          {t('form.contador', { cantidad: v.descripcion.trim().length, maximo: MINISTERIO_DESCRIPCION_MAX })}
        </p>
      </Campo>
      <Campo campo="lineaPublica" etiqueta={t('form.lineaPublica')} ayuda={t('form.lineaPublicaAyuda')} error={m.lineaPublica}>
        <input
          id="campo-lineaPublica"
          value={v.lineaPublica}
          onChange={(e) => {
            setV({ ...v, lineaPublica: e.target.value });
            validacion.limpiar('lineaPublica');
          }}
          aria-invalid={m.lineaPublica ? true : undefined}
          aria-describedby={describe('lineaPublica', true, m.lineaPublica)}
          disabled={enviando}
          className={cn(CLASE_CAMPO, 'h-10')}
        />
        <p id="campo-lineaPublica-contador" className="text-sm text-muted-foreground">
          {t('form.contador', { cantidad: v.lineaPublica.trim().length, maximo: MINISTERIO_LINEA_PUBLICA_MAX })}
        </p>
      </Campo>
      <div className="flex flex-col gap-1">
        <label className="flex min-h-10 cursor-pointer items-center gap-3 font-medium">
          <input
            type="checkbox"
            checked={v.requiereFormacion}
            onChange={(e) => setV({ ...v, requiereFormacion: e.target.checked })}
            aria-describedby="requiere-formacion-ayuda"
            disabled={enviando}
            className="size-4 accent-primary"
          />
          {t('form.requiereFormacion')}
        </label>
        <p id="requiere-formacion-ayuda" className="text-sm text-muted-foreground">
          {t('form.requiereFormacionAyuda')}
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancelar} disabled={enviando}>
          {t('form.cancelar')}
        </Button>
        <Button type="submit" loading={enviando}>
          {textoEnviar}
        </Button>
      </div>
    </form>
  );
}

/** spec 009, T042 (FR-027, docs/22): alta y edición de un área (Célula). */
export function FormularioCelula({
  inicial,
  textoEnviar,
  enviar,
  onCancelar,
}: {
  inicial: DatosCelula;
  textoEnviar: string;
  enviar: (datos: DatosCelula) => Promise<void>;
  onCancelar: () => void;
}) {
  const t = useTranslations('ministerios');
  const tc = useTranslations('errors.campos');
  const validacion = useValidacionCampos();
  const mensajesDeCampo = useMensajesDeCampo();
  const [v, setV] = useState({ nombre: inicial.nombre, descripcion: inicial.descripcion ?? '', ofreceRolDiscipulador: inicial.ofreceRolDiscipulador ?? false });

  const { enviando, ejecutar } = useEnvio(async () => {
    const locales: Record<string, string> = {};
    if (!v.nombre.trim()) locales.nombre = tc('NOMBRE_REQUERIDO');
    else if (v.nombre.trim().length > CELULA_NOMBRE_MAX) locales.nombre = tc('NOMBRE_DEMASIADO_LARGO');
    if (v.descripcion.trim().length > CELULA_DESCRIPCION_MAX) locales.descripcion = tc('DESCRIPCION_DEMASIADO_LARGA');
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    try {
      await enviar({ nombre: v.nombre, descripcion: v.descripcion.trim() || null, ofreceRolDiscipulador: v.ofreceRolDiscipulador });
    } catch (error) {
      const campos = mensajesDeCampo(error);
      if (campos) {
        validacion.reemplazar(campos);
        return;
      }
      throw error;
    }
  });

  const m = validacion.mensajes;
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
      className="flex flex-col gap-4"
    >
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('form.resumenErrores')} />
      <Campo campo="nombre" etiqueta={t('celulaForm.nombre')} error={m.nombre}>
        <input
          id="campo-nombre"
          value={v.nombre}
          onChange={(e) => {
            setV({ ...v, nombre: e.target.value });
            validacion.limpiar('nombre');
          }}
          aria-invalid={m.nombre ? true : undefined}
          aria-describedby={m.nombre ? 'campo-nombre-error' : undefined}
          disabled={enviando}
          className={cn(CLASE_CAMPO, 'h-10')}
        />
      </Campo>
      <Campo campo="descripcion" etiqueta={t('celulaForm.descripcion')} error={m.descripcion}>
        <textarea
          id="campo-descripcion"
          rows={3}
          value={v.descripcion}
          onChange={(e) => {
            setV({ ...v, descripcion: e.target.value });
            validacion.limpiar('descripcion');
          }}
          aria-invalid={m.descripcion ? true : undefined}
          aria-describedby={describe('descripcion', false, m.descripcion)}
          disabled={enviando}
          className={cn(CLASE_CAMPO, 'min-h-20')}
        />
        <p id="campo-descripcion-contador" className="text-sm text-muted-foreground">
          {t('form.contador', { cantidad: v.descripcion.trim().length, maximo: CELULA_DESCRIPCION_MAX })}
        </p>
      </Campo>
      <div className="flex flex-col gap-1">
        <label className="flex min-h-10 cursor-pointer items-center gap-3 font-medium">
          <input
            type="checkbox"
            checked={v.ofreceRolDiscipulador}
            onChange={(e) => setV({ ...v, ofreceRolDiscipulador: e.target.checked })}
            aria-describedby="ofrece-rol-ayuda"
            disabled={enviando}
            className="size-4 accent-primary"
          />
          {t('celulaForm.ofreceRol')}
        </label>
        <p id="ofrece-rol-ayuda" className="text-sm text-muted-foreground">
          {t('celulaForm.ofreceRolAyuda')}
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancelar} disabled={enviando}>
          {t('form.cancelar')}
        </Button>
        <Button type="submit" loading={enviando}>
          {textoEnviar}
        </Button>
      </div>
    </form>
  );
}
