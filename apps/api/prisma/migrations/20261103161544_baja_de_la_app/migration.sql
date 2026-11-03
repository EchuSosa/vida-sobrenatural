-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "dadaDeBajaEn" TIMESTAMP(3),
ADD COLUMN     "dadaDeBajaPorId" TEXT,
ADD COLUMN     "motivoBajaInterno" VARCHAR(200);

-- CreateTable
CREATE TABLE "archivos_pendientes_de_borrar" (
    "id" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_pendientes_de_borrar_pkey" PRIMARY KEY ("id")
);

