'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  anioInicioEventoValido,
  DIAS_RECORDATORIO_MAX,
  EDAD_DESTINATARIO_MAX,
  GENEROS_DESTINATARIO,
  hoyEnArgentina,
  instanteEnArgentina,
  validarPreguntas,
  partesEnArgentina,
  type DatosEvento,
  type EventoDetalle,
  type GeneroDestinatario,
  type TipoEvento,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  CampoFecha,
  CampoHora,
  MensajeErrorCampo,
  ResumenErrores,
  mensajeDeError,
  mensajesDeCampo,
  useEnvio,
  useValidacionCampos,
} from '@vida-sobrenatural/ui';
import { EditorPreguntas, preguntasEnEdicion, preguntasParaEnviar, type PreguntaEnEdicion } from './editor-preguntas';

export interface SedeOpcion {
  id: string;
  nombre: string;
}

export interface ValoresEvento {
  nombre: string;
  sedeId: string;
  tipo: TipoEvento;
  fechaInicio: string;
  horaInicio: string;
  tieneFin: boolean;
  fechaFin: string;
  horaFin: string;
  lugar: string;
  descripcion: string;
  publicoObjetivo: string;
  requiereInscripcion: boolean;
  requiereAprobacion: boolean;
  cupo: string;
  permiteListaEspera: boolean;
  diasRecordatorio: string;
  tieneCosto: boolean;
  costo: string;
  instruccionesPago: string;
  destinatariosGenero: GeneroDestinatario;
  edadMinima: string;
  edadMaxima: string;
  preguntas: PreguntaEnEdicion[];
}

export function valoresVacios(sedeId = ''): ValoresEvento {
  return {
    nombre: '',
    sedeId,
    tipo: 'general',
    fechaInicio: '',
    horaInicio: '19:00',
    tieneFin: false,
    fechaFin: '',
    horaFin: '21:00',
    lugar: '',
    descripcion: '',
    publicoObjetivo: '',
    requiereInscripcion: false,
    requiereAprobacion: false,
    cupo: '',
    permiteListaEspera: false,
    diasRecordatorio: '',
    tieneCosto: false,
    costo: '',
    instruccionesPago: '',
    destinatariosGenero: 'todas',
    edadMinima: '',
    edadMaxima: '',
    preguntas: [],
  };
}

export function valoresDeEvento(e: EventoDetalle): ValoresEvento {
  const inicio = partesEnArgentina(e.inicio);
  const fin = e.fin ? partesEnArgentina(e.fin) : null;
  return {
    nombre: e.nombre,
    sedeId: e.sede.id,
    tipo: e.tipo,
    fechaInicio: inicio.fecha,
    horaInicio: inicio.hora,
    tieneFin: fin !== null,
    fechaFin: fin?.fecha ?? '',
    horaFin: fin?.hora ?? '21:00',
    lugar: e.lugarPropio ?? '',
    descripcion: e.descripcion,
    publicoObjetivo: e.publicoObjetivo ?? '',
    requiereInscripcion: e.requiereInscripcion,
    requiereAprobacion: e.requiereAprobacion,
    cupo: e.cupo === null ? '' : String(e.cupo),
    permiteListaEspera: e.permiteListaEspera,
    diasRecordatorio: e.diasAnticipacionRecordatorio === null ? '' : String(e.diasAnticipacionRecordatorio),
    tieneCosto: e.costo !== null,
    costo: e.costo === null ? '' : String(Number(e.costo)),
    instruccionesPago: e.instruccionesPago ?? '',
    destinatariosGenero: e.destinatarios.genero,
    edadMinima: e.destinatarios.edadMinima === null ? '' : String(e.destinatarios.edadMinima),
    edadMaxima: e.destinatarios.edadMaxima === null ? '' : String(e.destinatarios.edadMaxima),
    preguntas: preguntasEnEdicion(e.preguntas),
  };
}

/** Body de POST/PATCH a partir del formulario. Lo que no aplica se manda vacío (FR-010, FR-045). */
export function datosParaEnviar(v: ValoresEvento): DatosEvento {
  const bautismo = v.tipo === 'bautismo';
  const inscripcion = bautismo || v.requiereInscripcion;
  const cupo = inscripcion && v.cupo.trim() !== '' ? Number(v.cupo) : null;
  const costo = !bautismo && inscripcion && v.tieneCosto;
  return {
    sedeId: v.sedeId,
    nombre: v.nombre,
    descripcion: v.descripcion,
    tipo: v.tipo,
    inicio: v.fechaInicio ? instanteEnArgentina(v.fechaInicio, v.horaInicio).toISOString() : '',
    fin: v.tieneFin && v.fechaFin ? instanteEnArgentina(v.fechaFin, v.horaFin).toISOString() : null,
    lugar: v.lugar.trim() || null,
    publicoObjetivo: v.publicoObjetivo.trim() || null,
    requiereInscripcion: inscripcion,
    requiereAprobacion: !bautismo && inscripcion && v.requiereAprobacion,
    cupo,
    permiteListaEspera: !bautismo && cupo !== null && v.permiteListaEspera,
    costo: costo ? v.costo.trim().replace(',', '.') : null,
    instruccionesPago: costo ? v.instruccionesPago : null,
    diasAnticipacionRecordatorio: !bautismo && inscripcion && v.diasRecordatorio.trim() !== '' ? Number(v.diasRecordatorio) : null,
    // Ampliación 2026-10-09 (FR-060): el bautismo es para todas las personas.
    destinatariosGenero: bautismo ? 'todas' : v.destinatariosGenero,
    edadMinima: !bautismo && v.edadMinima.trim() !== '' ? Number(v.edadMinima) : null,
    edadMaxima: !bautismo && v.edadMaxima.trim() !== '' ? Number(v.edadMaxima) : null,
    // FR-064: las preguntas solo con inscripción y fuera del bautismo (si no, se mandan vacías).
    preguntas: !bautismo && inscripcion ? preguntasParaEnviar(v.preguntas) : [],
  };
}

/** Las validaciones que se pueden hacer sin ir al servidor (H-72: al salir del campo y al enviar). */
function erroresLocales(v: ValoresEvento, t: (clave: string) => string, tc: (clave: string) => string): Record<string, string> {
  const e: Record<string, string> = {};
  if (v.nombre.trim() === '') e.nombre = t('requerido.nombre');
  if (!v.sedeId) e.sedeId = t('requerido.sede');
  if (!v.fechaInicio) e.inicio = t('requerido.inicio');
  // D236 (DEMO-14): un año como 1000 es un error de tipeo.
  else if (!anioInicioEventoValido(Number(v.fechaInicio.slice(0, 4)), Number(hoyEnArgentina().slice(0, 4)))) e.inicio = tc('campos.INICIO_FUERA_DE_RANGO');
  if (v.tieneFin && !v.fechaFin) e.fin = t('requerido.fin');
  if (v.descripcion.trim() === '') e.descripcion = t('requerido.descripcion');
  const inscripcion = v.tipo === 'bautismo' || v.requiereInscripcion;
  if (inscripcion && v.cupo.trim() !== '' && !(Number.isInteger(Number(v.cupo)) && Number(v.cupo) >= 1)) e.cupo = t('requerido.cupo');
  if (v.tipo !== 'bautismo' && inscripcion && v.tieneCosto) {
    const costo = Number(v.costo.trim().replace(',', '.'));
    if (!(costo > 0)) e.costo = t('requerido.costo');
    if (v.instruccionesPago.trim() === '') e.instruccionesPago = t('requerido.instruccionesPago');
  }
  if (v.tipo !== 'bautismo' && inscripcion && v.diasRecordatorio.trim() !== '') {
    const dias = Number(v.diasRecordatorio);
    if (!(Number.isInteger(dias) && dias >= 1 && dias <= DIAS_RECORDATORIO_MAX)) e.diasAnticipacionRecordatorio = t('requerido.diasRecordatorio');
  }
  if (v.tipo !== 'bautismo' && inscripcion) {
    for (const error of validarPreguntas(preguntasParaEnviar(v.preguntas))) e[error.campo] = tc(`campos.${error.code}`);
  }
  if (v.tipo !== 'bautismo') {
    const edad = (x: string) => x.trim() === '' || (Number.isInteger(Number(x)) && Number(x) >= 0 && Number(x) <= EDAD_DESTINATARIO_MAX);
    if (!edad(v.edadMinima)) e.edadMinima = t('requerido.edad');
    if (!edad(v.edadMaxima)) e.edadMaxima = t('requerido.edad');
    else if (edad(v.edadMinima) && v.edadMinima.trim() !== '' && v.edadMaxima.trim() !== '' && Number(v.edadMaxima) < Number(v.edadMinima)) {
      e.edadMaxima = t('requerido.edadMaxima');
    }
  }
  return e;
}

const CLASE_CAMPO = 'h-10 rounded-md border border-input bg-transparent px-3 text-sm aria-invalid:border-destructive dark:bg-input/30';

/**
 * spec 011, T030 — formulario de Evento (alta y edición; FR-010, FR-045).
 * Los campos que no aplican se ocultan: aprobación, cupo, lista y
 * recordatorio solo con inscripción; lista solo con cupo; costo e
 * instrucciones solo con inscripción; en "Bautismo", ninguno de los que el
 * bautismo no admite. Errores por campo con resumen y foco (H-50, H-72);
 * envío protegido (H-57). El flyer se sube aparte, en el detalle (necesita
 * el Evento ya creado y su propio texto alternativo).
 */
export function FormularioEvento({
  valoresIniciales,
  sedes,
  textoBoton,
  textoEnviando,
  enviar,
  accionSecundaria,
  bloquearTipo = false,
}: {
  valoresIniciales: ValoresEvento;
  sedes: SedeOpcion[];
  textoBoton: string;
  textoEnviando: string;
  /** Llama a la API; si falla, el formulario muestra el error (por campo o general). */
  enviar: (datos: DatosEvento) => Promise<void>;
  accionSecundaria?: ReactNode;
  /** FR-014: con Inscripciones el tipo no se puede cambiar. */
  bloquearTipo?: boolean;
}) {
  const t = useTranslations('eventos.gestion.formulario');
  const tg = useTranslations('eventos.gestion');
  const tf = useTranslations('campoFecha');
  const te = useTranslations('errors');
  const [v, setV] = useState(valoresIniciales);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const validacion = useValidacionCampos();
  const etiquetasFecha = { dia: tf('dia'), mes: tf('mes'), anio: tf('anio'), meses: tf.raw('meses') as string[] };
  const etiquetasHora = { hora: t('hora'), minutos: t('minutos') };

  function poner<K extends keyof ValoresEvento>(campo: K, valor: ValoresEvento[K], clave: string = campo) {
    setV((a) => ({ ...a, [campo]: valor }));
    validacion.limpiar(clave);
  }

  function revisar(clave: string) {
    const mensaje = erroresLocales(v, t, te)[clave];
    if (mensaje) validacion.revalidar(clave, v, { esValido: () => false, mensaje });
    else validacion.limpiar(clave);
  }

  const { enviando, ejecutar } = useEnvio(async () => {
    setErrorGeneral(null);
    const locales = erroresLocales(v, t, te);
    if (Object.keys(locales).length > 0) {
      validacion.reemplazar(locales);
      return;
    }
    try {
      await enviar(datosParaEnviar(v));
    } catch (e) {
      const campos = mensajesDeCampo(e, te, tg);
      if (campos) validacion.reemplazar(campos);
      else setErrorGeneral(mensajeDeError(e, te, tg));
    }
  });

  const bautismo = v.tipo === 'bautismo';
  const inscripcion = bautismo || v.requiereInscripcion;
  const m = validacion.mensajes;
  const CON_AYUDA = new Set(['nombre', 'lugar', 'publicoObjetivo', 'cupo', 'diasAnticipacionRecordatorio', 'costo', 'instruccionesPago']);
  const aria = (clave: string) => ({
    'aria-invalid': m[clave] ? true : undefined,
    'aria-describedby': [m[clave] ? `campo-${clave}-error` : null, CON_AYUDA.has(clave) ? `campo-${clave}-ayuda` : null].filter(Boolean).join(' ') || undefined,
  });
  const ayuda = (clave: string, texto: string) => (
    <p id={`campo-${clave}-ayuda`} className="text-sm text-muted-foreground">
      {texto}
    </p>
  );
  const error = (clave: string) => <MensajeErrorCampo id={`campo-${clave}-error`} mensaje={m[clave]} />;
  const opcional = <span className="font-normal text-muted-foreground"> {t('opcional')}</span>;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
    >
      {errorGeneral && (
        <p role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-foreground">
          {errorGeneral}
        </p>
      )}
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">{t('seccionDatos')}</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor="campo-nombre" className="text-sm font-medium">
            {t('nombre')}
          </label>
          {ayuda('nombre', t('nombreAyuda'))}
          <input id="campo-nombre" className={CLASE_CAMPO} value={v.nombre} maxLength={120} onChange={(e) => poner('nombre', e.target.value)} onBlur={() => revisar('nombre')} {...aria('nombre')} />
          {error('nombre')}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="campo-sedeId" className="text-sm font-medium">
            {t('sede')}
          </label>
          <select id="campo-sedeId" className={CLASE_CAMPO} value={v.sedeId} onChange={(e) => poner('sedeId', e.target.value)} onBlur={() => revisar('sedeId')} {...aria('sedeId')}>
            <option value="">{t('sedeElegir')}</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          {error('sedeId')}
        </div>

        <fieldset className="flex flex-col gap-1" aria-describedby="campo-tipo-ayuda">
          <legend className="text-sm font-medium">{t('tipo')}</legend>
          {ayuda('tipo', t('tipoAyuda'))}
          <div className="flex flex-wrap gap-4">
            {(['general', 'bautismo'] as const).map((tipo, i) => (
              <label key={tipo} className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipo"
                  id={i === 0 ? 'campo-tipo' : undefined}
                  value={tipo}
                  checked={v.tipo === tipo}
                  disabled={bloquearTipo}
                  onChange={() => poner('tipo', tipo)}
                  className="size-4"
                />
                {tg(`tipo.${tipo}`)}
              </label>
            ))}
          </div>
          {error('tipo')}
        </fieldset>

        <div className="flex flex-wrap items-end gap-4">
          <CampoFecha
            id="campo-inicio"
            etiqueta={t('fechaInicio')}
            value={v.fechaInicio}
            onChange={(valor) => poner('fechaInicio', valor, 'inicio')}
            onBlur={() => revisar('inicio')}
            etiquetas={etiquetasFecha}
            error={Boolean(m.inicio)}
            idError="campo-inicio-error"
            required
          />
          <CampoHora id="campo-horaInicio" etiqueta={t('horaInicio')} value={v.horaInicio} onChange={(valor) => poner('horaInicio', valor, 'inicio')} etiquetas={etiquetasHora} />
        </div>
        {error('inicio')}

        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={v.tieneFin} onChange={(e) => poner('tieneFin', e.target.checked, 'fin')} />
          {t('tieneFin')}
        </label>
        {v.tieneFin && (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <CampoFecha
                id="campo-fin"
                etiqueta={t('fechaFin')}
                value={v.fechaFin}
                onChange={(valor) => poner('fechaFin', valor, 'fin')}
                onBlur={() => revisar('fin')}
                etiquetas={etiquetasFecha}
                error={Boolean(m.fin)}
                idError="campo-fin-error"
              />
              <CampoHora id="campo-horaFin" etiqueta={t('horaFin')} value={v.horaFin} onChange={(valor) => poner('horaFin', valor, 'fin')} etiquetas={etiquetasHora} />
            </div>
            {error('fin')}
          </>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="campo-lugar" className="text-sm font-medium">
            {t('lugar')}
            {opcional}
          </label>
          {ayuda('lugar', t('lugarAyuda'))}
          <input id="campo-lugar" className={CLASE_CAMPO} value={v.lugar} maxLength={300} onChange={(e) => poner('lugar', e.target.value)} {...aria('lugar')} />
          {error('lugar')}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="campo-descripcion" className="text-sm font-medium">
            {t('descripcion')}
          </label>
          <textarea
            id="campo-descripcion"
            rows={5}
            maxLength={5000}
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm aria-invalid:border-destructive dark:bg-input/30"
            value={v.descripcion}
            onChange={(e) => poner('descripcion', e.target.value)}
            onBlur={() => revisar('descripcion')}
            {...aria('descripcion')}
          />
          {error('descripcion')}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="campo-publicoObjetivo" className="text-sm font-medium">
            {t('publicoObjetivo')}
            {opcional}
          </label>
          {ayuda('publicoObjetivo', t('publicoObjetivoAyuda'))}
          <input id="campo-publicoObjetivo" className={CLASE_CAMPO} value={v.publicoObjetivo} maxLength={120} onChange={(e) => poner('publicoObjetivo', e.target.value)} {...aria('publicoObjetivo')} />
          {error('publicoObjetivo')}
        </div>
      </fieldset>

      {!bautismo && (
        <fieldset className="flex flex-col gap-4" aria-describedby="campo-destinatarios-ayuda">
          <legend className="mb-2 text-lg font-semibold">{t('seccionDestinatarios')}</legend>
          {ayuda('destinatarios', t('destinatariosAyuda'))}
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium">{t('destinatariosGenero')}</legend>
            <div className="flex flex-wrap gap-4">
              {GENEROS_DESTINATARIO.map((g, i) => (
                <label key={g} className="flex min-h-10 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="destinatariosGenero"
                    id={i === 0 ? 'campo-destinatariosGenero' : undefined}
                    value={g}
                    checked={v.destinatariosGenero === g}
                    onChange={() => poner('destinatariosGenero', g)}
                    className="size-4"
                  />
                  {t(`genero.${g}`)}
                </label>
              ))}
            </div>
            {error('destinatariosGenero')}
          </fieldset>
          <div className="flex flex-wrap gap-4">
            {(['edadMinima', 'edadMaxima'] as const).map((campo) => (
              <div key={campo} className="flex flex-col gap-1">
                <label htmlFor={`campo-${campo}`} className="text-sm font-medium">
                  {t(campo)}
                  {opcional}
                </label>
                <input
                  id={`campo-${campo}`}
                  inputMode="numeric"
                  className={`${CLASE_CAMPO} w-32`}
                  value={v[campo]}
                  onChange={(e) => poner(campo, e.target.value.replace(/\D/g, ''))}
                  onBlur={() => revisar(campo)}
                  aria-invalid={m[campo] ? true : undefined}
                  aria-describedby={[m[campo] ? `campo-${campo}-error` : null, 'campo-edades-ayuda'].filter(Boolean).join(' ')}
                />
                {error(campo)}
              </div>
            ))}
          </div>
          <p id="campo-edades-ayuda" className="text-sm text-muted-foreground">
            {t('edadesAyuda')}
          </p>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">{t('seccionInscripcion')}</legend>
        {!bautismo && (
          <div className="flex flex-col gap-1">
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                id="campo-requiereInscripcion"
                type="checkbox"
                className="size-4"
                checked={v.requiereInscripcion}
                onChange={(e) => poner('requiereInscripcion', e.target.checked)}
                aria-describedby="campo-requiereInscripcion-ayuda"
              />
              {t('requiereInscripcion')}
            </label>
            {ayuda('requiereInscripcion', t('requiereInscripcionAyuda'))}
          </div>
        )}

        {inscripcion && (
          <>
            {!bautismo && (
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input id="campo-requiereAprobacion" type="checkbox" className="size-4" checked={v.requiereAprobacion} onChange={(e) => poner('requiereAprobacion', e.target.checked)} />
                {t('requiereAprobacion')}
              </label>
            )}
            {error('requiereAprobacion')}

            <div className="flex flex-col gap-1">
              <label htmlFor="campo-cupo" className="text-sm font-medium">
                {t('cupo')}
                {opcional}
              </label>
              {ayuda('cupo', t('cupoAyuda'))}
              <input id="campo-cupo" inputMode="numeric" className={`${CLASE_CAMPO} w-32`} value={v.cupo} onChange={(e) => poner('cupo', e.target.value.replace(/\D/g, ''))} onBlur={() => revisar('cupo')} {...aria('cupo')} />
              {error('cupo')}
            </div>

            {!bautismo && v.cupo.trim() !== '' && (
              <div className="flex flex-col gap-1">
                <label className="flex min-h-10 items-center gap-2 text-sm">
                  <input
                    id="campo-permiteListaEspera"
                    type="checkbox"
                    className="size-4"
                    checked={v.permiteListaEspera}
                    onChange={(e) => poner('permiteListaEspera', e.target.checked)}
                    aria-describedby="campo-permiteListaEspera-ayuda"
                  />
                  {t('permiteListaEspera')}
                </label>
                {ayuda('permiteListaEspera', t('permiteListaEsperaAyuda'))}
                {error('permiteListaEspera')}
              </div>
            )}

            {!bautismo && (
              <div className="flex flex-col gap-1">
                <label htmlFor="campo-diasAnticipacionRecordatorio" className="text-sm font-medium">
                  {t('diasRecordatorio')}
                  {opcional}
                </label>
                {ayuda('diasAnticipacionRecordatorio', t('diasRecordatorioAyuda'))}
                <input
                  id="campo-diasAnticipacionRecordatorio"
                  inputMode="numeric"
                  className={`${CLASE_CAMPO} w-32`}
                  value={v.diasRecordatorio}
                  onChange={(e) => poner('diasRecordatorio', e.target.value.replace(/\D/g, ''), 'diasAnticipacionRecordatorio')}
                  onBlur={() => revisar('diasAnticipacionRecordatorio')}
                  {...aria('diasAnticipacionRecordatorio')}
                />
                {error('diasAnticipacionRecordatorio')}
              </div>
            )}
          </>
        )}
      </fieldset>

      {inscripcion && !bautismo && (
        <EditorPreguntas
          preguntas={v.preguntas}
          onCambiar={(preguntas) => setV((a) => ({ ...a, preguntas }))}
          mensajes={m}
          onLimpiar={(campo) => validacion.limpiar(campo)}
        />
      )}

      {inscripcion && !bautismo && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">{t('seccionPago')}</legend>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={v.tieneCosto} onChange={(e) => poner('tieneCosto', e.target.checked, 'costo')} />
            {t('tieneCosto')}
          </label>
          {v.tieneCosto && (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor="campo-costo" className="text-sm font-medium">
                  {t('costo')}
                </label>
                {ayuda('costo', t('costoAyuda'))}
                <input id="campo-costo" inputMode="decimal" className={`${CLASE_CAMPO} w-40`} value={v.costo} onChange={(e) => poner('costo', e.target.value)} onBlur={() => revisar('costo')} {...aria('costo')} />
                {error('costo')}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="campo-instruccionesPago" className="text-sm font-medium">
                  {t('instruccionesPago')}
                </label>
                {ayuda('instruccionesPago', t('instruccionesPagoAyuda'))}
                <textarea
                  id="campo-instruccionesPago"
                  rows={3}
                  maxLength={1000}
                  className="rounded-md border border-input bg-transparent px-3 py-2 text-sm aria-invalid:border-destructive dark:bg-input/30"
                  value={v.instruccionesPago}
                  onChange={(e) => poner('instruccionesPago', e.target.value)}
                  onBlur={() => revisar('instruccionesPago')}
                  {...aria('instruccionesPago')}
                />
                {error('instruccionesPago')}
              </div>
            </>
          )}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={enviando} loadingText={textoEnviando}>
          {textoBoton}
        </Button>
        {accionSecundaria}
      </div>
    </form>
  );
}
