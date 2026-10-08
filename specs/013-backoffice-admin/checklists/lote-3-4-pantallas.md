# Checklist de pantallas — lotes 3 y 4 (T044, T054)

Verificación contra el "Checklist por pantalla" de `docs/15-guia-ux-ui.md` (D114) y D150. Cómo: a mano
(pantalla levantada con el seed demo, 1280 y 360 px, claro y oscuro, Admin y Pastor) y con los e2e
`inicio.spec.ts` y `cumpleanos.spec.ts` (axe en los dos temas).

## `/` (Inicio) — T044

- [x] **Una sola acción principal:** el Inicio no tiene acciones propias; cada línea es un enlace a la
  pantalla donde se actúa (la bandeja filtrada por tipo, Pendientes de tutor, el mes de cumpleaños).
- [x] **Cuatro estados, por bloque (D209):** cada bloque ("Esperan una respuesta", "Cumpleaños de esta
  semana", "Cómo está la iglesia") pide sus datos solo y tiene su esqueleto (`role="status"` con nombre),
  su vacío ("No hay nada esperando una respuesta.", "Nadie cumple años esta semana.", "Todavía no hay
  Personas activas para contar.") y su error con "Reintentar" que no tumba a los otros (e2e H3.6). La
  tarjeta Pendientes de la 004 sigue con su propio estado de error.
- [x] **Sin "NaN":** porcentaje con total 0 = 0 (`porcentaje()`, e2e H3.4); la barra recorta NaN.
- [x] **Tono:** "Esperan una respuesta", "5 de Vida Nueva", "Desde cuándo vienen" con la ayuda "Contado
  desde el año en que cada Persona empezó a venir." (D214).
- [x] **Celular:** a 360 px sin scroll horizontal (e2e `@celular`); los bloques se apilan; enlaces de
  44 px de alto.
- [x] **Teclado y lector:** cada bloque es una `section` con su `h2`; las métricas son tablas reales
  con `caption` y encabezados de fila; cantidad y porcentaje en texto, la barra es `aria-hidden` (D81);
  la Sede inactiva dice "Inactiva" con ícono.
- [x] **Contraste claro y oscuro:** axe sin violaciones; la barra usa `--primary` sobre `--muted`.
- [x] **Pastor:** ve lo mismo sin ninguna acción (e2e).

## `/cumpleanos` — T054

- [x] **Una sola acción principal:** no tiene; cada teléfono es un enlace `tel:` para saludar.
- [x] **Cuatro estados:** `loading.tsx`, `error.tsx` con código y "Reintentar", vacío "Nadie cumple años
  en <mes>.", tabla. `?mes=` o `?pagina=` inválidos → redirect (e2e).
- [x] **Navegación:** los doce meses son enlaces reales con `aria-current="page"` en el elegido (marcado
  también con borde y negrita, no solo color); paginado de a 50 con `Paginacion`.
- [x] **Tono:** "Cumple 34", "Cumplió 34" (meses que ya pasaron, H4.4), "Hoy" con ícono de torta.
- [x] **Celular:** a 360 px sin scroll; el teléfono pasa debajo del nombre con 44 px de alto (medido).
- [x] **Datos incompletos:** una Persona sin teléfono dice "Sin teléfono" (nunca un enlace vacío).
- [x] **Contraste claro y oscuro:** axe sin violaciones.

## Observaciones

1. "Hoy" lo decide la API con la fecha civil de Argentina; el e2e no puede mover ese reloj con
   `page.clock` (es del navegador), así que H4.2 y los bordes de mes y de año se prueban en la integración
   con el reloj fijado (`cumpleanos.integration-spec.ts`), y el e2e usa una Persona sembrada que cumple el
   día de la corrida.
