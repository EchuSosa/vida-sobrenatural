'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CircleCheck, TriangleAlert, UserX } from 'lucide-react';
import {
  ApiError,
  anioEnArgentina,
  apiFetch,
  erroresPorCampo,
  formatearDiaEnArgentina,
  type CoincidenciaDuplicado,
  type PersonaConMismoDni,
} from '@vida-sobrenatural/shared-types';
import { Button, ButtonLink, MensajeErrorCampo, MigaDePan, ResumenErrores, useEnvio, useValidacionCampos } from '@vida-sobrenatural/ui';
import {
  CamposPersona,
  DATOS_PERSONA_VACIOS,
  cuerpoPersona,
  erroresLocalesPersona,
  useMensajeCampoPersona,
  type DatosPersonaFormulario,
} from '../../../components/campos-persona';

interface Formulario extends DatosPersonaFormulario {
  consentimiento: boolean;
}

const VACIO: Formulario = { ...DATOS_PERSONA_VACIOS, consentimiento: false };

type Creada = { id: string; nombre: string; apellido: string; sinAccesoALaApp: boolean };

/**
 * spec 006, T079 (FR-031 a FR-036, FR-039): el alta de una Persona adulta por
 * el Admin. Los mismos datos y reglas del registro (`erroresDeDatosPersonales`,
 * una sola fuente), más el email opcional y el consentimiento presencial (D78).
 * Al guardar: errores por campo con resumen y foco (H-50); si la API avisa un
 * posible duplicado, la lista de coincidencias con "Es otra persona, crear
 * igual" (reenvía lo mismo, sin recargar datos — D145); y al crear, qué sigue.
 * El envío queda protegido de la reentrada (H-57). Los campos, sus reglas y
 * sus mensajes son los de `CamposPersona`, que reusa la edición (013, T082).
 */
export function AltaPersonaCliente({ sedes, apiToken }: { sedes: Array<{ id: string; nombre: string }>; apiToken: string }) {
  const t = useTranslations('personasAlta');
  const te = useTranslations('errors');
  const mensaje = useMensajeCampoPersona();
  const locale = useLocale();
  const validacion = useValidacionCampos();
  const [datos, setDatos] = useState<Formulario>(VACIO);
  const [coincidencias, setCoincidencias] = useState<CoincidenciaDuplicado[] | null>(null);
  const [creada, setCreada] = useState<Creada | null>(null);
  // D215: quién ya tiene el DNI escrito (para ir a su perfil en vez de cargarla de nuevo).
  const [conMismoDni, setConMismoDni] = useState<PersonaConMismoDni | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const anioActual = anioEnArgentina();

  function cambiar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    validacion.limpiar(campo === 'codigoPais' || campo === 'numero' ? 'telefono' : campo);
    setCoincidencias(null);
    if (campo === 'dni') setConMismoDni(null);
  }

  function cuerpo(confirmarPosibleDuplicado: boolean) {
    return { ...cuerpoPersona(datos), consentimiento: datos.consentimiento, confirmarPosibleDuplicado };
  }

  /** Las mismas reglas que aplica la API, antes de enviar. */
  function erroresLocales(c: ReturnType<typeof cuerpo>): Record<string, string> {
    const errores = erroresLocalesPersona(c, mensaje, { anioActual, soloAdultos: true });
    if (!c.consentimiento) errores.consentimiento = t('errores.consentimiento');
    return errores;
  }

  const { enviando, ejecutar } = useEnvio(async (confirmar: boolean) => {
    setErrorGeneral(null);
    const c = cuerpo(confirmar);
    const locales = erroresLocales(c);
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    try {
      const resultado = await apiFetch<Creada>('/personas/alta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(c),
      });
      setCoincidencias(null);
      setCreada(resultado);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'POSIBLE_DUPLICADO') {
        setCoincidencias((error.extensiones?.coincidencias as CoincidenciaDuplicado[] | undefined) ?? []);
        return;
      }
      // D215: el DNI repetido no se puede crear igual; se dice quién lo tiene.
      if (error instanceof ApiError && error.code === 'DNI_DUPLICADO') {
        const persona = (error.extensiones?.persona as PersonaConMismoDni | undefined) ?? null;
        setCoincidencias(null);
        setConMismoDni(persona);
        validacion.reemplazar({
          dni: persona ? t('dniDuplicado.mensaje', { nombre: `${persona.nombre} ${persona.apellido}` }) : mensaje('dni', 'DNI_DUPLICADO'),
        });
        return;
      }
      const campos = erroresPorCampo(error);
      if (campos) {
        validacion.reemplazar(Object.fromEntries(campos.map(({ campo, code }) => [campo, mensaje(campo, code)])));
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      setErrorGeneral(code && te.has(code) ? te(code) : t('errorGenerico'));
    }
  });

  if (creada) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <MigaDePan tramos={[{ label: t('personas'), href: '/personas' }, { label: t('titulo') }]} LinkComponente={Link} />
        <section role="status" aria-labelledby="alta-lista" className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <h1 id="alta-lista" className="flex items-center gap-2 text-2xl font-semibold">
            <CircleCheck aria-hidden className="size-6 shrink-0 text-primary" />
            {t('exito.titulo', { nombre: `${creada.nombre} ${creada.apellido}` })}
          </h1>
          {creada.sinAccesoALaApp ? (
            <>
              <p className="flex items-center gap-2 font-medium">
                <UserX aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                {t('sinAcceso')}
              </p>
              <p className="text-muted-foreground">{t('exito.sinEmail')}</p>
            </>
          ) : (
            <p className="text-muted-foreground">{t('exito.conEmail')}</p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                setCreada(null);
                setDatos(VACIO);
                setConMismoDni(null);
                validacion.reset();
              }}
            >
              {t('exito.otra')}
            </Button>
            <ButtonLink href="/personas" size="xl">
              {t('exito.volver')}
            </ButtonLink>
          </div>
        </section>
      </div>
    );
  }

  const m = validacion.mensajes;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('personas'), href: '/personas' }, { label: t('titulo') }]} LinkComponente={Link} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </div>

      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void ejecutar(false);
        }}
      >
        <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />
        {errorGeneral && (
          <p role="alert" className="rounded-md border border-destructive px-3 py-2">
            {errorGeneral}
          </p>
        )}

        <CamposPersona
          datos={datos}
          cambiar={cambiar}
          mensajes={m}
          sedes={sedes}
          anioActual={anioActual}
          ayudaFechaNacimiento={t('ayudas.fechaNacimiento')}
          despuesDelDni={
            conMismoDni &&
            m.dni && (
              <Link href={`/personas/${conMismoDni.id}`} className="w-fit text-sm underline underline-offset-4">
                {t('dniDuplicado.ver', { nombre: `${conMismoDni.nombre} ${conMismoDni.apellido}` })}
              </Link>
            )
          }
        />

        <div className="flex flex-col gap-1">
          <label className="flex min-h-11 items-start gap-3">
            <input
              id="campo-consentimiento"
              type="checkbox"
              className="mt-1 size-5 shrink-0"
              checked={datos.consentimiento}
              onChange={(e) => cambiar('consentimiento', e.target.checked)}
              aria-invalid={Boolean(m.consentimiento) || undefined}
              aria-describedby={m.consentimiento ? 'campo-consentimiento-error' : undefined}
            />
            <span>{t('campos.consentimiento')}</span>
          </label>
          <MensajeErrorCampo id="campo-consentimiento-error" mensaje={m.consentimiento} />
        </div>

        {coincidencias && coincidencias.length > 0 && (
          <section aria-labelledby="posible-duplicado" aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <h2 id="posible-duplicado" className="flex items-center gap-2 text-lg font-semibold">
              <TriangleAlert aria-hidden className="size-5 shrink-0" />
              {t('duplicado.titulo')}
            </h2>
            <p className="text-muted-foreground">{t('duplicado.descripcion')}</p>
            <ul className="flex flex-col gap-2">
              {coincidencias.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 rounded-md border border-border p-3">
                  <span className="font-medium">
                    {c.nombre} {c.apellido}
                    {!c.activa && ` · ${t('duplicado.inactiva')}`}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t('duplicado.datos', { fecha: formatearDiaEnArgentina(`${c.fechaNacimiento.slice(0, 10)}T12:00:00Z`, locale), telefono: c.telefono || '—' })}
                  </span>
                  <span className="text-sm">{t('duplicado.porque', { motivos: c.porque.map((p) => t(`duplicado.motivos.${p}`)).join(' y ') })}</span>
                  <Link href={`/personas?q=${encodeURIComponent(c.apellido)}`} className="w-fit text-sm underline underline-offset-4">
                    {t('duplicado.ver', { nombre: `${c.nombre} ${c.apellido}` })}
                  </Link>
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" className="h-11 w-fit" loading={enviando} onClick={() => void ejecutar(true)}>
              {t('duplicado.crearIgual')}
            </Button>
          </section>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ButtonLink href="/personas" variant="ghost" size="xl">
            {t('volver')}
          </ButtonLink>
          <Button type="submit" size="xl" loading={enviando} loadingText={t('guardando')}>
            {t('guardar')}
          </Button>
        </div>
      </form>
    </div>
  );
}
