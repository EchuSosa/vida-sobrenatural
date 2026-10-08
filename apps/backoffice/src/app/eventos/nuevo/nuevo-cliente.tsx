'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiFetch, type EventoDetalle } from '@vida-sobrenatural/shared-types';
import { ButtonLink, MigaDePan } from '@vida-sobrenatural/ui';
import { FormularioEvento, valoresVacios, type SedeOpcion } from '../formulario-evento';

/**
 * spec 011, T030 — alta de un Evento. Al crear, el detalle abre con el paso
 * siguiente a la vista (QR y flyer, `docs/15` §Backoffice).
 */
export function NuevoEventoCliente({ apiToken, sedes }: { apiToken: string; sedes: SedeOpcion[] }) {
  const t = useTranslations('eventos.gestion');
  const router = useRouter();

  async function crear(datos: object) {
    const creado = await apiFetch<EventoDetalle>('/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify(datos),
    });
    router.push(`/eventos/${creado.id}?creado=1`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/eventos' }, { label: t('nuevo.miga') }]} LinkComponente={Link} />
      <h1 className="text-2xl font-semibold">{t('nuevo.titulo')}</h1>
      <FormularioEvento
        valoresIniciales={valoresVacios(sedes.length === 1 ? sedes[0].id : '')}
        sedes={sedes}
        textoBoton={t('formulario.crear')}
        textoEnviando={t('formulario.creando')}
        enviar={crear}
        accionSecundaria={
          <ButtonLink variant="ghost" render={<Link href="/eventos" />}>
            {t('formulario.cancelarEdicion')}
          </ButtonLink>
        }
      />
    </div>
  );
}
