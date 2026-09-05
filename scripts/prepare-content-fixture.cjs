// An isolated technical fixture for Expo export. It can NEVER enter the real
// catalog. Test decisions below are explicitly not human content approval.
const fs = require('node:fs/promises');
const path = require('node:path');
const { ContentPipeline } = require('./content-pipeline.cjs');
const domain = require('./content-domain.cjs');
const { clipIdFor } = domain.load('src/lib/clips/types');
const { VOCABULARY } = domain.load('src/data/vocabulary');
async function prepare() {
  const root = path.resolve(__dirname, '..');
  const target = path.join(root, 'build-verification/asset-fixture');
  await fs.mkdir(path.join(target, 'src/lib/content'), { recursive: true });
  await fs.copyFile(path.join(root, 'src/lib/content/bundled.ts'), path.join(target, 'src/lib/content/bundled.ts'));
  const pipeline = new ContentPipeline(target);
  const wav = await fs.readFile(path.join(root, '.content-studio/measurement-source/speech-0.wav'));
  const text = 'AUTOMATED TECHNICAL FIXTURE ONLY';
  const id = clipIdFor('de', text);
  const audio = await pipeline.stage({ kind: 'audio', document: { id, language: 'de', text, kind: 'vocab', sourceId: 'test', format: 'wav', byteSize: wav.length,
    blobKey: 'test.wav', provider: 'gemini', model: 'TEST FIXTURE, ACTUALLY WINDOWS SAPI', voice: 'Hedda', generatedAt: 1, synthetic: true }, base64: wav.toString('base64') });
  const imageBytes = await fs.readFile(path.join(root, 'assets/images/icon.png'));
  const imageId = VOCABULARY.find((word) => word.isConcrete).id;
  const image = await pipeline.stage({ kind: 'images', document: { id: imageId, vocabId: imageId, format: 'png', byteSize: imageBytes.length,
    blobKey: 'test.png', prompt: 'TEST FIXTURE ICON', model: 'TEST', generatedAt: 1 }, base64: imageBytes.toString('base64') });
  for (const entry of [audio, image]) await pipeline.review({ ...entry, status: 'approved', reviewer: 'AUTOMATED TECHNICAL TEST - NO HUMAN APPROVAL', reason: 'Isolated ignored build directory only' });
  await pipeline.publish();
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  await fs.writeFile(path.join(target, 'package.json'), JSON.stringify({ name: 'content-asset-fixture', version: '1.0.0', main: 'index.js', dependencies: pkg.dependencies }));
  await fs.writeFile(path.join(target, 'app.json'), JSON.stringify({ expo: { name: 'Technical asset fixture', slug: 'asset-fixture', web: { output: 'single' }, plugins: ['expo-asset'] } }));
  await fs.writeFile(path.join(target, 'index.js'), `import React from 'react';\nimport { View, Text } from 'react-native';\nimport { registerRootComponent } from 'expo';\nimport { bundledAssetUri } from './src/lib/content/bundled';\nfunction App() { const [uri, setUri] = React.useState('loading'); React.useEffect(() => { bundledAssetUri('audio', '${id}').then(setUri); }, []); return React.createElement(View, null, React.createElement(Text, null, uri)); }\nregisterRootComponent(App);\n`);
  console.log(target);
}
prepare().catch((error) => { console.error(error); process.exitCode = 1; });
