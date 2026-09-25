/**
 * Config de Jest para e2e + integración, en modo ESM nativo (no CJS-via-transform):
 * el cliente de Prisma 7 carga su query compiler WASM vía `import()` dinámico,
 * lo que no funciona bajo el runtime CJS por defecto de Jest. Correr con
 * `node --experimental-vm-modules` (ver script `test:e2e` en package.json).
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  globalSetup: '<rootDir>/test/global-setup.cjs',
  // H-130: borra la carpeta de archivos de ESTA corrida, verificada — no un
  // afterAll de un spec, porque la carpeta es de la corrida entera.
  globalTeardown: '<rootDir>/test/global-teardown.cjs',
  setupFiles: ['<rootDir>/test/load-test-env.cjs'],
  testRegex: '(/test/.*\\.e2e-spec\\.ts$|/test/integration/.*\\.integration-spec\\.ts$)',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        module: { type: 'es6' },
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/\\.pnpm/(?!(@nestjs\\+|rxjs@|jose@))'],
  testEnvironment: 'node',
};
