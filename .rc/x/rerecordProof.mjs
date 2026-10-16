/* Round 1338 fixer: the attribution of the soccer-career-save-writer.yml re-record, replayed.
   The workflow's inverse spans each assert `inverse.count(changed) == 1` on src/pages/SoccerCareer.tsx.
   Claim: the ONLY input that moves is SoccerCareer.tsx line 93 (the CareerStory loader).
   (1) base's line 93 is found once in the workflow, head's line 93 zero times;
   (2) every span's count on base and on head; only the CareerStory loader span moves (1 -> 0);
   (3) head's page with line 93 put back to base's: every span counts exactly as on base (the old recording replays).
   Exit 0 when all three hold, 1 when not. Reads git only; no network. */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2] || '1027b08cac8ef5cfc52c6b2e738e5c0a8d703402';
const WF = '.github/workflows/soccer-career-save-writer.yml';
const PAGE = 'src/pages/SoccerCareer.tsx';
const wf = fs.readFileSync(WF, 'utf8');
const head = fs.readFileSync(PAGE, 'utf8').replace(/\r\n/g, '\n');
const base = execSync(`git show ${BASE}:${PAGE}`, { encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n');
const count = (hay, needle) => hay.split(needle).length - 1;
let bad = 0;
const say = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };

const baseL93 = base.split('\n')[92];
const headL93 = head.split('\n')[92];
say(count(wf, baseL93) === 1, `base line 93 found ${count(wf, baseL93)} time(s) in the workflow (expected 1)`);
say(count(wf, headL93) === 0, `head line 93 found ${count(wf, headL93)} time(s) in the workflow (expected 0)`);

/* the page spans: the first element of each (b"...", b"...") pair in the page's spans list */
const block = wf.slice(wf.indexOf('spans = ['), wf.indexOf('for changed, original in spans:'));
const spans = [...block.matchAll(/\(b(['"])(.*?)\1, b/g)].map(m => m[2]);
say(spans.length === 6, `${spans.length} page spans read from the workflow (expected 6)`);
const restored = head.split('\n'); restored[92] = baseL93; const replay = restored.join('\n');
for (const s of spans) {
  const b = count(base, s), h = count(head, s), r = count(replay, s);
  const isLoader = s.startsWith('const CareerStory = lazy(');
  const ok = isLoader ? (b === 1 && h === 0 && r === 1) : (b === h && r === b);
  say(ok, `span ${s.slice(0, 70)}... base ${b} head ${h} replay ${r}${isLoader ? ' (the loader: 1, 0, 1 expected)' : ''}`);
}
say(replay === base, 'head\'s page with line 93 put back is byte for byte base\'s page (line endings normalised)');
console.log(bad ? `rerecordProof: ${bad} check(s) failed` : 'rerecordProof: green. The one input is SoccerCareer.tsx line 93; put back, the old recording replays.');
process.exit(bad ? 1 : 0);
