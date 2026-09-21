/** Repariert die 52 steckengebliebenen Kreuzprüfungs-Wörter auf der Stage:
 *  sourceVerified=true lehnte der Publish ab („Quellengeprüft ohne
 *  Quellenangabe"). Flag auf false, Kreuzprüfungs-Note bleibt — dann
 *  /stage (Upsert) und /publish über den HELPER, nie die Datei von Hand.
 *  Aufruf: node scripts/content/repair-kreuzpruefung-stage.cjs
 */
const BASE = 'http://127.0.0.1:8082';
// Der Helper nimmt Schreibzugriffe nur von der Studio-App an (Origin-Gate).
const HEADERS = { 'content-type': 'application/json', origin: 'http://localhost:8081' };

async function main() {
  const stateRes = await fetch(`${BASE}/state`);
  if (!stateRes.ok) throw Error(`Helper /state: ${stateRes.status}`);
  const state = await stateRes.json();
  const stageVocab = (state.stage?.entries ?? []).filter((e) => e.kind === 'vocabulary');
  const kaputt = stageVocab.filter((e) => e.document?.sourceVerified === true);
  console.log(`Stage-Vokabeln: ${stageVocab.length}, davon mit sourceVerified=true: ${kaputt.length}`);
  for (const eintrag of kaputt) {
    const dokument = { ...eintrag.document, sourceVerified: false };
    const res = await fetch(`${BASE}/stage`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ kind: 'vocabulary', document: dokument }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw Error(`/stage für ${eintrag.document?.term ?? eintrag.id}: ${res.status} ${text.slice(0, 200)}`);
    }
  }
  console.log(`${kaputt.length} Einträge korrigiert. Veröffentliche …`);
  const publish = await fetch(`${BASE}/publish`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({}),
  });
  const bericht = await publish.json().catch(() => ({}));
  console.log('Publish:', publish.status, JSON.stringify(bericht).slice(0, 400));
  const danach = await (await fetch(`${BASE}/state`)).json();
  const katalog = (danach.shipped?.entries ?? []).filter((e) => e.kind === 'vocabulary');
  const jeSprache = {};
  for (const e of katalog) {
    const l = e.document?.language ?? '?';
    jeSprache[l] = (jeSprache[l] || 0) + 1;
  }
  console.log('Katalog-Vokabeln je Sprache:', JSON.stringify(jeSprache));
}

main().catch((error) => { console.error('FEHLER:', error.message); process.exit(1); });
