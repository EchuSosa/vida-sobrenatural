'use client';

import { useMemo, useState } from 'react';
import { type Sede, type ErrorDeCampo, HORARIOS_SEDE_REGEX, mensajeDeCampo } from '@vida-sobrenatural/shared-types';
import { Button, CampoTelefono, Input, ResumenErrores, MensajeErrorCampo } from '@vida-sobrenatural/ui';

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
  const [horariosTocado, setHorariosTocado] = useState(false);

  const horariosValido = valores.horarios === '' || HORARIOS_SEDE_REGEX.test(valores.horarios);

  const mensajesPorCampo = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const { campo, code } of erroresCampo ?? []) {
      mapa[campo] = mensajeDeCampo(code, ETIQUETAS_CAMPO[campo] ?? campo);
    }
    return mapa;
  }, [erroresCampo]);

  const resumenErrores = useMemo(
    () => Object.entries(mensajesPorCampo).map(([campo, mensaje]) => ({ campo, mensaje })),
    [mensajesPorCampo],
  );

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
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <ResumenErrores errores={resumenErrores} />
      <div className="flex flex-col gap-1">
        <Input
          id="campo-nombre"
          placeholder="Nombre"
          required
          aria-invalid={Boolean(mensajesPorCampo.nombre)}
          aria-describedby={mensajesPorCampo.nombre ? 'campo-nombre-error' : undefined}
          value={valores.nombre}
          onChange={(e) => actualizar('nombre', e.target.value)}
        />
        <MensajeErrorCampo id="campo-nombre-error" mensaje={mensajesPorCampo.nombre} />
      </div>
      <div className="flex flex-col gap-1">
        <Input
          id="campo-direccion"
          placeholder="Dirección"
          required
          aria-invalid={Boolean(mensajesPorCampo.direccion)}
          aria-describedby={mensajesPorCampo.direccion ? 'campo-direccion-error' : undefined}
          value={valores.direccion}
          onChange={(e) => actualizar('direccion', e.target.value)}
        />
        <MensajeErrorCampo id="campo-direccion-error" mensaje={mensajesPorCampo.direccion} />
      </div>
      <div className="flex flex-col gap-1">
        <Input
          id="campo-horarios"
          placeholder='Horarios (ej. "Domingos 10:30 hs")'
          required
          aria-invalid={(horariosTocado && !horariosValido) || Boolean(mensajesPorCampo.horarios)}
          aria-describedby={mensajesPorCampo.horarios ? 'campo-horarios-error' : undefined}
          value={valores.horarios}
          onChange={(e) => actualizar('horarios', e.target.value)}
          onBlur={() => setHorariosTocado(true)}
        />
        {mensajesPorCampo.horarios ? (
          <MensajeErrorCampo id="campo-horarios-error" mensaje={mensajesPorCampo.horarios} />
        ) : (
          horariosTocado &&
          !horariosValido && (
            <span className="text-sm text-destructive">
              Formato no reconocido — ej. &quot;Domingos 10:30 hs&quot; o &quot;Domingos 10 hs y Martes 19 hs&quot;.
            </span>
          )
        )}
      </div>
      <CampoTelefono
        id="campo-contactoTelefono"
        labelTelefono="Teléfono de contacto (opcional)"
        labelCodigo="Código de país"
        codigoPais={valores.codigoPais}
        numero={valores.numero}
        onChangeCodigo={(v) => actualizar('codigoPais', v)}
        onChangeNumero={(v) => actualizar('numero', v)}
        requerido={false}
        error={Boolean(mensajesPorCampo.contactoTelefono)}
        errorTexto={mensajesPorCampo.contactoTelefono}
      />
      <div className="flex flex-col gap-1">
        <Input
          id="campo-contactoEmail"
          placeholder="Email de contacto"
          type="email"
          aria-invalid={Boolean(mensajesPorCampo.contactoEmail)}
          aria-describedby={mensajesPorCampo.contactoEmail ? 'campo-contactoEmail-error' : undefined}
          value={valores.contactoEmail}
          onChange={(e) => actualizar('contactoEmail', e.target.value)}
        />
        <MensajeErrorCampo id="campo-contactoEmail-error" mensaje={mensajesPorCampo.contactoEmail} />
      </div>
      <textarea
        id="campo-descripcionBienvenida"
        placeholder="Descripción para la Bienvenida (opcional)"
        value={valores.descripcionBienvenida}
        onChange={(e) => actualizar('descripcionBienvenida', e.target.value)}
        className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
      />
      <Button type="submit" disabled={enviando || !horariosValido} className="w-fit">
        {enviando ? textoEnviando : textoBoton}
      </Button>
    </form>
  );
}
