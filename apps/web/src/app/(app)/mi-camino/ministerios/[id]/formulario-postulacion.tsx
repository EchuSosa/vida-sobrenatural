'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import {
  ApiError,
  POSTULACION_TEXTO_MAX,
  apiFetch,
  erroresPorCampo,
  type CelulaParaPostularse,
  type NuevaPostulacion,
} from '@vida-sobrenatural/shared-types';
import { Button, MensajeErrorCampo, ResumenErrores, cn, useEnvio, useValidacionCampos } from '@vida-sobrenatural/ui';

const SIN_PREFERENCIA = '';
const CLASE_TEXTO =
  'min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30';

/**
 * spec 009, T020 (FR-001, FR-007, FR-008): el formulario de postulación. La
 * Célula se elige entre las activas o "No tengo preferencia"; motivación y
 * disponibilidad son opcionales, con la ayuda debajo de la etiqueta y su
 * contador. Errores por campo con resumen y foco (H-50); envío protegido de
 * la reentrada (H-57). Al terminar vuelve a Mi camino, con la card en
 * revisión y un aviso que se anuncia (`aria-live` del toast).
 */
export function FormularioPostulacion({ ministerioId, celulas }: { ministerioId: string; celulas: CelulaParaPostularse[] }) {
  const t = useTranslations('ministerios');
  const te = useTranslations('errors');
  const router = useRouter();
  const { data: session } = useSession();
  const validacion = useValidacionCampos();
  const [celulaId, setCelulaId] = useState(SIN_PREFERENCIA);
  const [motivacion, setMotivacion] = useState('');
  const [disponibilidad, setDisponibilidad] = useState('');
  const demasiadoLargo = t('demasiadoLargo', { maximo: POSTULACION_TEXTO_MAX });

  const { enviando, ejecutar } = useEnvio(async () => {
    const locales: Record<string, string> = {};
    if (motivacion.trim().length > POSTULACION_TEXTO_MAX) locales.motivacion = demasiadoLargo;
    if (disponibilidad.trim().length > POSTULACION_TEXTO_MAX) locales.disponibilidad = demasiadoLargo;
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    const cuerpo: NuevaPostulacion = { celulaId: celulaId || null, motivacion, disponibilidad };
    try {
      await apiFetch(`/ministerios/${ministerioId}/postulaciones/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify(cuerpo),
      });
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) {
        validacion.reemplazar(
          Object.fromEntries(campos.map(({ campo, code }) => [campo, code === 'TEXTO_DEMASIADO_LARGO' ? demasiadoLargo : te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errorGenerico')])),
        );
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
      router.refresh();
      return;
    }
    toast.success(t('enviado'));
    router.push('/mi-camino#etapa-ministerio');
    router.refresh();
  });

  return (
    <form
      noValidate
      aria-labelledby="form-postulacion-titulo"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
      className="flex flex-col gap-5 rounded-lg border border-border p-4 sm:p-5"
    >
      <h2 id="form-postulacion-titulo" className="text-xl font-semibold">
        {t('formTitulo')}
      </h2>
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />

      {celulas.length > 0 && (
        <fieldset id="campo-celulaId" tabIndex={-1} className="flex flex-col gap-2" aria-describedby="celula-ayuda celulaId-error">
          <legend className="text-base font-medium">{t('celulaEtiqueta')}</legend>
          <p id="celula-ayuda" className="text-base text-muted-foreground">
            {t('celulaAyuda')}
          </p>
          {[{ id: SIN_PREFERENCIA, nombre: t('sinPreferencia') }, ...celulas].map((c) => (
            <label key={c.id || 'sin-preferencia'} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-base has-[:checked]:border-primary">
              <input
                type="radio"
                name="celulaId"
                value={c.id}
                checked={celulaId === c.id}
                onChange={() => {
                  setCelulaId(c.id);
                  validacion.limpiar('celulaId');
                }}
                disabled={enviando}
                className="size-5 shrink-0 accent-primary"
              />
              {c.nombre}
            </label>
          ))}
          <MensajeErrorCampo id="celulaId-error" mensaje={validacion.mensajes.celulaId} />
        </fieldset>
      )}

      <CampoTexto
        campo="motivacion"
        etiqueta={t('motivacionEtiqueta')}
        ayuda={t('motivacionAyuda')}
        valor={motivacion}
        onCambio={(v) => {
          setMotivacion(v);
          if (v.trim().length <= POSTULACION_TEXTO_MAX) validacion.limpiar('motivacion');
        }}
        error={validacion.mensajes.motivacion}
        contador={t('contador', { cantidad: motivacion.trim().length, maximo: POSTULACION_TEXTO_MAX })}
        excedido={motivacion.trim().length > POSTULACION_TEXTO_MAX}
        deshabilitado={enviando}
      />
      <CampoTexto
        campo="disponibilidad"
        etiqueta={t('disponibilidadEtiqueta')}
        ayuda={t('disponibilidadAyuda')}
        valor={disponibilidad}
        onCambio={(v) => {
          setDisponibilidad(v);
          if (v.trim().length <= POSTULACION_TEXTO_MAX) validacion.limpiar('disponibilidad');
        }}
        error={validacion.mensajes.disponibilidad}
        contador={t('contador', { cantidad: disponibilidad.trim().length, maximo: POSTULACION_TEXTO_MAX })}
        excedido={disponibilidad.trim().length > POSTULACION_TEXTO_MAX}
        deshabilitado={enviando}
      />

      <Button type="submit" size="xl" className="w-full text-base sm:w-fit sm:self-end" loading={enviando}>
        <Send aria-hidden />
        {t('enviar')}
      </Button>
    </form>
  );
}

function CampoTexto({
  campo,
  etiqueta,
  ayuda,
  valor,
  onCambio,
  error,
  contador,
  excedido,
  deshabilitado,
}: {
  campo: string;
  etiqueta: string;
  ayuda: string;
  valor: string;
  onCambio: (v: string) => void;
  error?: string;
  contador: string;
  excedido: boolean;
  deshabilitado: boolean;
}) {
  const id = `campo-${campo}`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-medium">
        {etiqueta}
      </label>
      <p id={`${id}-ayuda`} className="text-base text-muted-foreground">
        {ayuda}
      </p>
      <textarea
        id={id}
        name={campo}
        rows={3}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(`${id}-ayuda`, `${id}-contador`, error && `${id}-error`)}
        disabled={deshabilitado}
        className={CLASE_TEXTO}
      />
      <p id={`${id}-contador`} className={cn('text-sm text-muted-foreground', excedido && 'font-medium text-foreground')}>
        {contador}
      </p>
      <MensajeErrorCampo id={`${id}-error`} mensaje={error} />
    </div>
  );
}
