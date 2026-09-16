/** Jest config for unit tests (src/**\/*.spec.ts and test/unit/**\/*.spec.ts). */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '(/src/.*\\.spec\\.ts$|/test/unit/.*\\.spec\\.ts$)',
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
        },
      },
    ],
  },
  moduleNameMapper: {
    // tsconfig uses moduleResolution: nodenext, so relative imports carry an
    // explicit ".js" extension even for .ts source files. Strip it so Jest's
    // own resolver can find the real .ts file.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // @nestjs/* and rxjs ship native ESM — let @swc/jest transpile them to CJS
  // too, instead of Jest's default of skipping all of node_modules. pnpm's
  // store nests packages under node_modules/.pnpm/<pkg>@<version>/..., so the
  // pattern targets that layout (scoped packages use "+" instead of "/").
  transformIgnorePatterns: ['node_modules/\\.pnpm/(?!(@nestjs\\+|rxjs@|jose@))'],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};
