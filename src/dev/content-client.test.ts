import { exportDrafts } from './content-client';

const mockGetAll = jest.fn();
const mockPut = jest.fn();
jest.mock('@/lib/storage', () => ({ getStore: async () => ({ getAll: mockGetAll, put: mockPut }) }));
jest.mock('@/lib/content/developer', () => ({ isContentDeveloper: () => true }));
jest.mock('@/lib/clips/blob-store', () => ({ getAudioBlobStore: async () => ({ uri: async () => null }) }));
jest.mock('@/lib/images/blob-store', () => ({ getImageBlobStore: async () => ({ uri: async () => null }) }));

test('invalid local records and missing media do not prevent later drafts from exporting', async () => {
  const originalFetch = global.fetch;
  const staged: { kind: string; document: { id: string } }[] = [];
  global.fetch = jest.fn(async (_url, options) => {
    if (options?.method === 'POST') {
      if (String(_url).endsWith('/stage')) staged.push(JSON.parse(options.body as string));
      return { ok: true, json: async () => ({}) } as Response;
    }
    return { ok: true, json: async () => ({ rejected: { entries: [{ kind: 'situations', id: 'denied' }] } }) } as Response;
  });
  mockGetAll.mockImplementation(async (kind: string) => ({
    situations: [null, 4, [], { id: 'denied' }, { id: 'valid-situation' }],
    exam: [null, { id: 'builtin', source: 'builtin' }, { id: 'valid-exam', source: 'generated' }],
    images: [{ id: 'broken-image', blobKey: 123 }],
    audio: [{ id: 'missing-audio', blobKey: 'missing.mp3' }],
  })[kind]);
  const progress = jest.fn();
  try {
    await expect(exportDrafts(progress)).rejects.toThrow('Lokale Mediendatei fehlt');
    expect(staged.map((item) => item.document.id)).toEqual(['denied', 'valid-situation', 'valid-exam']);
    expect(mockPut).not.toHaveBeenCalled();
    const result = progress.mock.calls.at(-1)?.[0];
    expect(result).toContain('3 exportiert · Prüfbericht aktualisiert · 6 Exportfehler');
    expect(result).toContain('exam:(ungültiger Eintrag)');
    expect(result).toContain('images:broken-image: Blob-Schlüssel fehlt.');
    expect(result).toContain('audio:missing-audio: Lokale Mediendatei fehlt.');
  } finally { global.fetch = originalFetch; }
});
