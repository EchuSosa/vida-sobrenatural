'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheck, CircleMinus, CircleX, GraduationCap, UsersRound } from 'lucide-react';
import {
  ApiError,
  MOTIVO_RECHAZO_DECLARACION_MAX,
  apiFetch,
  erroresPorCampo,
  formatearFechaHora,
  type DeclaracionDetalle,
} from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, DialogoTextoOpcional, MigaDePan, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 006, T046 (FR-013, D151): el detalle de un "Ya lo hice". Muestra la
 * Persona, la etapa, el comentario y lo que el sistema ya sabe de esa etapa.
 * "Confirmar" es la acción principal; "No confirmar" pide un motivo opcional
 * que la Persona va a leer. Las dos son neutras (se puede volver a registrar
 * o a contar). Si otra pestaña ya la resolvió (`DECLARACION_NO_PENDIENTE`),
 * lo dice y recarga.
 * spec 015 (D243): un "Ya sirvo en un ministerio" muestra lo que eligió, desde
 * qué año y dónde ya sirve; el Admin marca qué áreas confirma (cada una crea
 * la membresía; las demás quedan descartadas) y, si hace falta, registra
 * también Vida de Servicio.
 */
export function DeclaracionDetalleCliente({
  declaracion,
  apiToken,
  puedeResolver,
}: {
  declaracion: DeclaracionDetalle;
  apiToken: string;
  puedeResolver: boolean;
}) {
  const t = useTranslations('historialPrevio');
  const tb = useTranslations('bandeja');
  const tEtapas = useTranslations('etapas');
  const te = useTranslations('errors');
  const ts = useTranslations('solicitudes');
  const locale = useLocale();
  const router = useRouter();
  const nombre = `${declaracion.persona.nombre} ${declaracion.persona.apellido}`;
  const etapa = tEtapas(declaracion.etapa);
  const fecha = (iso: string) => formatearFechaHora(iso, locale);
  const { contexto } = declaracion;
  const ministerio = declaracion.ministerio;
  const resolviendo = puedeResolver && declaracion.estado === 'pendiente';
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set(ministerio?.opciones.filter((o) => o.disponible).map((o) => o.id) ?? []));
  const [conVidaDeServicio, setConVidaDeServicio] = useState(false);
  const actuales = ministerio ? [...ministerio.membresias.principales, ...ministerio.membresias.enParalelo] : [];

  function llamar(accion: 'confirmar' | 'rechazar', body?: unknown) {
    return apiFetch(`/historial/declaraciones/${declaracion.id}/${accion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function avisarError(error: unknown) {
    const code = error instanceof ApiError ? error.code : null;
    toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    router.refresh();
  }

  const { enviando: confirmando, ejecutar: confirmar } = useEnvio(async () => {
    try {
      await llamar('confirmar', ministerio ? { opcionesConfirmadas: [...marcadas], tambienVidaDeServicio: conVidaDeServicio } : undefined);
      toast.success(t('confirmada', { nombre, etapa }));
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) {
        toast.error(te.has(`campos.${campos[0].code}`) ? te(`campos.${campos[0].code}`) : t('errorGenerico'));
        return;
      }
      avisarError(error);
      return;
    }
    router.refresh();
  });

  const loQueSabe = contexto.completa
    ? t(contexto.completa === 'sistema' ? 'contextoCompletaSistema' : 'contextoCompletaHistorial')
    : contexto.enCurso
      ? t('contextoEnCurso')
      : t('contextoNada', { etapa });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: ts('titulo'), href: '/solicitudes' }, { label: nombre }]} LinkComponente={Link} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo', { nombre, etapa })}</h1>
        <p className="text-muted-foreground">
          {t('edad', { edad: declaracion.persona.edad })} · {t('contoEl', { fecha: fecha(declaracion.createdAt) })}
          {declaracion.persona.sinAccesoALaApp && ` · ${t('sinAccesoALaApp')}`}
        </p>
        <p className="font-medium">{tb(`estados.historial.${declaracion.estado}`)}</p>
        {declaracion.revisadoPor && declaracion.revisadaEn && (
          <p className="text-sm text-muted-foreground">
            {t('revisadaPor', { nombre: `${declaracion.revisadoPor.nombre} ${declaracion.revisadoPor.apellido}`, fecha: fecha(declaracion.revisadaEn) })}
          </p>
        )}
      </div>

      <section aria-labelledby="comentario-titulo" className="flex flex-col gap-2">
        <h2 id="comentario-titulo" className="text-lg font-semibold">
          {t('comentarioTitulo')}
        </h2>
        <p className={declaracion.comentario ? 'whitespace-pre-line break-words' : 'text-muted-foreground'}>{declaracion.comentario ?? t('sinComentario')}</p>
      </section>

      {ministerio && (
        <section aria-labelledby="ya-sirvo-titulo" className="flex flex-col gap-3">
          <h2 id="ya-sirvo-titulo" className="text-lg font-semibold">
            {t('yaSirvoTitulo')}
          </h2>
          <p className="text-muted-foreground">{ministerio.desdeAnio ? t('yaSirvoDesde', { anio: ministerio.desdeAnio }) : t('yaSirvoSinAnio')}</p>
          <p className="flex items-center gap-2">
            <UsersRound aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            {actuales.length > 0 ? t('yaSirvoActuales', { ministerios: actuales.map((a) => a.ministerio.nombre).join(', ') }) : t('yaSirvoSinActuales')}
          </p>
          {resolviendo ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-medium">{t('yaSirvoLeyenda')}</legend>
              {ministerio.opciones.map((o) => (
                <div key={o.id} className="flex min-h-11 items-start gap-3 text-base">
                  <input
                    id={`opcion-${o.id}`}
                    type="checkbox"
                    checked={marcadas.has(o.id)}
                    disabled={!o.disponible || confirmando}
                    onChange={(e) => {
                      const siguiente = new Set(marcadas);
                      if (e.target.checked) siguiente.add(o.id);
                      else siguiente.delete(o.id);
                      setMarcadas(siguiente);
                    }}
                    aria-describedby={`opcion-${o.id}-detalle`}
                    className="mt-1 size-5 shrink-0 accent-primary"
                  />
                  <span className="flex flex-col">
                    <label htmlFor={`opcion-${o.id}`} className="cursor-pointer font-medium">
                      {o.celula ? `${o.ministerio.nombre} · ${o.celula.nombre}` : o.ministerio.nombre}
                    </label>
                    <span id={`opcion-${o.id}-detalle`} className="text-sm text-muted-foreground">
                      {[o.requiereFormacion ? t('yaSirvoFormacion') : null, o.enParalelo ? t('yaSirvoParalelo') : null, !o.disponible ? t('yaSirvoNoDisponible') : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">{t('yaSirvoAyuda')}</p>
              {!ministerio.vidaDeServicioHecha && (
                <div className="flex min-h-11 items-start gap-3 text-base">
                  <input
                    id="tambien-vs"
                    type="checkbox"
                    checked={conVidaDeServicio}
                    disabled={confirmando}
                    onChange={(e) => setConVidaDeServicio(e.target.checked)}
                    aria-describedby="tambien-vs-ayuda"
                    className="mt-1 size-5 shrink-0 accent-primary"
                  />
                  <span className="flex flex-col">
                    <label htmlFor="tambien-vs" className="flex cursor-pointer items-center gap-1.5 font-medium">
                      <GraduationCap aria-hidden className="size-4 shrink-0" />
                      {t('yaSirvoTambienVs')}
                    </label>
                    <span id="tambien-vs-ayuda" className="text-sm text-muted-foreground">
                      {t('yaSirvoTambienVsAyuda')}
                    </span>
                  </span>
                </div>
              )}
            </fieldset>
          ) : (
            <ul className="flex flex-col gap-1">
              {ministerio.opciones.map((o) => (
                <li key={o.id} className="flex items-center gap-2">
                  {o.resultado === 'confirmada' ? <CircleCheck aria-hidden className="size-4 shrink-0 text-primary" /> : <CircleMinus aria-hidden className="size-4 shrink-0" />}
                  {o.celula ? `${o.ministerio.nombre} · ${o.celula.nombre}` : o.ministerio.nombre}
                  {` — ${t(`yaSirvoResultado.${o.resultado}`)}`}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="contexto-titulo" className="flex flex-col gap-2">
        <h2 id="contexto-titulo" className="text-lg font-semibold">
          {t('contextoTitulo', { etapa })}
        </h2>
        <p>{loQueSabe}</p>
        {declaracion.contexto.declaracionesAnteriores.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {declaracion.contexto.declaracionesAnteriores.map((a, i) => (
              <li key={`${a.fecha}-${i}`}>{t('anterior', { estado: tb(`estados.historial.${a.estado}`), fecha: fecha(a.fecha) })}</li>
            ))}
          </ul>
        )}
      </section>

      {declaracion.estado === 'rechazada' && declaracion.motivoRechazo && (
        <p className="text-muted-foreground">{t('motivoMostrado', { motivo: declaracion.motivoRechazo })}</p>
      )}

      {puedeResolver && declaracion.estado === 'pendiente' && (
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <DialogoTextoOpcional
            trigger={
              <Button type="button" variant="outline" className="h-11" disabled={confirmando}>
                <CircleX aria-hidden />
                {t('noConfirmar')}
              </Button>
            }
            titulo={t('noConfirmarTitulo', { nombre, etapa })}
            descripcion={t('noConfirmarDescripcion')}
            campo="motivo"
            etiqueta={t('motivoEtiqueta')}
            ayuda={t('motivoAyuda')}
            max={MOTIVO_RECHAZO_DECLARACION_MAX}
            contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
            mensajeDemasiadoLargo={te('campos.MOTIVO_DEMASIADO_LARGO')}
            tituloResumen={t('resumenErrores')}
            textoEnviar={t('noConfirmarEnviar')}
            textoVolver={t('volver')}
            onEnviar={async (motivo) => {
              try {
                await llamar('rechazar', { motivo: motivo ?? undefined });
                toast.success(t('rechazada', { nombre }));
              } catch (error) {
                if (erroresPorCampo(error)) return { errorCampo: te('campos.MOTIVO_DEMASIADO_LARGO') };
                avisarError(error);
                return;
              }
              router.refresh();
            }}
          />
          <ConfirmDestructiveDialog
            tono="neutro"
            trigger={
              <Button type="button" loading={confirmando} className="h-11">
                <CircleCheck aria-hidden />
                {t('confirmar')}
              </Button>
            }
            titulo={t('confirmarTitulo', { nombre, etapa })}
            descripcion={t('confirmarDescripcion')}
            textoConfirmar={t('confirmarEnviar')}
            textoCancelar={t('volver')}
            onConfirmar={() => void confirmar()}
          />
        </div>
      )}
    </div>
  );
}
