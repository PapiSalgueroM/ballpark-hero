/* Round 1544 adversarial review (lens RUNS), second pass on dacf07f39: one named mutation applied to the
   runner's checkout (a /tmp worktree of HEAD). Each anchor must be there exactly once, or the script exits 2
   and writes nothing. */
import fs from 'node:fs';

const NBA = 'src/lib/nbaCareerIntl.ts';
const INTL = 'src/lib/careerIntl.ts';

const MUT = {
  // the first pass's gap, rerun: L3's draw never reaches a nation's latest finish
  M5: [NBA, 'Math.floor(rng() * past.length)', 'Math.floor(rng() * (past.length - 1))'],
  // stale history: a nation's rungs stop one played edition short (its latest finish, Paris 2024, is never seen)
  N1: [INTL, 'const out: IntlRung[] = [];\n  for (const e of cal.played()) {', 'const out: IntlRung[] = [];\n  for (const e of cal.played().slice(0, -1)) {'],
  // the stream key loses the edition: every summer of one career draws on the same stream
  N2: [INTL, 'intl:${slug}:${careerKey}:${editionId}', 'intl:${slug}:${careerKey}'],
  // a projected summer (2035 on) loses its "Host and field are the game's own." line
  N4: [NBA, "fieldNote: !e || e.kind === 'played' ? null :", "fieldNote: !e || e.kind !== 'future' ? null :"],
  // the agreement check forgets the knock: a replay that disagrees on hurt is still shown
  N5: [INTL, '&& mine.filter(g => g.winner === t.nation).length === r.wins && t.hurt === r.hurt', '&& mine.filter(g => g.winner === t.nation).length === r.wins'],
  // a summer still to come claims the real tournament was played (false today for 2027 and after)
  N9: [NBA, "happened: e?.kind === 'played',", "happened: e?.kind !== 'projected',"],
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
