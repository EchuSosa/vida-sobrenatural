# Contrato: `EmailService` y mail del código de ingreso

## `EmailService` (`apps/api/src/email/`)

```ts
export interface MensajeEmail {
  para: string;      // un solo destinatario
  asunto: string;
  html: string;
  texto: string;     // versión en texto plano, siempre
}

export abstract class EmailService {
  abstract enviar(mensaje: MensajeEmail): Promise<void>; // lanza si el envío falla
}
```

- **`SmtpEmailService`**: nodemailer con `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `SMTP_SEGURO`, `EMAIL_REMITENTE`. Local y e2e: Mailpit (`localhost:1025`). Producción: el
  proveedor que se elija (D140, candidato preferido Resend).
- **`EmailServiceFalso`** (solo tests de la API): guarda los mensajes en un arreglo en memoria.
- Si falta `SMTP_HOST` al arrancar la API, la API **no arranca** (mismo criterio que
  `INTERNAL_API_SECRET`): un servicio de email sin configurar no puede fallar recién cuando alguien
  quiere entrar.
- Nunca escribe en logs el destinatario ni el cuerpo; ante un error, loguea solo el tipo de error.

## Mail del código (texto aprobado en el clarify, FR-017)

Plantilla `plantillaCodigoIngreso({ codigo, minutos }) → MensajeEmail` (sin `para`), textos en
`apps/api/src/email/mensajes/es.json`.

**Asunto**: `Tu código para entrar: {codigo}`

**Cuerpo**:

```text
¡Hola!

Este es tu código para entrar a Vida Sobrenatural:

{codigo}                          ← grande, monoespaciado, fácil de copiar

Escribilo en la pantalla donde lo pediste. Vale por {minutos} minutos y sirve una sola vez.

Si no fuiste vos, ignorá este mail: nadie puede entrar sin este código.

Iglesia Vida Sobrenatural
```

**Reglas**:

- La versión en texto plano dice exactamente lo mismo (FR-017).
- Ningún dato personal: ni nombre, ni si el email está registrado, ni otro dato de la Persona
  (FR-018). El mail es **idéntico** para un email registrado y uno que no lo está.
- Sin enlaces a la app (un mail con un código y un enlace se parece más a un intento de estafa, y
  el código se escribe donde se pidió).
- HTML: tabla de una columna, estilos en línea, ancho máximo 480 px, fuente del sistema, el código
  en 32 px o más con espaciado entre letras. Colores tomados de los tokens del tema claro
  (`COLORES_EMAIL`, research.md #7), con contraste AA medido.
- `lang="es"` en el HTML.
