# Quickstart: Grupos de Extensión

1. `pnpm --filter api exec prisma migrate deploy && pnpm --filter api run db:seed && pnpm --filter api run db:seed-demo`.
2. Web, como `demo-nueva@example.com` (Florencia, mujer): Mi camino → "Mi grupo de extensión" →
   "Encontrá tu grupo" → escribir "7 nro 1200, La Plata" → ver solo grupos de mujeres por cercanía →
   "Quiero sumarme".
3. Web, como `demo-gex-lider@example.com` (líder de demo): Mi camino → "Mi grupo" → ver el pedido →
   "Aceptar".
4. Volver como Florencia: la card muestra el grupo con "Cómo llegar".
5. Backoffice como Admin: Grupos de extensión → crear uno "En la iglesia" y uno con dirección; detalle →
   agregar / quitar integrantes; bandeja → filtro "Grupo de extensión".

Sin red (o en CI): `GEOCODIFICADOR=falso` en `apps/api/.env`.
