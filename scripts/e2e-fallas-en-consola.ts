import { test as base, expect, type ConsoleMessage } from '@playwright/test';

/**
 * H-100/H-01 (revisión manual): ni axe ni ninguna otra herramienta agarra
 * una advertencia de consola del navegador — axe audita el DOM resultante,
 * no lo que React o una librería imprimen mientras arma ese DOM. La única
 * señal que tuvimos de H-01 (y de nuevo con H-100) fue alguien leyendo el
 * log a mano. Este `test` extendido hace que un `console.error` del
 * navegador, o una excepción sin atrapar en la página, hagan fallar el
 * test que estaba corriendo — no una regla que alguien tiene que acordarse
 * de seguir (H-61), sino algo que ya corre en cada test de las dos suites.
 *
 * Compartido entre `apps/web` y `apps/backoffice` (Principio XI): cada
 * `e2e/helpers.ts` reexporta este módulo en vez de duplicar el fixture —
 * mismo criterio que `scripts/e2e-base-datos.cjs`.
 *
 * A propósito, solo `console.error` — no `console.warn`. Los warnings de
 * desarrollo de React (ej. dependencias de un efecto) no siempre indican
 * un defecto real, y una suite que falla ante cualquiera de esos enseña a
 * la gente a ignorarla. `console.error` es lo que usan tanto React (errores
 * reales, "act() warnings" que sí importan) como Base UI (ver
 * `@base-ui/utils/createLogOnce`, severity 'error' → `console.error`) — la
 * señal que de verdad queremos.
 */

/**
 * Mensajes de terceros que de verdad no se pueden arreglar desde acá.
 * CADA entrada tiene que decir qué es y por qué se permite — nunca un
 * filtro amplio (ej. "ignorar todo lo que empiece con [WebServer]"): eso
 * convierte esta red en decoración, exactamente lo que H-100 encontró.
 */
const MENSAJES_PERMITIDOS: RegExp[] = [
  // VideoYoutube (apps/web) embebe el reproductor real de YouTube al hacer
  // clic (FR-005/D93) — el propio JS de YouTube, adentro de su iframe,
  // pide la Permissions Policy "compute-pressure" (lectura de presión
  // térmica del dispositivo, para adaptar la reproducción); nuestro iframe
  // no la delega y Chromium lo loguea. No es nuestro código, y agregar
  // "compute-pressure" al `allow` del iframe no cambia nada que nos
  // importe — solo silenciaría este aviso.
  /Permissions policy violation: compute-pressure is not allowed in this document\./,
];

/**
 * `permitirErrorDeConsola`: además de activar la red en cada test (es
 * `auto: true`), es la única función que un test puede llamar para
 * permitir, SOLO en ese test, un mensaje puntual — para cuando el propio
 * test provoca a propósito una respuesta de error (ej. un 400 de
 * validación, un 404 de "esta URL ya no existe") y Chromium loguea sola,
 * sin que nuestro código lo pida, un "Failed to load resource: the server
 * responded with a status of ___". Eso no es un defecto: es el navegador
 * anotando en la consola cualquier respuesta que no sea 2xx, incluida una
 * que el propio test esperaba. Permitirlo con el patrón más angosto
 * posible (nunca "toda respuesta 4xx") evita que la red se vuelva
 * decoración por un filtro ancho, sin obligar a cada test que ejercita un
 * camino de error a propósito a fallar por algo que no eligió causar.
 */
/**
 * docs/24 (2026-11-02, "contenido duplicado"): React 19.2 manda en streaming el contenido de cada
 * `loading.tsx` dentro de `<div hidden id="S:n">` y lo revela con `$RC`/`$RV`, pero **retrasa la
 * revelación a propósito** (`setTimeout($RV, $RT + 300 - ahora)`, hasta 2,3 s en un caso). En esa
 * ventana conviven la copia oculta y una visible, con los mismos ids. Para quien usa la app no se ve
 * nada (está `hidden`), pero Playwright cuenta los elementos ocultos y su modo estricto falla en el
 * acto, sin reintentar: era el flaky de "resolved to 2 elements" (persona-editar, mi-ministerio,
 * avisos). Reproducido en producción (`next start`): 18 de 25 cargas; con este script, 0 de 25.
 *
 * Solo en los tests: cada vez que llega una parte del streaming (`$RC`), se revela en el acto
 * (`$RV`, que vacía la lista; el `setTimeout` que React deja programado después no hace nada). La
 * app de verdad no cambia.
 */
const REVELAR_STREAMING_YA = `(() => {
  let original;
  Object.defineProperty(window, '$RC', {
    configurable: true,
    get() {
      return original && function (a, b) {
        original(a, b);
        if (Array.isArray(window.$RB) && window.$RB.length && typeof window.$RV === 'function') window.$RV(window.$RB);
      };
    },
    set(fn) { original = fn; },
  });
})();`;

export const test = base.extend<{
  permitirErrorDeConsola: (patron: RegExp) => void;
}>({
  context: async ({ context }, use) => {
    await context.addInitScript({ content: REVELAR_STREAMING_YA });
    await use(context);
  },
  permitirErrorDeConsola: [
    async ({ page }, use) => {
      const permitidosDeEsteTest: RegExp[] = [];
      const errores: string[] = [];

      const estaPermitido = (texto: string) =>
        MENSAJES_PERMITIDOS.some((patron) => patron.test(texto)) ||
        permitidosDeEsteTest.some((patron) => patron.test(texto));

      const alMensajeDeConsola = (mensaje: ConsoleMessage) => {
        if (mensaje.type() !== 'error') return;
        const texto = mensaje.text();
        if (estaPermitido(texto)) return;
        errores.push(`[console.error] ${texto}`);
      };
      const alErrorDePagina = (error: Error) => {
        if (estaPermitido(error.message)) return;
        errores.push(`[excepción sin atrapar] ${error.message}`);
      };

      page.on('console', alMensajeDeConsola);
      page.on('pageerror', alErrorDePagina);

      await use((patron) => permitidosDeEsteTest.push(patron));

      page.off('console', alMensajeDeConsola);
      page.off('pageerror', alErrorDePagina);

      expect(
        errores,
        'La página emitió error(es) de consola o una excepción sin atrapar durante este test (H-100/H-01).',
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
