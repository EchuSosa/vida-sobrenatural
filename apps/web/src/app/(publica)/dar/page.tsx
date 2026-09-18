import { useTranslations } from 'next-intl';
import { CampoCopiable } from '../../../components/campo-copiable';

export const metadata = {
  title: 'Dar — Vida Sobrenatural',
  description: 'Cómo colaborar con las ofrendas de Vida Sobrenatural.',
};

/**
 * H-08 (revisión manual, actualización 2026-09-18): datos reales de Ofrendas
 * de docs/09-notas-identidad-visual.md — versión estática del MVP (D67), sin
 * pasarela de pago. Alias y CBU son copiables (CampoCopiable); el resto son
 * datos de referencia (entidad, CUIT, cuenta) que no hace falta copiar.
 */
export default function DarPage() {
  const t = useTranslations('dar');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      <p className="text-lg leading-7 text-zinc-700 dark:text-zinc-300">
        {t('textoInstitucional')}
      </p>
      <p className="text-zinc-700 dark:text-zinc-300">{t('intro')}</p>

      <div className="flex flex-col gap-3">
        <CampoCopiable etiqueta={t('alias')} valor="IglesiaVS" />
        <CampoCopiable etiqueta={t('cbu')} valor="0720099120000002972718" />
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground">{t('entidad')}</p>
          <p className="font-medium">ISAIAS 61 ASOCIACIÓN CIVIL</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground">{t('cuit')}</p>
          <p className="font-medium">30-71798938-0</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground">{t('cuenta')}</p>
          <p className="font-medium">Cuenta en Pesos 099-029727/1, Banco Santander</p>
        </div>
      </div>
    </div>
  );
}
