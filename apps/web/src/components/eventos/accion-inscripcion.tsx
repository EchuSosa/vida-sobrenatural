'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import {
  apiFetch,
  argumentosTextoDestinatarios,
  campoDeRespuesta,
  validarRespuestas,
  formatearInicioEvento,
  formatearMoneda,
  type EventoPublico,
  type MiInscripcionEnEvento,
  type MiInscripcionEvento,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  ButtonLink,
  CamposPreguntasEvento,
  EstadoInscripcionBadge,
  ResumenErrores,
  Skeleton,
  mensajeDeError,
  mensajesDeCampo,
  useEnvio,
  useValidacionCampos,
} from '@vida-sobrenatural/ui';

/**
 * spec 011, T052 (research #10) — la isla de la página del Evento que depende
 * de quién mira: sin sesión, "Anotarme" lleva al ingreso con `destino`
 * (FR-020); con sesión, consulta su inscripción y muestra el estado o el paso
 * de confirmación, y después el resultado con "qué sigue" (FR-015, FR-017,
 * FR-019). Con `?anotarme=1` abre la confirmación sola. Lleno sin lista: el
 * botón queda deshabilitado con la explicación al lado (FR-004).
 */
export function AccionInscripcion({ evento }: { evento: EventoPublico }) {
  const t = useTranslations('eventos.inscripcion');
  const te = useTranslations('errors');
  const locale = useLocale();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [estado, setEstado] = useState<MiInscripcionEnEvento | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<MiInscripcionEvento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tituloConfirmar = useRef<HTMLHeadingElement>(null);
  const token = session?.apiToken;
  const activa = session?.user.estado === 'activa';

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      setEstado(await apiFetch<MiInscripcionEnEvento>(`/eventos/${evento.id}/mi-inscripcion`, { headers: { Authorization: `Bearer ${token}` } }));
    } catch {
      setErrorCarga(true);
    }
  }, [evento.id, token]);

  useEffect(() => {
    if (status !== 'authenticated' || !activa || !token) return;
    let vigente = true;
    apiFetch<MiInscripcionEnEvento>(`/eventos/${evento.id}/mi-inscripcion`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => vigente && setEstado(r))
      .catch(() => vigente && setErrorCarga(true));
    return () => {
      vigente = false;
    };
  }, [status, activa, token, evento.id]);

  // `?anotarme=1` (al volver del ingreso): abre la confirmación si se puede.
  const pedidoPorUrl = searchParams.get('anotarme') === '1';
  const [abiertaPorUrl, setAbiertaPorUrl] = useState(false);
  if (pedidoPorUrl && !abiertaPorUrl && estado && estado.corresponde && !estado.inscripcion?.estado.match(/confirmada|pendiente|lista_espera/) && puedeAnotarse(estado.estadoInscripcion)) {
    setAbiertaPorUrl(true);
    setConfirmando(true);
  }
  useEffect(() => {
    if (confirmando) tituloConfirmar.current?.focus();
  }, [confirmando]);

  // FR-065 (ampliación 2026-10-09): las preguntas del Evento se responden en el mismo paso.
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const validacion = useValidacionCampos();
  const mensajeDeCampo = (code: string) => (te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errores.generico'));

  const anotarme = useEnvio(async () => {
    setError(null);
    const enviadas = Object.entries(respuestas).map(([preguntaId, valor]) => ({ preguntaId, valor }));
    const locales = validarRespuestas(evento.preguntas, enviadas).errores;
    if (locales.length > 0) {
      validacion.reemplazar(Object.fromEntries(locales.map((e) => [e.campo, mensajeDeCampo(e.code)])));
      return;
    }
    try {
      const creada = await apiFetch<MiInscripcionEvento>(`/eventos/${evento.id}/inscripciones/me`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuestas: enviadas }),
      });
      setResultado(creada);
      setConfirmando(false);
      void cargar();
    } catch (e) {
      const campos = mensajesDeCampo(e, te, t);
      if (campos) validacion.reemplazar(campos);
      else setError(mensajeDeError(e, te, t));
      void cargar();
    }
  });

  const cuando = formatearInicioEvento(evento.inicio, evento.fin, locale);
  const destino = `/ingresar?destino=${encodeURIComponent(`/eventos/${evento.slug}?anotarme=1`)}`;
  const estadoEvento = estado?.estadoInscripcion ?? evento.estadoInscripcion;
  const lista = estadoEvento === 'lista_espera';

  if (!puedeAnotarse(evento.estadoInscripcion) && evento.estadoInscripcion !== 'cupo_completo') return null;

  return (
    <section aria-labelledby="titulo-inscripcion" className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <h2 id="titulo-inscripcion" className="text-xl font-semibold">
        {t('titulo')}
      </h2>

      {status === 'loading' || (status === 'authenticated' && activa && !estado && !errorCarga) ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <span className="sr-only">{t('cargando')}</span>
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-11 w-40" />
        </div>
      ) : errorCarga ? (
        <p role="alert" className="text-base">
          {t('errorCarga')}
        </p>
      ) : status !== 'authenticated' ? (
        estadoEvento === 'cupo_completo' ? (
          <CupoCompleto />
        ) : (
          <>
            <p className="text-base">{lista ? t('listaTexto') : t('sinSesionTexto')}</p>
            <ButtonLink size="xl" className="w-fit text-base" render={<Link href={destino} />}>
              {lista ? t('anotarmeLista') : t('anotarme')}
            </ButtonLink>
          </>
        )
      ) : !activa ? (
        <>
          <p className="text-base">{t('sinCuentaActiva')}</p>
          <ButtonLink size="xl" className="w-fit text-base" render={<Link href="/registro" />}>
            {t('terminarRegistro')}
          </ButtonLink>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div role="status" className="flex flex-col gap-3">
            {(resultado ?? estado?.inscripcion) && <EstadoYQueSigue inscripcion={(resultado ?? estado!.inscripcion)!} cuando={cuando} />}
          </div>
          {tieneAbierta(resultado ?? estado?.inscripcion ?? null) && estado && estado.respuestas.length > 0 && <MisRespuestas respuestas={estado.respuestas} />}

          {error && (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-base text-foreground">
              {error}
            </p>
          )}

          {!tieneAbierta(resultado ?? estado?.inscripcion ?? null) &&
            (estado && !estado.corresponde ? (
              <NoCorresponde evento={evento} />
            ) : estadoEvento === 'cupo_completo' ? (
              <CupoCompleto />
            ) : !puedeAnotarse(estadoEvento) ? null : confirmando ? (
              <div className="flex flex-col gap-3 rounded-md bg-secondary p-4">
                <h3 ref={tituloConfirmar} tabIndex={-1} className="text-lg font-semibold outline-none">
                  {t('confirmarTitulo', { nombre: evento.nombre })}
                </h3>
                <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('revisaRespuestas')} />
                <ul className="flex flex-col gap-1 text-base">
                  <li>{t('confirmarCuando', { cuando })}</li>
                  <li>{t('confirmarDonde', { lugar: evento.lugar })}</li>
                  {evento.costo && <li>{t('confirmarCosto', { costo: formatearMoneda(Number(evento.costo), locale) })}</li>}
                  {lista ? <li>{t('confirmarLista')}</li> : evento.requiereAprobacion && <li>{t('confirmarAprobacion')}</li>}
                </ul>
                {evento.preguntas.length > 0 && (
                  // Sobre `background`, no sobre el `secondary` del recuadro: el rojo de los errores
                  // por campo da 4.0:1 sobre `secondary` en oscuro (H-56); sobre `background`, pasa.
                  <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
                    <p className="text-base font-semibold">{t('preguntasTitulo')}</p>
                    <CamposPreguntasEvento
                      tactil
                      preguntas={evento.preguntas}
                      valores={respuestas}
                      onCambiar={(id, valor) => {
                        setRespuestas((a) => ({ ...a, [id]: valor }));
                        validacion.limpiar(campoDeRespuesta(id));
                      }}
                      errores={validacion.mensajes}
                      etiquetas={{ si: t('si'), no: t('no'), opcional: t('opcional'), sensible: t('sensible') }}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="xl" className="text-base" loading={anotarme.enviando} loadingText={t('anotando')} onClick={() => void anotarme.ejecutar()}>
                    {t('confirmarSi')}
                  </Button>
                  <Button size="xl" variant="outline" className="text-base" onClick={() => setConfirmando(false)}>
                    {t('confirmarNo')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {lista && <p className="text-base">{t('listaTexto')}</p>}
                <Button size="xl" className="w-fit text-base" onClick={() => setConfirmando(true)}>
                  {lista ? t('anotarmeLista') : t('anotarme')}
                </Button>
              </>
            ))}
        </div>
      )}
    </section>
  );
}

function puedeAnotarse(estado: MiInscripcionEnEvento['estadoInscripcion']): boolean {
  return estado === 'abierta' || estado === 'lista_espera';
}

function tieneAbierta(i: MiInscripcionEvento | null): boolean {
  return i !== null && (i.estado === 'confirmada' || i.estado === 'pendiente' || i.estado === 'lista_espera');
}

/** FR-061, FR-063 — no está entre los destinatarios: el texto (con ícono, D81) en lugar del botón. */
function NoCorresponde({ evento }: { evento: EventoPublico }) {
  const t = useTranslations('eventos.inscripcion');
  const tp = useTranslations('eventos.publico');
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-secondary p-4" data-testid="evento-no-corresponde">
      <Info aria-hidden="true" className="mt-1 size-5 shrink-0" />
      <div className="flex flex-col gap-1 text-base">
        <p className="font-semibold">{tp('destinatarios', argumentosTextoDestinatarios(evento.destinatarios))}</p>
        <p>{t('noCorresponde')}</p>
      </div>
    </div>
  );
}

/** FR-068: la propia Persona ve lo que respondió (también lo sensible). */
function MisRespuestas({ respuestas }: { respuestas: MiInscripcionEnEvento['respuestas'] }) {
  const t = useTranslations('eventos.inscripcion');
  return (
    <div className="flex flex-col gap-2 rounded-md bg-secondary p-4">
      <h3 className="text-lg font-semibold">{t('tusRespuestas')}</h3>
      <dl className="flex flex-col gap-2 text-base">
        {respuestas.map((r) => (
          <div key={r.preguntaId} className="flex flex-col">
            <dt className="font-medium">{r.pregunta}</dt>
            <dd>{r.tipo === 'si_no' ? t(r.valor === 'si' ? 'si' : 'no') : r.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CupoCompleto() {
  const t = useTranslations('eventos.inscripcion');
  return (
    <div className="flex flex-col gap-2">
      <Button size="xl" className="w-fit text-base" disabled aria-describedby="cupo-completo-explicacion">
        {t('cupoCompletoBoton')}
      </Button>
      <p id="cupo-completo-explicacion" className="text-base">
        {t('cupoCompletoTexto')}
      </p>
    </div>
  );
}

/** El estado de la propia inscripción y "qué sigue" (docs/15), con el pago si el Evento tiene costo. */
function EstadoYQueSigue({ inscripcion, cuando }: { inscripcion: MiInscripcionEvento; cuando: string }) {
  const t = useTranslations('eventos.inscripcion');
  const { estado, posicionEnLista, estadoPago, evento } = inscripcion;
  const posicion = posicionEnLista ?? 0;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
        <EstadoInscripcionBadge estado={estado} texto={t(`estado.${estado}`, { posicion })} />
        {estado === 'confirmada' && estadoPago !== 'no_aplica' && <EstadoInscripcionBadge estado={estadoPago} texto={t(`pago.${estadoPago}`)} />}
      </div>
      {estado === 'confirmada' && estadoPago === 'sin_pago' ? (
        <>
          <p className="text-base">{t('queSigue.confirmadaConCosto')}</p>
          {evento.instruccionesPago && <p className="whitespace-pre-line rounded-md bg-secondary p-3 text-base">{evento.instruccionesPago}</p>}
          <ButtonLink size="xl" className="w-fit text-base" render={<Link href={`/mis-eventos?pagar=${inscripcion.id}`} />}>
            {t('subirComprobante')}
          </ButtonLink>
        </>
      ) : (
        <p className="text-base">{t(`queSigue.${estado}`, { cuando, lugar: evento.lugar, posicion })}</p>
      )}
      {estado !== 'cancelada' && (
        <Link href="/mis-eventos" className="w-fit text-base font-medium underline underline-offset-4 hover:no-underline">
          {t('verMisEventos')}
        </Link>
      )}
    </>
  );
}
