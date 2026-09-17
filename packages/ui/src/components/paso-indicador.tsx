/**
 * Indicador de progreso para formularios largos divididos en pasos (D94,
 * docs/15-guia-ux-ui.md: "Paso 2 de 4"). Reutilizable por cualquier
 * formulario futuro, no solo el registro de specs/001-fase-bienvenida.
 */
export interface PasoIndicadorProps {
  actual: number;
  total: number;
  /** Ya interpolado por el caller (ej. next-intl: t('paso', {actual, total})). */
  etiqueta: string;
  nombrePaso?: string;
}

export function PasoIndicador({ actual, total, etiqueta, nombrePaso }: PasoIndicadorProps) {
  const porcentaje = Math.round((actual / total) * 100);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted-foreground">
        {etiqueta}
        {nombrePaso ? ` — ${nombrePaso}` : null}
      </p>
      <div
        role="progressbar"
        aria-valuenow={actual}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={etiqueta}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
