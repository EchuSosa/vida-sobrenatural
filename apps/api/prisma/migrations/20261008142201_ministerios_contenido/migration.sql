-- spec 009 (docs/22-ministerios.md): línea pública y "requiere formación" del
-- Ministerio, descripción de la Célula (área) y la marca de "Discipulados Vida
-- Nueva" que ofrece el rol discipulador al aprobar. La migración del lote 0 no
-- se edita (specs/IMPLEMENTACION.md §2.1).

-- AlterTable
ALTER TABLE "celulas" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "ofreceRolDiscipulador" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ministerios" ADD COLUMN     "lineaPublica" TEXT,
ADD COLUMN     "requiereFormacion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "postulaciones" ADD COLUMN     "requiereFormacion" BOOLEAN NOT NULL DEFAULT false;

-- spec 009 + docs/22 (contenido real de los Ministerios, 2026-10-08): largos
-- máximos de los textos nuevos (MINISTERIO_LINEA_PUBLICA_MAX y
-- CELULA_DESCRIPCION_MAX de shared-types/ministerios.ts), como el resto de
-- los CHECK de textos (patrón H-140).
ALTER TABLE "ministerios" ADD CONSTRAINT "ministerios_linea_publica_largo"
  CHECK (char_length(coalesce("lineaPublica", '')) <= 140);
ALTER TABLE "celulas" ADD CONSTRAINT "celulas_descripcion_largo"
  CHECK (char_length(coalesce("descripcion", '')) <= 400);
