import { createTextClient } from './text';

test.each(['gemini', 'chatgpt'] as const)('%s allows a slow text package to finish after 30 seconds', async provider => {
  jest.useFakeTimers();
  const originalFetch = global.fetch;
  const timeout = jest.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  });
  const fetchMock = jest.fn((_url: unknown, init: RequestInit) => new Promise<Response>((resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new Error('TimeoutError')));
    setTimeout(() => resolve(new Response(JSON.stringify(provider === 'gemini'
      ? { candidates: [{ content: { parts: [{ text: 'Antwort' }] } }] }
      : { choices: [{ message: { content: 'Antwort' } }] }), { status: 200 })), 45_000);
  }));
  global.fetch = fetchMock as typeof fetch;
  try {
    const result = createTextClient(provider, 'test-only', 'test').complete({ system: 'test', user: 'test', maxTokens: 32768 });
    await jest.advanceTimersByTimeAsync(45_000);
    await expect(result).resolves.toMatchObject({ text: 'Antwort' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(300_000);
  } finally {
    timeout.mockRestore();
    global.fetch = originalFetch;
    jest.useRealTimers();
  }
});
