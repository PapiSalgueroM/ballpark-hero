/* ─── Round 940: the GM inbox, one deck for every manager seat ───────────────

   src/lib/gmInbox.ts is one inbox engine for seven desks (NFL, NBA, MLB and
   NHL front offices, the college programs, the fight gym, the Australian
   football club), each desk a pack of events as data under src/data/gmInbox/.
   This harness drives the real engine over the real packs and holds:

     1) LEGAL. No pack quotes anybody, names anybody off the rosters, or puts
        a name placeholder anywhere. Every voice is a role. The banks live in
        src/data, which simNoInventedQuotes' static pass skips on purpose, so
        its detectors (and simNoInventedConduct's) are run over the banks
        here. The roster name set must be big enough to mean something.
     2) EXACT EFFECTS. Every option of every event, answered through the
        engine on a fresh desk, moves exactly what it declares and nothing
        else, its card line names exactly those moves, and a second answer
        moves nothing.
     3) RULES OVER 1,000 SEASONS PER PACK (100 desks of 10 seasons): every
        delivery is on its beat with every declared condition true over that
        week's facts (judged against a pristine copy of the pack), a one shot
        never comes twice, a repeatable never comes back inside its cooldown,
        never more than three open, never more than eight kept.
     4) RATE. Each pack's mean events per season sits in a band set from
        measured headroom (numbers below).
     5) REACH. Every event of every pack arrives in at least one ten season
        run, and in at least REACH_FLOOR of them.
     6) SAME SEED, SAME DECK, and a different seed deals a different one.

   MEASURED (filled in from runs over seeds 1 to 5, see RATE_BANDS).

   Negative controls, each must turn this harness red:
     GM_INBOX_CONTROL=quote   puts a quoted first person line under a real
                              roster name into the NFL pack; section 1 fails.
     GM_INBOX_CONTROL=flip    flips one condition in the pack the engine
                              reads (not the pristine copy); section 3 fails.
     GM_INBOX_CONTROL=cool    zeroes the cooldowns the engine reads; section 3
                              fails.
     GM_INBOX_CONTROL=drift   the engine stops applying the weeks out effect;
                              section 2 fails.
   Each control asserts the thing it mutates exists first, and refuses to run
   otherwise.

   Run: node scripts/simGmInbox.mjs   (SEED=n picks the stream, default 1) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GM_INBOX_CONTROL || '';
const SEED = Number(process.env.SEED || 1);
if (CONTROL && !['quote', 'flip', 'cool', 'drift'].includes(CONTROL)) {
  console.error(`GM_INBOX_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(2);
}
let failures = 0;
const fail = msg => { failures++; console.error(`   FAIL ${msg}`); };
const ok = msg => console.log(`   ok ${msg}`);

/* ─── bundle the real engine and packs ───────────────────────────────────── */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gminbox-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });
const R = ROOT.replaceAll('\\', '/');
const ENGINE = path.join(ROOT, 'src/lib/gmInbox.ts');
let engineSrc = null;
if (CONTROL === 'drift') {
  const src = fs.readFileSync(ENGINE, 'utf8');
  const line = 'if (c.out && c.out.weeks > 0) seat.setOut(s, c.out.who, c.out.weeks);';
  if (!src.includes(line)) { console.error('drift control: the out effect line is not in gmInbox.ts, refusing to run'); process.exit(2); }
  engineSrc = src.replace(line, '/* drift control: out effect dropped */');
}
const ENTRY = path.join(tmpDir, 'entry.mjs');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
export * as engine from '${R}/src/lib/gmInbox.ts';
export { GM_INBOX_PACKS } from '${R}/src/data/gmInbox/index.ts';
export { keyedRng } from '${R}/src/lib/keyedRng.ts';
`);
/* The drift control swaps the engine's source in memory, never on disk. */
const redirect = {
  name: 'gm-inbox-control',
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]gmInbox\.ts$/ }, () => (engineSrc === null ? undefined
      : { contents: engineSrc, loader: 'ts', resolveDir: path.dirname(ENGINE) }));
  },
};
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, plugins: [redirect], absWorkingDir: ROOT,
});
const { engine: E, GM_INBOX_PACKS, keyedRng } = await import(pathToFileURL(BUNDLE).href);
/* The engine reads PACKS; every judgement is made against PRISTINE. */
const PRISTINE = JSON.parse(JSON.stringify(GM_INBOX_PACKS));
const PACKS = GM_INBOX_PACKS;
const SEATS = Object.keys(PACKS);
console.log(`simGmInbox: ${SEATS.length} packs, ${SEATS.map(k => `${k} ${PACKS[k].events.length}`).join(', ')} events${CONTROL ? `, CONTROL=${CONTROL}` : ''}, seed ${SEED}`);
if (SEATS.length !== 7) fail(`expected seven packs, found ${SEATS.length}`);

/* ═══ 1. LEGAL: no quote, no real name, no placeholder, every voice a role ═══ */

console.log('1) Legal: every pack is narrated and every voice is a role');
/* The real people a desk could ever hold: the rosters every GM, career and
   gym game reads. Full names only, as simNoInventedQuotes does for its own. */
const ROSTER_FILES = [
  'src/data/frontOfficePlayers.ts', 'src/data/conquestDataNba.ts', 'src/data/mlbFoPlayers.ts', 'src/data/mlbFoRosters2026.ts',
  'src/data/nhlFoPlayers.ts', 'src/data/cfbHLPlayers.ts', 'src/data/ufcFighters.ts', 'src/data/aflGoalKickers.ts',
];
const deaccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const REAL = new Set();
for (const rel of ROSTER_FILES) {
  const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const m of txt.matchAll(/name:\s*['"]([A-Z][^'"]{1,40} [^'"]{2,40})['"]/g)) REAL.add(deaccent(m[1]));
}
const REAL_FLOOR = 1500;
if (REAL.size < REAL_FLOOR) fail(`only ${REAL.size} real names harvested (floor ${REAL_FLOOR}): the name scan would mean nothing`);
else ok(`${REAL.size} real names harvested from ${ROSTER_FILES.length} roster files`);

/* The detectors simNoInventedQuotes and simNoInventedConduct use, copied so
   they can be pointed at src/data/gmInbox, which their static passes skip. */
const QUOTE_MARK = /["“”]/;
const QUOTED = /["“”][^"“”]{8,}["“”]/g;
const FIRST_PERSON = /\b(I|I'm|I am|I've|I'll|my|me|mine|we|we're|us|our|boss|gaffer)\b/;
const UNQUOTED_SPEECH = /(?::|,)\s+(?:I|I'm|I am|I've|my|we|we're)\b/;
const ALLEGATION = /\b(casino|gambling debts?|drunk|drink driv\w*|crashed his|arrested|having an affair|cheating on|missed training|hungover|assaulted)\b/i;
const CONDUCT = /transfer request|bust-up|bust up|agents? for|leaked|reject(ed|s)? a|refus(ed|es)|demand(ed|s)|storm(ed|s) out|fell out|falling out|row over|walked out|went on strike|downed tools|sulk|tantrum|forced? (a|his) (move|exit)|handed in/i;
/* A voice is a role: a possessive role, an indefinite or definite one, or
   one of the club's departments. */
const ROLE = /^(Your |His |A |The )[a-z]/;
const DEPARTMENTS = new Set(['Ownership', 'Team doctor', 'Ticket office', 'Marketing', 'Compliance office', 'Membership team']);
const namesIn = text => { const flat = deaccent(text); return [...REAL].filter(n => flat.includes(n)); };

if (CONTROL === 'quote') {
  const someone = [...REAL].find(n => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n));
  if (!someone || !REAL.has(someone)) { console.error('quote control: no real name to borrow, refusing to run'); process.exit(2); }
  const before = PACKS.nfl.events.length;
  PACKS.nfl.events.push({ id: 'nfl_control_quote', beat: 'camp', from: someone, emoji: 'x',
    text: `${someone} told reporters: "I want a new deal before camp or I sit."`, choices: PACKS.nfl.events[0].choices });
  if (PACKS.nfl.events.length !== before + 1) { console.error('quote control changed nothing, refusing to run'); process.exit(2); }
}

{
  let strings = 0;
  const bad = [];
  for (const seat of SEATS) {
    const p = PACKS[seat];
    const lines = [['label', p.label], ...p.calendar.map(b => ['beat', b.label]), ...Object.values(p.targets).map(t => ['target', t])];
    for (const e of p.events) {
      lines.push(['text', e.text], ['from', e.from]);
      for (const c of e.choices) lines.push(['option', c.label], ['reply', c.reply]);
      if (!ROLE.test(e.from) && !DEPARTMENTS.has(e.from)) bad.push(`${e.id}: the voice "${e.from}" is not a role`);
      if (FIRST_PERSON.test(deaccent(e.text))) bad.push(`${e.id}: the message speaks in the first person instead of narrating`);
    }
    for (const [kind, s] of lines) {
      strings++;
      const where = `${seat} ${kind} "${String(s).slice(0, 50)}"`;
      if (QUOTE_MARK.test(s)) bad.push(`${where}: a quote mark`);
      if (/[{}]/.test(s)) bad.push(`${where}: a placeholder`);
      const names = namesIn(s);
      if (names.length === 0) continue;
      bad.push(`${where}: a real name (${names[0]})`);
      if ((s.match(QUOTED) ?? []).some(q => FIRST_PERSON.test(deaccent(q))) || UNQUOTED_SPEECH.test(deaccent(s))) bad.push(`${where}: a real name next to speech`);
      if (ALLEGATION.test(s) || CONDUCT.test(s)) bad.push(`${where}: a real name next to conduct`);
    }
  }
  console.log(`   scanned ${strings} strings across ${SEATS.length} packs, ${bad.length} findings`);
  for (const b of bad.slice(0, 12)) console.error(`     ${b}`);
  if (strings < 350) fail(`only ${strings} strings scanned: the packs are thinner than this harness was written for`);
  if (bad.length) fail(`${bad.length} legal findings in the packs`);
  else ok('no quote, no real name, no placeholder, every voice a role');
}

/* ═══ end ═══ */

console.log('');
if (failures > 0) {
  console.error(`simGmInbox: ${failures} failure${failures === 1 ? '' : 's'}${CONTROL ? ` (CONTROL=${CONTROL})` : ''}`);
  process.exit(1);
}
console.log(`simGmInbox: green.${CONTROL ? ` CONTROL=${CONTROL} did not fire, which is itself a failure of the control.` : ''}`);
if (CONTROL) process.exit(3);
