'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Copy, Download, ExternalLink, Info, Pencil, UsersRound } from 'lucide-react';
import {
  argumentosTextoDestinatarios,
  tieneRestriccionDeDestinatarios,
  apiFetch,
  formatearInicioEvento,
  formatearMoneda,
  FLYER_TAMANO_MAXIMO_BYTES,
  MIME_TIPOS_FLYER_PERMITIDOS,
  type DatosEvento as BodyEvento,
  type EventoDetalle,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  ButtonLink,
  CampoArchivo,
  ConfirmDestructiveDialog,
  MensajeErrorCampo,
  MigaDePan,
  PlaceholderImagen,
  mensajeDeError,
  mensajesDeCampo,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { EstadoEventoBadge } from '../estado-evento';
import { FormularioEvento, valoresDeEvento, type SedeOpcion } from '../formulario-evento';

/**
 * spec 011, T031/T035/T038 — la mitad del detalle que es del lote A: datos,
 * edición, flyer, QR con link (D83: el QR nunca va solo) y las acciones del
 * ciclo de vida (US7). El Pastor (`puedeGestionar: false`) ve todo sin
 * acciones (FR-009). Cancelar es reversible → confirmación neutra; eliminar,
 * destructiva (D151).
 */
export function DatosEvento({
  evento,
  sedes,
  apiToken,
  puedeGestionar,
  urlPublica,
  qrDataUrl,
  recienCreado,
}: {
  evento: EventoDetalle;
  sedes: SedeOpcion[];
  apiToken: string;
  puedeGestionar: boolean;
  urlPublica: string;
  qrDataUrl: string | null;
  recienCreado: boolean;
}) {
  const t = useTranslations('eventos.gestion');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const auth = { Authorization: `Bearer ${apiToken}` };
  const abiertas = evento.ocupados + evento.enEspera;

  async function guardar(datos: BodyEvento) {
    await apiFetch(`/eventos/${evento.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(datos),
    });
    toast(t('detalle.cambiosGuardados'));
    setEditando(false);
    router.refresh();
  }

  function accion(ruta: string, ok: string, despues?: () => void) {
    return async () => {
      try {
        await apiFetch(`/eventos/${evento.id}/${ruta}`, { method: 'POST', headers: auth });
        toast(ok);
        if (despues) despues();
        else router.refresh();
      } catch (e) {
        toast.error(mensajeDeError(e, te, t));
      }
    };
  }
  const cancelar = useEnvio(accion('cancelar', t('acciones.cancelado')));
  const reactivar = useEnvio(accion('reactivar', t('acciones.reactivado')));
  const eliminar = useEnvio(accion('eliminar', t('acciones.eliminado'), () => router.push('/eventos')));

  const cancelado = evento.estado === 'cancelado';
  const [ahora] = useState(() => Date.now());
  const pasado = new Date(evento.inicio).getTime() < ahora;

  return (
    <section aria-labelledby="titulo-evento" className="flex flex-col gap-6">
      <MigaDePan tramos={[{ label: t('detalle.miga'), href: '/eventos' }, { label: evento.nombre }]} LinkComponente={Link} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 id="titulo-evento" className="text-2xl font-semibold">
            {evento.nombre}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <EstadoEventoBadge estado={evento.estado} inicio={evento.inicio} />
            <span>{t(`tipo.${evento.tipo}`)}</span>
          </div>
        </div>
        <ButtonLink variant="outline" render={<Link href={urlPublica} target="_blank" rel="noreferrer" />}>
          <ExternalLink aria-hidden="true" />
          {t('detalle.verPublica')}
        </ButtonLink>
      </div>

      {recienCreado && (
        <p role="status" className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('detalle.creadoSiguiente')}
        </p>
      )}
      {cancelado && (
        <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('acciones.estadoCancelado')}
        </p>
      )}

      <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {editando ? (
            <FormularioEvento
              key={evento.id}
              valoresIniciales={valoresDeEvento(evento)}
              sedes={sedes}
              textoBoton={t('formulario.guardar')}
              textoEnviando={t('formulario.guardando')}
              enviar={guardar}
              bloquearTipo={evento.inscripcionesTotal > 0}
              accionSecundaria={
                <Button type="button" variant="ghost" onClick={() => setEditando(false)}>
                  {t('formulario.cancelarEdicion')}
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{t('detalle.datos')}</h2>
                {puedeGestionar && (
                  <Button variant="outline" onClick={() => setEditando(true)}>
                    <Pencil aria-hidden="true" />
                    {t('detalle.editar')}
                  </Button>
                )}
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[max-content_1fr]">
                <dt className="font-medium">{t('detalle.cuando')}</dt>
                <dd>{formatearInicioEvento(evento.inicio, evento.fin, locale)}</dd>
                <dt className="font-medium">{t('detalle.donde')}</dt>
                <dd>{evento.lugar}</dd>
                <dt className="font-medium">{t('detalle.sede')}</dt>
                <dd>{evento.sede.nombre}</dd>
                {(evento.publicoObjetivo || tieneRestriccionDeDestinatarios(evento.destinatarios)) && (
                  <>
                    <dt className="font-medium">{t('detalle.para')}</dt>
                    <dd className="flex flex-col gap-1">
                      {tieneRestriccionDeDestinatarios(evento.destinatarios) && (
                        <span className="flex items-start gap-2">
                          <UsersRound aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                          {t('detalle.destinatarios', argumentosTextoDestinatarios(evento.destinatarios))}
                        </span>
                      )}
                      {evento.publicoObjetivo && <span>{evento.publicoObjetivo}</span>}
                    </dd>
                  </>
                )}
                <dt className="font-medium">{t('detalle.inscripcion')}</dt>
                <dd>
                  {!evento.requiereInscripcion ? (
                    t('detalle.sinInscripcionTexto')
                  ) : (
                    <ul className="flex flex-col gap-0.5">
                      <li>
                        {t('detalle.cupo')}: {evento.cupo === null ? t('detalle.sinCupo') : t('ocupacion', { ocupados: evento.ocupados, cupo: evento.cupo })}
                      </li>
                      {evento.requiereAprobacion && <li>{t('detalle.conAprobacion')}</li>}
                      {evento.permiteListaEspera && <li>{t('detalle.conLista')}</li>}
                      {evento.diasAnticipacionRecordatorio !== null && <li>{t('detalle.recordatorio', { dias: evento.diasAnticipacionRecordatorio })}</li>}
                    </ul>
                  )}
                </dd>
                {evento.requiereInscripcion && (
                  <>
                    <dt className="font-medium">{t('detalle.costo')}</dt>
                    <dd>
                      {evento.costo === null ? (
                        t('detalle.sinCosto')
                      ) : (
                        <span className="flex flex-col gap-1">
                          <span>{formatearMoneda(Number(evento.costo), locale)}</span>
                          <span className="whitespace-pre-line text-muted-foreground">{evento.instruccionesPago}</span>
                        </span>
                      )}
                    </dd>
                  </>
                )}
              </dl>
              <p className="whitespace-pre-line text-sm">{evento.descripcion}</p>
              {evento.creadoPor && (
                <p className="text-xs text-muted-foreground">{t('detalle.creadoPor', { nombre: `${evento.creadoPor.nombre} ${evento.creadoPor.apellido}` })}</p>
              )}
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {qrDataUrl && <QrEvento id={evento.id} nombre={evento.nombre} urlPublica={urlPublica} qrDataUrl={qrDataUrl} />}
          <FlyerEvento evento={evento} apiToken={apiToken} puedeGestionar={puedeGestionar} />
        </div>
      </div>

      {puedeGestionar && (
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <div className="flex flex-wrap items-center gap-3">
            {cancelado ? (
              !pasado && (
                <ConfirmDestructiveDialog
                  tono="neutro"
                  trigger={
                    <Button variant="outline" loading={reactivar.enviando} loadingText={t('acciones.reactivando')}>
                      {t('acciones.reactivar')}
                    </Button>
                  }
                  titulo={t('acciones.reactivarTitulo', { nombre: evento.nombre })}
                  descripcion={t('acciones.reactivarTexto')}
                  textoConfirmar={t('acciones.reactivarConfirmar')}
                  textoCancelar={t('acciones.volver')}
                  onConfirmar={() => void reactivar.ejecutar()}
                />
              )
            ) : (
              <ConfirmDestructiveDialog
                tono="neutro"
                trigger={
                  <Button variant="outline" loading={cancelar.enviando} loadingText={t('acciones.cancelando')}>
                    {t('acciones.cancelar')}
                  </Button>
                }
                titulo={t('acciones.cancelarTitulo', { nombre: evento.nombre })}
                descripcion={t('acciones.cancelarTexto', { inscriptos: abiertas })}
                textoConfirmar={t('acciones.cancelarConfirmar')}
                textoCancelar={t('acciones.volver')}
                onConfirmar={() => void cancelar.ejecutar()}
              />
            )}
            {evento.inscripcionesTotal > 0 ? (
              <Button variant="outline" disabled aria-describedby="eliminar-bloqueado">
                {t('acciones.eliminar')}
              </Button>
            ) : (
              <ConfirmDestructiveDialog
                trigger={
                  <Button variant="outline" className="text-destructive" loading={eliminar.enviando} loadingText={t('acciones.eliminando')}>
                    {t('acciones.eliminar')}
                  </Button>
                }
                titulo={t('acciones.eliminarTitulo', { nombre: evento.nombre })}
                descripcion={t('acciones.eliminarTexto')}
                textoConfirmar={t('acciones.eliminarConfirmar')}
                textoCancelar={t('acciones.volver')}
                onConfirmar={() => void eliminar.ejecutar()}
              />
            )}
          </div>
          {evento.inscripcionesTotal > 0 && (
            <p id="eliminar-bloqueado" className="text-sm text-muted-foreground">
              {t('acciones.eliminarBloqueado')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** FR-013 (D56, D83): el QR con su link al lado, copiar y descargar. */
function QrEvento({ id, nombre, urlPublica, qrDataUrl }: { id: string; nombre: string; urlPublica: string; qrDataUrl: string }) {
  const t = useTranslations('eventos.gestion.qr');
  async function copiar() {
    try {
      await navigator.clipboard.writeText(urlPublica);
      toast(t('copiado'));
    } catch {
      toast.error(t('noSePudoCopiar'));
    }
  }
  return (
    <section aria-labelledby="titulo-qr" className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 id="titulo-qr" className="text-lg font-semibold">
        {t('titulo')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('ayuda')}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL generada en el servidor (research #8) */}
      <img src={qrDataUrl} alt={t('alt', { nombre })} width={192} height={192} className="mx-auto size-48 rounded-md" />
      <label htmlFor="link-evento" className="text-sm font-medium">
        {t('link')}
      </label>
      <input id="link-evento" readOnly value={urlPublica} onFocus={(e) => e.target.select()} className="h-10 rounded-md border border-input bg-transparent px-3 text-sm" />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void copiar()}>
          <Copy aria-hidden="true" />
          {t('copiar')}
        </Button>
        <ButtonLink variant="outline" render={<a href={`/api/eventos/${id}/qr.png`} download aria-label={t('descargar')} />}>
          <Download aria-hidden="true" />
          {t('descargar')}
        </ButtonLink>
      </div>
    </section>
  );
}

/** FR-012: subir, reemplazar o quitar el flyer; el texto alternativo es obligatorio. */
function FlyerEvento({ evento, apiToken, puedeGestionar }: { evento: EventoDetalle; apiToken: string; puedeGestionar: boolean }) {
  const t = useTranslations('eventos.gestion.flyer');
  const tg = useTranslations('eventos.gestion');
  const te = useTranslations('errors');
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [alt, setAlt] = useState(evento.descripcionImagen ?? '');
  const [errores, setErrores] = useState<Record<string, string>>({});

  function elegir(f: File | null) {
    setErrores({});
    if (f && !MIME_TIPOS_FLYER_PERMITIDOS.includes(f.type as (typeof MIME_TIPOS_FLYER_PERMITIDOS)[number])) {
      setErrores({ archivo: t('errorTipo') });
      setArchivo(null);
      return;
    }
    if (f && f.size > FLYER_TAMANO_MAXIMO_BYTES) {
      setErrores({ archivo: t('errorTamano') });
      setArchivo(null);
      return;
    }
    setArchivo(f);
  }

  const subir = useEnvio(async () => {
    if (!alt.trim()) {
      setErrores({ descripcionImagen: t('errorAlt') });
      document.getElementById('campo-descripcionImagen')?.focus();
      return;
    }
    const datos = new FormData();
    if (archivo) datos.append('archivo', archivo);
    datos.append('descripcionImagen', alt);
    try {
      await apiFetch(`/eventos/${evento.id}/flyer`, { method: 'PUT', headers: { Authorization: `Bearer ${apiToken}` }, body: datos });
      toast(t('guardado'));
      setArchivo(null);
      setErrores({});
      router.refresh();
    } catch (e) {
      const campos = mensajesDeCampo(e, te, tg);
      if (campos) setErrores(campos);
      else setErrores({ archivo: mensajeDeError(e, te, tg) });
    }
  });

  const quitar = useEnvio(async () => {
    try {
      await apiFetch(`/eventos/${evento.id}/flyer`, { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } });
      toast(t('quitado'));
      setAlt('');
      router.refresh();
    } catch (e) {
      toast.error(mensajeDeError(e, te, tg));
    }
  });

  return (
    <section aria-labelledby="titulo-flyer" className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 id="titulo-flyer" className="text-lg font-semibold">
        {t('titulo')}
      </h2>
      {evento.imagenUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- flyer servido por apps/api (D168)
        <img src={evento.imagenUrl} alt={evento.descripcionImagen ?? ''} className="max-h-80 w-full rounded-md bg-secondary object-contain" />
      ) : (
        <>
          <PlaceholderImagen aspecto="portada" etiqueta={t('titulo')} />
          <p className="text-sm text-muted-foreground">{t('sinFlyer')}</p>
        </>
      )}
      {puedeGestionar && (
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void subir.ejecutar();
          }}
        >
          <CampoArchivo
            id="campo-archivo"
            etiqueta={t('archivo')}
            ayuda={t('archivoAyuda')}
            textoBoton={evento.imagenUrl ? t('reemplazar') : t('subir')}
            textoSinArchivo={t('sinArchivo')}
            accept={MIME_TIPOS_FLYER_PERMITIDOS.join(',')}
            archivo={archivo}
            onElegir={elegir}
            error={errores.archivo}
          />
          {(archivo || evento.imagenUrl) && (
            <div className="flex flex-col gap-1">
              <label htmlFor="campo-descripcionImagen" className="text-sm font-medium">
                {t('alt')}
              </label>
              <p id="campo-descripcionImagen-ayuda" className="text-sm text-muted-foreground">
                {t('altAyuda')}
              </p>
              <textarea
                id="campo-descripcionImagen"
                rows={2}
                maxLength={500}
                value={alt}
                onChange={(e) => {
                  setAlt(e.target.value);
                  setErrores((a) => ({ ...a, descripcionImagen: '' }));
                }}
                aria-invalid={errores.descripcionImagen ? true : undefined}
                aria-describedby={`campo-descripcionImagen-ayuda${errores.descripcionImagen ? ' campo-descripcionImagen-error' : ''}`}
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm aria-invalid:border-destructive dark:bg-input/30"
              />
              <MensajeErrorCampo id="campo-descripcionImagen-error" mensaje={errores.descripcionImagen || undefined} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(archivo || (evento.imagenUrl && alt !== (evento.descripcionImagen ?? ''))) && (
              <Button type="submit" loading={subir.enviando} loadingText={t('subiendo')}>
                {archivo ? (evento.imagenUrl ? t('reemplazar') : t('subir')) : t('guardarAlt')}
              </Button>
            )}
            {evento.imagenUrl && !archivo && (
              <Button type="button" variant="outline" loading={quitar.enviando} loadingText={t('quitando')} onClick={() => void quitar.ejecutar()}>
                {t('quitar')}
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
