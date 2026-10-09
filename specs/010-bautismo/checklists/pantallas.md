# Checklist de pantallas — 010 Bautismo (docs/15, D114)

Tareas T023, T031, T040, T045, T052, T060 y T065. Cada ítem dice cómo se verificó. Lo que no
cumple va a **Observaciones** (no se arregló en silencio).

Verificación: e2e con axe en claro y oscuro (`apps/web/e2e/mi-camino-bautismo.spec.ts`,
`apps/backoffice/e2e/bautismo.spec.ts`, ver el CI del PR), capturas locales a 360 px (web) y
1280 px (backoffice) con el seed demo, y lectura del código.

## Card de Bautismo en Mi camino (web) — T023, T045

- [x] **Una sola acción principal, con verbo concreto**: "Quiero bautizarme" (en `puede_pedir`); en
  `con_fecha`, las dos acciones son secundarias ("No puedo ese día", "Retirar el pedido").
- [x] **Orden de botones**: en los diálogos, "Volver…" a la izquierda y la confirmación a la
  derecha (`DialogoTextoOpcional`, `ConfirmDestructiveDialog`); apilados en celular.
- [x] **Cuatro estados**: cargando = `loading.tsx` de Mi camino; error = `error.tsx` de Mi camino;
  vacío = no aplica (siempre hay un estado de la card); éxito = los 8 estados de FR-019.
- [x] **Reentrada (H-57)**: `useEnvio` en pedir, retirar y "No puedo"; e2e con doble clic en
  confirmar → un solo pedido.
- [x] **Feedback**: toast "Listo: recibimos tu pedido." y la card cambia sin recargar
  (`router.refresh()`); errores de la API por `errors.<code>`.
- [x] **Qué pasa después**: cada estado lo dice ("Cuando lo acepte, te avisamos…", "Te avisamos
  cuando tengamos la próxima fecha", "Si ese día no podés, avisanos…").
- [x] **Tono**: voseo, sin jerga ("aceptamos tu pedido", nunca "aprobada"); el rechazo nunca muestra
  el motivo (D185).
- [x] **Celular / teclado / lector**: 360 px sin scroll horizontal (captura y `sinScrollHorizontal`);
  botones `size="xl"` (44 px, D150) y texto 16 px; íconos `aria-hidden` y siempre con texto (D81);
  el lugar lleva "Lugar:" para el lector.
- [x] **Contraste**: axe en claro y oscuro en cada estado probado; diálogos neutros (D151).
- [x] **Errores por campo (H-50)**: comentario > 500 → mensaje bajo el campo, resumen arriba con
  foco (pieza `DialogoTextoOpcional`).

## Detalle de la Solicitud de Bautismo (backoffice) — T031

- [x] Acción principal "Aceptar" (con la fecha opcional); secundaria "Rechazar".
- [x] Orden de botones: secundaria a la izquierda, principal a la derecha; en celular apilados.
- [x] Cuatro estados: `loading.tsx`, `error.tsx` con "Reintentar" y código, `not-found.tsx`, éxito.
- [x] Reentrada: `useEnvio` en aceptar, asignar y quitar; los demás botones se deshabilitan mientras.
- [x] Feedback: toast con el nombre; `SOLICITUD_BAUTISMO_YA_CAMBIO` se explica y recarga.
- [x] Qué pasa después: la ayuda del selector ("queda esperando y la asignás después desde el
  Evento") y la descripción de cada diálogo.
- [x] Sin Eventos próximos: texto + "Crear un Evento de bautismo" en vez de un selector vacío.
- [x] Pastor: ve todo sin botones (e2e).
- [x] Miga `Solicitudes › {Persona}`.
- [x] Contraste: axe en claro y oscuro (e2e).

## Sección Bautismo del Evento (backoffice) — T040, T060

- [x] Acción principal "Sumar al bautismo (N)" (deshabilitada sin selección); "Confirmar bautismos
  (N)" pasada la fecha.
- [x] Acciones en lote con casillas reales y nombre accesible; "Seleccionar todas las de esta
  página".
- [x] Resultado parcial explicado en texto (`role="status"`): "Se sumaron 3; 1 ya no estaba
  aceptada…".
- [x] Qué pasa después: "Cada persona ve la fecha en su Mi camino"; en confirmar, "destildá a quien
  no se bautizó: vuelve a esperar fecha".
- [x] Vacíos amables: "Todavía no hay nadie asignado…", "No hay pedidos aceptados esperando fecha".
- [x] Paginado de "Esperando fecha" en la API y en la URL (`?esperando=`), FR-033.
- [x] Pastor sin acciones (e2e). Sin QR en el Evento de bautismo (FR-018).
- [x] Cargando / error: los de la página del Evento (011).

## Bloque Bautismo del Perfil de Persona — T052

- [x] Situación en texto + ícono (Vida Nueva, habilitada por quién y cuándo, bautizada, pedido
  abierto con enlace a su detalle).
- [x] "Habilitar el bautismo" / "Quitar la habilitación" con diálogo neutro; "Pedir el bautismo en su
  nombre" con comentario opcional y error por campo.
- [x] Carga y falla sola (la envuelve la página del Perfil, 013); el Pastor la ve en solo lectura.

## Pendientes del Inicio — T060

- [x] Dos filas nuevas por `RegistroPendientesAdmin`: aceptadas sin fecha (enlaza a la bandeja
  filtrada) y bautismos pasados sin confirmar (enlaza a Eventos de bautismo). Los pedidos nuevos
  ya los cuenta la fila "N de Bautismo" de la bandeja (013).

## Observaciones

1. **El encabezado genérico de la card puede contradecir al bloque de Bautismo.** El estado de
   arriba de la card ("Todavía no se habilita", "La podés empezar") lo calcula la 006 sin saber
   de la Solicitud de Bautismo ni de la habilitación del Admin: una Persona habilitada sin Vida
   Nueva ve "Todavía no se habilita" y, debajo, "Podés pedir tu bautismo"; una con fecha ve "La
   podés empezar" y, debajo, "Ya tenés fecha". Se ve en la captura con el seed demo. No se tocó
   `page.tsx` (es de la 006): queda como Pregunta para Echu en el PR.
2. "Ya lo hice" (la declaración genérica de la 006) aparece también cuando hay un pedido de
   bautismo abierto; si se confirma, el pedido se retira solo (H3), así que es coherente, pero
   suma una acción más a la card.
3. El "Esperando fecha" de la bandeja usa el filtro existente `estado=aprobada` (incluye las ya
   asignadas, con su Evento en `extra`): la bandeja es de la 013 y no se le agregó un filtro propio.
