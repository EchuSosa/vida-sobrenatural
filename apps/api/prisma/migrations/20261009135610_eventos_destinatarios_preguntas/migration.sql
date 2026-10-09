-- CreateEnum
CREATE TYPE "GeneroDestinatario" AS ENUM ('todas', 'mujeres', 'varones');

-- CreateEnum
CREATE TYPE "TipoPreguntaEvento" AS ENUM ('si_no', 'opcion', 'texto');

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "destinatariosGenero" "GeneroDestinatario" NOT NULL DEFAULT 'todas',
ADD COLUMN     "edadMaxima" INTEGER,
ADD COLUMN     "edadMinima" INTEGER,
ADD COLUMN     "respuestasSensiblesBorradasEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "inscripciones_evento" ADD COLUMN     "fueraDeDestinatarios" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "preguntas_evento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" "TipoPreguntaEvento" NOT NULL,
    "opciones" TEXT[],
    "obligatoria" BOOLEAN NOT NULL DEFAULT false,
    "sensible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preguntas_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestas_pregunta_evento" (
    "id" TEXT NOT NULL,
    "inscripcionId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_pregunta_evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preguntas_evento_eventoId_orden_idx" ON "preguntas_evento"("eventoId", "orden");

-- CreateIndex
CREATE INDEX "respuestas_pregunta_evento_preguntaId_idx" ON "respuestas_pregunta_evento"("preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "respuestas_pregunta_evento_inscripcionId_preguntaId_key" ON "respuestas_pregunta_evento"("inscripcionId", "preguntaId");

-- AddForeignKey
ALTER TABLE "preguntas_evento" ADD CONSTRAINT "preguntas_evento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_pregunta_evento" ADD CONSTRAINT "respuestas_pregunta_evento_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones_evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_pregunta_evento" ADD CONSTRAINT "respuestas_pregunta_evento_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas_evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FR-060: edades razonables y coherentes (la API valida con códigos por campo).
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_edad_minima_rango" CHECK ("edadMinima" IS NULL OR ("edadMinima" >= 0 AND "edadMinima" <= 120));
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_edad_maxima_rango" CHECK ("edadMaxima" IS NULL OR ("edadMaxima" >= 0 AND "edadMaxima" <= 120));
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_edades_ordenadas" CHECK ("edadMinima" IS NULL OR "edadMaxima" IS NULL OR "edadMinima" <= "edadMaxima");
-- FR-064: hasta 200 caracteres por pregunta y por respuesta de texto.
ALTER TABLE "preguntas_evento" ADD CONSTRAINT "preguntas_evento_texto_largo" CHECK (char_length("texto") BETWEEN 1 AND 200);
ALTER TABLE "respuestas_pregunta_evento" ADD CONSTRAINT "respuestas_pregunta_evento_valor_largo" CHECK (char_length("valor") BETWEEN 1 AND 200);
