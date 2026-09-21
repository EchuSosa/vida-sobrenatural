'use client';

import { useState } from 'react';
import { type Sede, type ErrorDeCampo, HORARIOS_SEDE_REGEX, TELEFONO_REGEX, mensajeDeCampo } from '@vida-sobrenatural/shared-types';
import { Button, CampoTelefono, Input, ResumenErrores, MensajeErrorCampo, useValidacionCampos, type ValidacionCampo } from '@vida-sobrenatural/ui';

export interface ValoresSede {
  nombre: string;
  direccion: string;
  horarios: string;
  codigoPais: string;
  numero: string;
  contactoEmail: string;
  descripcionBienvenida: string;
}

export const VALORES_SEDE_VACIOS: ValoresSede = {
  nombre: '',
  direccion: '',
  horarios: '',
  codigoPais: '+54',
  numero: '',
  contactoEmail: '',
  descripcionBienvenida: '',
};

/** H-52: valores iniciales del formulario de edición a partir de una Sede ya cargada. */
export function sedeAValoresFormulario(sede: Sede): ValoresSede {
  const match = sede.contactoTelefono?.match(/^(\+\d{1,4})\s*(.*)$/);
  return {
    nombre: sede.nombre,
    direccion: sede.direccion,
    horarios: sede.horarios,
    codigoPais: match?.[1] ?? '+54',
    numero: (match?.[2] ?? '').replace(/\s+/g, ''),
    contactoEmail: sede.contactoEmail ?? '',
    descripcionBienvenida: sede.descripcionBienvenida ?? '',
  };
}

/** Body de POST/PATCH /sedes a partir de ValoresSede. */
export function datosSedeParaEnviar(valores: ValoresSede) {
  return {
    nombre: valores.nombre,
    direccion: valores.direccion,
    horarios: valores.horarios,
    contactoTelefono: valores.numero ? `${valores.codigoPais} ${valores.numero}` : undefined,
    contactoEmail: valores.contactoEmail || undefined,
    descripcionBienvenida: valores.descripcionBienvenida || undefined,
  };
}

/**
 * H-52 (revisión manual ronda 4): campos compartidos por el alta (modal, en
 * sedes/page.tsx) y la edición (sedes/[id]/page.tsx) — antes solo existía el
 * de alta, copiado íntegro hubiera sido la misma duplicación que ya marcó
 * H-49/Principio XI en el selector de tema.
 */
const ETIQUETAS_CAMPO: Record<string, string> = {
  nombre: 'Nombre',
  direccion: 'Dirección',
  horarios: 'Horarios',
  contactoTelefono: 'Teléfono de contacto',
  contactoEmail: 'Email de contacto',
  descripcionBienvenida: 'Descripción para la Bienvenida',
};

const MENSAJE_REQUERIDO = 'Revisá este dato.';

export function FormularioSede({
  valoresIniciales,
  onGuardar,
  enviando,
  textoBoton,
  textoEnviando,
  error,
  erroresCampo,
}: {
  valoresIniciales: ValoresSede;
  onGuardar: (valores: ValoresSede) => void;
  enviando: boolean;
  textoBoton: string;
  textoEnviando: string;
  error?: string | null;
  /** H-50: `{campo, code}` de un 400 de validación — ver `erroresPorCampo` en shared-types. */
  erroresCampo?: ErrorDeCampo[] | null;
}) {
  const [valores, setValores] = useState(valoresIniciales);
  // H-72 (revisión manual ronda 7): un error se limpia al escribir y se
  // revalida al salir del campo — antes horarios era el único campo con
  // algo de esto (a mano, distinto del resto), y nombre/dirección no tenían
  // nada más que el `required` nativo del navegador. Pieza compartida
  // (H-50), usada igual en los seis formularios.
  const validacion = useValidacionCampos();
  // `erroresCampo` (prop, del servidor) se vuelca al estado compartido
  // cuando cambia — comparado por referencia porque el padre arma un array
  // nuevo (o null) en cada intento de envío. Ajuste durante el render
  // (React: "adjusting state when a prop changes"), no en un efecto, que
  // dispararía un render en cascada de más.
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
    nombre: requerido,
    direccion: requerido,
    horarios: {
      esValido: (v: string) => v.trim() !== '' && HORARIOS_SEDE_REGEX.test(v),
      mensaje: mensajeDeCampo('HORARIOS_INVALIDO', ETIQUETAS_CAMPO.horarios),
    } satisfies ValidacionCampo<string>,
    // Opcional — D90/H-30: si se carga un teléfono, tiene que tener código
    // de país; en blanco no es un error (CONTACTO_SEDE_REQUERIDO, si hace
    // falta, lo valida el servidor al enviar).
    contactoTelefono: {
      esValido: (v: { codigoPais: string; numero: string }) =>
        v.numero.trim() === '' || TELEFONO_REGEX.test(`${v.codigoPais} ${v.numero}`),
      mensaje: mensajeDeCampo('CONTACTOTELEFONO_INVALIDO', ETIQUETAS_CAMPO.contactoTelefono),
    } satisfies ValidacionCampo<{ codigoPais: string; numero: string }>,
  };

  function actualizar<K extends keyof ValoresSede>(campo: K, valor: ValoresSede[K]) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(valores);
      }}
      className="flex flex-col gap-3"
    >
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} />
      <div className="flex flex-col gap-1">
        <Input
          id="campo-nombre"
          placeholder="Nombre"
          aria-label={ETIQUETAS_CAMPO.nombre}
          required
          aria-invalid={Boolean(validacion.mensajes.nombre)}
          aria-describedby={validacion.mensajes.nombre ? 'campo-nombre-error' : undefined}
          value={valores.nombre}
          onChange={(e) => {
            actualizar('nombre', e.target.value);
            validacion.limpiar('nombre');
          }}
          onBlur={() => validacion.revalidar('nombre', valores.nombre, validaciones.nombre)}
        />
        <MensajeErrorCampo id="campo-nombre-error" mensaje={validacion.mensajes.nombre} />
      </div>
      <div className="flex flex-col gap-1">
        <Input
          id="campo-direccion"
          placeholder="Dirección"
          aria-label={ETIQUETAS_CAMPO.direccion}
          required
          aria-invalid={Boolean(validacion.mensajes.direccion)}
          aria-describedby={validacion.mensajes.direccion ? 'campo-direccion-error' : undefined}
          value={valores.direccion}
          onChange={(e) => {
            actualizar('direccion', e.target.value);
            validacion.limpiar('direccion');
          }}
          onBlur={() => validacion.revalidar('direccion', valores.direccion, validaciones.direccion)}
        />
        <MensajeErrorCampo id="campo-direccion-error" mensaje={validacion.mensajes.direccion} />
      </div>
      <div className="flex flex-col gap-1">
        <Input
          id="campo-horarios"
          placeholder='Horarios (ej. "Domingos 10:30 hs")'
          aria-label={ETIQUETAS_CAMPO.horarios}
          required
          aria-invalid={Boolean(validacion.mensajes.horarios)}
          aria-describedby={validacion.mensajes.horarios ? 'campo-horarios-error' : undefined}
          value={valores.horarios}
          onChange={(e) => {
            actualizar('horarios', e.target.value);
            validacion.limpiar('horarios');
          }}
          onBlur={() => validacion.revalidar('horarios', valores.horarios, validaciones.horarios)}
        />
        <MensajeErrorCampo id="campo-horarios-error" mensaje={validacion.mensajes.horarios} />
      </div>
      <CampoTelefono
        id="campo-contactoTelefono"
        labelTelefono="Teléfono de contacto (opcional)"
        labelCodigo="Código de país"
        codigoPais={valores.codigoPais}
        numero={valores.numero}
        onChangeCodigo={(v) => {
          actualizar('codigoPais', v);
          validacion.limpiar('contactoTelefono');
        }}
        onChangeNumero={(v) => {
          actualizar('numero', v);
          validacion.limpiar('contactoTelefono');
        }}
        onBlurNumero={() =>
          validacion.revalidar(
            'contactoTelefono',
            { codigoPais: valores.codigoPais, numero: valores.numero },
            validaciones.contactoTelefono,
          )
        }
        requerido={false}
        error={Boolean(validacion.mensajes.contactoTelefono)}
        errorTexto={validacion.mensajes.contactoTelefono}
      />
      <div className="flex flex-col gap-1">
        <Input
          id="campo-contactoEmail"
          placeholder="Email de contacto"
          aria-label={ETIQUETAS_CAMPO.contactoEmail}
          type="email"
          aria-invalid={Boolean(validacion.mensajes.contactoEmail)}
          aria-describedby={validacion.mensajes.contactoEmail ? 'campo-contactoEmail-error' : undefined}
          value={valores.contactoEmail}
          onChange={(e) => {
            actualizar('contactoEmail', e.target.value);
            validacion.limpiar('contactoEmail');
          }}
        />
        <MensajeErrorCampo id="campo-contactoEmail-error" mensaje={validacion.mensajes.contactoEmail} />
      </div>
      <textarea
        id="campo-descripcionBienvenida"
        placeholder="Descripción para la Bienvenida (opcional)"
        aria-label={ETIQUETAS_CAMPO.descripcionBienvenida}
        value={valores.descripcionBienvenida}
        onChange={(e) => actualizar('descripcionBienvenida', e.target.value)}
        className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
      />
      <Button type="submit" loading={enviando} loadingText={textoEnviando} className="w-fit">
        {textoBoton}
      </Button>
    </form>
  );
}
