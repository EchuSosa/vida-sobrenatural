'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  ESTADOS_CIVILES,
  GENEROS,
  PROFESIONES,
  erroresDeDatosPersonales,
  esMenorDeEdad,
  hoyEnArgentina,
  normalizarDni,
  opcionesAnioCongregaDesde,
} from '@vida-sobrenatural/shared-types';
import { CampoFecha, CampoTelefono, MensajeErrorCampo, separarTelefono, type EtiquetasCampoFecha } from '@vida-sobrenatural/ui';

/**
 * Los datos de una Persona que carga o corrige el Admin: el alta de la 006
 * (T079) y la edición de la 013 (Historia 7, T082) usan estos mismos campos,
 * reglas y mensajes — un solo formulario, sin copiar código (Principio XI).
 * Cada pantalla pone lo suyo alrededor: el alta, el consentimiento y el aviso
 * de posible duplicado; la edición, mandar solo lo que cambió.
 */
export interface DatosPersonaFormulario {
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
}

export const DATOS_PERSONA_VACIOS: DatosPersonaFormulario = {
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
};

/** Lo que muestra el formulario de edición: los datos actuales de la Persona. */
export function datosPersonaDesde(p: {
  apellido: string;
  nombre: string;
  genero: string;
  fechaNacimiento: string;
  telefono: string;
  direccion: string;
  sede: { id: string };
  estadoCivil: string;
  profesion: string;
  profesionDetalle: string | null;
  congregaDesde: number;
  email: string | null;
  dni: string | null;
}): DatosPersonaFormulario {
  const { codigoPais, numero } = separarTelefono(p.telefono);
  return {
    apellido: p.apellido,
    nombre: p.nombre,
    genero: p.genero,
    fechaNacimiento: p.fechaNacimiento.slice(0, 10),
    codigoPais,
    numero,
    direccion: p.direccion,
    sedeId: p.sede.id,
    estadoCivil: p.estadoCivil,
    profesion: p.profesion,
    profesionDetalle: p.profesionDetalle ?? '',
    congregaDesde: String(p.congregaDesde),
    email: p.email ?? '',
    dni: p.dni ?? '',
  };
}

/** El cuerpo que espera la API (alta y edición), con los mismos nombres de campo. */
export function cuerpoPersona(d: DatosPersonaFormulario) {
  return {
    apellido: d.apellido.trim(),
    nombre: d.nombre.trim(),
    genero: d.genero || undefined,
    fechaNacimiento: d.fechaNacimiento || undefined,
    telefono: d.numero ? `${d.codigoPais} ${d.numero}` : '',
    direccion: d.direccion.trim(),
    sedeId: d.sedeId || undefined,
    estadoCivil: d.estadoCivil || undefined,
    profesion: d.profesion || undefined,
    profesionDetalle: d.profesion === 'otro' ? d.profesionDetalle.trim() : undefined,
    congregaDesde: d.congregaDesde ? Number(d.congregaDesde) : undefined,
    email: d.email.trim() || null,
    dni: d.dni.trim() || null,
  };
}
export type CuerpoPersona = ReturnType<typeof cuerpoPersona>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** El texto de un error de campo: el propio del formulario, o el general de `errors`. */
export function useMensajeCampoPersona() {
  const t = useTranslations('personasAlta');
  const te = useTranslations('errors');
  return function mensaje(campo: string, code: string): string {
    if (code.endsWith('_INVALIDO') && code !== 'EMAIL_INVALIDO' && t.has(`errores.${campo}`)) return t(`errores.${campo}`);
    if (te.has(`campos.${code}`)) return te(`campos.${code}`);
    if (te.has(code)) return te(code);
    return t('errorGenerico');
  };
}

/**
 * Las mismas reglas que aplica la API, antes de enviar. `soloAdultos`: el alta
 * de la 006 (FR-031) solo carga mayores; en la edición la regla de la edad es
 * D133, que decide la API porque depende de los roles.
 */
export function erroresLocalesPersona(
  c: CuerpoPersona,
  mensaje: (campo: string, code: string) => string,
  { anioActual, soloAdultos }: { anioActual: number; soloAdultos: boolean },
): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const e of erroresDeDatosPersonales(c, anioActual)) errores[e.campo] = mensaje(e.campo, e.code);
  if (soloAdultos && !errores.fechaNacimiento && c.fechaNacimiento && esMenorDeEdad(c.fechaNacimiento, hoyEnArgentina())) {
    errores.fechaNacimiento = mensaje('fechaNacimiento', 'ALTA_MENOR_DE_EDAD');
  }
  if (c.email && !EMAIL.test(c.email)) errores.email = mensaje('email', 'EMAIL_INVALIDO');
  if (normalizarDni(c.dni) === undefined) errores.dni = mensaje('dni', 'DNI_INVALIDO');
  return errores;
}

/**
 * Los campos, en tres grupos. `cambiar` recibe el campo del formulario
 * (`codigoPais` y `numero` limpian el error de `telefono`, eso lo resuelve
 * quien lo usa). `despuesDelDni`: el enlace al perfil de quien ya tiene ese
 * DNI (D215), que arma cada pantalla.
 */
export function CamposPersona({
  datos,
  cambiar,
  mensajes: m,
  sedes,
  anioActual,
  ayudaFechaNacimiento,
  despuesDelDni,
}: {
  datos: DatosPersonaFormulario;
  cambiar: <K extends keyof DatosPersonaFormulario>(campo: K, valor: DatosPersonaFormulario[K]) => void;
  mensajes: Partial<Record<string, string>>;
  sedes: Array<{ id: string; nombre: string }>;
  anioActual: number;
  ayudaFechaNacimiento?: string;
  despuesDelDni?: ReactNode;
}) {
  const t = useTranslations('personasAlta');
  const tf = useTranslations('campoFecha');
  return (
    <>
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
          {ayudaFechaNacimiento && <p className="text-sm text-muted-foreground">{ayudaFechaNacimiento}</p>}
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
        {despuesDelDni}
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
    </>
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
