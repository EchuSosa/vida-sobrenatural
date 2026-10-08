'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowRightLeft, CircleCheckBig, Clock, Info, Lock, UserRoundX } from 'lucide-react';
import { apiFetch, ApiError, formatearDiaEnArgentina } from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, EstadoVacio, MigaDePan, useEnvio } from '@vida-sobrenatural/ui';
import type { DetalleDiscipuladoAdmin } from '@vida-sobrenatural/shared-types';
import { PanelMotivo, mensajeDeError, mensajesDeCampo, nombresDe, textoFranja, type TextosPanelMotivo } from '@vida-sobrenatural/ui';
import { EnlacePersona } from '../../../components/enlace-persona';
import { PanelReasignar } from './reasignar';

type PersonaAdmin = DetalleDiscipuladoAdmin['personas'][number];

/** Qué panel de motivo está abierto: rechazar la finalización o rechazar la baja de una Inscripción. */
type Rechazo = { tipo: 'finalizacion' } | { tipo: 'baja'; persona: PersonaAdmin } | null;

/**
 * specs/004, T047, T052 y T054c: el detalle administrativo. Arriba, "Qué
 * falta decidir" (solo con `grupos.gestionar`): la finalización pedida, las
 * bajas pedidas y el cambio de Discipulador. Después las Personas, el horario
 * derivado, los Encuentros SIN notas y el historial de Discipuladores.
 */
export function GrupoDetalleCliente({ detalle, apiToken, puedeGestionar }: { detalle: DetalleDiscipuladoAdmin; apiToken: string; puedeGestionar: boolean }) {
  const t = useTranslations('grupos');
  const tf = useTranslations('franjas');
  const tc = useTranslations('comun');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [rechazo, setRechazo] = useState<Rechazo>(null);
  const [reasignando, setReasignando] = useState(false);
  const enCurso = detalle.estado === 'en_curso';
  const gestiona = puedeGestionar && enCurso;
  const activas = detalle.personas.filter((p) => p.estadoInscripcion === 'activa');
  const nombres = nombresDe(enCurso ? activas : detalle.personas);
  const actual = `${detalle.discipulador.nombre} ${detalle.discipulador.apellido}`;
  const nombrePorPersona = new Map(detalle.personas.map((p) => [p.id, p.nombre]));
  const dias = tf.raw('dias') as string[];
  const bajasPedidas = activas.filter((p) => p.bajaPropuestaEn);

  async function post(ruta: string, cuerpo?: object) {
    return apiFetch(`/grupos/discipulados/${detalle.grupoId}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  }

  /** Ante un 409 de estado (otro Admin lo resolvió, el Grupo cerró), se dice y se recarga. */
  function fallo(e: unknown) {
    toast.error(mensajeDeError(e, te, t));
    if (e instanceof ApiError && e.code !== 'ERROR_INTERNO') router.refresh();
  }

  const { enviando: confirmandoFin, ejecutar: confirmarFinalizacion } = useEnvio(async () => {
    try {
      await post('/finalizacion/confirmar');
      toast(t('finalizacion.exitoConfirmada'));
      router.refresh();
    } catch (e) {
      fallo(e);
    }
  });

  const { enviando: confirmandoBaja, ejecutar: confirmarBaja } = useEnvio(async (p: PersonaAdmin) => {
    try {
      await post(`/inscripciones/${p.inscripcionId}/baja/confirmar`);
      toast(t('baja.exitoConfirmada', { nombre: p.nombre }));
      router.refresh();
    } catch (e) {
      fallo(e);
    }
  });

  const { enviando: retirando, ejecutar: retirarReasignacion } = useEnvio(async () => {
    try {
      await post('/reasignar/retirar');
      toast(t('reasignacion.exitoRetirada'));
      router.refresh();
    } catch (e) {
      fallo(e);
    }
  });

  async function rechazar(motivo: string): Promise<Record<string, string> | null> {
    if (!rechazo) return null;
    try {
      if (rechazo.tipo === 'finalizacion') await post('/finalizacion/rechazar', motivo ? { motivo } : {});
      else await post(`/inscripciones/${rechazo.persona.inscripcionId}/baja/rechazar`, motivo ? { motivo } : {});
      toast(rechazo.tipo === 'finalizacion' ? t('finalizacion.exitoRechazada') : t('baja.exitoRechazada'));
    } catch (e) {
      const campos = mensajesDeCampo(e, te, t);
      if (campos) return campos;
      fallo(e);
    }
    setRechazo(null);
    router.refresh();
    return null;
  }

  const textosRechazo = (titulo: string, descripcion: string): TextosPanelMotivo => ({
    titulo,
    descripcion,
    etiqueta: t('motivo'),
    ayuda: t('motivoAyuda'),
    confirmar: t('confirmarRechazo'),
    enviando: t('rechazando'),
    volver: t('volver'),
    cerrarPanel: tc('cerrarPanel'),
    resumen: t('campos.resumen'),
    demasiadoLargo: te('campos.MOTIVO_DEMASIADO_LARGO'),
  });

  const hayQueDecidir = Boolean(detalle.propuestaFinalizacionEn) || bajasPedidas.length > 0 || detalle.reasignacionPropuesta !== null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/grupos' }, { label: nombres }]} LinkComponente={Link} />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('detalle.titulo', { nombres })}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            {enCurso ? <Clock className="size-4" aria-hidden="true" /> : <CircleCheckBig className="size-4" aria-hidden="true" />}
            {t(`estado.${detalle.motivoCierre ?? 'en_curso'}`)}
          </span>
          <span>{t('detalle.discipulador', { nombre: actual })}</span>
          <span className="text-muted-foreground">{t('detalle.desde', { fecha: formatearDiaEnArgentina(detalle.desde, locale) })}</span>
          {enCurso && <span className="text-muted-foreground">{t('detalle.lugar', detalle.lugar)}</span>}
        </p>
      </header>

      {gestiona && (
        <section aria-labelledby="decidir" className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <h2 id="decidir" className="text-lg font-semibold">
            {t('detalle.acciones')}
          </h2>
          {!hayQueDecidir && <p className="text-sm text-muted-foreground">{t('detalle.nadaQueDecidir')}</p>}

          {detalle.propuestaFinalizacionEn && (
            <div className="flex flex-col gap-3">
              <p className="flex items-start gap-2 text-sm">
                <CircleCheckBig className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t('finalizacion.propuesta', { nombre: actual, fecha: formatearDiaEnArgentina(detalle.propuestaFinalizacionEn, locale) })}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
                <ConfirmDestructiveDialog
                  trigger={
                    <Button size="lg" loading={confirmandoFin} loadingText={t('finalizacion.confirmando')}>
                      {t('finalizacion.confirmar')}
                    </Button>
                  }
                  titulo={t('finalizacion.confirmarTitulo')}
                  descripcion={t('finalizacion.confirmarTexto')}
                  textoConfirmar={t('finalizacion.confirmarBoton')}
                  textoCancelar={t('volver')}
                  onConfirmar={() => void confirmarFinalizacion()}
                />
                <Button size="lg" variant="outline" onClick={() => setRechazo({ tipo: 'finalizacion' })}>
                  {t('finalizacion.rechazar')}
                </Button>
              </div>
            </div>
          )}

          {bajasPedidas.map((p) => (
            <div key={p.inscripcionId} className="flex flex-col gap-3 border-t border-border pt-4">
              <div className="flex flex-col gap-1 text-sm">
                <p className="flex items-start gap-2 font-medium">
                  <UserRoundX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {p.nombre} {p.apellido}: {t('baja.propuesta', { fecha: formatearDiaEnArgentina(p.bajaPropuestaEn!, locale) })}
                </p>
                {p.bajaPropuestaMotivo && <p className="text-muted-foreground">{t('baja.motivo', { motivo: p.bajaPropuestaMotivo })}</p>}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
                <ConfirmDestructiveDialog
                  trigger={
                    <Button size="lg" variant="destructive" loading={confirmandoBaja} loadingText={t('baja.confirmando')}>
                      <UserRoundX aria-hidden="true" />
                      {t('baja.confirmar', { nombre: p.nombre })}
                    </Button>
                  }
                  titulo={t('baja.confirmarTitulo', { nombre: `${p.nombre} ${p.apellido}` })}
                  descripcion={t('baja.confirmarTexto', { nombre: p.nombre })}
                  textoConfirmar={t('baja.confirmarBoton')}
                  textoCancelar={t('volver')}
                  onConfirmar={() => void confirmarBaja(p)}
                />
                <Button size="lg" variant="outline" onClick={() => setRechazo({ tipo: 'baja', persona: p })}>
                  {t('baja.rechazar', { nombre: p.nombre })}
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            {detalle.reasignacionPropuesta ? (
              <>
                <p className="flex items-start gap-2 text-sm">
                  <ArrowRightLeft className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {t('reasignacion.propuesta', {
                    nombre: `${detalle.reasignacionPropuesta.discipulador.nombre} ${detalle.reasignacionPropuesta.discipulador.apellido}`,
                    fecha: formatearDiaEnArgentina(detalle.reasignacionPropuesta.propuestaEn, locale),
                    actual,
                  })}
                </p>
                <ConfirmDestructiveDialog
                  trigger={
                    <Button size="lg" variant="outline" className="w-fit" loading={retirando} loadingText={t('reasignacion.retirando')}>
                      {t('reasignacion.retirar')}
                    </Button>
                  }
                  titulo={t('reasignacion.retirarTitulo', { nombre: `${detalle.reasignacionPropuesta.discipulador.nombre} ${detalle.reasignacionPropuesta.discipulador.apellido}` })}
                  descripcion={t('reasignacion.retirarTexto', { actual })}
                  textoConfirmar={t('reasignacion.retirarBoton')}
                  textoCancelar={t('volver')}
                  onConfirmar={() => void retirarReasignacion()}
                />
              </>
            ) : (
              <Button size="lg" variant="outline" className="w-fit" onClick={() => setReasignando(true)}>
                <ArrowRightLeft aria-hidden="true" />
                {t('reasignacion.abrir')}
              </Button>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="personas" className="flex flex-col gap-3">
        <h2 id="personas" className="text-lg font-semibold">
          {t('detalle.personas')}
        </h2>
        <ul className="flex flex-col gap-2">
          {detalle.personas.map((p) => (
            <li key={p.inscripcionId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
              {/* spec 013 (T034): el nombre lleva al perfil. */}
              <EnlacePersona persona={p} className="font-medium" />
              <span className="inline-flex items-center gap-1.5 text-sm">
                {p.estadoInscripcion === 'activa' ? (
                  p.bajaPropuesta ? <UserRoundX className="size-4" aria-hidden="true" /> : <Clock className="size-4" aria-hidden="true" />
                ) : p.estadoInscripcion === 'completada' ? (
                  <CircleCheckBig className="size-4" aria-hidden="true" />
                ) : (
                  <UserRoundX className="size-4" aria-hidden="true" />
                )}
                {t(`detalle.inscripcion.${p.estadoInscripcion}`)}
                {p.bajaPropuestaEn && ` · ${t('pendientes.baja', { cantidad: 1 })}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {enCurso && (
        <section aria-labelledby="horario" className="flex flex-col gap-2">
          <h2 id="horario" className="text-lg font-semibold">
            {t('detalle.horario')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('detalle.horarioAyuda')}</p>
          {detalle.franjasDelGrupo.length === 0 ? (
            <p className="text-sm">{t('detalle.horarioVacio')}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {detalle.franjasDelGrupo.map((f) => (
                <li key={`${f.diaSemana}-${f.inicio}-${f.fin}`} className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0" aria-hidden="true" />
                  {textoFranja(f, dias)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="encuentros" className="flex flex-col gap-3">
        <h2 id="encuentros" className="text-lg font-semibold">
          {t('detalle.encuentros')}
        </h2>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('detalle.notasPrivadas')}
        </p>
        {detalle.encuentros.length === 0 ? (
          <EstadoVacio mensaje={t('detalle.encuentrosVacio')} />
        ) : (
          <ul className="flex flex-col gap-2">
            {detalle.encuentros.map((e) => {
              const faltaron = e.asistencias.filter((a) => !a.presente).map((a) => nombrePorPersona.get(a.personaId) ?? '');
              return (
                <li key={e.id} className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{formatearDiaEnArgentina(e.fecha, locale)}</p>
                  <p>{t('detalle.capitulos', { capitulos: e.capitulos })}</p>
                  <p className="text-muted-foreground">
                    {faltaron.length === 0 ? t('detalle.vinieronTodos') : t('detalle.faltaron', { nombres: faltaron.join(', ') })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial" className="flex flex-col gap-3">
        <h2 id="historial" className="text-lg font-semibold">
          {t('detalle.historial')}
        </h2>
        <ul className="flex flex-col gap-1 text-sm">
          {detalle.liderazgos.map((l) => (
            <li key={`${l.discipulador.id}-${l.desde}`} className="flex items-start gap-2">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                <EnlacePersona persona={l.discipulador} className="font-medium" />{' '}
                —{' '}
                {l.hasta
                  ? t('detalle.periodo', { desde: formatearDiaEnArgentina(l.desde, locale), hasta: formatearDiaEnArgentina(l.hasta, locale) })
                  : t('detalle.vigente', { desde: formatearDiaEnArgentina(l.desde, locale) })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <PanelMotivo
        key={rechazo ? (rechazo.tipo === 'baja' ? rechazo.persona.inscripcionId : 'fin') : 'cerrado'}
        abierto={rechazo !== null}
        onCerrar={() => setRechazo(null)}
        onConfirmar={rechazar}
        textos={
          rechazo?.tipo === 'baja'
            ? textosRechazo(t('baja.rechazarTitulo', { nombre: rechazo.persona.nombre }), t('baja.rechazarTexto', { nombre: rechazo.persona.nombre }))
            : textosRechazo(t('finalizacion.rechazarTitulo'), t('finalizacion.rechazarTexto'))
        }
      />

      {gestiona && reasignando && (
        <PanelReasignar
          abierto
          onCerrar={() => setReasignando(false)}
          onPropuesta={() => {
            setReasignando(false);
            router.refresh();
          }}
          grupoId={detalle.grupoId}
          apiToken={apiToken}
          actual={actual}
        />
      )}
    </div>
  );
}
