-- CreateEnum
CREATE TYPE "Profesion" AS ENUM ('salud', 'educacion', 'tecnologia_ingenieria', 'comercio_ventas', 'oficios_construccion', 'administracion_finanzas', 'legal', 'comunicacion_marketing', 'arte_diseno', 'servicios_gastronomia', 'transporte', 'estudiante', 'ama_de_casa', 'jubilado_a', 'sin_ocupacion', 'otro');

-- AlterTable: profesion pasa de texto libre a categorías. Los valores
-- existentes (texto libre) se preservan en profesionDetalle y la categoría
-- se marca como 'otro', en vez de perderse.
ALTER TABLE "personas" ADD COLUMN     "profesionDetalle" TEXT;
UPDATE "personas" SET "profesionDetalle" = "profesion";
ALTER TABLE "personas" ADD COLUMN     "profesion_new" "Profesion";
UPDATE "personas" SET "profesion_new" = 'otro';
ALTER TABLE "personas" DROP COLUMN "profesion";
ALTER TABLE "personas" RENAME COLUMN "profesion_new" TO "profesion";
ALTER TABLE "personas" ALTER COLUMN "profesion" SET NOT NULL;
