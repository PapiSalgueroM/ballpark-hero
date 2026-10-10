/* Reviewer's mutations for Round 1300 (run on the runner only, restored by git checkout in the same line).
   node .rc/x/review-run-mut.mjs <name> : applies ONE exact string replacement, refusing unless the string is
   in the file exactly once (exit 9), and prints what it did. */
import { readFileSync, writeFileSync } from 'node:fs';

const PO = 'src/lib/season/usPlayoffs.ts';
const DATA = 'src/data/usPostseasonFormat.ts';
const US = 'src/lib/season/us.ts';
const MUTS = {
  /* the sum rule's rounding written the plain way (the float trap the brief's advice 16 names) */
  m1: { file: PO, from: 'total: Math.round((Math.round(t.mean * 10) * games) / 10), perGameCap', to: 'total: Math.round(t.mean * games), perGameCap' },
  /* a dropped filter: a season played to another format gets a format again */
  m2: { file: DATA, from: 'if (!w || w.modified.includes(year)) return null;', to: 'if (!w) return null;' },
  /* an off by one on the window: its first season falls out */
  m3: { file: DATA, from: 'x.sport === sport && year >= x.from && (x.to === null || year <= x.to)', to: 'x.sport === sport && year > x.from && (x.to === null || year <= x.to)' },
  /* the tie rule of the fewest repairs: the LAST least repaired try instead of the lowest numbered one */
  m4: { file: PO, from: 'if (!best || p.season.repairs < best.season.repairs) best = p;', to: 'if (!best || p.season.repairs <= best.season.repairs) best = p;' },
  /* a dropped filter: a stat field with no playoff number keeps its REGULAR season number */
  m5: { file: PO, from: 'if (finite(v)) { out[k] = v; any = true; } else delete out[k];', to: 'if (finite(v)) { out[k] = v; any = true; }' },
  /* the lay: a series may run one game past its most */
  m6: { file: US, from: 'const room = len.map((v, r) => (v < need[r][1] ? r : -1)).filter(r => r >= 0);', to: 'const room = len.map((v, r) => (v <= need[r][1] ? r : -1)).filter(r => r >= 0);' },
  /* an inverted flag: a named opponent is said to be unnamed, and the other way round */
  m7: { file: PO, from: 'series.push({ round: sr.round, opp: sr.opp, named: sr.slot !== null, need', to: 'series.push({ round: sr.round, opp: sr.opp, named: sr.slot === null, need' },
  /* no change of meaning at all: one more space in a line a control patches (does the control abort or fire?) */
  m8: { file: PO, from: 'clinch: null }, series, at };', to: 'clinch: null },  series, at };' },
  /* the venue handed to the score law the wrong way round */
  m9: { file: PO, from: 'score: (edge, home, rng) => bind.score(edge, home, rng, ctx.eraId),', to: 'score: (edge, home, rng) => bind.score(edge, !home, rng, ctx.eraId),' },
  /* a stale constant: the play-in window starts a season late, so 2020 has no row */
  m10: { file: DATA, from: "sport: 'nba', from: 2020, to: null,", to: "sport: 'nba', from: 2021, to: null," },
  /* the opponent's label of a series taken from the series before it */
  m11: { file: PO, from: '...lay.series.map((sr, r): SlotLabel => ({ name: sr.opp,', to: '...lay.series.map((sr, r): SlotLabel => ({ name: lay.series[Math.max(0, r - 1)].opp,' },
  /* the critic's correction 6 undone at the score call: every game is SCORED as a home game, while the flag on the game still alternates */
  m12: { file: PO, from: 'score: (edge, home, rng) => bind.score(edge, home, rng, ctx.eraId),', to: 'score: (edge, _home, rng) => bind.score(edge, true, rng, ctx.eraId),' },
  /* a stale pair: the NFL field as it was before 2020 (12 clubs, two byes a conference) */
  m20: { file: DATA, from: "sport: 'nfl', from: 2020, to: null, clubs: 14, byes: 1,", to: "sport: 'nfl', from: 2020, to: null, clubs: 12, byes: 2," },
  /* the lay of a one game round: the count is never filled in, so a sport of one game rounds lays nothing out */
  m22: { file: US, from: '  else if (po === n) games.fill(1);', to: '' },
  /* swapped sides: the strength meant for his side is handed to the opponent */
  m25: { file: PO, from: 'strengths: () => [bind.strengthFor(share), 0],', to: 'strengths: () => [0, bind.strengthFor(share)],' },
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`unknown mutation ${name}`); process.exit(9); }
const src = readFileSync(m.file, 'utf8');
const n = src.split(m.from).length - 1;
if (n !== 1) { console.error(`MUTATION ${name} REFUSED: its string is in ${m.file} ${n} times`); process.exit(9); }
const out = src.replace(m.from, () => m.to);
if (out === src) { console.error(`MUTATION ${name} REFUSED: nothing changed`); process.exit(9); }
writeFileSync(m.file, out);
console.log(`MUTATION ${name} applied to ${m.file}`);
