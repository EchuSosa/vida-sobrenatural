# Lighthouse — Nosotros y sus subpáginas (T061, H-45)

**Cuándo**: 2026-09-21, contra un build de producción (`pnpm --filter web run build && pnpm --filter web run start`, puerto 3001) — no contra el dev server, cuyos números no son representativos (sin minificar, con overhead de HMR).

**Cómo**: `lighthouse` CLI 13.5.0, `--form-factor=mobile --screenEmulation.mobile --throttling-method=simulate` (perfil por defecto de Lighthouse para "celular": CPU 4x slowdown, red Slow 4G simulada — mismo perfil que mide el Core Web Vitals de campo de Chrome para tráfico mobile). Categoría `performance` únicamente.

**Metas** (`.specify/memory/constitution.md`, docs/13-requisitos-no-funcionales.md): LCP < 2.5 s, INP < 200 ms, CLS < 0.1, medidas en celular. Lighthouse no mide INP directamente (es una métrica de campo, no de laboratorio) — se usa el Total Blocking Time (TBT) como proxy de laboratorio ya establecido para esa meta.

## Resultados

| Ruta | LCP | TBT (proxy de INP) | CLS | Nota |
|---|---|---|---|---|
| `/nosotros` (entrada) | 5.97 s | 23 ms | 0.000 | |
| `/nosotros/quienes-somos` | 3.62 s | 21 ms | 0.000 | |
| `/nosotros/vision-mision-valores` | 3.62 s | 20 ms | 0.000 | |
| `/nosotros/liderazgo` | 4.40 s | 23 ms | 0.000 | |
| `/nosotros/en-que-creemos` | 4.14 s | 20 ms | 0.000 | |
| `/nosotros/palabra-profetica` | 5.04 s | 22 ms | 0.073 | |
| `/nosotros/ediciones-vs` | 5.19 s | 22 ms | 0.000 | |

**TBT y CLS cumplen la meta en las siete páginas.** LCP no la cumple en ninguna — entre 1.1 s y 3.5 s por encima de los 2.5 s.

## Por qué (LCP)

El desglose de Lighthouse (`lcp-breakdown-insight`) descompone el LCP simulado de la entrada de
Nosotros en Time to First Byte (10.9 ms, servido casi instantáneo — no es un problema del servidor
ni de la base de datos) más "element render delay" (~890 ms, en la traza sin acelerar). La brecha
entre eso y los 5.97 s simulados es el tiempo de red simulado (Slow 4G) para bajar el JS de
hidratación de la app (Next.js + Sentry + next-auth + next-intl del lado del cliente) antes de que
el navegador pueda pintar el elemento — el elemento de LCP en todas las páginas es texto simple
(un párrafo), no una imagen pesada ni un recurso propio de esta spec.

**No es específico de D122 ni de la Historia 5**: las siete páginas —con y sin las tarjetas nuevas,
con y sin la marca de agua del placeholder— muestran el mismo patrón, con la misma causa raíz
(peso del bundle de cliente que ya traía la app antes de esta spec). Corresponde a un lote de
optimización de performance aparte, no a un cambio puntual de esta spec — queda documentado acá
como la primera medición real de estas metas (H-45: "nadie las midió nunca"), no arreglado en este
tramo.
