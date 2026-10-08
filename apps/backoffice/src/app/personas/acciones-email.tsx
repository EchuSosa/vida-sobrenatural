'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { MailPlus, UserX } from 'lucide-react';
import { ApiError, apiFetch, erroresPorCampo } from '@vida-sobrenatural/shared-types';
import {
  Button,
  Input,
  MensajeErrorCampo,
  ResumenErrores,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useEnvio,
  useValidacionCampos,
} from '@vida-sobrenatural/ui';

/** spec 006, FR-037 (D81): "Sin acceso a la app", con ícono y texto. */
export function SinAccesoALaApp() {
  const t = useTranslations('personasAlta');
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-md border border-border px-2 py-0.5 text-sm text-muted-foreground">
      <UserX aria-hidden className="size-4 shrink-0" />
      {t('sinAcceso')}
    </span>
  );
}

/**
 * spec 006, T080 (FR-037, FR-039): "Agregar email" a quien no tiene, desde la
 * fila de Personas. Errores debajo del campo y en el resumen (H-50), envío
 * protegido (H-57). Solo con `personas.editar_email` (lo decide quien lo monta).
 */
export function AgregarEmail({ personaId, nombre, apiToken }: { personaId: string; nombre: string; apiToken: string }) {
  const t = useTranslations('personasAlta.agregarEmail');
  const te = useTranslations('errors');
  const tc = useTranslations('comun');
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState('');
  const validacion = useValidacionCampos();

  const { enviando, ejecutar } = useEnvio(async () => {
    if (!email.trim()) {
      validacion.reemplazar({ email: te('campos.EMAIL_INVALIDO') });
      return;
    }
    try {
      await apiFetch(`/personas/${personaId}/email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ email }),
      });
      toast.success(t('listo', { nombre }));
      setAbierto(false);
      router.refresh();
    } catch (error) {
      const campos = erroresPorCampo(error);
      if (campos) {
        validacion.reemplazar(
          Object.fromEntries(
            campos.map(({ campo, code }) => [campo, te.has(`campos.${code}`) ? te(`campos.${code}`) : te.has(code) ? te(code) : t('errorGenerico')]),
          ),
        );
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
      router.refresh();
    }
  });

  return (
    <Sheet
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor);
        if (!valor) {
          setEmail('');
          validacion.reset();
        }
      }}
    >
      <Button type="button" variant="outline" size="sm" className="max-sm:h-11 w-fit" onClick={() => setAbierto(true)} aria-label={t('botonDe', { nombre })}>
        <MailPlus aria-hidden />
        {t('boton')}
      </Button>
      <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')}>
        <form
          noValidate
          className="flex h-full flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void ejecutar();
          }}
        >
          <SheetHeader>
            <SheetTitle>{t('titulo', { nombre })}</SheetTitle>
            <SheetDescription>{t('descripcion')}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 px-4">
            <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />
            <label htmlFor="campo-email" className="text-sm font-medium">
              {t('etiqueta')}
            </label>
            <Input
              id="campo-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validacion.limpiar('email');
              }}
              aria-invalid={Boolean(validacion.mensajes.email) || undefined}
              aria-describedby={validacion.mensajes.email ? 'campo-email-error' : undefined}
              className="h-11"
            />
            <MensajeErrorCampo id="campo-email-error" mensaje={validacion.mensajes.email} />
          </div>
          <SheetFooter>
            <Button type="submit" loading={enviando} loadingText={t('guardando')} className="h-11">
              {t('guardar')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
