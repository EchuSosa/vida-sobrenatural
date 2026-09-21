'use client';

import { useState } from 'react';
import { type Sede, HORARIOS_SEDE_REGEX } from '@vida-sobrenatural/shared-types';
import { Button, CampoTelefono, Input } from '@vida-sobrenatural/ui';

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
export function FormularioSede({
  valoresIniciales,
  onGuardar,
  enviando,
  textoBoton,
  textoEnviando,
  error,
}: {
  valoresIniciales: ValoresSede;
  onGuardar: (valores: ValoresSede) => void;
  enviando: boolean;
  textoBoton: string;
  textoEnviando: string;
  error?: string | null;
}) {
  const [valores, setValores] = useState(valoresIniciales);
  const [horariosTocado, setHorariosTocado] = useState(false);

  const horariosValido = valores.horarios === '' || HORARIOS_SEDE_REGEX.test(valores.horarios);

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
      <Input
        placeholder="Nombre"
        required
        value={valores.nombre}
        onChange={(e) => actualizar('nombre', e.target.value)}
      />
      <Input
        placeholder="Dirección"
        required
        value={valores.direccion}
        onChange={(e) => actualizar('direccion', e.target.value)}
      />
      <div className="flex flex-col gap-1">
        <Input
          placeholder='Horarios (ej. "Domingos 10:30 hs")'
          required
          aria-invalid={horariosTocado && !horariosValido}
          value={valores.horarios}
          onChange={(e) => actualizar('horarios', e.target.value)}
          onBlur={() => setHorariosTocado(true)}
        />
        {horariosTocado && !horariosValido && (
          <span className="text-sm text-destructive">
            Formato no reconocido — ej. &quot;Domingos 10:30 hs&quot; o &quot;Domingos 10 hs y Martes 19 hs&quot;.
          </span>
        )}
      </div>
      <CampoTelefono
        labelTelefono="Teléfono de contacto (opcional)"
        labelCodigo="Código de país"
        codigoPais={valores.codigoPais}
        numero={valores.numero}
        onChangeCodigo={(v) => actualizar('codigoPais', v)}
        onChangeNumero={(v) => actualizar('numero', v)}
        requerido={false}
      />
      <Input
        placeholder="Email de contacto"
        type="email"
        value={valores.contactoEmail}
        onChange={(e) => actualizar('contactoEmail', e.target.value)}
      />
      <textarea
        placeholder="Descripción para la Bienvenida (opcional)"
        value={valores.descripcionBienvenida}
        onChange={(e) => actualizar('descripcionBienvenida', e.target.value)}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <Button type="submit" disabled={enviando || !horariosValido} className="w-fit">
        {enviando ? textoEnviando : textoBoton}
      </Button>
    </form>
  );
}
