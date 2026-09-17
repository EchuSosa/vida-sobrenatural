-- CreateEnum
CREATE TYPE "OrigenConsentimiento" AS ENUM ('app', 'presencial');

-- CreateEnum
CREATE TYPE "OrigenAlta" AS ENUM ('autorregistro', 'admin');

-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "altaPor" TEXT,
ADD COLUMN     "consentimientoDatosFecha" TIMESTAMP(3),
ADD COLUMN     "consentimientoDatosOrigen" "OrigenConsentimiento",
ADD COLUMN     "origenAlta" "OrigenAlta" NOT NULL DEFAULT 'autorregistro';
