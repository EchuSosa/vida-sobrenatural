-- D218: WhatsApp de Secretaría de la Sede (opcional). Se guarda normalizado
-- para wa.me: 549 + característica + número (10 dígitos, sin 0 ni 15).
ALTER TABLE "sedes" ADD COLUMN "whatsappSecretaria" TEXT;

ALTER TABLE "sedes" ADD CONSTRAINT "sedes_whatsapp_secretaria_normalizado"
  CHECK ("whatsappSecretaria" IS NULL OR "whatsappSecretaria" ~ '^549[123][0-9]{9}$');
