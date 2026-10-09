'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarPlus, CalendarX, CircleCheck, CircleX } from 'lucide-react';
import {
  ApiError,
  MOTIVO_RECHAZO_BAUTISMO_MAX,
  apiFetch,
  erroresPorCampo,
  formatearFechaHora,
  formatearInicioEvento,
  type EventoDeBautismoResumen,
  type SolicitudBautismoDetalle,
} from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, DialogoTextoOpcional, MigaDePan, useEnvio } from '@vida-sobrenatural/ui';

const CLASE_CAMPO = 'h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30 sm:w-auto sm:min-w-80';

/**
 * spec 010, T029 y T037 (FR-007 a FR-012, FR-015; D151): el detalle de una
 * Solicitud de Bautismo. Muestra la Persona, su comentario y su situación
 * respecto de la regla (Vida Nueva en curso / completada / habilitada por
 * quién / ninguna). "Aceptar" es la acción principal, con un selector
 * opcional de la próxima fecha; "Rechazar" pide un motivo opcional que solo
 * ve el equipo. Ya aceptada: asignar a una fecha o quitarla de la suya. Sin
 * Eventos de bautismo próximos, en vez de un selector vacío ofrece crear uno
 * (escenario 3.5). Si otra pestaña ya la cambió (`…YA_CAMBIO`), lo dice y
 * recarga.
 */
export function DetalleBautismoCliente({
  solicitud,
  eventos,
  apiToken,
  puedeResolver,
  puedeCrearEventos,
}: {
  solicitud: SolicitudBautismoDetalle;
  eventos: EventoDeBautismoResumen[];
  apiToken: string;
  puedeResolver: boolean;
  puedeCrearEventos: boolean;
}) {
  const t = useTranslations('solicitudes.bautismo');
  const tb = useTranslations('bandeja');
  const te = useTranslations('errors');
  const ts = useTranslations('solicitudes');
  const locale = useLocale();
  const router = useRouter();
  const [eventoId, setEventoId] = useState('');
  const nombre = `${solicitud.persona.nombre} ${solicitud.persona.apellido}`;
  const fecha = (iso: string) => formatearFechaHora(iso, locale);
  const nombreDe = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`;
  const eventoElegido = eventos.find((e) => e.id === eventoId);

  function llamar(ruta: string, body?: unknown) {
    return apiFetch(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify(body ?? {}),
    });
  }

  function avisarError(error: unknown) {
    const code = error instanceof ApiError ? error.code : null;
    toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    router.refresh();
  }

  const { enviando: aceptando, ejecutar: aceptar } = useEnvio(async () => {
    try {
      await llamar(`/bautismo/solicitudes/${solicitud.id}/aceptar`, eventoId ? { eventoId } : {});
      toast.success(eventoElegido ? t('aceptadaConFecha', { nombre, evento: eventoElegido.nombre }) : t('aceptada', { nombre }));
    } catch (error) {
      avisarError(error);
      return;
    }
    router.refresh();
  });

  const { enviando: asignando, ejecutar: asignar } = useEnvio(async () => {
    if (!eventoId) return;
    try {
      const r = await apiFetch<{ asignadas: string[] }>(`/bautismo/eventos/${eventoId}/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ solicitudIds: [solicitud.id] }),
      });
      if (r.asignadas.length === 0) toast.error(te('SOLICITUD_BAUTISMO_YA_CAMBIO'));
      else toast.success(t('asignada', { nombre, evento: eventoElegido?.nombre ?? '' }));
    } catch (error) {
      avisarError(error);
      return;
    }
    router.refresh();
  });

  const { enviando: quitando, ejecutar: quitar } = useEnvio(async () => {
    try {
      await llamar(`/bautismo/solicitudes/${solicitud.id}/quitar-de-evento`);
      toast.success(t('quitada', { nombre }));
    } catch (error) {
      avisarError(error);
      return;
    }
    router.refresh();
  });

  const vn = solicitud.vidaNueva;
  const situacion =
    vn.estado === 'en_curso'
      ? vn.desde
        ? t('vidaNuevaEnCursoDesde', { fecha: fecha(vn.desde) })
        : t('vidaNuevaEnCurso')
      : vn.estado === 'completada'
        ? t('vidaNuevaCompletada')
        : solicitud.habilitacion
          ? null
          : solicitud.creadoPor
            ? t('ningunaEnNombre')
            : t('ninguna');
  const enEspera = solicitud.estado === 'aprobada' && !solicitud.evento;
  const conFechaFutura = solicitud.estado === 'aprobada' && solicitud.evento && new Date(solicitud.evento.inicio) > new Date();
  const ocupado = aceptando || asignando || quitando;

  const selectorDeFecha = (
    <div className="flex flex-col gap-2">
      {eventos.length > 0 ? (
        <>
          <label htmlFor="campo-eventoId" className="text-sm font-medium">
            {solicitud.estado === 'pendiente' ? t('fechaOpcional') : t('fechaElegir')}
          </label>
          <select id="campo-eventoId" className={CLASE_CAMPO} value={eventoId} onChange={(e) => setEventoId(e.target.value)} aria-describedby="ayuda-eventoId">
            <option value="">{solicitud.estado === 'pendiente' ? t('sinFechaTodavia') : t('elegirFecha')}</option>
            {eventos.map((e) => (
              <option key={e.id} value={e.id}>
                {t('opcionEvento', { nombre: e.nombre, fecha: formatearInicioEvento(e.inicio, e.fin, locale) })}
              </option>
            ))}
          </select>
          <p id="ayuda-eventoId" className="text-sm text-muted-foreground">
            {t('fechaAyuda')}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('sinEventos')}{' '}
          {puedeCrearEventos && (
            <Link href="/eventos/nuevo" className="font-medium text-primary underline underline-offset-2">
              {t('crearEvento')}
            </Link>
          )}
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: ts('titulo'), href: '/solicitudes' }, { label: nombre }]} LinkComponente={Link} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo', { nombre })}</h1>
        <p className="text-muted-foreground">
          {t('edad', { edad: solicitud.persona.edad })} · {t('pidioEl', { fecha: fecha(solicitud.createdAt) })}
          {solicitud.persona.sinAccesoALaApp && ` · ${t('sinAccesoALaApp')}`}
        </p>
        <p className="font-medium">{tb(`estados.bautismo.${solicitud.estado}`)}</p>
        {solicitud.creadoPor && <p className="text-sm text-muted-foreground">{t('creadaPor', { nombre: nombreDe(solicitud.creadoPor) })}</p>}
        {solicitud.revisadoPor && solicitud.revisadaEn && (
          <p className="text-sm text-muted-foreground">{t('revisadaPor', { nombre: nombreDe(solicitud.revisadoPor), fecha: fecha(solicitud.revisadaEn) })}</p>
        )}
        {solicitud.realizadaEn && <p className="text-sm text-muted-foreground">{t('realizadaEl', { fecha: fecha(solicitud.realizadaEn) })}</p>}
      </div>

      <section aria-labelledby="comentario-titulo" className="flex flex-col gap-2">
        <h2 id="comentario-titulo" className="text-lg font-semibold">
          {t('comentarioTitulo')}
        </h2>
        <p className={solicitud.comentario ? 'whitespace-pre-line break-words' : 'text-muted-foreground'}>{solicitud.comentario ?? t('sinComentario')}</p>
      </section>

      <section aria-labelledby="situacion-titulo" className="flex flex-col gap-2">
        <h2 id="situacion-titulo" className="text-lg font-semibold">
          {t('situacionTitulo')}
        </h2>
        {situacion && <p>{situacion}</p>}
        {solicitud.habilitacion && (
          <p>
            {solicitud.habilitacion.por
              ? t('habilitadaPor', { nombre: nombreDe(solicitud.habilitacion.por), fecha: fecha(solicitud.habilitacion.en) })
              : t('habilitada', { fecha: fecha(solicitud.habilitacion.en) })}
          </p>
        )}
      </section>

      {(solicitud.estado === 'aprobada' || solicitud.estado === 'realizada') && (
        <section aria-labelledby="fecha-titulo" className="flex flex-col gap-2">
          <h2 id="fecha-titulo" className="text-lg font-semibold">
            {t('fechaTitulo')}
          </h2>
          {solicitud.evento ? (
            <p>
              <Link href={`/eventos/${solicitud.evento.id}`} className="font-medium text-primary underline underline-offset-2">
                {solicitud.evento.nombre}
              </Link>
              {' · '}
              {formatearInicioEvento(solicitud.evento.inicio, solicitud.evento.fin, locale)}
            </p>
          ) : (
            <p className="text-muted-foreground">{t('esperandoFecha')}</p>
          )}
        </section>
      )}

      {solicitud.estado === 'rechazada' && solicitud.motivoRechazo && (
        <p className="text-muted-foreground">{t('motivoMostrado', { motivo: solicitud.motivoRechazo })}</p>
      )}

      {puedeResolver && solicitud.estado === 'pendiente' && (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {selectorDeFecha}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogoTextoOpcional
              trigger={
                <Button type="button" variant="outline" className="h-11" disabled={ocupado}>
                  <CircleX aria-hidden />
                  {t('rechazar')}
                </Button>
              }
              titulo={t('rechazarTitulo', { nombre })}
              descripcion={t('rechazarDescripcion')}
              campo="motivo"
              etiqueta={t('motivoEtiqueta')}
              ayuda={t('motivoAyuda')}
              max={MOTIVO_RECHAZO_BAUTISMO_MAX}
              contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
              mensajeDemasiadoLargo={te('campos.MOTIVO_DEMASIADO_LARGO')}
              tituloResumen={t('resumenErrores')}
              textoEnviar={t('rechazarEnviar')}
              textoVolver={t('volver')}
              onEnviar={async (motivo) => {
                try {
                  await llamar(`/bautismo/solicitudes/${solicitud.id}/rechazar`, { motivo: motivo ?? undefined });
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
                <Button type="button" loading={aceptando} disabled={ocupado} className="h-11">
                  <CircleCheck aria-hidden />
                  {t('aceptar')}
                </Button>
              }
              titulo={t('aceptarTitulo', { nombre })}
              descripcion={eventoElegido ? t('aceptarDescripcionConFecha', { evento: eventoElegido.nombre }) : t('aceptarDescripcion')}
              textoConfirmar={t('aceptarEnviar')}
              textoCancelar={t('volver')}
              onConfirmar={() => void aceptar()}
            />
          </div>
        </div>
      )}

      {puedeResolver && enEspera && (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {selectorDeFecha}
          {eventos.length > 0 && (
            <div className="flex sm:justify-end">
              <Button type="button" className="h-11" loading={asignando} disabled={!eventoId || ocupado} onClick={() => void asignar()}>
                <CalendarPlus aria-hidden />
                {t('asignar')}
              </Button>
            </div>
          )}
        </div>
      )}

      {puedeResolver && conFechaFutura && (
        <div className="flex border-t border-border pt-4 sm:justify-end">
          <ConfirmDestructiveDialog
            tono="neutro"
            trigger={
              <Button type="button" variant="outline" className="h-11" loading={quitando} disabled={ocupado}>
                <CalendarX aria-hidden />
                {t('quitar')}
              </Button>
            }
            titulo={t('quitarTitulo', { nombre })}
            descripcion={t('quitarDescripcion')}
            textoConfirmar={t('quitarEnviar')}
            textoCancelar={t('volver')}
            onConfirmar={() => void quitar()}
          />
        </div>
      )}
    </div>
  );
}
