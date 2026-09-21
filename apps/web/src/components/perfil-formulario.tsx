'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  type EstadoCivil,
  type Profesion,
  apiFetch,
  ApiError,
  erroresPorCampo,
  mensajeDeCampo,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  CampoTelefono,
  ResumenErrores,
  MensajeErrorCampo,
  useEnvio,
  type ErrorResumen,
} from '@vida-sobrenatural/ui';
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
  const [mensajesPorCampo, setMensajesPorCampo] = useState<Record<string, string>>({});
  const [resumenErrores, setResumenErrores] = useState<ErrorResumen[]>([]);

  const etiquetasCampo: Record<string, string> = {
    telefono: t('campos.numeroTelefono'),
    direccion: t('campos.direccion'),
    estadoCivil: t('campos.estadoCivil'),
    profesion: t('campos.profesion'),
    profesionDetalle: t('campos.profesionDetalle'),
  };

  const { enviando: guardando, ejecutar: guardar } = useEnvio(async () => {
    setMensajesPorCampo({});
    setResumenErrores([]);
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
      const campos = erroresPorCampo(error);
      if (campos) {
        const resumen = campos.map(({ campo, code }) => ({
          campo,
          mensaje: mensajeDeCampo(code, etiquetasCampo[campo] ?? campo),
        }));
        setResumenErrores(resumen);
        setMensajesPorCampo(Object.fromEntries(resumen.map((r) => [r.campo, r.mensaje])));
      } else {
        const mensaje = error instanceof ApiError ? error.message : 'No pudimos guardar tus cambios.';
        toast.error(mensaje);
      }
    }
  });

  return (
    <form
      onSubmit={(e) => {
        // El preventDefault tiene que correr SIEMPRE, no solo cuando el
        // guard de useEnvio deja pasar el envío — si no, un segundo/tercer
        // submit bloqueado por el guard sigue su curso nativo (navegación
        // GET con los campos como query string) en vez de quedar sin efecto.
        e.preventDefault();
        void guardar();
      }}
      className="flex flex-col gap-4"
    >
      <ResumenErrores errores={resumenErrores} />
      <CampoTelefono
        id="campo-telefono"
        labelTelefono={t('campos.numeroTelefono')}
        labelCodigo={t('campos.codigoPais')}
        codigoPais={telefonoCodigoPais}
        numero={telefonoNumero}
        onChangeCodigo={setTelefonoCodigoPais}
        onChangeNumero={setTelefonoNumero}
        error={Boolean(mensajesPorCampo.telefono)}
        errorTexto={mensajesPorCampo.telefono}
      />
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t('campos.direccion')}
        <input
          id="campo-direccion"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          required
          aria-invalid={Boolean(mensajesPorCampo.direccion) || undefined}
          aria-describedby={mensajesPorCampo.direccion ? 'campo-direccion-error' : undefined}
          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm font-normal aria-invalid:border-destructive dark:bg-input/30"
        />
        <MensajeErrorCampo id="campo-direccion-error" mensaje={mensajesPorCampo.direccion} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t('campos.estadoCivil')}
        <select
          id="campo-estadoCivil"
          value={estadoCivil}
          onChange={(e) => setEstadoCivil(e.target.value as EstadoCivil)}
          required
          aria-invalid={Boolean(mensajesPorCampo.estadoCivil) || undefined}
          aria-describedby={mensajesPorCampo.estadoCivil ? 'campo-estadoCivil-error' : undefined}
          className="h-10 rounded-md border border-input bg-transparent px-2 text-sm font-normal aria-invalid:border-destructive dark:bg-input/30"
        >
          {opciones.estadoCivil.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <MensajeErrorCampo id="campo-estadoCivil-error" mensaje={mensajesPorCampo.estadoCivil} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t('campos.profesion')}
        <select
          id="campo-profesion"
          value={profesion}
          onChange={(e) => setProfesion(e.target.value as Profesion)}
          required
          aria-invalid={Boolean(mensajesPorCampo.profesion) || undefined}
          aria-describedby={mensajesPorCampo.profesion ? 'campo-profesion-error' : undefined}
          className="h-10 rounded-md border border-input bg-transparent px-2 text-sm font-normal aria-invalid:border-destructive dark:bg-input/30"
        >
          {opciones.profesion.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <MensajeErrorCampo id="campo-profesion-error" mensaje={mensajesPorCampo.profesion} />
      </label>
      {profesion === 'otro' && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t('campos.profesionDetalle')}
          <input
            id="campo-profesionDetalle"
            value={profesionDetalle}
            onChange={(e) => setProfesionDetalle(e.target.value)}
            required
            aria-invalid={Boolean(mensajesPorCampo.profesionDetalle) || undefined}
            aria-describedby={mensajesPorCampo.profesionDetalle ? 'campo-profesionDetalle-error' : undefined}
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm font-normal aria-invalid:border-destructive dark:bg-input/30"
          />
          <MensajeErrorCampo id="campo-profesionDetalle-error" mensaje={mensajesPorCampo.profesionDetalle} />
        </label>
      )}
      <Button type="submit" loading={guardando} loadingText="Guardando…" className="self-start">
        Guardar cambios
      </Button>
    </form>
  );
}
