-- D241 (spec 015): una Persona puede servir en hasta 2 Ministerios a la vez,
-- más "Discipulados Vida Nueva" en paralelo (D217). Enmienda D170 / FR-020 de
-- la 009. Un índice parcial no cuenta hasta 2: el máximo lo garantiza el
-- servicio con la Persona bloqueada (`bloquearPersona`, el mismo candado de
-- toda aprobación). La base sigue garantizando lo que sí puede:
--   - una sola aprobada en paralelo (`postulaciones_una_aprobada_en_paralelo`);
--   - nunca dos aprobadas del mismo Ministerio.
DROP INDEX "postulaciones_una_aprobada";
CREATE UNIQUE INDEX "postulaciones_aprobada_por_ministerio"
  ON "postulaciones" ("personaId", "ministerioId") WHERE "estado" = 'aprobada';
