'use client';

import { useState } from 'react';
import { type Libro, type ErrorDeCampo, mensajeDeCampo } from '@vida-sobrenatural/shared-types';
import { Button, MensajeErrorCampo, ResumenErrores, useValidacionCampos, type ValidacionCampo } from '@vida-sobrenatural/ui';

export interface ValoresLibro {
  titulo: string;
  autor: string;
  anio: string;
  descripcion: string;
  orden: string;
}

export const VALORES_LIBRO_VACIOS: ValoresLibro = {
  titulo: '',
  autor: '',
  anio: String(new Date().getFullYear()),
  descripcion: '',
  orden: '0',
};

export function libroAValoresFormulario(libro: Libro): ValoresLibro {
  return {
    titulo: libro.titulo,
    autor: libro.autor,
    anio: String(libro.anio),
    descripcion: libro.descripcion ?? '',
    orden: String(libro.orden),
  };
}

/** Body de POST/PATCH /libros a partir de ValoresLibro — FR-015. La portada no entra acá (FR-021). */
export function datosLibroParaEnviar(valores: ValoresLibro) {
  return {
    titulo: valores.titulo,
    autor: valores.autor,
    anio: Number(valores.anio),
    descripcion: valores.descripcion.trim() || undefined,
    orden: Number(valores.orden),
  };
}

const ETIQUETAS_CAMPO: Record<string, string> = {
  titulo: 'Título',
  autor: 'Autor/a',
  anio: 'Año',
  descripcion: 'Descripción',
  orden: 'Orden',
};

const MENSAJE_REQUERIDO = 'Revisá este dato.';

/** FR-015/FR-016 — título/autor/año obligatorios; descripción y orden opcionales/con default. Mismo patrón H-50/H-72 que FormularioSede. */
export function FormularioLibro({
  valoresIniciales,
  onGuardar,
  enviando,
  textoBoton,
  textoEnviando,
  error,
  erroresCampo,
  soloLectura = false,
}: {
  valoresIniciales: ValoresLibro;
  onGuardar: (valores: ValoresLibro) => void;
  enviando: boolean;
  textoBoton: string;
  textoEnviando: string;
  error?: string | null;
  erroresCampo?: ErrorDeCampo[] | null;
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
    titulo: requerido,
    autor: requerido,
    anio: {
      esValido: (v: string) => v.trim() !== '' && Number.isInteger(Number(v)),
      mensaje: 'Ingresá un año válido.',
    } satisfies ValidacionCampo<string>,
    orden: {
      esValido: (v: string) => v.trim() === '' || (Number.isInteger(Number(v)) && Number(v) >= 0),
      mensaje: 'Ingresá un número entero, 0 o más.',
    } satisfies ValidacionCampo<string>,
  };

  function actualizar<K extends keyof ValoresLibro>(campo: K, valor: ValoresLibro[K]) {
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
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} />
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
        <label htmlFor="campo-autor" className="text-sm font-medium">
          {ETIQUETAS_CAMPO.autor}
        </label>
        <input
          id="campo-autor"
          required
          aria-invalid={Boolean(validacion.mensajes.autor)}
          aria-describedby={validacion.mensajes.autor ? 'campo-autor-error' : undefined}
          value={valores.autor}
          disabled={soloLectura}
          onChange={(e) => {
            actualizar('autor', e.target.value);
            validacion.limpiar('autor');
          }}
          onBlur={() => validacion.revalidar('autor', valores.autor, validaciones.autor)}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
        />
        <MensajeErrorCampo id="campo-autor-error" mensaje={validacion.mensajes.autor} />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
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
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="campo-orden" className="text-sm font-medium">
            {ETIQUETAS_CAMPO.orden}
          </label>
          <input
            id="campo-orden"
            type="number"
            aria-invalid={Boolean(validacion.mensajes.orden)}
            aria-describedby={validacion.mensajes.orden ? 'campo-orden-error' : undefined}
            value={valores.orden}
            disabled={soloLectura}
            onChange={(e) => {
              actualizar('orden', e.target.value);
              validacion.limpiar('orden');
            }}
            onBlur={() => validacion.revalidar('orden', valores.orden, validaciones.orden)}
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
          />
          <MensajeErrorCampo id="campo-orden-error" mensaje={validacion.mensajes.orden} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="campo-descripcion" className="text-sm font-medium">
          {ETIQUETAS_CAMPO.descripcion} (opcional)
        </label>
        <textarea
          id="campo-descripcion"
          value={valores.descripcion}
          disabled={soloLectura}
          rows={3}
          onChange={(e) => actualizar('descripcion', e.target.value)}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
        />
      </div>
      {!soloLectura && (
        <Button type="submit" loading={enviando} loadingText={textoEnviando} className="w-fit">
          {textoBoton}
        </Button>
      )}
    </form>
  );
}
