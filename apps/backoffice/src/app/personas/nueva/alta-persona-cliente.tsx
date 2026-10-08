'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CircleCheck, TriangleAlert, UserX } from 'lucide-react';
import {
  ApiError,
  ESTADOS_CIVILES,
  GENEROS,
  PROFESIONES,
  anioEnArgentina,
  apiFetch,
  erroresDeDatosPersonales,
  erroresPorCampo,
  esMenorDeEdad,
  formatearDiaEnArgentina,
  hoyEnArgentina,
  normalizarDni,
  opcionesAnioCongregaDesde,
  type CoincidenciaDuplicado,
  type PersonaConMismoDni,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  ButtonLink,
  CampoFecha,
  CampoTelefono,
  MensajeErrorCampo,
  MigaDePan,
  ResumenErrores,
  useEnvio,
  useValidacionCampos,
  type EtiquetasCampoFecha,
} from '@vida-sobrenatural/ui';

interface Formulario {
  apellido: string;
  nombre: string;
  genero: string;
  fechaNacimiento: string;
  codigoPais: string;
  numero: string;
  direccion: string;
  sedeId: string;
  estadoCivil: string;
  profesion: string;
  profesionDetalle: string;
  congregaDesde: string;
  email: string;
  dni: string;
  consentimiento: boolean;
}

const VACIO: Formulario = {
  apellido: '',
  nombre: '',
  genero: '',
  fechaNacimiento: '',
  codigoPais: '+54',
  numero: '',
  direccion: '',
  sedeId: '',
  estadoCivil: '',
  profesion: '',
  profesionDetalle: '',
  congregaDesde: '',
  email: '',
  dni: '',
  consentimiento: false,
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Creada = { id: string; nombre: string; apellido: string; sinAccesoALaApp: boolean };

/**
 * spec 006, T079 (FR-031 a FR-036, FR-039): el alta de una Persona adulta por
 * el Admin. Los mismos datos y reglas del registro (`erroresDeDatosPersonales`,
 * una sola fuente), más el email opcional y el consentimiento presencial (D78).
 * Al guardar: errores por campo con resumen y foco (H-50); si la API avisa un
 * posible duplicado, la lista de coincidencias con "Es otra persona, crear
 * igual" (reenvía lo mismo, sin recargar datos — D145); y al crear, qué sigue.
 * El envío queda protegido de la reentrada (H-57).
 */
export function AltaPersonaCliente({ sedes, apiToken }: { sedes: Array<{ id: string; nombre: string }>; apiToken: string }) {
  const t = useTranslations('personasAlta');
  const te = useTranslations('errors');
  const tf = useTranslations('campoFecha');
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

  function mensaje(campo: string, code: string): string {
    if (code.endsWith('_INVALIDO') && code !== 'EMAIL_INVALIDO' && t.has(`errores.${campo}`)) return t(`errores.${campo}`);
    if (te.has(`campos.${code}`)) return te(`campos.${code}`);
    if (te.has(code)) return te(code);
    return t('errorGenerico');
  }

  function cuerpo(confirmarPosibleDuplicado: boolean) {
    return {
      apellido: datos.apellido.trim(),
      nombre: datos.nombre.trim(),
      genero: datos.genero || undefined,
      fechaNacimiento: datos.fechaNacimiento || undefined,
      telefono: datos.numero ? `${datos.codigoPais} ${datos.numero}` : '',
      direccion: datos.direccion.trim(),
      sedeId: datos.sedeId || undefined,
      estadoCivil: datos.estadoCivil || undefined,
      profesion: datos.profesion || undefined,
      profesionDetalle: datos.profesion === 'otro' ? datos.profesionDetalle.trim() : undefined,
      congregaDesde: datos.congregaDesde ? Number(datos.congregaDesde) : undefined,
      email: datos.email.trim() || null,
      dni: datos.dni.trim() || null,
      consentimiento: datos.consentimiento,
      confirmarPosibleDuplicado,
    };
  }

  /** Las mismas reglas que aplica la API, antes de enviar. */
  function erroresLocales(c: ReturnType<typeof cuerpo>): Record<string, string> {
    const errores: Record<string, string> = {};
    for (const e of erroresDeDatosPersonales(c, anioActual)) errores[e.campo] = mensaje(e.campo, e.code);
    if (!errores.fechaNacimiento && c.fechaNacimiento && esMenorDeEdad(c.fechaNacimiento, hoyEnArgentina())) {
      errores.fechaNacimiento = mensaje('fechaNacimiento', 'ALTA_MENOR_DE_EDAD');
    }
    if (c.email && !EMAIL.test(c.email)) errores.email = mensaje('email', 'EMAIL_INVALIDO');
    if (normalizarDni(c.dni) === undefined) errores.dni = mensaje('dni', 'DNI_INVALIDO');
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

        <Seccion titulo={t('secciones.personales')}>
          <CampoTexto id="apellido" etiqueta={t('campos.apellido')} valor={datos.apellido} onCambio={(v) => cambiar('apellido', v)} error={m.apellido} autoComplete="off" />
          <CampoTexto id="nombre" etiqueta={t('campos.nombre')} valor={datos.nombre} onCambio={(v) => cambiar('nombre', v)} error={m.nombre} autoComplete="off" />
          <CampoLista
            id="genero"
            etiqueta={t('campos.genero')}
            valor={datos.genero}
            onCambio={(v) => cambiar('genero', v)}
            error={m.genero}
            elegir={t('elegir')}
            opciones={GENEROS.map((g) => ({ value: g, label: t(`opciones.genero.${g}`) }))}
          />
          <div className="flex flex-col gap-1">
            <CampoFecha
              id="campo-fechaNacimiento"
              etiqueta={t('campos.fechaNacimiento')}
              required
              autoCompletarNacimiento
              value={datos.fechaNacimiento}
              onChange={(v) => cambiar('fechaNacimiento', v)}
              etiquetas={{ dia: tf('dia'), mes: tf('mes'), anio: tf('anio'), meses: tf.raw('meses') as EtiquetasCampoFecha['meses'] }}
              error={Boolean(m.fechaNacimiento)}
              idError="campo-fechaNacimiento-error"
            />
            <p className="text-sm text-muted-foreground">{t('ayudas.fechaNacimiento')}</p>
            <MensajeErrorCampo id="campo-fechaNacimiento-error" mensaje={m.fechaNacimiento} />
          </div>
          <CampoTexto
            id="dni"
            etiqueta={t('campos.dni')}
            ayuda={t('ayudas.dni')}
            valor={datos.dni}
            onCambio={(v) => cambiar('dni', v)}
            error={m.dni}
            autoComplete="off"
            inputMode="numeric"
          />
          {conMismoDni && m.dni && (
            <Link href={`/personas/${conMismoDni.id}`} className="w-fit text-sm underline underline-offset-4">
              {t('dniDuplicado.ver', { nombre: `${conMismoDni.nombre} ${conMismoDni.apellido}` })}
            </Link>
          )}
        </Seccion>

        <Seccion titulo={t('secciones.contacto')}>
          <div className="flex flex-col gap-1">
            <CampoTelefono
              id="campo-telefono"
              labelTelefono={t('campos.telefono')}
              labelCodigo={t('campos.codigoPais')}
              codigoPais={datos.codigoPais}
              numero={datos.numero}
              onChangeCodigo={(v) => cambiar('codigoPais', v)}
              onChangeNumero={(v) => cambiar('numero', v.replace(/[^0-9\s]/g, ''))}
              error={Boolean(m.telefono)}
              errorTexto={m.telefono}
            />
          </div>
          <CampoTexto id="direccion" etiqueta={t('campos.direccion')} valor={datos.direccion} onCambio={(v) => cambiar('direccion', v)} error={m.direccion} autoComplete="off" />
          <CampoTexto
            id="email"
            etiqueta={t('campos.email')}
            ayuda={t('ayudas.email')}
            tipo="email"
            valor={datos.email}
            onCambio={(v) => cambiar('email', v)}
            error={m.email}
            autoComplete="off"
          />
        </Seccion>

        <Seccion titulo={t('secciones.iglesia')}>
          <CampoLista
            id="sedeId"
            etiqueta={t('campos.sede')}
            valor={datos.sedeId}
            onCambio={(v) => cambiar('sedeId', v)}
            error={m.sedeId}
            elegir={t('elegir')}
            opciones={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
          />
          <CampoLista
            id="congregaDesde"
            etiqueta={t('campos.congregaDesde')}
            valor={datos.congregaDesde}
            onCambio={(v) => cambiar('congregaDesde', v)}
            error={m.congregaDesde}
            elegir={t('elegir')}
            opciones={opcionesAnioCongregaDesde(anioActual).map((anio) => ({
              value: String(anio),
              label: anio === anioActual ? t('opciones.esteAnio', { anio }) : String(anio),
            }))}
          />
          <CampoLista
            id="estadoCivil"
            etiqueta={t('campos.estadoCivil')}
            valor={datos.estadoCivil}
            onCambio={(v) => cambiar('estadoCivil', v)}
            error={m.estadoCivil}
            elegir={t('elegir')}
            opciones={ESTADOS_CIVILES.map((e) => ({ value: e, label: t(`opciones.estadoCivil.${e}`) }))}
          />
          <CampoLista
            id="profesion"
            etiqueta={t('campos.profesion')}
            valor={datos.profesion}
            onCambio={(v) => cambiar('profesion', v)}
            error={m.profesion}
            elegir={t('elegir')}
            opciones={PROFESIONES.map((p) => ({ value: p, label: t(`opciones.profesion.${p}`) }))}
          />
          {datos.profesion === 'otro' && (
            <CampoTexto
              id="profesionDetalle"
              etiqueta={t('campos.profesionDetalle')}
              valor={datos.profesionDetalle}
              onCambio={(v) => cambiar('profesionDetalle', v)}
              error={m.profesionDetalle}
            />
          )}
        </Seccion>

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

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-lg border border-border p-5">
      <legend className="px-1 text-lg font-semibold">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function CampoTexto({
  id,
  etiqueta,
  ayuda,
  tipo = 'text',
  valor,
  onCambio,
  error,
  autoComplete,
  inputMode,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  tipo?: string;
  valor: string;
  onCambio: (v: string) => void;
  error?: string;
  autoComplete?: string;
  inputMode?: 'numeric';
}) {
  const describe = [ayuda && `campo-${id}-ayuda`, error && `campo-${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`campo-${id}`} className="font-medium">
        {etiqueta}
      </label>
      {ayuda && (
        <p id={`campo-${id}-ayuda`} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      <input
        id={`campo-${id}`}
        name={id}
        type={tipo}
        value={valor}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(e) => onCambio(e.target.value)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describe}
        className="h-11 rounded-md border border-input bg-transparent px-3 aria-invalid:border-destructive dark:bg-input/30"
      />
      <MensajeErrorCampo id={`campo-${id}-error`} mensaje={error} />
    </div>
  );
}

function CampoLista({
  id,
  etiqueta,
  valor,
  onCambio,
  error,
  elegir,
  opciones,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  error?: string;
  elegir: string;
  opciones: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`campo-${id}`} className="font-medium">
        {etiqueta}
      </label>
      <select
        id={`campo-${id}`}
        name={id}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `campo-${id}-error` : undefined}
        className="h-11 rounded-md border border-input bg-background px-3 aria-invalid:border-destructive dark:bg-input/30"
      >
        <option value="">{elegir}</option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <MensajeErrorCampo id={`campo-${id}-error`} mensaje={error} />
    </div>
  );
}
