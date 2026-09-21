import { getTranslations } from 'next-intl/server';
import type { useTranslations } from 'next-intl';
import type { Sede } from '@vida-sobrenatural/shared-types';
import { ChurchJsonLd } from '../../../components/church-json-ld';

export const metadata = {
  title: 'Visitanos — Vida Sobrenatural',
  description: 'Dirección, horarios y contacto de Vida Sobrenatural.',
};

async function getSedesActivas(): Promise<Sede[]> {
  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3333';
  const response = await fetch(`${baseUrl}/sedes`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`GET /sedes respondió ${response.status}`);
  }
  return response.json();
}

function SedeCard({ sede, t }: { sede: Sede; t: ReturnType<typeof useTranslations> }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border p-5">
      <h2 className="text-xl font-medium">{sede.nombre}</h2>
      <p className="text-foreground">{sede.direccion}</p>
      <p className="text-foreground">{sede.horarios}</p>
      {sede.contactoTelefono && (
        <p className="text-foreground">
          {t('telefono')} {sede.contactoTelefono}
        </p>
      )}
      {sede.contactoEmail && (
        <p className="text-foreground">
          {t('email')} {sede.contactoEmail}
        </p>
      )}
      {sede.descripcionBienvenida && (
        <p className="mt-2 text-muted-foreground">{sede.descripcionBienvenida}</p>
      )}
    </article>
  );
}

export default async function VisitanosPage() {
  const sedes = await getSedesActivas();
  const t = await getTranslations('visitanos');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>

      {sedes.length === 0 && (
        // Edge case del spec 001: todavía no hay ninguna Sede cargada por el Admin.
        <p className="text-muted-foreground">{t('sinSedes')}</p>
      )}

      {/* FR-002/FR-003 (spec 001): una única Sede activa se muestra directamente, sin selección. */}
      {sedes.length === 1 && (
        <>
          <ChurchJsonLd sede={sedes[0]} />
          <SedeCard sede={sedes[0]} t={t} />
        </>
      )}

      {/* FR-004 (spec 001): más de una Sede activa — el Visitante identifica la suya. */}
      {sedes.length > 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground">{t('elegirSede')}</p>
          {sedes.map((sede) => (
            <SedeCard key={sede.id} sede={sede} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
