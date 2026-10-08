'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheckBig, Clock, Info, MapPin, Pencil, Phone, UserRoundX } from 'lucide-react';
import { apiFetch, type EncuentroDelDiscipulador, formatearDiaEnArgentina } from '@vida-sobrenatural/shared-types';
import type { DetalleMiDiscipulado } from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, EstadoVacio, MigaDePan, PanelMotivo, mensajeDeError, mensajesDeCampo, nombresDe, useEnvio } from '@vida-sobrenatural/ui';
import { FormularioEncuentro } from './formulario-encuentro';

type PersonaDetalle = DetalleMiDiscipulado['personas'][number];

/**
 * specs/004, T046, T052 y T054c: el detalle del Discipulador, a 360 px
 * primero. Acción principal de la pantalla: "Registrar encuentro" (una sola,
 * docs/15). Pedir terminarlo y pedir una baja son secundarias y con
 * confirmación: afectan a una persona real (T054e).
 */
export function DetalleMiDiscipuladoCliente({
  detalle,
  apiToken,
  puedeGestionar,
}: {
  detalle: DetalleMiDiscipulado;
  apiToken: string;
  puedeGestionar: boolean;
}) {
  const t = useTranslations('misDiscipulados');
  const tm = useTranslations('miCamino');
  const locale = useLocale();
  const router = useRouter();
  const [formulario, setFormulario] = useState<{ encuentro: EncuentroDelDiscipulador | null } | null>(null);
  const nombres = nombresDe(detalle.personas);
  const enCurso = detalle.estado === 'en_curso';
  const gestiona = puedeGestionar && enCurso;
  const activas = enCurso ? detalle.personas : [];
  const nombrePorPersona = new Map(detalle.personas.map((p) => [p.personaId, p.nombre]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <MigaDePan tramos={[{ label: tm('titulo'), href: '/mi-camino' }, { label: t('titulo'), href: '/mis-discipulados' }, { label: nombres }]} LinkComponente={Link} />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('detalle.titulo', { nombres })}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            {enCurso ? <Clock className="size-4" aria-hidden="true" /> : <CircleCheckBig className="size-4" aria-hidden="true" />}
            {enCurso ? t('detalle.enCurso', { fecha: formatearDiaEnArgentina(detalle.desde, locale) }) : t('detalle.finalizado')}
          </span>
          {enCurso && <span className="text-muted-foreground">{t('detalle.lugar', detalle.lugar)}</span>}
        </p>
      </header>

      <section aria-labelledby="personas" className="flex flex-col gap-3">
        <h2 id="personas" className="text-lg font-semibold">
          {t('detalle.personas')}
        </h2>
        <ul className="flex flex-col gap-4">
          {detalle.personas.map((p) => (
            <TarjetaPersona key={p.inscripcionId} persona={p} grupoId={detalle.grupoId} apiToken={apiToken} gestiona={gestiona} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="encuentros" className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="encuentros" className="text-lg font-semibold">
            {t('detalle.encuentros.titulo')}
          </h2>
          {gestiona && (
            <Button size="xl" className="w-full sm:w-auto" onClick={() => setFormulario({ encuentro: null })}>
              {t('detalle.encuentros.registrar')}
            </Button>
          )}
        </div>
        {detalle.encuentros.length === 0 ? (
          <EstadoVacio mensaje={t('detalle.encuentros.vacio')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {detalle.encuentros.map((e) => {
              const faltaron = e.asistencias.filter((a) => !a.presente).map((a) => nombrePorPersona.get(a.personaId) ?? '');
              const fecha = formatearDiaEnArgentina(e.fecha, locale);
              return (
                <li key={e.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <h3 className="font-semibold">{fecha}</h3>
                      <p className="text-sm">{t('detalle.encuentros.capitulos', { capitulos: e.capitulos })}</p>
                    </div>
                    {gestiona && (
                      <Button
                        variant="outline"
                        size="xl"
                        aria-label={t('detalle.encuentros.editarDe', { fecha })}
                        onClick={() => setFormulario({ encuentro: e })}
                      >
                        <Pencil aria-hidden="true" />
                        {t('detalle.encuentros.editar')}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {faltaron.length === 0 ? t('detalle.encuentros.vinieronTodos') : t('detalle.encuentros.faltaron', { nombres: faltaron.join(', ') })}
                  </p>
                  <div className="text-sm">
                    <p className="font-medium">{t('detalle.encuentros.notas')}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{e.notas ?? t('detalle.encuentros.sinNotas')}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {enCurso && <SeccionFinalizacion detalle={detalle} apiToken={apiToken} gestiona={gestiona} />}

      {formulario && (
        <FormularioEncuentro
          key={formulario.encuentro?.id ?? 'nuevo'}
          abierto
          onCerrar={() => setFormulario(null)}
          onGuardado={() => {
            setFormulario(null);
            router.refresh();
          }}
          grupoId={detalle.grupoId}
          apiToken={apiToken}
          personas={activas.map((p) => ({ inscripcionId: p.inscripcionId, personaId: p.personaId, nombre: p.nombre }))}
          encuentro={formulario.encuentro}
        />
      )}
    </div>
  );
}

function TarjetaPersona({ persona, grupoId, apiToken, gestiona }: { persona: PersonaDetalle; grupoId: string; apiToken: string; gestiona: boolean }) {
  const t = useTranslations('misDiscipulados');
  const tc = useTranslations('comun');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [pidiendoBaja, setPidiendoBaja] = useState(false);
  const nombre = `${persona.nombre} ${persona.apellido}`;
  const { contacto } = persona;

  async function pedirBaja(motivo: string): Promise<Record<string, string> | null> {
    try {
      await apiFetch(`/discipulado/mis-discipulados/${grupoId}/inscripciones/${persona.inscripcionId}/baja/proponer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(motivo ? { motivo } : {}),
      });
      toast(t('detalle.baja.exito', { nombre: persona.nombre }));
    } catch (e) {
      const campos = mensajesDeCampo(e, te, t);
      if (campos) return campos;
      toast.error(mensajeDeError(e, te, t));
    }
    setPidiendoBaja(false);
    router.refresh();
    return null;
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <h3 className="font-semibold">
        {nombre} <span className="font-normal text-muted-foreground">· {t('detalle.edad', { edad: persona.edad })}</span>
      </h3>
      <dl className="flex flex-col gap-2 text-sm">
        <div>
          <dt className="sr-only">{t('detalle.telefono')}</dt>
          <dd>
            <a href={`tel:${contacto.telefono.replace(/\s/g, '')}`} className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              {t('detalle.llamar', { nombre: persona.nombre, telefono: contacto.telefono })}
            </a>
          </dd>
        </div>
        <div>
          <dt className="sr-only">{t('detalle.direccion')}</dt>
          <dd className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {contacto.direccion}
          </dd>
        </div>
        {contacto.tutor && (
          <div className="flex flex-col gap-1 rounded-md border border-border p-3">
            <dt className="font-medium">{t('detalle.tutor')}</dt>
            <dd className="text-muted-foreground">{t('detalle.tutorAclaracion')}</dd>
            <dd>
              {contacto.tutor.telefono ? (
                <a href={`tel:${contacto.tutor.telefono.replace(/\s/g, '')}`} className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4">
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  {t('detalle.llamarTutor', { nombre: contacto.tutor.nombre, telefono: contacto.tutor.telefono })}
                </a>
              ) : (
                contacto.tutor.nombre
              )}
            </dd>
          </div>
        )}
      </dl>

      {persona.bajaPropuesta ? (
        <p className="flex items-start gap-2 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('detalle.baja.propuesta', { fecha: formatearDiaEnArgentina(persona.bajaPropuesta.en, locale) })}
        </p>
      ) : (
        <>
          {persona.bajaRechazada && (
            <p className="flex items-start gap-2 text-sm">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {t('detalle.baja.rechazada', { fecha: formatearDiaEnArgentina(persona.bajaRechazada.en, locale) })}
                {persona.bajaRechazada.motivo && ` ${t('detalle.baja.rechazadaMotivo', { motivo: persona.bajaRechazada.motivo })}`}
              </span>
            </p>
          )}
          {gestiona && (
            <Button variant="outline" size="xl" className="w-full sm:w-fit" onClick={() => setPidiendoBaja(true)}>
              <UserRoundX aria-hidden="true" />
              {t('detalle.baja.proponer', { nombre: persona.nombre })}
            </Button>
          )}
        </>
      )}

      <PanelMotivo
        key={pidiendoBaja ? 'abierto' : 'cerrado'}
        abierto={pidiendoBaja}
        onCerrar={() => setPidiendoBaja(false)}
        onConfirmar={pedirBaja}
        destructivo
        textos={{
          titulo: t('detalle.baja.titulo', { nombre }),
          descripcion: t('detalle.baja.texto', { nombre: persona.nombre }),
          etiqueta: t('detalle.baja.motivo'),
          ayuda: t('detalle.baja.motivoAyuda'),
          confirmar: t('detalle.baja.confirmar'),
          enviando: t('detalle.baja.enviando'),
          volver: t('detalle.volver'),
          cerrarPanel: tc('cerrarPanel'),
          resumen: t('campos.resumen'),
          demasiadoLargo: te('campos.MOTIVO_DEMASIADO_LARGO'),
        }}
      />
    </li>
  );
}

function SeccionFinalizacion({ detalle, apiToken, gestiona }: { detalle: DetalleMiDiscipulado; apiToken: string; gestiona: boolean }) {
  const t = useTranslations('misDiscipulados');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();

  const { enviando, ejecutar: proponer } = useEnvio(async () => {
    try {
      await apiFetch(`/discipulado/mis-discipulados/${detalle.grupoId}/finalizacion/proponer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast(t('detalle.finalizacion.exito'));
    } catch (e) {
      toast.error(mensajeDeError(e, te, t));
    }
    router.refresh();
  });

  return (
    <section aria-labelledby="finalizacion" className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 id="finalizacion" className="text-lg font-semibold">
        {t('detalle.finalizacion.titulo')}
      </h2>
      {detalle.propuestaFinalizacionEn ? (
        <p className="flex items-start gap-2 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('detalle.finalizacion.enviada', { fecha: formatearDiaEnArgentina(detalle.propuestaFinalizacionEn, locale) })}
        </p>
      ) : (
        <>
          {detalle.finalizacionRechazada && (
            <p className="flex items-start gap-2 text-sm">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {t('detalle.finalizacion.rechazada', { fecha: formatearDiaEnArgentina(detalle.finalizacionRechazada.en, locale) })}
                {detalle.finalizacionRechazada.motivo && ` ${t('detalle.finalizacion.rechazadaMotivo', { motivo: detalle.finalizacionRechazada.motivo })}`}
              </span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">{t('detalle.finalizacion.texto')}</p>
          {gestiona && (
            <ConfirmDestructiveDialog
              tono="neutro"
              trigger={
                <Button variant="outline" size="xl" className="w-full sm:w-fit" loading={enviando} loadingText={t('detalle.finalizacion.proponiendo')}>
                  {t('detalle.finalizacion.proponer')}
                </Button>
              }
              titulo={t('detalle.finalizacion.confirmarTitulo')}
              descripcion={t('detalle.finalizacion.confirmarTexto')}
              textoConfirmar={t('detalle.finalizacion.confirmar')}
              textoCancelar={t('detalle.volver')}
              onConfirmar={() => void proponer()}
            />
          )}
        </>
      )}
    </section>
  );
}
