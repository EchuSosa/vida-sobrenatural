// H-113 (revisión manual): sin `'use client'` a propósito — page.tsx (Server
// Component) y pendientes-tutor-cliente.tsx ('use client') importan esta
// constante los dos. Cuando vivía en el archivo cliente, Next.js reemplazaba
// el export por una referencia rota al leerlo del lado del servidor
// (`${TAMANIO_PAGINA}` interpolaba el código fuente de esa referencia, no
// el número), y el fetch de page.tsx salía con `take` roto hacia la API.
export const TAMANIO_PAGINA = 20;
