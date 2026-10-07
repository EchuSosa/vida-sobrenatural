# Contrato: mail de un aviso importante

Usa `EmailService` y `MensajeEmail` de la spec 007 (`apps/api/src/email/`), sin cambiarlos.

## `plantillaAviso` (`apps/api/src/email/plantillas/aviso.ts`)

```ts
function plantillaAviso(p: {
  asunto: string; titulo: string; parrafos: string[];
  textoBoton: string; url: string; idioma: Idioma;
}): Omit<MensajeEmail, 'para'>;
```

Quien la llama (`EnvioEmailsService`) arma `p`:
- **automática**: textos de `mensajes/<idioma>.json` → `avisos.<evento>` (con `params` interpolados);
  `url = WEB_URL + CATALOGO_AVISOS[evento].destino(params)`.
- **manual**: `asunto = titulo`, `titulo = titulo`, `parrafos = mensaje` partido por líneas en
  blanco, `url = WEB_URL + /avisos/{entregaAppId}`.
- `idioma` = `Persona.idiomaPreferido`; si no hay mensajes en ese idioma, `es` (D84).

## Forma del mail

```text
[logo]

{titulo}

{párrafo 1}
{párrafo 2}

[ {textoBoton} ]          ← un solo botón, ≥ 44 px de alto, URL absoluta

Te escribimos porque es un aviso importante sobre tu camino en la iglesia.
Iglesia Vida Sobrenatural · Calle 23 N°1665, La Plata
```

- HTML: tabla de una columna, estilos en línea, ancho máximo 480 px, fuente del sistema, `lang`,
  colores de `COLORES_EMAIL` (spec 007, research #7) con contraste AA. El logo es una imagen pública
  de la web app (`${WEB_URL}/marca/logo-email.png`, PNG ≤ 20 KB, `alt="Vida Sobrenatural"`).
- Texto plano: lo mismo, con la URL escrita entera en lugar del botón.
- Sin datos personales en el asunto (FR-021, SC-006). El cuerpo puede decir el resultado ("Ya tenés
  Discipulador") pero no motivos ni nombres de otras Personas.
- Sin enlace para "darse de baja": los importantes son transaccionales y no se pueden desactivar en
  el MVP (D96); el pie explica por qué le llega.

## `EnvioEmailsService` (`apps/api/src/notificaciones/envio-emails.service.ts`)

- `procesarPendientes(lote = 20): Promise<{ enviados; reintentos; fallidos }>` — research #5.
- `empujar(): void` — `setImmediate(() => procesarPendientes())`, sin esperar ni propagar errores.
- Tipos de error que guarda en `ultimoError`: `SIN_EMAIL`, `PERSONA_INACTIVA`, `ENVIO_FALLIDO`
  (cualquier excepción de `EmailService`). Al log: `{ entregaId, intento, tipo }`.
