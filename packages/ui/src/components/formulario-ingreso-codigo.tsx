'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { CODIGO_INGRESO_LARGO } from '@vida-sobrenatural/shared-types';
import { useEnvio } from '../hooks/use-envio';
import { Button } from './ui/button';
import { MensajeErrorCampo, ResumenErrores } from './form-errors';

/**
 * spec 007 (T014, contracts/nextauth-codigo-email.md, research.md #11) — el
 * formulario de dos pasos del ingreso con código: email → código. Es de
 * presentación: las acciones de servidor (`pedirCodigo`, `verificarCodigo`)
 * y los textos traducidos los pone cada app (D84). Lo usan `/ingresar` y
 * `/ingresar/codigo` de la web y la pantalla sin sesión del backoffice.
 *
 * - Botón bloqueado y con indicador mientras envía, y guard de reentrada en el
 *   envío (`useEnvio`, H-57).
 * - Errores por campo debajo del campo y en un resumen arriba con foco (H-50);
 *   el email escrito se conserva ante un error.
 * - Al cambiar de paso, el foco va al título del paso nuevo.
 */

export type CampoIngreso = 'email' | 'codigo';
export type PasoIngreso = 'email' | 'codigo';

export type ResultadoIngreso =
  /** `redirigirA`: a dónde ir después de entrar, con una carga completa de la página (la sesión nueva tiene que llegar a todo, también al `SessionProvider`). */
  | { ok: true; redirigirA?: string }
  | { ok?: false; errores: Array<{ campo: CampoIngreso; code: string }>; reintentarEn?: number };

export interface TextosFormularioIngresoCodigo {
  tituloEmail: string;
  ayudaEmail: string;
  campoEmail: string;
  enviarCodigo: string;
  enviandoCodigo: string;
  tituloCodigo: string;
  /** "Te mandamos un código a {email}. Vale por 15 minutos." — ya armado con `email` por la app. */
  explicacionCodigo: (email: string) => string;
  campoCodigo: string;
  ayudaCodigo: string;
  entrar: string;
  entrando: string;
  otroCodigo: string;
  codigoReenviado: string;
  otroEmail: string;
  tituloResumen: string;
  /** Mensaje de un `code` de error; `minutos` solo para `DEMASIADOS_PEDIDOS`. */
  mensajeError: (code: string, valores: { minutos: number }) => string;
}

export interface FormularioIngresoCodigoProps {
  textos: TextosFormularioIngresoCodigo;
  pasoInicial?: PasoIngreso;
  /** El email con el que se pidió el código (paso código en la web, leído de su cookie). */
  emailInicial?: string;
  pedirCodigo: (email: string) => Promise<ResultadoIngreso>;
  /** Si sale bien, devuelve `redirigirA` y el formulario navega con una carga completa. */
  verificarCodigo: (email: string, codigo: string) => Promise<ResultadoIngreso>;
  /** Si se pasa, se llama al pedir bien el primer código en vez de pasar de paso acá (la web navega a `/ingresar/codigo`). */
  alPedirCodigo?: (email: string) => void;
  /** Si se pasa, "Usar otro email" la llama (la web borra la cookie y vuelve a `/ingresar`); si no, vuelve al paso email acá. */
  alUsarOtroEmail?: () => void | Promise<void>;
  /** `h1` cuando el formulario es el contenido principal de la página. */
  nivelTitulo?: 'h1' | 'h2';
}

export function FormularioIngresoCodigo({
  textos,
  pasoInicial = 'email',
  emailInicial = '',
  pedirCodigo,
  verificarCodigo,
  alPedirCodigo,
  alUsarOtroEmail,
  nivelTitulo = 'h2',
}: FormularioIngresoCodigoProps) {
  const Titulo = nivelTitulo;
  const [paso, setPaso] = useState<PasoIngreso>(pasoInicial);
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState('');
  const [errores, setErrores] = useState<Array<{ campo: CampoIngreso; mensaje: string }>>([]);
  const [foco, setFoco] = useState(0);
  const [reenviado, setReenviado] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const pasoAnterior = useRef(paso);

  useEffect(() => {
    if (pasoAnterior.current !== paso) tituloRef.current?.focus();
    pasoAnterior.current = paso;
  }, [paso]);

  function mostrarErrores(resultado: Exclude<ResultadoIngreso, { ok: true }>) {
    const minutos = Math.max(1, Math.ceil((resultado.reintentarEn ?? 60) / 60));
    setErrores(resultado.errores.map((e) => ({ campo: e.campo, mensaje: textos.mensajeError(e.code, { minutos }) })));
    setFoco((n) => n + 1);
  }

  const envioEmail = useEnvio(async () => {
    setReenviado(false);
    const resultado = await pedirCodigo(email);
    if (!resultado.ok) return mostrarErrores(resultado);
    setErrores([]);
    if (alPedirCodigo) return alPedirCodigo(email.trim().toLowerCase());
    setCodigo('');
    setPaso('codigo');
  });

  const [entrando, setEntrando] = useState(false);
  const envioCodigo = useEnvio(async () => {
    setReenviado(false);
    const resultado = await verificarCodigo(email, codigo);
    if (!resultado.ok) return mostrarErrores(resultado);
    setErrores([]);
    if (resultado.redirigirA) {
      // El botón sigue "Entrando…" hasta que cargue la página siguiente.
      setEntrando(true);
      window.location.assign(resultado.redirigirA);
    }
  });

  const reenvio = useEnvio(async () => {
    setReenviado(false);
    const resultado = await pedirCodigo(email);
    if (!resultado.ok) return mostrarErrores(resultado);
    setErrores([]);
    setCodigo('');
    setReenviado(true);
  });

  const errorDe = (campo: CampoIngreso) => errores.find((e) => e.campo === campo)?.mensaje;
  const ocupado = envioEmail.enviando || envioCodigo.enviando || reenvio.enviando || entrando;

  if (paso === 'email') {
    const error = errorDe('email');
    return (
      <section aria-labelledby="titulo-ingreso-codigo" className="flex w-full flex-col gap-4 text-left">
        <div className="flex flex-col gap-1">
          <Titulo id="titulo-ingreso-codigo" ref={tituloRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            {textos.tituloEmail}
          </Titulo>
          <p className="text-base text-muted-foreground">{textos.ayudaEmail}</p>
        </div>
        <ResumenErrores errores={errores} titulo={textos.tituloResumen} foco={foco} />
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void envioEmail.ejecutar();
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="campo-email" className="text-base font-medium">
              {textos.campoEmail}
            </label>
            <input
              id="campo-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'error-email' : undefined}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
            />
            <MensajeErrorCampo id="error-email" mensaje={error} />
          </div>
          <Button type="submit" size="xl" className="w-full text-base" loading={envioEmail.enviando} loadingText={textos.enviandoCodigo}>
            {textos.enviarCodigo}
          </Button>
        </form>
      </section>
    );
  }

  const error = errorDe('codigo') ?? errorDe('email');
  const campoDelError = errorDe('codigo') ? 'codigo' : 'email';
  return (
    <section aria-labelledby="titulo-ingreso-codigo" className="flex w-full flex-col gap-4 text-left">
      <div className="flex flex-col gap-1">
        <Titulo id="titulo-ingreso-codigo" ref={tituloRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          {textos.tituloCodigo}
        </Titulo>
        <p className="text-base text-muted-foreground">{textos.explicacionCodigo(email)}</p>
      </div>
      {/* En el paso código, un error del email (p. ej. demasiados pedidos al reenviar) se muestra en el campo visible. */}
      <ResumenErrores
        errores={errores.map((e) => ({ campo: e.campo === 'email' ? 'codigo' : e.campo, mensaje: e.mensaje }))}
        titulo={textos.tituloResumen}
        foco={foco}
      />
      <p role="status" className="text-base text-foreground empty:hidden">
        {reenviado ? textos.codigoReenviado : ''}
      </p>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void envioCodigo.ejecutar();
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="campo-codigo" className="text-base font-medium">
            {textos.campoCodigo}
          </label>
          <p id="ayuda-codigo" className="text-sm text-muted-foreground">
            {textos.ayudaCodigo}
          </p>
          <input
            id="campo-codigo"
            name="codigo"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODIGO_INGRESO_LARGO + 2}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `ayuda-codigo error-${campoDelError}` : 'ayuda-codigo'}
            className="h-11 w-full rounded-lg border border-input bg-transparent px-3 font-mono text-lg tracking-[0.3em] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
          />
          <MensajeErrorCampo id={`error-${campoDelError}`} mensaje={error} />
        </div>
        <Button type="submit" size="xl" className="w-full text-base" loading={envioCodigo.enviando || entrando} loadingText={textos.entrando}>
          {textos.entrar}
        </Button>
      </form>
      <div className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="link"
          className="h-11 px-0 text-base underline"
          loading={reenvio.enviando}
          disabled={ocupado && !reenvio.enviando}
          onClick={() => void reenvio.ejecutar()}
        >
          {textos.otroCodigo}
        </Button>
        <Button
          type="button"
          variant="link"
          className="h-11 px-0 text-base underline"
          disabled={ocupado}
          onClick={() => {
            setErrores([]);
            setReenviado(false);
            if (alUsarOtroEmail) return void alUsarOtroEmail();
            setCodigo('');
            setPaso('email');
          }}
        >
          {textos.otroEmail}
        </Button>
      </div>
    </section>
  );
}
