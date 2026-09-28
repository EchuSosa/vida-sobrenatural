/**
 * specs/004, lote B: la forma mínima de `pg` que usa discipulado-datos.ts.
 * `pg` está en la raíz del monorepo pero `@types/pg` no llega a apps/backoffice;
 * sumarlo a su package.json tocaría archivos compartidos entre lotes.
 * TODO(merge): si se agrega `@types/pg` como devDependency, borrar este archivo.
 */
declare module 'pg' {
  export class Client {
    constructor(config: { connectionString: string });
    connect(): Promise<void>;
    end(): Promise<void>;
    query<R = Record<string, unknown>>(texto: string, valores?: unknown[]): Promise<{ rows: R[] }>;
  }
}
