'use client';

import * as React from 'react';
import { useId, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import {
  COMENTARIO_TEXTO_MAX,
  TELEFONO_REGEX,
  resumirNavegador,
  ultimoRequestId,
  type AppOrigen,
  type ComentarioNuevo,
  type TipoComentario,
} from '@vida-sobrenatural/shared-types';
import { useEnvio } from '../hooks/use-envio';
import { useValidacionCampos } from '../hooks/use-validacion-campos';
import { Button } from './ui/button';
import { CampoTelefono } from './campo-telefono';
import { MensajeErrorCampo, ResumenErrores } from './form-errors';

/**
 * spec 013 (T013, research #11; FR-041, FR-042, FR-045): "Contanos qué te
 * parece", el mismo formulario en la web (`/contanos`) y en el backoffice
 * (panel del menú de usuario). Es de presentación: cada app pone los textos
 * (D84) y cómo enviar (su acción de servidor, que suma la sesión y el origen).
 *
 * - Tipo (radio con texto), texto con contador y "Pueden contactarme". Sin
 *   sesión, la casilla despliega email y teléfono (uno de los dos); con sesión
 *   no se piden: se usan los del perfil (H5.2).
 * - Errores por campo y resumen arriba con foco (H-50); lo escrito no se borra.
 * - Botón bloqueado mientras envía y guard de reentrada (`useEnvio`, H-57).
 * - Manda el navegador resumido (nunca el user agent entero) y el `requestId`
 *   del último error que vio esta pestaña.
 * - Al enviar, la confirmación dice qué pasa después.
 */

export type ResultadoEnvioComentario =
  | { ok: true }
  | { ok: false; errores: Array<{ campo: string; code: string }>; code?: string; reintentarEn?: number };

export interface TextosFormularioComentario {
  tipoLeyenda: string;
  tipos: Record<TipoComentario, { etiqueta: string; ayuda: string }>;
  texto: string;
  ayudaTexto: string;
  /** "{n} de 2000 caracteres" — ya armado por la app. */
  contador: (n: number, maximo: number) => string;
  aceptaContacto: string;
  ayudaAceptaContactoConSesion: string;
  contactoLeyenda: string;
  ayudaContacto: string;
  contactoEmail: string;
  contactoTelefono: string;
  codigoPais: string;
  enviar: string;
  enviando: string;
  tituloResumen: string;
  /** El texto de un error de campo (`campo`, `code`). */
  mensajeCampo: (campo: string, code: string) => string;
  /** "Mandaste varios comentarios seguidos. Probá de nuevo en {minutos, plural, …}". */
  demasiados: (minutos: number) => string;
  errorGeneral: string;
  confirmacionTitulo: string;
  /** Qué pasa después; `contactan` si dijo que la podían contactar. */
  confirmacionDetalle: (contactan: boolean) => string;
  otro: string;
}

/** El `t` de next-intl del namespace `comentarios.formulario` de cada app (packages/ui no depende de Next). */
export type TraductorComentario = (clave: string, valores?: Record<string, string | number>) => string;

/**
 * Los textos del formulario desde los mensajes de la app, armados igual en
 * las dos (las claves están en `comentarios.formulario` de cada `es.json`).
 */
export function textosFormularioComentario(t: TraductorComentario): TextosFormularioComentario {
  return {
    tipoLeyenda: t('tipoLeyenda'),
    tipos: {
      problema: { etiqueta: t('tipos.problema.etiqueta'), ayuda: t('tipos.problema.ayuda') },
      sugerencia: { etiqueta: t('tipos.sugerencia.etiqueta'), ayuda: t('tipos.sugerencia.ayuda') },
    },
    texto: t('texto'),
    ayudaTexto: t('ayudaTexto'),
    contador: (n, maximo) => t('contador', { n, maximo }),
    aceptaContacto: t('aceptaContacto'),
    ayudaAceptaContactoConSesion: t('ayudaAceptaContactoConSesion'),
    contactoLeyenda: t('contactoLeyenda'),
    ayudaContacto: t('ayudaContacto'),
    contactoEmail: t('contactoEmail'),
    contactoTelefono: t('contactoTelefono'),
    codigoPais: t('codigoPais'),
    enviar: t('enviar'),
    enviando: t('enviando'),
    tituloResumen: t('tituloResumen'),
    mensajeCampo: (campo) =>
      ['tipo', 'texto', 'contacto', 'contactoEmail', 'contactoTelefono'].includes(campo) ? t(`errores.${campo}`) : t('errores.otro'),
    demasiados: (minutos) => t('demasiados', { minutos }),
    errorGeneral: t('errorGeneral'),
    confirmacionTitulo: t('confirmacionTitulo'),
    confirmacionDetalle: (contactan) => t(contactan ? 'confirmacionDetalleContacto' : 'confirmacionDetalle'),
    otro: t('otro'),
  };
}

export interface FormularioComentarioProps {
  textos: TextosFormularioComentario;
  conSesion: boolean;
  /** Path de la pantalla desde donde se abrió, sin query. */
  paginaOrigen: string;
  app: AppOrigen;
  enviar: (datos: ComentarioNuevo) => Promise<ResultadoEnvioComentario>;
  /** Lo que va junto a "Mandar otro" en la confirmación (p. ej. volver o cerrar el panel). */
  accionesConfirmacion?: React.ReactNode;
}

interface Datos {
  tipo: TipoComentario | '';
  texto: string;
  aceptaContacto: boolean;
  contactoEmail: string;
  codigoPais: string;
  numero: string;
}

const VACIO: Datos = { tipo: '', texto: '', aceptaContacto: false, contactoEmail: '', codigoPais: '+54', numero: '' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormularioComentario({ textos, conSesion, paginaOrigen, app, enviar, accionesConfirmacion }: FormularioComentarioProps) {
  const base = useId();
  const validacion = useValidacionCampos();
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [enviado, setEnviado] = useState<{ contactan: boolean } | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const m = validacion.mensajes;
  const pideContacto = datos.aceptaContacto && !conSesion;

  function cambiar<K extends keyof Datos>(campo: K, valor: Datos[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    validacion.limpiar(campo === 'codigoPais' || campo === 'numero' ? 'contactoTelefono' : campo);
    if (campo === 'contactoEmail' || campo === 'numero' || campo === 'aceptaContacto') validacion.limpiar('contacto');
    setErrorGeneral(null);
  }

  function cuerpo(): ComentarioNuevo {
    const telefono = datos.numero.trim() ? `${datos.codigoPais} ${datos.numero.trim()}` : '';
    return {
      tipo: datos.tipo as TipoComentario,
      texto: datos.texto,
      aceptaContacto: datos.aceptaContacto,
      ...(pideContacto && datos.contactoEmail.trim() ? { contactoEmail: datos.contactoEmail.trim() } : {}),
      ...(pideContacto && telefono ? { contactoTelefono: telefono } : {}),
      paginaOrigen: paginaOrigen.split(/[?#]/)[0] || '/',
      navegador: resumirNavegador(typeof navigator === 'undefined' ? '' : navigator.userAgent),
      ...(ultimoRequestId() ? { ultimoRequestId: ultimoRequestId()! } : {}),
      app,
    };
  }

  /** Las mismas reglas que la API, antes de enviar. */
  function erroresLocales(c: ComentarioNuevo): Record<string, string> {
    const errores: Record<string, string> = {};
    if (!c.tipo) errores.tipo = textos.mensajeCampo('tipo', 'TIPO_INVALIDO');
    const largo = c.texto.trim().length;
    if (largo === 0 || largo > COMENTARIO_TEXTO_MAX) errores.texto = textos.mensajeCampo('texto', 'TEXTO_INVALIDO');
    if (pideContacto) {
      if (c.contactoEmail && !EMAIL.test(c.contactoEmail)) errores.contactoEmail = textos.mensajeCampo('contactoEmail', 'CONTACTOEMAIL_INVALIDO');
      if (c.contactoTelefono && !TELEFONO_REGEX.test(c.contactoTelefono)) errores.contactoTelefono = textos.mensajeCampo('contactoTelefono', 'CONTACTOTELEFONO_INVALIDO');
      if (!c.contactoEmail && !c.contactoTelefono) errores.contacto = textos.mensajeCampo('contacto', 'CONTACTO_INVALIDO');
    }
    return errores;
  }

  const { enviando, ejecutar } = useEnvio(async () => {
    setErrorGeneral(null);
    const c = cuerpo();
    const locales = erroresLocales(c);
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    let resultado: ResultadoEnvioComentario;
    try {
      resultado = await enviar(c);
    } catch {
      resultado = { ok: false, errores: [] };
    }
    if (resultado.ok) {
      validacion.reset();
      setEnviado({ contactan: datos.aceptaContacto });
      return;
    }
    if (resultado.code === 'DEMASIADOS_PEDIDOS') {
      setErrorGeneral(textos.demasiados(Math.max(1, Math.ceil((resultado.reintentarEn ?? 60) / 60))));
      return;
    }
    if (resultado.errores.length > 0) {
      validacion.reemplazar(Object.fromEntries(resultado.errores.map(({ campo, code }) => [campo, textos.mensajeCampo(campo, code)])));
      return;
    }
    setErrorGeneral(textos.errorGeneral);
  });

  if (enviado) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <CircleCheck aria-hidden className="size-5 shrink-0 text-primary" />
          {textos.confirmacionTitulo}
        </p>
        <p className="text-muted-foreground">{textos.confirmacionDetalle(enviado.contactan)}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {accionesConfirmacion}
          <Button
            type="button"
            variant="outline"
            size="xl"
            onClick={() => {
              setDatos(VACIO);
              setEnviado(null);
            }}
          >
            {textos.otro}
          </Button>
        </div>
      </div>
    );
  }

  const ayudaTextoId = `${base}-ayuda-texto`;
  const contadorId = `${base}-contador`;
  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
    >
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={textos.tituloResumen} />
      {errorGeneral && (
        <p role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-foreground">
          {errorGeneral}
        </p>
      )}

      <fieldset className="flex flex-col gap-2" aria-describedby={m.tipo ? 'campo-tipo-error' : undefined}>
        <legend className="mb-1 font-medium">{textos.tipoLeyenda}</legend>
        {(['problema', 'sugerencia'] as const).map((tipo, i) => (
          <label key={tipo} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary">
            <input
              id={i === 0 ? 'campo-tipo' : `campo-tipo-${tipo}`}
              type="radio"
              name="tipo"
              value={tipo}
              checked={datos.tipo === tipo}
              onChange={() => cambiar('tipo', tipo)}
              aria-invalid={Boolean(m.tipo) || undefined}
              className="mt-1 size-5 shrink-0"
            />
            <span className="flex flex-col">
              <span className="font-medium">{textos.tipos[tipo].etiqueta}</span>
              <span className="text-sm text-muted-foreground">{textos.tipos[tipo].ayuda}</span>
            </span>
          </label>
        ))}
        <MensajeErrorCampo id="campo-tipo-error" mensaje={m.tipo} />
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="campo-texto" className="font-medium">
          {textos.texto}
        </label>
        <p id={ayudaTextoId} className="text-sm text-muted-foreground">
          {textos.ayudaTexto}
        </p>
        <textarea
          id="campo-texto"
          name="texto"
          rows={6}
          value={datos.texto}
          onChange={(e) => cambiar('texto', e.target.value)}
          aria-invalid={Boolean(m.texto) || undefined}
          aria-describedby={[ayudaTextoId, contadorId, m.texto && 'campo-texto-error'].filter(Boolean).join(' ')}
          className="min-h-32 rounded-md border border-input bg-transparent px-3 py-2 aria-invalid:border-destructive dark:bg-input/30"
        />
        <p id={contadorId} className="text-sm text-muted-foreground" aria-live="polite">
          {textos.contador(datos.texto.trim().length, COMENTARIO_TEXTO_MAX)}
        </p>
        <MensajeErrorCampo id="campo-texto-error" mensaje={m.texto} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            id="campo-aceptaContacto"
            type="checkbox"
            checked={datos.aceptaContacto}
            onChange={(e) => cambiar('aceptaContacto', e.target.checked)}
            aria-describedby={conSesion ? `${base}-ayuda-contacto-sesion` : undefined}
            className="mt-1 size-5 shrink-0"
          />
          <span>{textos.aceptaContacto}</span>
        </label>
        {conSesion && (
          <p id={`${base}-ayuda-contacto-sesion`} className="text-sm text-muted-foreground">
            {textos.ayudaAceptaContactoConSesion}
          </p>
        )}
      </div>

      {pideContacto && (
        <fieldset
          id="campo-contacto"
          tabIndex={-1}
          className="flex min-w-0 flex-col gap-4 rounded-lg border border-border p-4 outline-none"
          aria-describedby={[`${base}-ayuda-contacto`, m.contacto && 'campo-contacto-error'].filter(Boolean).join(' ')}
        >
          <legend className="px-1 font-medium">{textos.contactoLeyenda}</legend>
          <p id={`${base}-ayuda-contacto`} className="text-sm text-muted-foreground">
            {textos.ayudaContacto}
          </p>
          <MensajeErrorCampo id="campo-contacto-error" mensaje={m.contacto} />
          <div className="flex flex-col gap-1">
            <label htmlFor="campo-contactoEmail" className="font-medium">
              {textos.contactoEmail}
            </label>
            <input
              id="campo-contactoEmail"
              type="email"
              autoComplete="email"
              value={datos.contactoEmail}
              onChange={(e) => cambiar('contactoEmail', e.target.value)}
              aria-invalid={Boolean(m.contactoEmail) || undefined}
              aria-describedby={m.contactoEmail ? 'campo-contactoEmail-error' : undefined}
              className="h-11 rounded-md border border-input bg-transparent px-3 aria-invalid:border-destructive dark:bg-input/30"
            />
            <MensajeErrorCampo id="campo-contactoEmail-error" mensaje={m.contactoEmail} />
          </div>
          <CampoTelefono
            id="campo-contactoTelefono"
            labelTelefono={textos.contactoTelefono}
            labelCodigo={textos.codigoPais}
            codigoPais={datos.codigoPais}
            numero={datos.numero}
            onChangeCodigo={(v) => cambiar('codigoPais', v)}
            onChangeNumero={(v) => cambiar('numero', v.replace(/[^0-9\s]/g, ''))}
            error={Boolean(m.contactoTelefono)}
            errorTexto={m.contactoTelefono}
            requerido={false}
          />
        </fieldset>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="xl" loading={enviando} loadingText={textos.enviando}>
          {textos.enviar}
        </Button>
      </div>
    </form>
  );
}
