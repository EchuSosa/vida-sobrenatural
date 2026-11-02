import { mismoSecreto } from '../../src/auth/internal-lookup.guard.js';

/** docs/25, S-09: el secreto interno se compara en tiempo constante. */
describe('mismoSecreto', () => {
  it('acepta el mismo secreto', () => expect(mismoSecreto('s3cr3t-largo', 's3cr3t-largo')).toBe(true));
  it('rechaza otro del mismo largo', () => expect(mismoSecreto('s3cr3t-lárgo'.slice(0, 12), 's3cr3t-largo')).toBe(false));
  it('rechaza uno de otro largo, vacío o ausente', () => {
    expect(mismoSecreto('s3cr3t', 's3cr3t-largo')).toBe(false);
    expect(mismoSecreto('', 's3cr3t-largo')).toBe(false);
    expect(mismoSecreto(undefined, 's3cr3t-largo')).toBe(false);
    expect(mismoSecreto(['s3cr3t-largo'], 's3cr3t-largo')).toBe(false);
  });
});
