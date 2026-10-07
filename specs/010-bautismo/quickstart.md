# Quickstart: validar Bautismo (spec 010)

Guía de verificación, no de implementación. Cómo levantar todo: `specs/revision-manual/COMO-ARRANCAR.md`.
Puertos fijos (D104): web 3001, backoffice 3002, API 3333.

## Prerrequisitos

- La spec 011 mergeada (Eventos de bautismo, `contracts/dependencia-evento.md`, E1–E9).
- `pnpm --filter api exec prisma migrate dev` aplicado y `packages/shared-types` reconstruido (H-33).
- `pnpm --filter api run db:seed-demo` para tener una Persona en cada estado.

## Recorrido manual

1. **Pedir.** Entrar a la web app con la Persona demo "con Vida Nueva en curso" → Mi camino → card
   Bautismo → "Quiero bautizarme" → confirmar. La card dice "Recibimos tu pedido…". (Historia 1)
2. **Sin habilitar.** Con la Persona demo "sin Vida Nueva": la card explica la regla y enlaza a Vida
   Nueva, sin botón. (FR-002)
3. **Aceptar.** Backoffice como Admin → Solicitudes → filtro "Bautismo" → abrir el pedido → Aceptar.
   La Persona ve "Aceptamos tu pedido, te avisamos la próxima fecha". (Historia 2, D147)
4. **Asignar.** Backoffice → Eventos → el Evento de bautismo próximo → "Esperando fecha" → tildar
   dos → "Sumar al bautismo". Cada Persona ve fecha, hora y lugar en su card. (Historia 3)
5. **No puedo ese día.** Desde la card con fecha → "No puedo ese día" → confirmar (diálogo neutro).
   El Admin la ve otra vez en "Esperando fecha". (FR-020a)
6. **Cancelar el Evento** (spec 011): las asignadas vuelven a "Esperando fecha". (FR-016)
7. **Confirmar.** En el Evento pasado de la demo → "Confirmar bautismos" → destildar uno →
   confirmar. Las tildadas ven "Te bautizaste el …"; la destildada, "esperando fecha". (Historia 7)
8. **Habilitar y en nombre de.** Personas → una sin Vida Nueva → "Habilitar el bautismo"; y desde
   Solicitudes → "Nueva solicitud en nombre de…" → tipo Bautismo. (Historia 5)
9. **Pastor.** Entrar como Pastor: bandeja, detalle y sección del Evento, sin ningún botón de acción.

## Suites (las tres en verde antes de cerrar, CLAUDE.md)

```bash
pnpm --filter api run test        # unit: estadoCardBautismo, motivoNoPuedePedir, transiciones, eventos
pnpm --filter api run test:e2e    # integración: pedir, carreras, asignar, cancelar, confirmar, bandeja
pnpm --filter web run test:e2e    # card de Bautismo, axe claro/oscuro, @celular
pnpm --filter backoffice run test:e2e  # bandeja, detalle, sección del Evento, habilitar, Pastor
```

Resultado esperado: todo verde; axe sin violaciones en los dos temas; los e2e `@celular` de la card
sin scroll horizontal y con botones de 44 px.
