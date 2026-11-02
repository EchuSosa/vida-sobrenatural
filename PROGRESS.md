# Progreso

Una línea por ítem terminado (pedido de Echu, 2026-11-01). Lo más nuevo abajo.

- 2026-11-01 · **PR 0 — decisiones del 1/11**: regla "cada historia lleva un e2e del caso de error" en `CLAUDE.md`; E2E de la CI en 2 shards en paralelo; `scripts/preparar-entorno.sh` (entorno nuevo en un comando).
- 2026-11-01 · **Ítem 1 — casos infelices** (#65): e2e de error de API en las 17 acciones principales y doble envío contado; 5 bugs arreglados (sesión `Bearer undefined` en toda la app, Perfil con texto crudo, Sedes sin `role=alert`, "Asignar líder" sin `useEnvio`, toque perdido del registro).
- 2026-11-02 · **Ítem 2 — fallas de docs/24 que llegaron a 3**: hidratación de fechas era bug del producto (hora corrida 3 h con el servidor en UTC; `formatearFechaHora` con zona fija, unitario); arranque en frío cerrado con el fixture `calentarServidor` (#67); DOM duplicado cerrado (#69: React 19.2 retrasa revelar el streaming, arreglo solo en los e2e, medido 18/25 → 0/25 en prod); el 404 de `registro-bienvenida` era `/favicon.ico` (#76).
