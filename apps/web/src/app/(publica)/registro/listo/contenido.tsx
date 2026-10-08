import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ButtonLink } from '@vida-sobrenatural/ui';

/**
 * ajustes-ux #36: "Ir a Inicio" llevaba a la web pública (`/`) aunque la
 * Persona ya tiene la app — la acción principal ahora la lleva a Mi camino,
 * que es donde sigue (docs/15 "Primer ingreso"). Textos a `next-intl` (D84).
 */
export function ContenidoRegistroListo() {
  const t = useTranslations('registro.listo');
  // Sin <main id="contenido"> propio — (publica)/layout.tsx ya lo provee
  // (H-05, actualización 2026-09-18).
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <p className="text-muted-foreground">{t('texto')}</p>
      {/*
        FR-012: esta pantalla NO enlaza a Vida Nueva, Vida de Servicio ni
        Ministerio — esos pasos pertenecen a fases posteriores del proceso de
        integración. Mi camino sí: es la sección de la app, no una etapa.
      */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink render={<Link href="/mi-camino" />} size="xl">
          {t('irAMiCamino')}
        </ButtonLink>
        <ButtonLink render={<Link href="/primeros-pasos" />} variant="outline" size="xl">
          {t('volverAPrimerosPasos')}
        </ButtonLink>
      </div>
    </div>
  );
}
