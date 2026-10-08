'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Hourglass, Plus, UserRound, UsersRound } from 'lucide-react';
import {
  ApiError,
  POSTULACION_TEXTO_MAX,
  apiFetch,
  erroresPorCampo,
  formatearFechaHora,
  type MinisterioDePersona,
  type MinisterioParaPostularse,
} from '@vida-sobrenatural/shared-types';
import {
  AvisoEstado,
  Button,
  MensajeErrorCampo,
  ResumenErrores,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  useEnvio,
  useValidacionCampos,
} from '@vida-sobrenatural/ui';
import { claveEstado } from '../../../solicitudes/postulacion/estado';

const CLASE_CAMPO =
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30';

/**
 * spec 009 (FR-024, D97): el Ministerio de una Persona en su Perfil y
 * "Postular a un Ministerio" en su nombre. El nombre de la Persona queda a la
 * vista durante toda la acción (docs/15); mismas reglas que si lo hiciera
 * ella (la API las aplica), errores por campo con resumen y foco (H-50) y un
 * solo envío (H-57).
 */
export function MinisterioPersonaCliente({
  personaId,
  nombre,
  datos,
  ministerios,
  apiToken,
  puedePostular,
}: {
  personaId: string;
  nombre: string;
  datos: MinisterioDePersona;
  ministerios: MinisterioParaPostularse[];
  apiToken: string;
  puedePostular: boolean;
}) {
  const t = useTranslations('postulaciones');
  const tc = useTranslations('comun');
  const locale = useLocale();
  const fecha = (iso: string) => formatearFechaHora(iso, locale);
  const [abierto, setAbierto] = useState(false);
  const { actual, pendiente, historial } = datos;

  return (
    <div className="flex flex-col gap-3">
      {actual ? (
        <AvisoEstado
          icono={<UsersRound className="text-primary" />}
          titulo={actual.celula ? t('perfil.actualCelula', { ministerio: actual.ministerio.nombre, celula: actual.celula.nombre }) : t('perfil.actual', { ministerio: actual.ministerio.nombre })}
        >
          {t('perfil.desde', { fecha: fecha(actual.desde) })}
        </AvisoEstado>
      ) : (
        <AvisoEstado icono={<UserRound className="text-muted-foreground" />} titulo={t('perfil.ninguno')} />
      )}
      {pendiente && (
        <AvisoEstado icono={<Hourglass className="text-primary" />} titulo={t('perfil.pendiente', { ministerio: pendiente.ministerio.nombre, fecha: fecha(pendiente.createdAt) })}>
          <Link href={`/solicitudes/postulacion/${pendiente.postulacionId}`} className="underline underline-offset-4">
            {t('perfil.verPostulacion')}
          </Link>
        </AvisoEstado>
      )}
      {historial.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">{t('historialTitulo')}</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {historial.map((h) => (
              <li key={h.id}>
                {t('historialFila', { ministerio: h.ministerio.nombre, estado: t(`estado.${claveEstado(h)}`), fecha: fecha(h.resueltaEn ?? h.createdAt) })}
                {h.motivo && <span className="block text-muted-foreground">{t('historialMotivo', { motivo: h.motivo })}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
      {puedePostular && !pendiente && (
        <>
          <Button type="button" variant="outline" className="w-fit" onClick={() => setAbierto(true)} disabled={ministerios.length === 0}>
            <Plus aria-hidden />
            {t('perfil.postular')}
          </Button>
          {ministerios.length === 0 && <p className="text-sm text-muted-foreground">{t('perfil.sinMinisterios')}</p>}
          <Sheet open={abierto} onOpenChange={setAbierto}>
            <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')}>
              <SheetHeader>
                <SheetTitle>{t('perfil.postularTitulo', { nombre })}</SheetTitle>
                <SheetDescription>{t('perfil.postularDescripcion')}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <FormularioEnNombreDe personaId={personaId} nombre={nombre} ministerios={ministerios} apiToken={apiToken} onListo={() => setAbierto(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}

function FormularioEnNombreDe({
  personaId,
  nombre,
  ministerios,
  apiToken,
  onListo,
}: {
  personaId: string;
  nombre: string;
  ministerios: MinisterioParaPostularse[];
  apiToken: string;
  onListo: () => void;
}) {
  const t = useTranslations('postulaciones');
  const te = useTranslations('errors');
  const router = useRouter();
  const validacion = useValidacionCampos();
  const [ministerioId, setMinisterioId] = useState('');
  const [celulaId, setCelulaId] = useState('');
  const [motivacion, setMotivacion] = useState('');
  const [disponibilidad, setDisponibilidad] = useState('');
  const elegido = ministerios.find((m) => m.id === ministerioId);
  const largo = t('perfil.demasiadoLargo', { maximo: POSTULACION_TEXTO_MAX });

  const { enviando, ejecutar } = useEnvio(async () => {
    const locales: Record<string, string> = {};
    if (!ministerioId) locales.ministerioId = t('perfil.ministerioRequerido');
    if (motivacion.trim().length > POSTULACION_TEXTO_MAX) locales.motivacion = largo;
    if (disponibilidad.trim().length > POSTULACION_TEXTO_MAX) locales.disponibilidad = largo;
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    try {
      await apiFetch('/postulaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ personaId, ministerioId, celulaId: celulaId || null, motivacion, disponibilidad }),
      });
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) {
        validacion.reemplazar(
          Object.fromEntries(campos.map(({ campo, code }) => [campo, code === 'TEXTO_DEMASIADO_LARGO' ? largo : te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errorGenerico')])),
        );
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      validacion.reemplazar({ ministerioId: code && te.has(code) ? te(code) : t('errorGenerico') });
      return;
    }
    toast.success(t('perfil.enviada'));
    onListo();
    router.refresh();
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
      className="flex flex-col gap-4"
    >
      <p className="rounded-md border border-border p-3 text-sm font-medium">{t('perfil.enNombreDe', { nombre })}</p>
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />
      <div className="flex flex-col gap-2">
        <label htmlFor="campo-ministerioId" className="font-medium">
          {t('perfil.ministerioEtiqueta')}
        </label>
        <select
          id="campo-ministerioId"
          value={ministerioId}
          onChange={(e) => {
            setMinisterioId(e.target.value);
            setCelulaId('');
            validacion.limpiar('ministerioId');
          }}
          aria-invalid={validacion.mensajes.ministerioId ? true : undefined}
          aria-describedby={validacion.mensajes.ministerioId ? 'campo-ministerioId-error' : undefined}
          disabled={enviando}
          className={`${CLASE_CAMPO} h-10`}
        >
          <option value="">{t('perfil.ministerioElegir')}</option>
          {ministerios.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        <MensajeErrorCampo id="campo-ministerioId-error" mensaje={validacion.mensajes.ministerioId} />
      </div>
      {elegido && elegido.celulas.length > 0 && (
        <fieldset id="campo-celulaId" tabIndex={-1} className="flex flex-col gap-2">
          <legend className="font-medium">{t('perfil.celulaEtiqueta')}</legend>
          {[{ id: '', nombre: t('perfil.sinPreferencia') }, ...elegido.celulas].map((c) => (
            <label key={c.id || 'sin-preferencia'} className="flex min-h-10 cursor-pointer items-center gap-3">
              <input type="radio" name="celulaId" value={c.id} checked={celulaId === c.id} onChange={() => setCelulaId(c.id)} disabled={enviando} className="size-4 accent-primary" />
              {c.nombre}
            </label>
          ))}
          <MensajeErrorCampo id="campo-celulaId-error" mensaje={validacion.mensajes.celulaId} />
        </fieldset>
      )}
      {(['motivacion', 'disponibilidad'] as const).map((campo) => {
        const valor = campo === 'motivacion' ? motivacion : disponibilidad;
        const set = campo === 'motivacion' ? setMotivacion : setDisponibilidad;
        return (
          <div key={campo} className="flex flex-col gap-2">
            <label htmlFor={`campo-${campo}`} className="font-medium">
              {t(`perfil.${campo}Etiqueta`)}
            </label>
            <textarea
              id={`campo-${campo}`}
              rows={3}
              value={valor}
              onChange={(e) => {
                set(e.target.value);
                if (e.target.value.trim().length <= POSTULACION_TEXTO_MAX) validacion.limpiar(campo);
              }}
              aria-invalid={validacion.mensajes[campo] ? true : undefined}
              aria-describedby={`campo-${campo}-contador${validacion.mensajes[campo] ? ` campo-${campo}-error` : ''}`}
              disabled={enviando}
              className={`${CLASE_CAMPO} min-h-20`}
            />
            <p id={`campo-${campo}-contador`} className="text-sm text-muted-foreground">
              {t('contador', { cantidad: valor.trim().length, maximo: POSTULACION_TEXTO_MAX })}
            </p>
            <MensajeErrorCampo id={`campo-${campo}-error`} mensaje={validacion.mensajes[campo]} />
          </div>
        );
      })}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onListo} disabled={enviando}>
          {t('perfil.cancelar')}
        </Button>
        <Button type="submit" loading={enviando}>
          {t('perfil.enviar')}
        </Button>
      </div>
    </form>
  );
}
