-- CreateEnum
CREATE TYPE "TipoRelacionFamiliar" AS ENUM ('tutor', 'conyuge', 'hijo_a', 'padre_madre', 'hermano_a');

-- AlterTable
ALTER TABLE "personas" ALTER COLUMN "temaPreferido" SET DEFAULT 'claro';

-- DataMigration (H-22, D106): nadie eligió "sistema" explícitamente todavía
-- (era el default viejo, no una preferencia real) — se migra a "claro".
-- Válido solo antes del lanzamiento; después de esto, "sistema" pasa a ser
-- una elección real que no debe tocarse.
UPDATE "personas" SET "temaPreferido" = 'claro' WHERE "temaPreferido" = 'sistema';

-- CreateTable
CREATE TABLE "relaciones_familiares" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "familiarId" TEXT NOT NULL,
    "tipoRelacion" "TipoRelacionFamiliar" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relaciones_familiares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "relaciones_familiares_personaId_familiarId_tipoRelacion_key" ON "relaciones_familiares"("personaId", "familiarId", "tipoRelacion");

-- AddForeignKey
ALTER TABLE "relaciones_familiares" ADD CONSTRAINT "relaciones_familiares_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relaciones_familiares" ADD CONSTRAINT "relaciones_familiares_familiarId_fkey" FOREIGN KEY ("familiarId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
