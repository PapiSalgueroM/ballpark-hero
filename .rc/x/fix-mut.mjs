/* Round 1544 fixer (review of Round 1544): one named mutation applied to a /tmp worktree of HEAD on the runner,
   to prove the fixer's new tests catch what the review found uncaught. Each anchor must be there exactly once,
   or the script exits 2 and writes nothing. Never committed. */
import fs from 'node:fs';

const NBA = 'src/lib/nbaCareerIntl.ts';
const INTL = 'src/lib/careerIntl.ts';

const MUT = {
  // the fix of major 10 reverted: every World Cup shape with two group rounds says so, 2027 and projected ones too
  FMT: [NBA, "playedAsNote: e && e.kind === 'played' && !e.shape.playable ?", 'playedAsNote: e && !e.shape.playable ?'],
  // stale history: a nation's rungs stop one played edition short (Paris 2024 never seen)
  N1: [INTL, 'const out: IntlRung[] = [];\n  for (const e of cal.played()) {', 'const out: IntlRung[] = [];\n  for (const e of cal.played().slice(0, -1)) {'],
  // the stream key loses the edition
  N2: [INTL, 'intl:${slug}:${careerKey}:${editionId}', 'intl:${slug}:${careerKey}'],
  // a projected summer loses "Host and field are the game's own."
  N4: [NBA, "fieldNote: !e || e.kind === 'played' ? null :", "fieldNote: !e || e.kind !== 'future' ? null :"],
  // the agreement check forgets the knock
  N5: [INTL, '&& mine.filter(g => g.winner === t.nation).length === r.wins && t.hurt === r.hurt', '&& mine.filter(g => g.winner === t.nation).length === r.wins'],
  // a summer still to come claims the real tournament was played
  N9: [NBA, "happened: e?.kind === 'played',", "happened: e?.kind !== 'projected',"],
  // the generated field draws in another order (a draw order change the golden must see): shuffle twice
  N2b: [INTL, 'function shuffleInPlace<T>(xs: T[], rng: Rng): T[] {\n  for (let i = xs.length - 1; i > 0; i -= 1) {', 'function shuffleInPlace<T>(xs: T[], rng: Rng): T[] {\n  rng();\n  for (let i = xs.length - 1; i > 0; i -= 1) {'],
};

const name = process.argv[2];
const m = MUT[name];
if (!m) { console.error(`unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`mutation ${name} cannot run: ${file} holds the anchor ${hits} times`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`mutation ${name} applied to ${file}`);
