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
export function CampoCopiable({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  const t = useTranslations('dar');

  async function copiar() {
    await navigator.clipboard.writeText(valor);
    toast(t('copiado', { campo: etiqueta }));
  }

  // ajustes-ux #18: "Copiar" con texto visible (un ícono de dos rectángulos
  // no dice "copiar" a todo el mundo), 44 px, a todo el ancho debajo del dato
  // en celular. El nombre accesible sigue nombrando el dato ("Copiar Alias").
  // #20: la etiqueta en 16 px.
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-base text-muted-foreground">{etiqueta}</p>
        <p className="font-mono font-medium [overflow-wrap:anywhere]">{valor}</p>
        {detalle && <p className="text-foreground">{detalle}</p>}
      </div>
      <Button variant="outline" aria-label={t('copiar', { campo: etiqueta })} onClick={copiar} className="w-full sm:w-auto">
        <Copy aria-hidden />
        {t('copiarBoton')}
      </Button>
    </div>
  );
}
