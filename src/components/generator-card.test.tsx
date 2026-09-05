import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Pressable } from 'react-native';
import { Button, GeneratorCard, type StartArgs } from './generator-card';

jest.mock('@/lib/api-key', () => ({
  loadApiKey: async () => 'test-key-never-sent', getKeyStorageMode: async () => 'memory',
  clearApiKey: jest.fn(), looksLikeApiKey: () => true, saveApiKey: jest.fn(),
}));

test('one cost confirmation precedes every provider call; cancel costs nothing', async () => {
  const provider = jest.fn(async () => {});
  const automaticExport = jest.fn(async () => {});
  const onStart = async ({ confirmRun }: StartArgs) => {
    if (!await confirmRun({ count: 2, usd: 0.1, basis: 'Test estimate' })) return;
    await provider(); await provider(); await automaticExport();
  };
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<GeneratorCard heading="Test" description="Test" group="audio"
    choice={{ provider: 'gemini', model: 'gemini-3.1-flash-tts-preview', voice: 'Kore' }}
    onChoiceChange={() => {}} statusLine="Test" runOptions={[{ id: 'full', label: 'Alle', hint: '2 Clips' }]}
    onStart={onStart} onFinished={() => {}} onDelete={async () => {}} canDelete={false} deleteLabel="Löschen" />); });
  const press = (label: string) => {
    const button = tree.root.findAllByType(Button).find(node => node.props.label === label);
    if (!button) throw Error('Missing button ' + label);
    button.props.onPress();
  };
  await act(async () => { press('Start'); });
  expect(provider).not.toHaveBeenCalled();
  await act(async () => { press('Kosten bestätigen und Lauf starten'); });
  expect(provider).toHaveBeenCalledTimes(2); expect(automaticExport).toHaveBeenCalledTimes(1);
  await act(async () => { press('Start'); });
  await act(async () => { press('Abbrechen'); });
  expect(provider).toHaveBeenCalledTimes(2);
  await act(async () => { tree.unmount(); });
});
