// Release BJ triage: give a playSoccerLanding base (b59ebe2b with PR270's codec and x/chainBase.sh) Round 1504's page
// loader of the summer deck, and nothing else. Since Round 1504 (merged in Round BJG as m5 9bbc7b5a) the head page pulls
// the deck in as soon as a live career is on screen, so a summer it deals can open with a deck card; the base page never
// asked for the deck, so it dealt none, and the bytes section saw the two arms part at the first summer deal (the
// release gate, rBJ-rgV land-toasts: step 9, social_media_action, head 37 saves against the base's 35). The base already
// carries the deck and its gate (chainBase.sh copies every src/lib file the chain changed since 08923969 and every
// src/data file added, Round 1334's deck among them); this adds the two things 1504 added to the page for it: the gate's
// import and the effect that loads the deck (git diff 353d1c26 9bbc7b5a -- src/pages/SoccerCareer.tsx, the
// deckWanted effect, verbatim). Round 1504's deck card answer path (handleEventChoice) is left out on purpose: with the
// deck in memory it calls applyEventChoice exactly as the base page does, and only its toast text differs, which the
// bytes section does not read. Fails closed (exit 2) unless each anchor is in the base page exactly once.
// usage: node .rc/x/deckBase1504.mjs /tmp/<dir>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const file = path.join(dir, 'src/pages/SoccerCareer.tsx');
const gate = path.join(dir, 'src/lib/soccerDeckGate.ts');
if (!fs.existsSync(gate)) { console.log(`deckBase1504: ${gate} is missing (run x/chainBase.sh first)`); process.exit(2); }
let src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
if (src.includes('loadSoccerDeck')) { console.log('deckBase1504: the base page already loads the deck'); process.exit(2); }
const EDITS = [
  ['import { applyDrillResult, type DrillKind } from "@/lib/careerDrills";\n',
    'import { applyDrillResult, type DrillKind } from "@/lib/careerDrills";\nimport { loadSoccerDeck, soccerDeckReady } from "@/lib/soccerDeckGate";\n'],
  ['  useEffect(() => {\n    setClubs(FALLBACK_CLUBS);\n',
    '  const deckWanted = !!career && !career.retired;\n  useEffect(() => {\n    if (deckWanted && !soccerDeckReady()) void loadSoccerDeck().catch(() => { /* a pending deck card asks again, see handleEventChoice */ });\n  }, [deckWanted, career?.phase]);\n\n  useEffect(() => {\n    setClubs(FALLBACK_CLUBS);\n'],
];
for (const [from, to] of EDITS) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`deckBase1504: an anchor is in the base page ${n} times, it must be once: ${JSON.stringify(from.slice(0, 60))}`); process.exit(2); }
  src = src.replace(from, to);
}
fs.writeFileSync(file, src);
console.log(`deckBase1504: Round 1504's deck loader added to ${file}`);
