# Portadas de Ediciones VS — provisorias

**No son archivos de tapa: son fotos de los libros**, sobre una mesa, con fondo, alguna en
diagonal y alguna con una mano encima. Salieron de lo que había disponible; las tapas reales se
le piden a la editorial más adelante (ver la lista de contenido pendiente en
`docs/06-preguntas-abiertas.md`).

Por eso importan dos cosas al procesarlas:

- **No se recortan.** Van de 0.81 a 1.30 de alto/ancho, casi todas cuadradas. Un recorte centrado
  a 2:3 les corta entre 14% y 46% del ancho, y en `vida-nueva.jpg` el libro está corrido a la
  derecha, así que el recorte se comería el libro. `ImagenPortadaService` usa `fit: 'inside'`.
- **`PORTADA_ASPECTO` está en 1:1 mientras el contenido sea este** (en caja 2:3 una foto cuadrada
  deja 33% de aire y `vida-nueva` 46%; en caja cuadrada el peor caso es 23%). Vuelve a 2:3 cuando
  lleguen las tapas reales, que sí son verticales.

Origen: PNG con alfa sin usar, convertidos a JPEG de calidad 85 en su tamaño original — 24,3 MB
en PNG contra 2,2 MB así. Las nueve pasan el mínimo de dimensiones.
