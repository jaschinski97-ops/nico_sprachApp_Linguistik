import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Pressable, TextInput } from 'react-native';
import { Button, GeneratorCard, type StartArgs } from './generator-card';

jest.mock('@/lib/api-key', () => ({
  loadApiKey: async () => 'test-key-never-sent', getKeyStorageMode: async () => 'memory',
  clearApiKey: jest.fn(), looksLikeApiKey: () => true, saveApiKey: jest.fn(),
}));

test('one cost confirmation precedes every provider call; cancel costs nothing', async () => {
  const provider = jest.fn(async () => {});
  const automaticExport = jest.fn(async () => {});
  const onStart = async ({ confirmRun }: StartArgs) => {
    if (!await confirmRun({ count: 2, usd: 0.1, basis: 'Test estimate', delivery: {
      total: 3, toneCheckable: 1, technicalOnly: 1, uncheckedDelivered: 0, excluded: 1,
      reasons: { 'Ungeprüftes Satzaudio': 1 },
    } })) return;
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
  expect(JSON.stringify(tree.toJSON())).toContain('Auslieferungsvorschau');
  expect(JSON.stringify(tree.toJSON())).toContain('66.7');
  expect(JSON.stringify(tree.toJSON())).toContain('Ungeprüftes Satzaudio');
  await act(async () => { press('Kosten bestätigen und Lauf starten'); });
  expect(provider).toHaveBeenCalledTimes(2); expect(automaticExport).toHaveBeenCalledTimes(1);
  await act(async () => { press('Start'); });
  await act(async () => { press('Abbrechen'); });
  expect(provider).toHaveBeenCalledTimes(2);
  await act(async () => { tree.unmount(); });
});

test('„Alle Sprachen“ übergibt die Kette, zeigt den Schritt und bestätigt genau einmal', async () => {
  const schritte = [{ key: 'th', label: 'Thai' }, { key: 'es', label: 'Spanisch' }];
  const erhalteneKette: ({ key: string; label: string }[] | undefined)[] = [];
  let bestaetigungen = 0;
  // Hält den „Kettenlauf“ an, während wir den Baum außerhalb prüfen.
  let ketteFortsetzen: () => void = () => {};
  const onStart = async ({ chain, onChainStep, confirmRun }: StartArgs) => {
    erhalteneKette.push(chain);
    if (!await confirmRun({ count: 2, usd: 0.2, basis: 'Kette' })) return;
    bestaetigungen += 1;
    onChainStep?.({ index: 2, total: 2, label: 'Spanisch' });
    await new Promise<void>((resolve) => { ketteFortsetzen = resolve; });
  };
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<GeneratorCard heading="Test" description="Test" group="images"
    choice={{ provider: 'gemini', model: 'gemini-3.1-flash-image', voice: '' }}
    language="th" onLanguageChange={() => {}}
    onChoiceChange={() => {}} statusLine="Test" runOptions={[{ id: 'full', label: 'Alle', hint: '2 Bilder' }]}
    onStart={onStart} onFinished={() => {}} onDelete={async () => {}} canDelete={false} deleteLabel="Löschen"
    allRun={{ label: 'Alle Sprachen', steps: schritte }} />); });
  const press = (label: string) => {
    const button = tree.root.findAllByType(Button).find(node => node.props.label === label);
    if (!button) throw Error('Missing button ' + label);
    button.props.onPress();
  };
  await act(async () => { press('Alle Sprachen'); });
  // Während der Kette läuft: kein zweiter Start, keine zweite „Alle“-Wahl.
  expect(JSON.stringify(tree.toJSON())).toContain('Anhalten');
  expect(tree.root.findAllByType(Button).find(node => node.props.label === 'Alle Sprachen'))
    .toBeUndefined();
  await act(async () => { press('Kosten bestätigen und Lauf starten'); });
  // EINE kombinierte Bestätigung für die ganze Kette — nicht eine je Schritt.
  expect(bestaetigungen).toBe(1);
  expect(erhalteneKette[0]).toEqual(schritte);
  // Mitten im Kettenlauf steht, welcher Schritt von wie vielen läuft.
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Schritt 2 / 2 · Spanisch');
  expect(json).toContain('Anhalten');
  await act(async () => { ketteFortsetzen(); });
  await act(async () => { tree.unmount(); });
});

test('„Max. neue erzeugen“ geht als maxNew durch; leer bleibt unbegrenzt', async () => {
  const erhaltene: StartArgs[] = [];
  const onStart = async (args: StartArgs) => { erhaltene.push(args); };
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<GeneratorCard heading="Test" description="Test" group="images"
    choice={{ provider: 'gemini', model: 'gemini-3.1-flash-image', voice: '' }}
    onChoiceChange={() => {}} statusLine="Test" runOptions={[{ id: 'full', label: 'Alle', hint: '2 Bilder' }]}
    onStart={onStart} onFinished={() => {}} onDelete={async () => {}} canDelete={false} deleteLabel="Löschen" />); });
  const press = (label: string) => {
    const button = tree.root.findAllByType(Button).find(node => node.props.label === label);
    if (!button) throw Error('Missing button ' + label);
    button.props.onPress();
  };
  const feld = tree.root.findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === 'Max. neue erzeugen für Test');
  if (!feld) throw Error('Missing cap input');
  // Fremdzeichen werden herausgefiltert — negativ kann nicht entstehen.
  await act(async () => { feld.props.onChangeText('12x-9'); });
  expect(feld.props.value).toBe('129');
  await act(async () => { press('Start'); });
  expect(erhaltene[0].maxNew).toBe(129);
  expect(JSON.stringify(tree.toJSON())).toContain('begrenzt auf max. 129 neue');
  // Leer heißt: alles Fehlende, keine Begrenzung.
  await act(async () => { feld.props.onChangeText(''); });
  await act(async () => { press('Start'); });
  expect(erhaltene[1].maxNew).toBeUndefined();
  // „0“ ist ausdrücklich erlaubt und bedeutet ebenfalls unbegrenzt.
  await act(async () => { feld.props.onChangeText('0'); });
  await act(async () => { press('Start'); });
  expect(erhaltene[2].maxNew).toBeUndefined();
  await act(async () => { tree.unmount(); });
});

test('Die Zähler-Zeile zeigt den Bestand je Sprache mit Hervorhebung der Wahl', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<GeneratorCard heading="Test" description="Test" group="images"
    choice={{ provider: 'gemini', model: 'gemini-3.1-flash-image', voice: '' }}
    language="th" onLanguageChange={() => {}}
    onChoiceChange={() => {}} statusLine="Test"
    counts={[
      { key: 'th', label: 'Thai', count: 7, highlighted: true },
      { key: 'en', label: 'Englisch', count: 0 },
      { key: 'es', label: 'Spanisch', count: null, detail: 'lädt' },
    ]}
    runOptions={[{ id: 'full', label: 'Alle', hint: '2 Bilder' }]}
    onStart={async () => {}} onFinished={() => {}} onDelete={async () => {}} canDelete={false} deleteLabel="Löschen" />); });
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Thai: 7');
  expect(json).toContain('Englisch: 0');
  // Noch nicht geladen — ehrlich „…“ statt einer erfundenen Zahl.
  expect(json).toContain('Spanisch: …');
  await act(async () => { tree.unmount(); });
});
