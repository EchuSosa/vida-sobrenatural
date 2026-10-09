/**
 * spec 012 — tipos mínimos de `pg` (devDependency de la raíz, sin `@types/pg`)
 * para `helpers-012.ts`: solo lo que usa.
 */
declare module 'pg' {
  export class Client {
    constructor(opciones: { connectionString: string });
    connect(): Promise<void>;
    end(): Promise<void>;
    query<T = Record<string, unknown>>(sql: string, valores?: unknown[]): Promise<{ rows: T[] }>;
  }
}
