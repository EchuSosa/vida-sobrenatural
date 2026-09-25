// Tipos de scripts/destino-de-test.cjs (H-130), para importarlo desde TS.
declare const guardas: {
  TOKEN_ENV: 'DESTINO_DE_TEST_TOKEN';
  crearDestinoDeTest(variable: string): string;
  verificarDestinoDeTest(ruta: string | undefined, nombre?: string): string;
  borrarDestinoDeTest(ruta: string | undefined, nombre?: string): void;
  verificarBaseDeTest(databaseUrl: string | undefined, origen?: string): string;
};
export = guardas;
