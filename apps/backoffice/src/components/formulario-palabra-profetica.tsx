'use client';

import { useState } from 'react';
import { type ErrorDeCampo, mensajeDeCampo } from '@vida-sobrenatural/shared-types';
import {
  Button,
  EditorMarkdown,
  MensajeErrorCampo,
  ResumenErrores,
  useValidacionCampos,
  type EtiquetasEditorMarkdown,
  type ValidacionCampo,
} from '@vida-sobrenatural/ui';

export interface ValoresPalabraProfetica {
  anio: string;
  titulo: string;
  texto: string;
  youtubeUrl: string;
}

export const VALORES_PALABRA_PROFETICA_VACIOS: ValoresPalabraProfetica = {
  anio: String(new Date().getFullYear()),
  titulo: '',
  texto: '',
  youtubeUrl: '',
};

/** Body de POST/PATCH /palabra-profetica a partir de ValoresPalabraProfetica — FR-010, D121 (youtubeUrl opcional). */
export function datosPalabraProfeticaParaEnviar(valores: ValoresPalabraProfetica) {
  return {
    anio: Number(valores.anio),
    titulo: valores.titulo,
    texto: valores.texto,
    youtubeUrl: valores.youtubeUrl.trim() || undefined,
  };
}

const ETIQUETAS_CAMPO: Record<string, string> = {
  anio: 'Año',
  titulo: 'Título',
  texto: 'Texto',
  youtubeUrl: 'URL del video de YouTube',
};

const MENSAJE_REQUERIDO = 'Revisá este dato.';
const ANIO_MINIMO = 2010;

/** H-90/D127: etiquetas de la barra de EditorMarkdown — sin default en packages/ui (D84). */
const ETIQUETAS_EDITOR_MARKDOWN: EtiquetasEditorMarkdown = {
  negrita: 'Negrita',
  italica: 'Itálica',
  enlace: 'Enlace',
  lista: 'Lista',
  cita: 'Cita',
  h2: 'Subtítulo (h2)',
  h3: 'Subtítulo (h3)',
  textoPorDefectoEnlace: 'texto del enlace',
  urlPorDefectoEnlace: 'https://',
};

/**
 * FR-010/FR-011/FR-014 (Historia 3): año/título/texto obligatorios,
 * `youtubeUrl` opcional (D121) — el formato inválido lo detecta el
 * servidor (YOUTUBE_URL_INVALIDA) y `guardar()` en palabra-profetica-
 * cliente.tsx lo mapea al campo, igual que cualquier otro `erroresCampo`.
 * Mismo patrón de validación por campo que FormularioSede (H-50/H-72).
 */
export function FormularioPalabraProfetica({
  valoresIniciales,
  onGuardar,
  enviando,
  textoBoton,
  textoEnviando,
  error,
  erroresCampo,
  soloLectura = false,
}: {
  valoresIniciales: ValoresPalabraProfetica;
  onGuardar: (valores: ValoresPalabraProfetica) => void;
  enviando: boolean;
  textoBoton: string;
  textoEnviando: string;
  error?: string | null;
  erroresCampo?: ErrorDeCampo[] | null;
  /** D64: Pastor ve el formulario pero no puede editar ni enviar. */
  soloLectura?: boolean;
}) {
  const [valores, setValores] = useState(valoresIniciales);
  const validacion = useValidacionCampos();
  const [erroresCampoVistos, setErroresCampoVistos] = useState(erroresCampo);
  if (erroresCampo !== erroresCampoVistos) {
    setErroresCampoVistos(erroresCampo);
    const mapa: Record<string, string> = {};
    for (const { campo, code } of erroresCampo ?? []) {
      mapa[campo] = mensajeDeCampo(code, ETIQUETAS_CAMPO[campo] ?? campo);
    }
    validacion.reemplazar(mapa);
  }

  const requerido: ValidacionCampo<string> = { esValido: (v) => v.trim() !== '', mensaje: MENSAJE_REQUERIDO };
  const validaciones = {
    anio: {
      esValido: (v: string) => {
        const n = Number(v);
        return v.trim() !== '' && Number.isInteger(n) && n >= ANIO_MINIMO && n <= new Date().getFullYear() + 1;
      },
      mensaje: `Ingresá un año entre ${ANIO_MINIMO} y ${new Date().getFullYear() + 1}.`,
    } satisfies ValidacionCampo<string>,
    titulo: requerido,
    texto: requerido,
  };

  function actualizar<K extends keyof ValoresPalabraProfetica>(campo: K, valor: ValoresPalabraProfetica[K]) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (soloLectura) return;
        onGuardar(valores);
      }}
      className="flex flex-col gap-3"
      inert={soloLectura}
    >
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} />
      <div className="flex flex-col gap-1">
        <label htmlFor="campo-anio" className="text-sm font-medium">
          {ETIQUETAS_CAMPO.anio}
        </label>
        <input
          id="campo-anio"
          type="number"
          required
          aria-invalid={Boolean(validacion.mensajes.anio)}
          aria-describedby={validacion.mensajes.anio ? 'campo-anio-error' : undefined}
          value={valores.anio}
          disabled={soloLectura}
          onChange={(e) => {
            actualizar('anio', e.target.value);
            validacion.limpiar('anio');
          }}
          onBlur={() => validacion.revalidar('anio', valores.anio, validaciones.anio)}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
        />
        <MensajeErrorCampo id="campo-anio-error" mensaje={validacion.mensajes.anio} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="campo-titulo" className="text-sm font-medium">
          {ETIQUETAS_CAMPO.titulo}
        </label>
        <input
          id="campo-titulo"
          required
          aria-invalid={Boolean(validacion.mensajes.titulo)}
          aria-describedby={validacion.mensajes.titulo ? 'campo-titulo-error' : undefined}
          value={valores.titulo}
          disabled={soloLectura}
          placeholder="Ej. Fidelidad y crecimiento"
          onChange={(e) => {
            actualizar('titulo', e.target.value);
            validacion.limpiar('titulo');
          }}
          onBlur={() => validacion.revalidar('titulo', valores.titulo, validaciones.titulo)}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
        />
        <MensajeErrorCampo id="campo-titulo-error" mensaje={validacion.mensajes.titulo} />
      </div>
      <div className="flex flex-col gap-1">
        {/* id además de htmlFor: un <div contenteditable role="textbox">
            (EditorMarkdown) no es un elemento "labelable" del HTML — el
            `for` solo lo asocia visualmente/por convención con el resto de
            los campos; el nombre accesible real lo arma `aria-labelledby`
            (EditorMarkdown, ver el comentario ahí). */}
        <label id="etiqueta-campo-texto" htmlFor="campo-texto" className="text-sm font-medium">
          {ETIQUETAS_CAMPO.texto}
        </label>
        {/* H-90/D127 (revisión manual): editor TipTap — WYSIWYG, guarda
            Markdown (nunca HTML ni el JSON de ProseMirror). La página
            pública sigue renderizando con MarkdownSeguro, sin cambios. */}
        <EditorMarkdown
          id="campo-texto"
          ariaLabelledby="etiqueta-campo-texto"
          ariaInvalid={Boolean(validacion.mensajes.texto)}
          ariaDescribedby={validacion.mensajes.texto ? 'campo-texto-error' : undefined}
          value={valores.texto}
          disabled={soloLectura}
          etiquetas={ETIQUETAS_EDITOR_MARKDOWN}
          onChange={(valor) => {
            actualizar('texto', valor);
            validacion.limpiar('texto');
          }}
          onBlur={() => validacion.revalidar('texto', valores.texto, validaciones.texto)}
        />
        <MensajeErrorCampo id="campo-texto-error" mensaje={validacion.mensajes.texto} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="campo-youtubeUrl" className="text-sm font-medium">
          {ETIQUETAS_CAMPO.youtubeUrl} (opcional)
        </label>
        <input
          id="campo-youtubeUrl"
          aria-invalid={Boolean(validacion.mensajes.youtubeUrl)}
          aria-describedby={validacion.mensajes.youtubeUrl ? 'campo-youtubeUrl-error' : undefined}
          value={valores.youtubeUrl}
          disabled={soloLectura}
          placeholder="https://www.youtube.com/watch?v=..."
          onChange={(e) => {
            actualizar('youtubeUrl', e.target.value);
            validacion.limpiar('youtubeUrl');
          }}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
        />
        <MensajeErrorCampo id="campo-youtubeUrl-error" mensaje={validacion.mensajes.youtubeUrl} />
      </div>
      {!soloLectura && (
        <Button type="submit" loading={enviando} loadingText={textoEnviando} className="w-fit">
          {textoBoton}
        </Button>
      )}
    </form>
  );
}
