'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type EstadoCivil, type Profesion, apiFetch, ApiError } from '@vida-sobrenatural/shared-types';
import { Button, CampoTelefono } from '@vida-sobrenatural/ui';
import { useOpcionesRegistro } from '../hooks/use-opciones-registro';

export interface PerfilEditable {
  telefono: string;
  direccion: string;
  estadoCivil: EstadoCivil;
  profesion: Profesion;
  profesionDetalle: string | null;
}

function separarTelefono(telefono: string) {
  const match = telefono.match(/^(\+\d{1,4})\s*(.*)$/);
  return { codigoPais: match?.[1] ?? '+54', numero: (match?.[2] ?? '').replace(/\s+/g, '') };
}

/**
 * H-35 (revisión manual ronda 3, Flujo 11, FR-028/FR-029): self-edit de
 * teléfono, dirección, estado civil y profesión — mismos controles y
 * opciones que el registro (`useOpcionesRegistro`, `CampoTelefono`). No
 * edita `fechaNacimiento` ni `email` (FR-029): esos los cambia un Admin.
 */
export function PerfilFormulario({ perfil }: { perfil: PerfilEditable }) {
  const { data: session } = useSession();
  const t = useTranslations('registro');
  const opciones = useOpcionesRegistro();
  const telefonoInicial = separarTelefono(perfil.telefono);

  const [telefonoCodigoPais, setTelefonoCodigoPais] = useState(telefonoInicial.codigoPais);
  const [telefonoNumero, setTelefonoNumero] = useState(telefonoInicial.numero);
  const [direccion, setDireccion] = useState(perfil.direccion);
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil>(perfil.estadoCivil);
  const [profesion, setProfesion] = useState<Profesion>(perfil.profesion);
  const [profesionDetalle, setProfesionDetalle] = useState(perfil.profesionDetalle ?? '');
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await apiFetch('/personas/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.apiToken}`,
        },
        body: JSON.stringify({
          telefono: `${telefonoCodigoPais}${telefonoNumero}`,
          direccion,
          estadoCivil,
          profesion,
          profesionDetalle: profesion === 'otro' ? profesionDetalle : undefined,
        }),
      });
      toast.success('Guardamos tus cambios.');
    } catch (error) {
      const mensaje = error instanceof ApiError ? error.message : 'No pudimos guardar tus cambios.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <CampoTelefono
        labelTelefono={t('campos.numeroTelefono')}
        labelCodigo={t('campos.codigoPais')}
        codigoPais={telefonoCodigoPais}
        numero={telefonoNumero}
        onChangeCodigo={setTelefonoCodigoPais}
        onChangeNumero={setTelefonoNumero}
      />
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t('campos.direccion')}
        <input
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          required
          className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t('campos.estadoCivil')}
        <select
          value={estadoCivil}
          onChange={(e) => setEstadoCivil(e.target.value as EstadoCivil)}
          required
          className="h-10 rounded-md border border-zinc-300 px-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
        >
          {opciones.estadoCivil.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t('campos.profesion')}
        <select
          value={profesion}
          onChange={(e) => setProfesion(e.target.value as Profesion)}
          required
          className="h-10 rounded-md border border-zinc-300 px-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
        >
          {opciones.profesion.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {profesion === 'otro' && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t('campos.profesionDetalle')}
          <input
            value={profesionDetalle}
            onChange={(e) => setProfesionDetalle(e.target.value)}
            required
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      )}
      <Button type="submit" disabled={guardando} className="self-start">
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
