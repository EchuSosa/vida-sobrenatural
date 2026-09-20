'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import type { Sede, ErrorCode } from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  CampoTelefono,
  ConfirmDestructiveDialog,
  Input,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '../../lib/api-client';

// H-30: no se importa como valor desde @vida-sobrenatural/shared-types acá
// — ver la nota larga junto a HORARIOS_SEDE_REGEX en
// packages/shared-types/src/sede.ts (rompe en runtime: ese paquete no tiene
// build propio y sus re-exports con extensión .js, necesarios para el
// type-check nodenext de apps/api, no resuelven bajo webpack). Mismo valor
// que ahí y que apps/api/src/sede/dto/crear-sede.dto.ts — si uno cambia,
// cambiar los tres.
const GRUPO_HORARIO = '[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ \\d{1,2}(?::\\d{2})? hs\\.?';
const HORARIOS_SEDE_REGEX = new RegExp(`^${GRUPO_HORARIO}(?: y ${GRUPO_HORARIO}|, ${GRUPO_HORARIO})*$`);

/**
 * H-30 (revisión manual, actualización 2026-09-20, D38/D90/D102): desactivar
 * pide confirmación (o, si es la única Sede activa, la bloquea con un
 * diálogo informativo); horarios y teléfono pasan a validarse.
 */
export default function SedesPage() {
  const { data: session, status } = useSession();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [avisoUnicaActiva, setAvisoUnicaActiva] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const te = useTranslations('errors');

  const cargarSedes = useCallback(async () => {
    try {
      setSedes(await apiFetch<Sede[]>('/sedes'));
    } catch {
      // GET /sedes es público — un fallo acá es de red, no de permisos.
    }
  }, []);

  useEffect(() => {
    async function ejecutar() {
      await cargarSedes();
    }
    ejecutar();
  }, [cargarSedes]);

  async function desactivar(id: string) {
    setError(null);
    setSinPermiso(false);
    try {
      await apiFetch(`/sedes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify({ activo: false }),
      });
      toast('Sede desactivada.');
      await cargarSedes();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SIN_PERMISO') {
        setSinPermiso(true);
        return;
      }
      if (e instanceof ApiError && e.code === 'SEDE_UNICA_ACTIVA') {
        setAvisoUnicaActiva(true);
        return;
      }
      setError(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos desactivar la Sede.');
    }
  }

  if (status === 'loading') {
    return <main className="mx-auto max-w-3xl px-4 py-16">Cargando…</main>;
  }

  if (status === 'unauthenticated') {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Gestión de Sede</h1>
        <Button onClick={() => signIn('google')}>Continuar con Google</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Gestión de Sede</h1>

      {sinPermiso && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Tu usuario no tiene rol Admin — no podés crear ni editar Sedes.
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Sedes activas</h2>
        {sedes.length === 0 && <p className="text-zinc-500">Todavía no hay Sedes cargadas.</p>}
        {sedes.map((sede) => (
          <article key={sede.id} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium">{sede.nombre}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{sede.direccion}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{sede.horarios}</p>
            <div className="mt-2">
              {sedes.length === 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setAvisoUnicaActiva(true)}
                >
                  Desactivar
                </Button>
              ) : (
                <ConfirmDestructiveDialog
                  trigger={
                    <Button variant="outline" size="sm" className="text-destructive">
                      Desactivar
                    </Button>
                  }
                  titulo={`¿Desactivar la Sede ${sede.nombre}?`}
                  descripcion="Deja de mostrarse en Visitanos y en el registro. No se borra nada: las personas asociadas siguen igual y podés volver a activarla cuando quieras."
                  textoConfirmar="Sí, desactivar"
                  textoCancelar="Volver"
                  onConfirmar={() => desactivar(sede.id)}
                />
              )}
            </div>
          </article>
        ))}
      </section>

      <AlertDialog open={avisoUnicaActiva} onOpenChange={setAvisoUnicaActiva}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Necesitás al menos una Sede activa</AlertDialogTitle>
            <AlertDialogDescription>{te('SEDE_UNICA_ACTIVA')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setAvisoUnicaActiva(false);
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Crear una Sede
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section ref={formRef} className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Crear nueva Sede</h2>
        <FormularioSede apiToken={session?.apiToken} onCreada={cargarSedes} />
      </section>
    </main>
  );
}

function FormularioSede({ apiToken, onCreada }: { apiToken: string | undefined; onCreada: () => Promise<void> }) {
  const te = useTranslations('errors');
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [horarios, setHorarios] = useState('');
  const [horariosTocado, setHorariosTocado] = useState(false);
  const [codigoPais, setCodigoPais] = useState('+54');
  const [numero, setNumero] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');
  const [descripcionBienvenida, setDescripcionBienvenida] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const horariosValido = horarios === '' || HORARIOS_SEDE_REGEX.test(horarios);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await apiFetch('/sedes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({
          nombre,
          direccion,
          horarios,
          contactoTelefono: numero ? `${codigoPais} ${numero}` : undefined,
          contactoEmail: contactoEmail || undefined,
          descripcionBienvenida: descripcionBienvenida || undefined,
        }),
      });
      toast('Sede creada.');
      setNombre('');
      setDireccion('');
      setHorarios('');
      setHorariosTocado(false);
      setNumero('');
      setContactoEmail('');
      setDescripcionBienvenida('');
      await onCreada();
    } catch (e) {
      setError(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos crear la Sede.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <Input placeholder="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <Input placeholder="Dirección" required value={direccion} onChange={(e) => setDireccion(e.target.value)} />
      <div className="flex flex-col gap-1">
        <Input
          placeholder='Horarios (ej. "Domingos 10:30 hs")'
          required
          aria-invalid={horariosTocado && !horariosValido}
          value={horarios}
          onChange={(e) => setHorarios(e.target.value)}
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
        codigoPais={codigoPais}
        numero={numero}
        onChangeCodigo={setCodigoPais}
        onChangeNumero={setNumero}
        requerido={false}
      />
      <Input
        placeholder="Email de contacto"
        type="email"
        value={contactoEmail}
        onChange={(e) => setContactoEmail(e.target.value)}
      />
      <textarea
        placeholder="Descripción para la Bienvenida (opcional)"
        value={descripcionBienvenida}
        onChange={(e) => setDescripcionBienvenida(e.target.value)}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <Button type="submit" disabled={enviando || !horariosValido} className="w-fit">
        {enviando ? 'Creando…' : 'Crear Sede'}
      </Button>
    </form>
  );
}
