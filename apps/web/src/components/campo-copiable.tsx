'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@vida-sobrenatural/ui';

/**
 * H-08 (revisión manual, actualización 2026-09-18): alias y CBU de Ofrendas
 * se pueden copiar con un toque, con su aviso de confirmación (matriz de
 * feedback, docs/16-sistemas-transversales.md — "Guardar un cambio simple":
 * toast breve + el cambio visible en pantalla; acá el "cambio" es el
 * portapapeles).
 */
export function CampoCopiable({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const t = useTranslations('dar');

  async function copiar() {
    await navigator.clipboard.writeText(valor);
    toast(t('copiado', { campo: etiqueta }));
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm text-muted-foreground">{etiqueta}</p>
        <p className="font-mono font-medium">{valor}</p>
      </div>
      <Button variant="ghost" size="icon" aria-label={t('copiar', { campo: etiqueta })} onClick={copiar}>
        <Copy className="size-4" />
      </Button>
    </div>
  );
}
