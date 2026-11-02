import { mintApiToken } from '@vida-sobrenatural/shared-types/auth-server';

/** docs/25, S-10: sin NEXTAUTH_SECRET no se firma un token con clave vacía. */
describe('mintApiToken sin secreto', () => {
  const antes = process.env.NEXTAUTH_SECRET;
  afterEach(() => {
    if (antes === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = antes;
  });

  it('falla en vez de firmar con una clave vacía', async () => {
    delete process.env.NEXTAUTH_SECRET;
    await expect(mintApiToken({ email: 'a@example.com', personaId: null, estado: null, rol: [] })).rejects.toThrow('NEXTAUTH_SECRET');
  });

  it('con secreto, firma', async () => {
    process.env.NEXTAUTH_SECRET = 'un-secreto-de-prueba-suficientemente-largo';
    await expect(mintApiToken({ email: 'a@example.com', personaId: null, estado: null, rol: [] })).resolves.toMatch(/^ey/);
  });
});
