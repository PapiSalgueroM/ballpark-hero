/* Round 1544 adversarial review (lens RUNS): one named mutation applied to the runner's checkout.
   Each anchor must be there exactly once, or the script exits 2 and writes nothing.
   The request line restores the tree with git checkout -- src scripts. */
import fs from 'node:fs';

const GATE = 'src/lib/nbaCareerIntlGate.ts';
const NBA = 'src/lib/nbaCareerIntl.ts';
const INTL = 'src/lib/careerIntl.ts';
const BOARD = 'src/components/us-career/UsCareerBoard.tsx';

const MUT = {
  // off by one: the bar becomes "over 87", not "87 or better"
  M1: [GATE, 'if (line.ovr < INTL_CALL_UP_OVR ||', 'if (line.ovr <= INTL_CALL_UP_OVR ||'],
  // dropped filter: the gate forgets a summer already answered
  M2: [GATE, 'return Array.isArray(rows) && rows.some(r => r?.year === summer) ? null : summer;', 'return Array.isArray(rows) ? summer : summer;'],
  // replay off by one: careerAt finds the season LABELLED with the summer, not the one before it
  M3: [NBA, 'while (i >= 0 && nbaIntlSummerOf(c.seasons[i].year) !== summer) i -= 1;', 'while (i >= 0 && c.seasons[i].year !== summer) i -= 1;'],
  // dropped filter: the replay is shown even when it disagrees with the row
  M4: [INTL, 'return replay && rowAgrees(replay, r) ? replay : null;', 'return replay ?? null;'],
  // L3 draw never reaches a nation's last rung
  M5: [NBA, 'Math.floor(rng() * past.length)', 'Math.floor(rng() * (past.length - 1))'],
  // the answer persists the wrong phase (drops a dealt summer's event phase)
  M6: [BOARD, 'persist(c, phase, teamQuality);\n    if (res.row.went) setIntlResult', "persist(c, 'season', teamQuality);\n    if (res.row.went) setIntlResult"],
  // the repair drops a stored last whenever a replay exists, equal or not
  M8: [INTL, 'else if (bind && JSON.stringify(replayIntl(c, bind, row)) === JSON.stringify(last)) changed = true;', 'else if (bind && replayIntl(c, bind, row)) changed = true;'],
  // the beat only reads the season phase, so a save with a dealt summer card never meets the call
  M11: [BOARD, "sport.intl && (phase === 'season' || phase === 'event') ? sport.intl.pendingYear(career) : null;", "sport.intl && (phase === 'season') ? sport.intl.pendingYear(career) : null;"],
  // stale constant: the lift still counts from the old bar of 86
  M13: [GATE, '(ovr - INTL_CALL_UP_OVR) * INTL_LIFT_PER_POINT', '(ovr - INTL_CALL_UP_OVR + 1) * INTL_LIFT_PER_POINT'],
  // L3 broken for played editions: a played edition consumes a draw from the career stream
  M14: [NBA, "if (e.kind === 'played') return INTL_RUNG_STRENGTH[intlRungOf(e, nation) ?? 'field'];", "if (e.kind === 'played') { rng(); return INTL_RUNG_STRENGTH[intlRungOf(e, nation) ?? 'field']; }"],
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
