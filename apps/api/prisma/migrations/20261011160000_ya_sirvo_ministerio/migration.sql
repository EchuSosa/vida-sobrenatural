-- spec 015, D243: "Ya sirvo en un ministerio" — las opciones elegidas del listado
-- (el mismo shape que las de la elección) y desde qué año.

-- AlterTable
ALTER TABLE "declaraciones_historial" ADD COLUMN     "desdeAnio" INTEGER;

-- CreateTable
CREATE TABLE "opciones_declaracion_ministerio" (
    "id" TEXT NOT NULL,
    "declaracionId" TEXT NOT NULL,
    "ministerioId" TEXT NOT NULL,
    "celulaId" TEXT,
    "enParalelo" BOOLEAN NOT NULL DEFAULT false,
    "resultado" "ResultadoOpcionEleccion" NOT NULL DEFAULT 'pendiente',
    "postulacionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opciones_declaracion_ministerio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opciones_declaracion_ministerio_postulacionId_key" ON "opciones_declaracion_ministerio"("postulacionId");

-- CreateIndex
CREATE UNIQUE INDEX "opciones_declaracion_ministerio_declaracionId_ministerioId_key" ON "opciones_declaracion_ministerio"("declaracionId", "ministerioId");

-- AddForeignKey
ALTER TABLE "opciones_declaracion_ministerio" ADD CONSTRAINT "opciones_declaracion_ministerio_declaracionId_fkey" FOREIGN KEY ("declaracionId") REFERENCES "declaraciones_historial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_declaracion_ministerio" ADD CONSTRAINT "opciones_declaracion_ministerio_ministerioId_fkey" FOREIGN KEY ("ministerioId") REFERENCES "ministerios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_declaracion_ministerio" ADD CONSTRAINT "opciones_declaracion_ministerio_celulaId_fkey" FOREIGN KEY ("celulaId") REFERENCES "celulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Forma: confirmada ⇔ con su membresía; el año, razonable.
ALTER TABLE "opciones_declaracion_ministerio"
  ADD CONSTRAINT "opciones_declaracion_confirmada" CHECK (("resultado" = 'confirmada') = ("postulacionId" IS NOT NULL));
ALTER TABLE "declaraciones_historial"
  ADD CONSTRAINT "declaraciones_historial_desde_anio" CHECK ("desdeAnio" IS NULL OR "desdeAnio" BETWEEN 1950 AND 2100);
