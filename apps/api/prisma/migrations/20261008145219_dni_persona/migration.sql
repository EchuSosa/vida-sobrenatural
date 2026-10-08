-- D215: DNI opcional de la Persona, cargado solo por el Admin.
ALTER TABLE "personas" ADD COLUMN "dni" TEXT;

-- Solo dígitos, 7 u 8 (se guarda sin puntos: `normalizarDni`, shared-types).
ALTER TABLE "personas" ADD CONSTRAINT "personas_dni_formato" CHECK ("dni" IS NULL OR "dni" ~ '^[0-9]{7,8}$');

-- Único entre todas las Personas, activas o no; quienes no lo tienen no chocan.
CREATE UNIQUE INDEX "personas_dni_key" ON "personas"("dni") WHERE "dni" IS NOT NULL;
