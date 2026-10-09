'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Save, UsersRound, X } from 'lucide-react';
import {
  ApiError,
  DIAS_SEMANA,
  apiFetch,
  erroresPorCampo,
  generoDelGrupo,
  validarDatosGrupo,
  type DatosGrupoExtension,
  type DiaSemana,
  type ResultadoGuardarGrupo,
} from '@vida-sobrenatural/shared-types';
import { Button, ButtonLink, CampoHora, Input, MensajeErrorCampo, ResumenErrores, useEnvio, useValidacionCampos } from '@vida-sobrenatural/ui';
import { BuscarPersonaGex } from './buscar-persona';

export interface LiderElegido {
  id: string;
  nombre: string;
  apellido: string;
  genero: 'masculino' | 'femenino';
}

export interface InicialGrupo {
  id?: string;
  nombre: string;
  lideres: LiderElegido[];
  dias: DiaSemana[];
  horaInicio: string;
  cupo: number | null;
  edadMinima: number | null;
  edadMaxima: number | null;
  enLaIglesia: boolean;
  sedeId: string | null;
  calle: string | null;
  numero: string | null;
  entreCalle1: string | null;
  entreCalle2: string | null;
  zona: string | null;
}

const CLASE_SELECT = 'h-10 w-full rounded-md border border-input bg-transparent px-2 text-sm aria-invalid:border-destructive dark:bg-input/30 sm:w-fit';

/**
 * spec 014 (D221–D223): crear o editar un Grupo de Extensión. Valida con las
 * mismas reglas que la API (`validarDatosGrupo`), por campo, con resumen y
 * foco (H-50); el envío está protegido de la reentrada (H-57). El género no se
 * carga: se muestra el que sale de los líderes elegidos (D222). Si la
 * dirección no se pudo ubicar, se guarda igual y se avisa (D223).
 */
export function FormularioGrupoExtension({ inicial, sedes, apiToken }: { inicial: InicialGrupo; sedes: Array<{ id: string; nombre: string }>; apiToken: string }) {
  const t = useTranslations('gruposExtension.form');
  const tg = useTranslations('gruposExtension');
  const te = useTranslations('errors');
  const router = useRouter();
  const validacion = useValidacionCampos();
  const [v, setV] = useState<InicialGrupo>({ ...inicial, sedeId: inicial.sedeId ?? sedes[0]?.id ?? null });
  const editando = !!inicial.id;

  function poner<K extends keyof InicialGrupo>(campo: K, valor: InicialGrupo[K]) {
    setV((actual) => ({ ...actual, [campo]: valor }));
    validacion.limpiar(campo);
  }
  const numero = (texto: string) => (texto.trim() === '' ? null : Number(texto));
  const mensaje = (code: string) => (te.has(`campos.${code}`) ? te(`campos.${code}`) : tg('errorGenerico'));

  const { enviando, ejecutar } = useEnvio(async () => {
    const datos: DatosGrupoExtension = {
      nombre: v.nombre,
      lideres: v.lideres.map((l) => l.id),
      dias: v.dias,
      horaInicio: v.horaInicio,
      cupo: v.cupo,
      edadMinima: v.edadMinima,
      edadMaxima: v.edadMaxima,
      enLaIglesia: v.enLaIglesia,
      sedeId: v.enLaIglesia ? v.sedeId : null,
      calle: v.enLaIglesia ? null : v.calle,
      numero: v.enLaIglesia ? null : v.numero,
      entreCalle1: v.enLaIglesia ? null : v.entreCalle1,
      entreCalle2: v.enLaIglesia ? null : v.entreCalle2,
      zona: v.zona,
    };
    const locales = validarDatosGrupo(datos);
    if (locales.length > 0) {
      validacion.reemplazar(Object.fromEntries(locales.map((e) => [e.campo, mensaje(e.code)])));
      return;
    }
    let resultado: ResultadoGuardarGrupo;
    try {
      resultado = await apiFetch<ResultadoGuardarGrupo>(editando ? `/grupos-extension/${inicial.id}` : '/grupos-extension', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(datos),
      });
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) {
        validacion.reemplazar(Object.fromEntries(campos.map(({ campo, code }) => [campo, mensaje(code)])));
        return;
      }
      toast.error(error instanceof ApiError && te.has(error.code) ? te(error.code) : tg('errorGenerico'));
      return;
    }
    toast.success(editando ? t('guardado') : t('creado', { nombre: v.nombre.trim() }));
    if (!resultado.ubicado) toast.warning(t('sinUbicar'), { duration: 12_000 });
    router.push(`/grupos-extension/${resultado.id}`);
    router.refresh();
  });

  const genero = generoDelGrupo(v.lideres.map((l) => l.genero));
  const err = validacion.mensajes;
  const campoTexto = (campo: 'nombre' | 'calle' | 'numero' | 'entreCalle1' | 'entreCalle2' | 'zona', etiqueta: string, ayuda?: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`campo-${campo}`} className="text-sm font-medium">
        {etiqueta}
      </label>
      {ayuda && (
        <p id={`${campo}-ayuda`} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      <Input
        id={`campo-${campo}`}
        value={v[campo] ?? ''}
        onChange={(e) => poner(campo, e.target.value)}
        disabled={enviando}
        aria-invalid={err[campo] ? true : undefined}
        aria-describedby={[ayuda ? `${campo}-ayuda` : '', err[campo] ? `${campo}-error` : ''].filter(Boolean).join(' ') || undefined}
        className="h-10"
      />
      <MensajeErrorCampo id={`${campo}-error`} mensaje={err[campo]} />
    </div>
  );
  const campoNumero = (campo: 'cupo' | 'edadMinima' | 'edadMaxima', etiqueta: string, idAyuda: string, ayuda?: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`campo-${campo}`} className="text-sm font-medium">
        {etiqueta}
      </label>
      {ayuda && (
        <p id={idAyuda} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      <Input
        id={`campo-${campo}`}
        type="number"
        inputMode="numeric"
        min={campo === 'cupo' ? 1 : 0}
        value={v[campo] ?? ''}
        onChange={(e) => poner(campo, numero(e.target.value))}
        disabled={enviando}
        aria-invalid={err[campo] ? true : undefined}
        aria-describedby={[idAyuda, err[campo] ? `${campo}-error` : ''].filter(Boolean).join(' ')}
        className="h-10 w-32"
      />
      <MensajeErrorCampo id={`${campo}-error`} mensaje={err[campo]} />
    </div>
  );

  return (
    <form
      noValidate
      aria-labelledby="form-gex-titulo"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
      className="flex flex-col gap-6"
    >
      <h1 id="form-gex-titulo" className="text-2xl font-semibold">
        {editando ? t('tituloEditar') : t('tituloNuevo')}
      </h1>
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />

      {campoTexto('nombre', t('nombre'), t('nombreAyuda'))}

      <fieldset id="campo-lideres" tabIndex={-1} className="flex flex-col gap-2" aria-describedby={err.lideres ? 'lideres-ayuda lideres-error' : 'lideres-ayuda'}>
        <legend className="text-sm font-medium">{t('lideres')}</legend>
        <p id="lideres-ayuda" className="text-sm text-muted-foreground">
          {t('lideresAyuda')}
        </p>
        {v.lideres.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('ninguno')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {v.lideres.map((l) => {
              const nombre = `${l.nombre} ${l.apellido}`;
              return (
                <li key={l.id} className="flex items-center gap-2 rounded-md border border-border py-1 pr-1 pl-3 text-sm">
                  {nombre}
                  <Button type="button" variant="ghost" size="sm" aria-label={t('quitarAria', { nombre })} disabled={enviando} onClick={() => poner('lideres', v.lideres.filter((x) => x.id !== l.id))}>
                    <X aria-hidden />
                    {t('quitar')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {genero && (
          <p className="flex items-center gap-2 text-sm font-medium">
            <UsersRound aria-hidden className="size-4 text-muted-foreground" />
            {t('generoCalculado', { genero: tg(`genero.${genero}`) })}
          </p>
        )}
        <BuscarPersonaGex
          id="buscar-lider"
          apiToken={apiToken}
          textoElegir={t('elegir')}
          ariaElegir={(nombre) => t('elegirAria', { nombre })}
          excluir={v.lideres.map((l) => l.id)}
          bloquearMenores
          deshabilitado={enviando}
          onElegir={(p) => poner('lideres', [...v.lideres, { id: p.id, nombre: p.nombre, apellido: p.apellido, genero: p.genero }])}
        />
        <MensajeErrorCampo id="lideres-error" mensaje={err.lideres} />
      </fieldset>

      <fieldset id="campo-dias" tabIndex={-1} className="flex flex-col gap-2" aria-describedby={err.dias ? 'dias-ayuda dias-error' : 'dias-ayuda'}>
        <legend className="text-sm font-medium">{t('dias')}</legend>
        <p id="dias-ayuda" className="text-sm text-muted-foreground">
          {t('diasAyuda')}
        </p>
        <div className="flex flex-wrap gap-2">
          {DIAS_SEMANA.map((dia) => (
            <label key={dia} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm has-[:checked]:border-primary has-[:checked]:font-medium">
              <input
                type="checkbox"
                checked={v.dias.includes(dia)}
                onChange={(e) => poner('dias', e.target.checked ? [...v.dias, dia] : v.dias.filter((d) => d !== dia))}
                disabled={enviando}
                className="size-4 accent-primary"
              />
              {tg(`dias.${dia}`)}
            </label>
          ))}
        </div>
        <MensajeErrorCampo id="dias-error" mensaje={err.dias} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <CampoHora
          id="campo-horaInicio"
          etiqueta={t('hora')}
          value={v.horaInicio}
          onChange={(valor) => poner('horaInicio', valor)}
          etiquetas={{ hora: t('horaHora'), minutos: t('horaMinutos') }}
          error={!!err.horaInicio}
          idError="horaInicio-error"
          disabled={enviando}
        />
        <MensajeErrorCampo id="horaInicio-error" mensaje={err.horaInicio} />
      </div>

      {campoNumero('cupo', t('cupo'), 'cupo-ayuda', t('cupoAyuda'))}
      <fieldset className="flex flex-col gap-2" aria-describedby="edad-ayuda">
        <legend className="text-sm font-medium">{t('edades')}</legend>
        <p id="edad-ayuda" className="text-sm text-muted-foreground">
          {t('edadAyuda')}
        </p>
        <div className="flex flex-wrap gap-4">
          {campoNumero('edadMinima', t('edadMinima'), 'edad-ayuda')}
          {campoNumero('edadMaxima', t('edadMaxima'), 'edad-ayuda')}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-medium">{t('lugar')}</legend>
        <div className="flex min-h-10 items-start gap-3 text-sm">
          <input
            id="campo-enLaIglesia"
            type="checkbox"
            checked={v.enLaIglesia}
            onChange={(e) => poner('enLaIglesia', e.target.checked)}
            disabled={enviando}
            className="mt-0.5 size-4 accent-primary"
            aria-describedby="iglesia-ayuda"
          />
          <div className="flex flex-col">
            <label htmlFor="campo-enLaIglesia" className="cursor-pointer font-medium">
              {t('enLaIglesia')}
            </label>
            <span id="iglesia-ayuda" className="text-muted-foreground">
              {t('enLaIglesiaAyuda')}
            </span>
          </div>
        </div>
        {v.enLaIglesia ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="campo-sedeId" className="text-sm font-medium">
              {t('sede')}
            </label>
            <select
              id="campo-sedeId"
              value={v.sedeId ?? ''}
              onChange={(e) => poner('sedeId', e.target.value || null)}
              disabled={enviando}
              aria-invalid={err.sedeId ? true : undefined}
              aria-describedby={err.sedeId ? 'sedeId-error' : undefined}
              className={CLASE_SELECT}
            >
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <MensajeErrorCampo id="sedeId-error" mensaje={err.sedeId} />
          </div>
        ) : (
          <>
            {campoTexto('calle', t('calle'), t('calleAyuda'))}
            {campoTexto('numero', t('numero'))}
            <p id="entre-ayuda" className="text-sm text-muted-foreground">
              {t('entreAyuda')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {campoTexto('entreCalle1', t('entreCalle1'))}
              {campoTexto('entreCalle2', t('entreCalle2'))}
            </div>
          </>
        )}
        {campoTexto('zona', v.enLaIglesia ? t('zonaOpcional') : t('zona'), t('zonaAyuda'))}
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <ButtonLink render={<Link href={editando ? `/grupos-extension/${inicial.id}` : '/grupos-extension'} />} variant="outline">
          {t('cancelar')}
        </ButtonLink>
        <Button type="submit" loading={enviando}>
          <Save aria-hidden />
          {editando ? t('guardar') : t('crear')}
        </Button>
      </div>
    </form>
  );
}
