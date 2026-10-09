# Research: Grupos de Extensión

1. **Geocodificación.** Georef (`apis.datos.gob.ar/georef/api/direcciones`, gratis, oficial, sin clave)
   entiende "calle 64 820" con `provincia=Buenos Aires` y `departamento=La Plata`; para una esquina
   ("64 e/ 11 y 12" sin número) se pide la intersección `calle 64 y calle 11`. Si no resuelve,
   Nominatim (`nominatim.openstreetmap.org/search`, `format=json`, `countrycodes=ar`) con `User-Agent`
   propio (exigencia de su política de uso) y como mucho una consulta por segundo (uso bajo: solo al
   guardar un Grupo o al buscar). Interfaz `Geocodificador { ubicar(consulta): Promise<Coordenadas|null> }`
   detrás de un token de Nest; `GEOCODIFICADOR=falso` (o `NODE_ENV=test`) usa el falso, que resuelve
   un diccionario fijo de direcciones de prueba. Timeout de 5 s por servicio.
2. **Distancia**: haversine en memoria. Con decenas de Grupos no justifica PostGIS.
3. **Privacidad**: la búsqueda va por `POST` (la dirección no queda en la URL ni en logs de acceso); el
   geocodificador no loguea la consulta. La respuesta de la búsqueda no incluye calle ni número.
4. **Membresía = Solicitud `aceptada`** (como D170): índices únicos parciales
   `WHERE estado='pendiente'` y `WHERE estado='aceptada'` por `personaId`.
5. **Cupo y concurrencia**: aceptar bloquea la fila del Grupo (`SELECT … FOR UPDATE`) y cuenta las
   aceptadas dentro de la misma transacción; resolver usa `updateMany where estado='pendiente'` para
   que dos resoluciones simultáneas no pisen.
6. **"Cómo llegar"**: `https://www.google.com/maps/search/?api=1&query=<dirección, La Plata>` (abre la
   app de mapas en el celular). "Usar mi ubicación": `navigator.geolocation` en el cliente; manda lat/lng.
7. **WhatsApp**: `enlaceWhatsapp` de shared-types (D218) con el teléfono normalizado `549…`.
