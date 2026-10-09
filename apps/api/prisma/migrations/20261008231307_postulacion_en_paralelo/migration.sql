-- D217 (docs/22-ministerios.md): "Discipulados Vida Nueva" se sirve en
-- paralelo con cualquier Ministerio. La Postulación guarda su propia marca
-- (copia de `celulas.ofreceRolDiscipulador` al postularse, como
-- `requiereFormacion`): un índice parcial no puede mirar otra tabla.
-- La migración del lote 0 no se edita (specs/IMPLEMENTACION.md §2.1).

-- AlterTable
ALTER TABLE "postulaciones" ADD COLUMN     "enParalelo" BOOLEAN NOT NULL DEFAULT false;

-- Las que ya existen a un área que ofrece el rol discipulador.
UPDATE "postulaciones" p
   SET "enParalelo" = true
  FROM "celulas" c
 WHERE c."id" = p."celulaId" AND c."ofreceRolDiscipulador";

-- La membresía (D170) es una aprobada por Persona sin contar las en paralelo;
-- en paralelo, también una como máximo.
DROP INDEX "postulaciones_una_aprobada";
CREATE UNIQUE INDEX "postulaciones_una_aprobada"
  ON "postulaciones" ("personaId") WHERE "estado" = 'aprobada' AND NOT "enParalelo";
CREATE UNIQUE INDEX "postulaciones_una_aprobada_en_paralelo"
  ON "postulaciones" ("personaId") WHERE "estado" = 'aprobada' AND "enParalelo";
