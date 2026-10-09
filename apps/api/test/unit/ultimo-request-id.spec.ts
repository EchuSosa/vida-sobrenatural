import { ApiError, apiFetch, ultimoRequestId } from '@vida-sobrenatural/shared-types';

/** spec 013, T017 (FR-042): `apiFetch` recuerda el requestId del último error, no el de las respuestas correctas. */
describe('ultimoRequestId (spec 013 T017)', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  function responder(status: number, cuerpo: unknown) {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
  }

  it('se actualiza con cada error y no con una respuesta correcta', async () => {
    responder(404, { code: 'NO_ENCONTRADO', detail: 'No', requestId: 'req-1' });
    await expect(apiFetch('/x')).rejects.toBeInstanceOf(ApiError);
    expect(ultimoRequestId()).toBe('req-1');

    responder(200, { ok: true });
    await apiFetch('/x');
    expect(ultimoRequestId()).toBe('req-1');

    responder(500, { code: 'ERROR_INTERNO', detail: 'Uy', requestId: 'req-2' });
    await expect(apiFetch('/x')).rejects.toBeInstanceOf(ApiError);
    expect(ultimoRequestId()).toBe('req-2');
  });
});
