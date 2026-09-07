import { postForBytes, postJson } from './http';

/**
 * Zeitlimit und Wiederholung der beiden POST-Helfer.
 *
 * fetch wird hier gemockt, weil die Fragen an das Zeitverhalten gestellt
 * werden, nicht an einen echten Anbieter: wie lange wartet der Helfer, was
 * wiederholt er, was lässt er bewusst links liegen.
 */

const fetchMock = jest.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Simuliert einen Hänger: löst erst ab, wenn das Timeout-Signal abbricht. */
function neverAnswering(_url: string, init: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => {
      const error = new Error('signal timed out');
      error.name = 'TimeoutError';
      reject(error);
    });
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  // Nichts darf den globalen fetch über den Test hinaus verbiegen.
  delete (global as { fetch?: typeof fetch }).fetch;
});

describe('postJson', () => {
  it('liefert die JSON-Antwort des Anbieters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ text: 'ok' }));

    await expect(
      postJson({ url: 'https://api.example.test/v1', headers: {}, body: { a: 1 } })
    ).resolves.toEqual({ text: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('wiederholt EINMAL, wenn das Netz den ersten Versuch schluckt', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ zweiter: 'Versuch' }));

    await expect(
      postJson({ url: 'https://api.example.test/v1', headers: {}, body: {} })
    ).resolves.toEqual({ zweiter: 'Versuch' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('wiederholt NICHT bei einer HTTP-Fehlerantwort — ein 401 bleibt 401', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":{"message":"Incorrect API key"}}', {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(
      postJson({ url: 'https://api.example.test/v1', headers: {}, body: {} })
    ).rejects.toThrow(/HTTP 401/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gibt nach zwei Netzwerkfehlern die benannte Meldung, nicht den rohen Abbruch', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      postJson({ url: 'https://api.example.test/v1', headers: {}, body: {} })
    ).rejects.toThrow(/Keine Antwort von api\.example\.test/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('bricht einen Hänger nach dem Zeitlimit ab und wiederholt ihn', async () => {
    fetchMock
      .mockImplementationOnce(neverAnswering)
      .mockResolvedValueOnce(jsonResponse({ nach: 'Zeitlimit' }));

    await expect(
      postJson({
        url: 'https://api.example.test/v1',
        headers: {},
        body: {},
        timeoutMs: 40,
      })
    ).resolves.toEqual({ nach: 'Zeitlimit' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('nennt das Zeitlimit in der Meldung, wenn beide Versuche hängen', async () => {
    fetchMock.mockImplementation(neverAnswering);

    await expect(
      postJson({
        url: 'https://api.example.test/v1',
        headers: {},
        body: {},
        timeoutMs: 40,
      })
    ).rejects.toThrow(/Zeitlimit abgelaufen/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gibt jedem Versuch ein Timeout-Signal mit', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await postJson({ url: 'https://api.example.test/v1', headers: {}, body: {} });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
  });
});

describe('postForBytes', () => {
  it('liefert Bytes und Content-Type', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    fetchMock.mockResolvedValueOnce(
      new Response(bytes, { status: 200, headers: { 'content-type': 'audio/mpeg' } })
    );

    const result = await postForBytes({ url: 'https://api.example.test/audio', headers: {}, body: {} });

    expect(new Uint8Array(result.bytes)).toEqual(bytes);
    expect(result.contentType).toBe('audio/mpeg');
  });

  it('wiederholt einen Netzwerkfehler einmal, eine Fehlerantwort gar nicht', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(new Uint8Array([9]), { status: 200 }));
    await expect(
      postForBytes({ url: 'https://api.example.test/audio', headers: {}, body: {} })
    ).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(new Response('nein', { status: 500 }));
    await expect(
      postForBytes({ url: 'https://api.example.test/audio', headers: {}, body: {} })
    ).rejects.toThrow(/HTTP 500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
