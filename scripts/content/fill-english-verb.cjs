/** Trägt englishVerb {past, participle, irregular} an die unregelmäßigen
 *  Verben des generierten EN-Wortschatzbestands (18.09.2026). Die Formen
 *  kommen aus src/data/english-irregular-verbs.json (kuratierte Standard-
 *  liste, keine KI-Erzeugung) — die Übungen „Unregelmäßige Verben" und
 *  „Dritte Form" lesen genau dieses Feld. Reguläre Verben bleiben ohne
 *  Feld (die Übungen wollen bewusst nur irregular:true).
 *
 *  Aufruf:  node scripts/content/fill-english-verb.cjs           (Trockenlauf)
 *           node scripts/content/fill-english-verb.cjs --write   (stage + publish)
 *  Schreibweg wie immer ÜBER DEN HELPER (Origin-Gate), nie Datei von Hand.
 */
const BASE = 'http://127.0.0.1:8082';
// Der Helper nimmt Schreibzugriffe nur von der Studio-App an (Origin-Gate).
const HEADERS = { 'content-type': 'application/json', origin: 'http://localhost:8081' };
const SCHREIBEN = process.argv.includes('--write');

const tabelle = require('../../src/data/english-irregular-verbs.json');

async function main() {
  const stateRes = await fetch(`${BASE}/state`);
  if (!stateRes.ok) throw Error(`Helper /state: ${stateRes.status}`);
  const state = await stateRes.json();
  const enVerben = (state.shipped?.entries ?? [])
    .filter((e) => e.kind === 'vocabulary' && e.document?.language === 'en' && e.document?.partOfSpeech === 'verb');
  const bereits = enVerben.filter((e) => e.document.englishVerb);
  const ohne = enVerben.filter((e) => !e.document.englishVerb);

  const treffer = [];
  const keine = [];
  for (const eintrag of ohne) {
    const schluessel = String(eintrag.document.term).trim().toLowerCase();
    const formen = tabelle[schluessel];
    if (formen) treffer.push({ eintrag, formen });
    else keine.push(eintrag.document.term);
  }

  console.log(`EN-Verben im Katalog: ${enVerben.length} | mit englishVerb: ${bereits.length} | ohne: ${ohne.length}`);
  console.log(`Tabelle: ${Object.keys(tabelle).length - 1} Verben | Treffer: ${treffer.length} | unregelmäßig Lautende ohne Tabelleneintrag: ${keine.length}`);
  console.log('Treffer (Beispiel):', treffer.slice(0, 15).map((t) => `${t.eintrag.document.term}→${t.formen[0]}/${t.formen[1]}`).join(', '));
  if (keine.length > 0) console.log('Ohne Feld (Rest, vermutlich regelmäßige Verben):', keine.slice(0, 40).join(', '), keine.length > 40 ? '…' : '');

  if (!SCHREIBEN) {
    console.log('Trockenlauf — mit --write werden die Treffer gestaged und veröffentlicht.');
    return;
  }

  for (const { eintrag, formen } of treffer) {
    const dokument = {
      ...eintrag.document,
      englishVerb: { past: formen[0], participle: formen[1], irregular: true },
    };
    const res = await fetch(`${BASE}/stage`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ kind: 'vocabulary', document: dokument }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw Error(`/stage für ${dokument.term}: ${res.status} ${text.slice(0, 200)}`);
    }
  }
  console.log(`${treffer.length} Einträge mit englishVerb gestaged. Veröffentliche …`);
  const publish = await fetch(`${BASE}/publish`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({}),
  });
  const bericht = await publish.json().catch(() => ({}));
  console.log('Publish:', publish.status, JSON.stringify(bericht).slice(0, 400));

  const danach = await (await fetch(`${BASE}/state`)).json();
  const mitFeld = (danach.shipped?.entries ?? [])
    .filter((e) => e.kind === 'vocabulary' && e.document?.language === 'en' && e.document.englishVerb?.irregular);
  console.log(`Katalog danach: ${mitFeld.length} EN-Verben mit irregular englishVerb.`);
}

main().catch((error) => { console.error('FEHLER:', error.message); process.exit(1); });
