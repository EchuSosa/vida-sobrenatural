-- CreateTable
CREATE TABLE "palabras_profeticas" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "palabras_profeticas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "libros" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "portadaUrl" TEXT,
    "portadaDescripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "libros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "palabras_profeticas_vigente_idx" ON "palabras_profeticas"("vigente");

-- CreateIndex
CREATE INDEX "libros_orden_idx" ON "libros"("orden");
