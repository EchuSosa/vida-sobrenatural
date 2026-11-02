/**
 * docs/25, S-07: la documentación interactiva de la API (Swagger, en `/api`)
 * publica el mapa completo de rutas. Sirve para desarrollar, no hace falta
 * publicada: en producción no se monta, salvo que se pida a propósito con
 * `SWAGGER_EN_PRODUCCION=true`.
 */
export function montarDocumentacionApi(entorno: NodeJS.ProcessEnv = process.env): boolean {
  return entorno.NODE_ENV !== 'production' || entorno.SWAGGER_EN_PRODUCCION === 'true';
}
