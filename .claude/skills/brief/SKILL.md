---
name: "brief"
description: "Ejecutar el encargo que dejó el chat de claude.ai en BRIEF.md (raíz del repo): leerlo, hacerlo, y preguntar lo que no esté claro."
argument-hint: "Opcional: una aclaración corta para esta corrida"
user-invocable: true
disable-model-invocation: true
---

# /brief — ejecutar el encargo de BRIEF.md

`BRIEF.md` (raíz del repo, ignorado por git) lo escribe el chat de claude.ai con el que Echu
piensa el proyecto. Es un encargo ya preparado: contexto verificado contra el repo, pasos en
orden, criterio de terminado y en qué momentos frenar a preguntar.

## Cómo se ejecuta

1. Leé `BRIEF.md` completo. Si no existe o está vacío, decilo y no hagas nada.
2. Verificá el estado del repo contra lo que el brief dice (`git status`, `git log -5`, y los
   archivos que nombra). Si algo no coincide, avisá antes de arrancar — no acomodes el brief a
   la realidad sin decirlo.
3. Ejecutá los pasos en orden. Cada paso dice si puede seguir solo o si tiene que frenar y
   preguntar. Cuando frenes, hacé **una** pregunta por mensaje, corta y con una
   recomendación: Echu contesta desde el celular.
4. Todo lo demás lo rigen `CLAUDE.md` y la Constitución: spec primero, una sola fuente de
   verdad, los cuatro estados, tokens, textos por `next-intl`, commits en español, no pushear
   salvo pedido explícito.
5. **Dejá rastro en `BRIEF-ESTADO.md`** (raíz del repo, ignorado por git; creálo si no
   existe, y vaciálo al empezar cada corrida). El chat de claude.ai lo lee para seguir la
   corrida sin que Echu tenga que copiar nada:
   - **Antes de cada pregunta** que le hagas a Echu, agregá al archivo la hora, la pregunta
     completa, las opciones con su explicación y cuál recomendás. Después preguntá.
   - **Después de cada respuesta**, agregá qué eligió.
   - **Al terminar**, agregá el resumen final: qué quedó hecho (commits), qué decidiste solo,
     qué quedó abierto y qué necesita decisión.
   Lo que importe tiene que estar además commiteado en el repo; el archivo es para seguir la
   corrida, no reemplaza a los docs.

Si se pasa un argumento (`/brief <texto>`), es una aclaración de Echu para esta corrida y
tiene prioridad sobre el brief en lo que se contradigan.
