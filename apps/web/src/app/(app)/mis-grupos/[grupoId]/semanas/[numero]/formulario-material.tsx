'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FileText, ImageIcon, Plus, Save, Trash2, Undo2 } from 'lucide-react';
import {
  ARCHIVOS_POR_SEMANA_MAX,
  ARCHIVO_MAX_BYTES,
  ENLACES_POR_SEMANA_MAX,
  MIME_CONTENIDO_ADMITIDOS,
  TEXTO_CONTENIDO_MAX,
  TITULO_CONTENIDO_MAX,
  ApiError,
  apiFetch,
  erroresPorCampo,
  formatearTamanio,
  type ArchivoDeContenido,
  type EnlaceDeContenido,
} from '@vida-sobrenatural/shared-types';
import { Button, CampoArchivo, Input, MensajeErrorCampo, ResumenErrores, useEnvio } from '@vida-sobrenatural/ui';

interface Nuevo {
  clave: string;
  archivo: File;
  alt: string;
}

/**
 * spec 008, T041 (FR-020 a FR-023, H-50, H-57): el formulario del material.
 * Los errores van debajo de cada campo y en un resumen arriba con foco; lo
 * que se puede saber antes de subir (tamaño, cantidad, título) se avisa sin
 * esperar a la API, el resto (tipo real del archivo, URLs) lo dice la API
 * por campo. "Guardar material" va abajo, ancho completo en celular (zona del
 * pulgar), bloqueado mientras guarda.
 */
export function FormularioMaterial({
  grupoId,
  numero,
  inicial,
}: {
  grupoId: string;
  numero: number;
  inicial: { titulo: string; texto: string; archivos: ArchivoDeContenido[]; enlaces: EnlaceDeContenido[] };
}) {
  const t = useTranslations('misGrupos.material');
  const tg = useTranslations('misGrupos');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [texto, setTexto] = useState(inicial.texto);
  const [quitar, setQuitar] = useState<Set<string>>(new Set());
  const [nuevos, setNuevos] = useState<Nuevo[]>([]);
  const [enlaces, setEnlaces] = useState<EnlaceDeContenido[]>(inicial.enlaces);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [foco, setFoco] = useState(0);
  const tamanio = (bytes: number) => formatearTamanio(bytes, locale);

  const mensaje = (code: string) => (te.has(`campos.${code}`) ? te(`campos.${code}`) : tg('errorGenerico'));

  function mostrar(nuevosErrores: Record<string, string>) {
    setErrores(nuevosErrores);
    setFoco((f) => f + 1);
  }

  /** Lo que se puede saber sin la API. Los índices de `archivosNuevos` son los del orden en que se envían. */
  function validarAntes(): Record<string, string> {
    const e: Record<string, string> = {};
    if (titulo.trim() === '') e.titulo = mensaje('TITULO_REQUERIDO');
    else if (titulo.trim().length > TITULO_CONTENIDO_MAX) e.titulo = mensaje('TITULO_DEMASIADO_LARGO');
    if (texto.trim().length > TEXTO_CONTENIDO_MAX) e.texto = mensaje('TEXTO_DEMASIADO_LARGO');
    const quedan = inicial.archivos.filter((a) => !quitar.has(a.id)).length;
    if (quedan + nuevos.length > ARCHIVOS_POR_SEMANA_MAX) e.archivosNuevos = mensaje('DEMASIADOS_ARCHIVOS');
    nuevos.forEach((n, i) => {
      if (n.archivo.size > ARCHIVO_MAX_BYTES) e[`archivosNuevos.${i}`] = mensaje('ARCHIVO_DEMASIADO_GRANDE');
      else if (n.archivo.type.startsWith('image/') && n.alt.trim() === '') e[`textoAlternativo.${i}`] = mensaje('TEXTO_ALTERNATIVO_REQUERIDO');
    });
    if (enlaces.length > ENLACES_POR_SEMANA_MAX) e.enlaces = mensaje('DEMASIADOS_ENLACES');
    return e;
  }

  const { enviando, ejecutar } = useEnvio(async () => {
    const antes = validarAntes();
    if (Object.keys(antes).length > 0) return mostrar(antes);
    const datos = new FormData();
    datos.set('titulo', titulo);
    datos.set('texto', texto);
    datos.set('enlaces', JSON.stringify(enlaces));
    datos.set('archivosQuitar', JSON.stringify([...quitar]));
    for (const n of nuevos) {
      datos.append('archivosNuevos', n.archivo, n.archivo.name);
      datos.append('textoAlternativo', n.alt);
    }
    try {
      await apiFetch(`/vida-de-servicio/mis-grupos/${grupoId}/semanas/${numero}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session?.apiToken}` },
        body: datos,
      });
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) return mostrar(Object.fromEntries(campos.map((c) => [c.campo, mensaje(c.code)])));
      const code = e instanceof ApiError ? e.code : null;
      toast.error(code && te.has(code) ? te(code) : tg('errorGenerico'));
      return;
    }
    toast.success(t('guardado', { numero }));
    setNuevos([]);
    setQuitar(new Set());
    setErrores({});
    router.refresh();
  });

  const resumen = Object.entries(errores).map(([campo, m]) => ({ campo, mensaje: m }));
  const err = (campo: string) => errores[campo];
  const describir = (campo: string, ayuda?: string) => [errores[campo] ? `error-${campo}` : null, ayuda].filter(Boolean).join(' ') || undefined;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
    >
      <ResumenErrores errores={resumen} titulo={tg('resumenErrores')} foco={foco} />

      <div className="flex flex-col gap-1">
        <label htmlFor="campo-titulo" className="text-base font-medium">
          {t('tituloEtiqueta')}
        </label>
        <Input
          id="campo-titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={TITULO_CONTENIDO_MAX + 20}
          aria-invalid={err('titulo') ? true : undefined}
          aria-describedby={describir('titulo', 'ayuda-titulo')}
          className="h-11 text-base"
        />
        <p id="ayuda-titulo" className="text-base text-muted-foreground">
          {t('tituloAyuda')}
        </p>
        <MensajeErrorCampo id="error-titulo" mensaje={err('titulo')} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="campo-texto" className="text-base font-medium">
          {t('textoEtiqueta')}
        </label>
        <textarea
          id="campo-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={8}
          aria-invalid={err('texto') ? true : undefined}
          aria-describedby={describir('texto', 'ayuda-texto')}
          className="rounded-md border border-input bg-background p-3 text-base"
        />
        <p id="ayuda-texto" className="text-base text-muted-foreground">
          {t('textoAyuda')}
        </p>
        <MensajeErrorCampo id="error-texto" mensaje={err('texto')} />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-semibold">{t('archivosTitulo')}</legend>
        {inicial.archivos.length > 0 && (
          <ul className="flex flex-col gap-2">
            {inicial.archivos.map((a) => {
              const seQuita = quitar.has(a.id);
              const Icono = a.mimeType.startsWith('image/') ? ImageIcon : FileText;
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-base">
                  <span className="flex min-w-0 items-center gap-2 break-all">
                    <Icono aria-hidden className="size-5 shrink-0" />
                    {seQuita ? t('seQuita', { nombre: a.nombre }) : `${a.nombre} (${tamanio(a.tamanioBytes)})`}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xl"
                    className="text-base"
                    onClick={() =>
                      setQuitar((q) => {
                        const nuevo = new Set(q);
                        if (seQuita) nuevo.delete(a.id);
                        else nuevo.add(a.id);
                        return nuevo;
                      })
                    }
                  >
                    {seQuita ? <Undo2 aria-hidden /> : <Trash2 aria-hidden />}
                    {seQuita ? t('deshacerQuitar', { nombre: a.nombre }) : t('quitar', { nombre: a.nombre })}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {nuevos.map((n, i) => (
          <div key={n.clave} id={`campo-archivosNuevos.${i}`} tabIndex={-1} className="flex flex-col gap-2 rounded-md border border-border p-3 text-base outline-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="break-all">{t('nuevo', { nombre: n.archivo.name, tamanio: tamanio(n.archivo.size) })}</span>
              <Button type="button" variant="outline" size="xl" className="text-base" onClick={() => setNuevos((xs) => xs.filter((x) => x.clave !== n.clave))}>
                <Trash2 aria-hidden />
                {t('sacarNuevo', { nombre: n.archivo.name })}
              </Button>
            </div>
            <MensajeErrorCampo id={`error-archivosNuevos.${i}`} mensaje={err(`archivosNuevos.${i}`)} />
            {n.archivo.type.startsWith('image/') && (
              <div className="flex flex-col gap-1">
                <label htmlFor={`campo-textoAlternativo.${i}`} className="font-medium">
                  {t('altEtiqueta', { nombre: n.archivo.name })}
                </label>
                <Input
                  id={`campo-textoAlternativo.${i}`}
                  value={n.alt}
                  onChange={(e) => setNuevos((xs) => xs.map((x) => (x.clave === n.clave ? { ...x, alt: e.target.value } : x)))}
                  aria-invalid={err(`textoAlternativo.${i}`) ? true : undefined}
                  aria-describedby={describir(`textoAlternativo.${i}`, `ayuda-alt-${i}`)}
                  className="h-11 text-base"
                />
                <p id={`ayuda-alt-${i}`} className="text-muted-foreground">
                  {t('altAyuda')}
                </p>
                <MensajeErrorCampo id={`error-textoAlternativo.${i}`} mensaje={err(`textoAlternativo.${i}`)} />
              </div>
            )}
          </div>
        ))}
        {/* CampoArchivo (packages/ui, de la 011: "la otra lo reusa"): un archivo por vez; cada uno se suma a la lista de arriba. */}
        <CampoArchivo
          id="campo-archivosNuevos"
          etiqueta={t('agregarArchivos')}
          ayuda={t('archivosAyuda')}
          textoBoton={t('elegirArchivo')}
          textoSinArchivo={t('sinArchivoNuevo')}
          accept={MIME_CONTENIDO_ADMITIDOS.join(',')}
          archivo={null}
          onElegir={(archivo) => {
            if (archivo) setNuevos((xs) => [...xs, { clave: `${archivo.name}-${archivo.size}-${Math.random()}`, archivo, alt: '' }]);
          }}
          error={err('archivosNuevos')}
          className="[&_label]:text-base [&_p]:text-base"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3" id="campo-enlaces" tabIndex={-1}>
        <legend className="mb-1 text-lg font-semibold">{t('enlacesTitulo')}</legend>
        {enlaces.map((e, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3 text-base">
            <label htmlFor={`campo-enlaces.${i}.texto`} className="font-medium">
              {t('enlaceTexto', { numero: i + 1 })}
            </label>
            <Input
              id={`campo-enlaces.${i}.texto`}
              value={e.texto}
              onChange={(ev) => setEnlaces((xs) => xs.map((x, j) => (j === i ? { ...x, texto: ev.target.value } : x)))}
              aria-invalid={err(`enlaces.${i}.texto`) ? true : undefined}
              aria-describedby={describir(`enlaces.${i}.texto`)}
              className="h-11 text-base"
            />
            <MensajeErrorCampo id={`error-enlaces.${i}.texto`} mensaje={err(`enlaces.${i}.texto`)} />
            <label htmlFor={`campo-enlaces.${i}.url`} className="font-medium">
              {t('enlaceUrl', { numero: i + 1 })}
            </label>
            <Input
              id={`campo-enlaces.${i}.url`}
              type="url"
              inputMode="url"
              value={e.url}
              placeholder="https://"
              onChange={(ev) => setEnlaces((xs) => xs.map((x, j) => (j === i ? { ...x, url: ev.target.value } : x)))}
              aria-invalid={err(`enlaces.${i}.url`) ? true : undefined}
              aria-describedby={describir(`enlaces.${i}.url`, `ayuda-url-${i}`)}
              className="h-11 text-base"
            />
            <p id={`ayuda-url-${i}`} className="text-muted-foreground">
              {t('enlaceUrlAyuda')}
            </p>
            <MensajeErrorCampo id={`error-enlaces.${i}.url`} mensaje={err(`enlaces.${i}.url`)} />
            <Button type="button" variant="outline" size="xl" className="w-full text-base sm:w-fit" onClick={() => setEnlaces((xs) => xs.filter((_, j) => j !== i))}>
              <Trash2 aria-hidden />
              {t('quitarEnlace', { numero: i + 1 })}
            </Button>
          </div>
        ))}
        {enlaces.length < ENLACES_POR_SEMANA_MAX && (
          <Button type="button" variant="outline" size="xl" className="w-full text-base sm:w-fit" onClick={() => setEnlaces((xs) => [...xs, { texto: '', url: '' }])}>
            <Plus aria-hidden />
            {t('agregarEnlace')}
          </Button>
        )}
        <MensajeErrorCampo id="error-enlaces" mensaje={err('enlaces')} />
      </fieldset>

      <Button type="submit" size="xl" className="w-full text-base sm:w-fit sm:self-end" loading={enviando}>
        <Save aria-hidden />
        {t('guardar')}
      </Button>
    </form>
  );
}
