'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheck, Lock, Save } from 'lucide-react';
import {
  ApiError,
  ELECCION_NOTAS_MAX,
  apiFetch,
  erroresPorCampo,
  formatearFechaHora,
  type DetalleEleccionLider,
  type GuardarEleccionLider,
} from '@vida-sobrenatural/shared-types';
import { AvisoEstado, Button, MensajeErrorCampo, ResumenErrores, useEnvio, useValidacionCampos } from '@vida-sobrenatural/ui';
import { SelectorMinisterios, opcionesDe, seleccionDe, textoOpcion, type SeleccionMinisterios } from '../../../../../../components/eleccion/selector-ministerios';

const CLASE_TEXTO =
  'min-h-32 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30';

/**
 * spec 015 (D240): lo que el líder hace en la charla — ajustar la elección con
 * la persona (mismo listado y mismo límite), escribir notas privadas y marcar
 * "Charla hecha", que la manda al equipo. "Guardar" deja todo como borrador
 * (sirve para anotar antes de terminar). Errores por campo con resumen y foco
 * (H-50); cada botón bloqueado mientras se envía (H-57). Si alguien la cambió
 * mientras tanto, la API lo dice (versión optimista) y se recarga.
 */
export function CharlaEleccion({ grupoId, personaId, datos }: { grupoId: string; personaId: string; datos: DetalleEleccionLider }) {
  const t = useTranslations('misGrupos.elecciones');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const validacion = useValidacionCampos();
  const e = datos.eleccion;
  const [seleccion, setSeleccion] = useState<SeleccionMinisterios>(e ? seleccionDe(e.opciones) : {});
  const [notas, setNotas] = useState(e?.notas ?? '');
  const yaCharlada = e !== null && e.estado !== 'borrador';
  const mensajeDe = (code: string) => (te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errorGenerico'));

  async function guardar(charlaHecha: boolean) {
    const opciones = opcionesDe(seleccion);
    const locales: Record<string, string> = {};
    if (charlaHecha && opciones.length === 0) locales.opciones = mensajeDe('ELECCION_VACIA');
    if (notas.trim().length > ELECCION_NOTAS_MAX) locales.notas = mensajeDe('TEXTO_DEMASIADO_LARGO');
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    const cuerpo: GuardarEleccionLider = { opciones, notas, charlaHecha, version: e?.version ?? null };
    try {
      await apiFetch(`/vida-de-servicio/mis-grupos/${grupoId}/elecciones/${personaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify(cuerpo),
      });
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) {
        validacion.reemplazar(Object.fromEntries(campos.map(({ campo, code }) => [campo, mensajeDe(code)])));
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
      router.refresh();
      return;
    }
    toast.success(charlaHecha ? t('charlaMarcada') : t('guardada'));
    if (charlaHecha) router.push(`/mis-grupos/${grupoId}/elecciones`);
    router.refresh();
  }

  const guardarBorrador = useEnvio(() => guardar(false));
  const marcarCharla = useEnvio(() => guardar(true));
  const ocupado = guardarBorrador.enviando || marcarCharla.enviando;

  if (!datos.notasEditables && !datos.opcionesEditables) {
    return (
      <AvisoEstado icono={<Lock className="text-muted-foreground" />} titulo={t('cerrada')} className="rounded-lg border border-border p-4">
        {e && e.opciones.map((o) => textoOpcion({ ministerio: o.ministerio.nombre, celula: o.celula?.nombre ?? null })).join(' / ')}
      </AvisoEstado>
    );
  }

  return (
    <form
      noValidate
      aria-labelledby="charla-form-titulo"
      onSubmit={(ev) => {
        ev.preventDefault();
        void guardarBorrador.ejecutar();
      }}
      className="flex flex-col gap-6"
    >
      <h2 id="charla-form-titulo" className="sr-only">
        {t('formTitulo')}
      </h2>
      {yaCharlada && e?.charlaEn && (
        <AvisoEstado icono={<CircleCheck className="text-primary" />} titulo={t('yaCharlada', { nombre: e.charlaPor ? `${e.charlaPor.nombre} ${e.charlaPor.apellido}` : '', fecha: formatearFechaHora(e.charlaEn, locale) })} className="rounded-lg border border-border p-4" />
      )}
      {e?.comentario && (
        <section aria-labelledby="comentario-titulo" className="flex flex-col gap-1">
          <h2 id="comentario-titulo" className="text-lg font-semibold">
            {t('comentarioTitulo')}
          </h2>
          <p className="text-base whitespace-pre-line break-words">{e.comentario}</p>
        </section>
      )}
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />
      {datos.opcionesEditables ? (
        <SelectorMinisterios
          catalogo={datos.catalogo}
          seleccion={seleccion}
          onCambio={(s) => {
            setSeleccion(s);
            validacion.limpiar('opciones');
          }}
          deshabilitado={ocupado}
          invalido={!!validacion.mensajes.opciones}
          idError={validacion.mensajes.opciones ? 'opciones-error' : undefined}
        />
      ) : (
        <p className="text-base">{e?.opciones.map((o) => textoOpcion({ ministerio: o.ministerio.nombre, celula: o.celula?.nombre ?? null })).join(' / ')}</p>
      )}
      <MensajeErrorCampo id="opciones-error" mensaje={validacion.mensajes.opciones} />

      <div className="flex flex-col gap-2">
        <label htmlFor="campo-notas" className="text-base font-medium">
          {t('notasEtiqueta')}
        </label>
        <p id="notas-ayuda" className="flex gap-2 text-base text-muted-foreground">
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t('notasAyuda')}
        </p>
        <textarea
          id="campo-notas"
          name="notas"
          value={notas}
          onChange={(ev) => {
            setNotas(ev.target.value);
            validacion.limpiar('notas');
          }}
          disabled={ocupado || !datos.notasEditables}
          aria-invalid={validacion.mensajes.notas ? true : undefined}
          aria-describedby={validacion.mensajes.notas ? 'notas-ayuda notas-error' : 'notas-ayuda'}
          className={CLASE_TEXTO}
        />
        <p className="text-sm text-muted-foreground">{t('contadorTexto', { cantidad: notas.trim().length, maximo: ELECCION_NOTAS_MAX })}</p>
        <MensajeErrorCampo id="notas-error" mensaje={validacion.mensajes.notas} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" variant="outline" size="xl" className="w-full text-base sm:w-fit" loading={guardarBorrador.enviando} disabled={marcarCharla.enviando}>
          <Save aria-hidden />
          {t('guardar')}
        </Button>
        {!yaCharlada && (
          <Button type="button" size="xl" className="w-full text-base sm:w-fit" loading={marcarCharla.enviando} disabled={guardarBorrador.enviando} onClick={() => void marcarCharla.ejecutar()}>
            <CircleCheck aria-hidden />
            {t('marcarCharla')}
          </Button>
        )}
      </div>
    </form>
  );
}
