/* ─── Round 1324: the event deck kit, the proof every pack round reruns ──────

   src/lib/gmInbox.ts is the one event deck the depth program builds on: a
   pack of cards as data, conditions over plain facts, beats, cooldowns, one
   shots, the kept and open caps, the words written from the effects, no
   Math.random. Round 1324 grows it the rules a deck of hundreds of cards
   needs (weights, story lines, a rest for the man a card is about, several
   wordings a card, cards that expire, a season clock). Every one of them is
   an optional field, so a pack without them must deal exactly what it dealt
   before. This kit holds that, and holds each new rule to its word.

     1) REPLAY. The seven GM packs at seeds 1, 2 and 3 over four drives
        (FLEET 100 desks answering three weeks in four with a random option,
        SILENT 20 desks that never answer, STUBBORN 20 desks that leave their
        first message open and answer the rest, FALLEN 20 desks handing in the
        week of the season as their clock with a year that never moves, so
        the rebase and the id suffix run), ten seasons a desk, byte equal to
        scripts/data/gmInboxReplay.json: the sha256 of every desk's JSON after
        every week with the ids dealt and the answer lines, the deck rng's call
        count and the deal count, plus a 12 character hash a desk so a red
        names the first desk that moved. The file was recorded from the base
        engine BEFORE gmInbox.ts changed, by
          SIM_EVENT_DECK_RECORD=<base sha> node scripts/simEventDeck.mjs
        which refuses unless the engine, careerInbox, keyedRng and the packs
        are byte equal to that commit. The drive is the code between the two
        FROZEN DRIVE markers below; its hash is recorded too, so a change to
        it reads as a re-record, and a re-record is the lead's call, never
        the builder's.

   No board binds gmInbox yet (the importers are its own test, the packs, the
   panel and two harnesses), so every drive here is a synthetic desk: each
   fact drawn from the range its own pack declares, per season or per week.

   Negative controls (EVENT_DECK_CONTROL), each asserts its anchor exists
   exactly once in the engine and refuses to run otherwise:
     replay   one extra deck draw before every pick; section 1 fails.

   Run: node scripts/simEventDeck.mjs
        SIM_EVENT_DECK_SHARD=nfl runs one seat's rows of section 1 only. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const T0 = Date.now();
const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const CONTROL = process.env.EVENT_DECK_CONTROL || '';
const RECORD = process.env.SIM_EVENT_DECK_RECORD || '';
const SHARD = process.env.SIM_EVENT_DECK_SHARD || '';
const REPLAY_FILE = path.join(ROOT, 'scripts/data/gmInboxReplay.json');
const CONTROLS = ['replay'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`EVENT_DECK_CONTROL=${CONTROL} is not a control this kit knows`); process.exit(2); }
if (RECORD && (CONTROL || SHARD)) { console.error('a recording runs the whole replay with no control, refusing'); process.exit(2); }
const red = new Set();
let failures = 0;
const fail = (sec, msg) => { failures++; red.add(sec); console.error(`   FAIL ${msg}`); };
const ok = msg => console.log(`   ok ${msg}`);
/* Every read of a src file normalises line endings, so an anchor typed here
   (LF) matches on a CRLF checkout too. */
const readSrc = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const count = (hay, needle) => hay.split(needle).length - 1;

/* ─── bundle the real engine and every pack index the kit knows ─────────── */

/* The pack indexes, one line each, append only: W2 and W3 add theirs. */
const PACK_INDEXES = [
  ['src/data/gmInbox/index.ts', 'GM_INBOX_PACKS'],
];
const ENGINE_REL = 'src/lib/gmInbox.ts';
/* The controls that swap one line of the engine: the line, and what it becomes. */
const ENGINE_CONTROLS = {
  replay: ['const e = came.splice(Math.floor(rng() * came.length), 1)[0];',
    'rng(); const e = came.splice(Math.floor(rng() * came.length), 1)[0]; /* replay control */'],
};
let engineSrc = null;
if (ENGINE_CONTROLS[CONTROL]) {
  const src = readSrc(ENGINE_REL);
  const [line, swap] = ENGINE_CONTROLS[CONTROL];
  const n = count(src, line);
  if (n !== 1) { console.error(`${CONTROL} control: its anchor is in gmInbox.ts ${n} times, not once, refusing to run`); process.exit(2); }
  engineSrc = src.replace(line, swap);
  if (engineSrc === src) { console.error(`${CONTROL} control changed nothing, refusing to run`); process.exit(2); }
}
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventdeck-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });
const R = ROOT.replaceAll('\\', '/');
const ENTRY = path.join(tmpDir, 'entry.mjs');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  `export * as engine from '${R}/${ENGINE_REL}';`,
  `export { keyedRng } from '${R}/src/lib/keyedRng.ts';`,
  ...PACK_INDEXES.map(([rel, name], i) => `export { ${name} as packs${i} } from '${R}/${rel}';`),
].join('\n'));
/* A control swaps the engine's source in memory, never on disk. */
const redirect = {
  name: 'event-deck-control',
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]gmInbox\.ts$/ }, () => (engineSrc === null ? undefined
      : { contents: engineSrc, loader: 'ts', resolveDir: path.join(ROOT, 'src/lib') }));
  },
};
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, plugins: [redirect], absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);
const E = B.engine;
const { keyedRng } = B;
const GM = B.packs0;
/* Every pack the kit knows, by a tag that is unique across indexes. */
const ALL_PACKS = Object.assign({}, ...PACK_INDEXES.map((_, i) => B[`packs${i}`]));
const GM_SEATS = Object.keys(GM);
console.log(`simEventDeck: ${Object.keys(ALL_PACKS).length} packs (${GM_SEATS.join(', ')})${CONTROL ? `, CONTROL=${CONTROL}` : ''}${SHARD ? `, shard ${SHARD}` : ''}`);

/* ═══ FROZEN DRIVE: begin. Section 1's recording was made with exactly this
   code, and its hash is in the recording; any change is a re-record. ═══ */
const SEASONS = 10;
const DRIVES = {
  FLEET: { desks: 100, policy: 'sometimes', fallen: false },
  SILENT: { desks: 20, policy: 'never', fallen: false },
  STUBBORN: { desks: 20, policy: 'stubborn', fallen: false },
  FALLEN: { desks: 20, policy: 'sometimes', fallen: true },
};
const clamp100 = v => Math.max(0, Math.min(100, v));
const newDesk = () => ({ morale: 50, trust: 50, fans: 50, cash: 10, year: 2030, recruit: 50, out: {}, rating: {} });
const BINDING = {
  moodOf: s => s.trust, setMood: (s, v) => { s.trust = v; },
  addPopularity: (s, d) => { s.fans = clamp100(s.fans + d); },
  addCash: (s, a) => { s.cash = Math.round((s.cash + a) * 1000) / 1000; },
  yearOf: s => s.year,
  setOut: (s, who, w) => { s.out[who] = (s.out[who] ?? 0) + w; },
  addRating: (s, who, d) => { s.rating[who] = (s.rating[who] ?? 0) + d; },
  addRecruit: (s, d) => { s.recruit += d; },
};
const draw = (spec, rng) => (spec.kind === 'bool' ? rng() < spec.p : Math.round((spec.min + rng() * (spec.max - spec.min)) * 100) / 100);
const factsOf = (pack, per, base, rng) => {
  const out = { ...base };
  for (const [k, spec] of Object.entries(pack.facts)) if (spec.per === per) out[k] = draw(spec, rng);
  return out;
};
const openOf = s => (s.phoneInbox ?? []).filter(m => m.answered === undefined);
/* The answer policies, a parameter of the drive (the room W1b's best and
   worst answer fleets need). */
const POLICIES = {
  sometimes: (s, got, bound, rng, lines) => {
    for (const m of openOf(s)) if (rng() < 0.75) lines.push(E.answerGmInbox(s, m.id, Math.floor(rng() * m.choices.length), bound));
  },
  never: () => undefined,
  stubborn: (s, got, bound, rng, lines, st) => {
    for (const m of got) { if (st.first === null) st.first = m.id; else lines.push(E.answerGmInbox(s, m.id, 0, bound)); }
  },
};
/** One desk, ten seasons. opts: policy (a POLICIES name or a function), bind
 *  (extra binding fields), between (takes the desk after a week and returns
 *  the desk to go on with: the reload proof), observe (sees every week and
 *  every dealt message). The recording uses none of them. */
function runDesk(pack, tag, seed, kind, desk, opts = {}) {
  const drive = DRIVES[kind];
  const policy = typeof opts.policy === 'function' ? opts.policy : POLICIES[opts.policy ?? drive.policy];
  const weeks = E.gmSeasonWeeks(pack);
  const key = `simEventDeck|${kind}|${tag}|${seed}|${desk}`;
  const factRng = keyedRng(`${key}|facts`);
  const rawDeck = keyedRng(`${key}|deck`);
  let calls = 0;
  const deckRng = () => { calls++; return rawDeck(); };
  const answerRng = keyedRng(`${key}|answer`);
  const bound = E.bindGmInbox(pack, { ...BINDING, ...(opts.bind ?? {}) });
  const h = crypto.createHash('sha256');
  const st = { first: null };
  let s = newDesk();
  let deals = 0;
  let suffixed = 0;
  let clock = 0;
  for (let season = 0; season < SEASONS; season++) {
    s.year = drive.fallen ? 2030 : 2030 + season;
    const seasonFacts = factsOf(pack, 'season', {}, factRng);
    for (let w = 0; w < weeks.length; w++) {
      const facts = factsOf(pack, 'week', seasonFacts, factRng);
      const at = drive.fallen ? w : clock;
      const got = E.gmInboxWeek(s, bound, weeks[w], facts, at, deckRng);
      deals += got.length;
      suffixed += got.filter(m => m.id !== `${m.defId}-${s.year}-w${at}`).length;
      const lines = [];
      policy(s, got, bound, answerRng, lines, st);
      h.update(`${JSON.stringify(s)}|${got.map(m => m.id).join(',')}|${lines.join('/')}\n`);
      if (opts.observe) opts.observe({ s, got, beat: weeks[w], facts, clock: at, season, week: w, desk, lines });
      if (opts.between) s = opts.between(s);
      clock++;
    }
  }
  return { hash: h.digest('hex'), calls, deals, suffixed, s };
}
/** One row: every desk of one drive for one pack and seed. */
function runRow(pack, tag, seed, kind, opts = {}) {
  const h = crypto.createHash('sha256');
  const desks = [];
  let calls = 0;
  let deals = 0;
  let suffixed = 0;
  for (let d = 0; d < DRIVES[kind].desks; d++) {
    const r = runDesk(pack, tag, seed, kind, d, opts);
    h.update(`${r.hash}\n`);
    desks.push(r.hash.slice(0, 12));
    calls += r.calls;
    deals += r.deals;
    suffixed += r.suffixed;
  }
  return { hash: h.digest('hex'), calls, deals, suffixed, desks };
}
/* ═══ FROZEN DRIVE: end ═══ */

const SEEDS = [1, 2, 3];
const KINDS = Object.keys(DRIVES);
const DRIVE_HASH = (() => {
  const txt = fs.readFileSync(SELF, 'utf8').replace(/\r\n/g, '\n');
  const a = txt.indexOf('/* ═══ FROZEN DRIVE: begin');
  const b = txt.indexOf('/* ═══ FROZEN DRIVE: end ═══ */');
  if (a < 0 || b < a) { console.error('the frozen drive markers are gone, refusing to run'); process.exit(2); }
  return crypto.createHash('sha256').update(txt.slice(a, b)).digest('hex').slice(0, 12);
})();
const secs = () => ((Date.now() - T0) / 1000).toFixed(1);

/* ═══ 1. REPLAY: the seven GM packs deal exactly what the base engine dealt ═══ */

console.log(`1) Replay: ${GM_SEATS.length} GM packs, seeds ${SEEDS.join(', ')}, drives ${KINDS.join(', ')}, ${SEASONS} seasons a desk`);
const ROWS = {};
{
  const seats = SHARD ? GM_SEATS.filter(k => k === SHARD) : GM_SEATS;
  if (SHARD && seats.length === 0) { console.error(`SIM_EVENT_DECK_SHARD=${SHARD} is not a GM seat`); process.exit(2); }
  for (const seat of seats) for (const seed of SEEDS) for (const kind of KINDS) ROWS[`${seat}|${seed}|${kind}`] = runRow(GM[seat], seat, seed, kind);
  const all = Object.values(ROWS);
  const deals = all.reduce((n, r) => n + r.deals, 0);
  const calls = all.reduce((n, r) => n + r.calls, 0);
  const suffixed = Object.entries(ROWS).filter(([k]) => k.endsWith('|FALLEN')).reduce((n, [, r]) => n + r.suffixed, 0);
  console.log(`   ${all.length} rows, ${deals} events dealt, ${calls} deck draws, ${suffixed} repeat ids suffixed on FALLEN desks (${secs()} s)`);
  /* Measured 296 over the whole replay (2026-10-13); one seat alone may have none. */
  if (!SHARD && suffixed === 0) fail(1, 'no FALLEN desk ever repeated an id, so the id suffix never ran');
  if (RECORD) {
    const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
    let sha = '';
    try { sha = git(['rev-parse', '--verify', `${RECORD}^{commit}`]); } catch { console.error(`${RECORD} is not a commit, refusing to record`); process.exit(2); }
    const watched = ['src/lib/gmInbox.ts', 'src/lib/careerInbox.ts', 'src/lib/keyedRng.ts', 'src/data/gmInbox'];
    try { execFileSync('git', ['diff', '--quiet', sha, '--', ...watched], { cwd: ROOT, stdio: 'ignore' }); } catch {
      console.error(`the engine or its packs differ from ${sha}: a recording is made from the base engine only, refusing`);
      process.exit(2);
    }
    const meta = { round: 1324, base: sha, gmInboxBlob: git(['rev-parse', `${sha}:src/lib/gmInbox.ts`]), drive: DRIVE_HASH, seeds: SEEDS, seasons: SEASONS, drives: DRIVES };
    const text = `{\n${Object.entries(meta).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}\n  "rows": {\n${
      Object.entries(ROWS).map(([k, r]) => `    ${JSON.stringify(k)}: ${JSON.stringify(r)}`).join(',\n')}\n  }\n}\n`;
    fs.writeFileSync(REPLAY_FILE, text);
    console.log(`   RECORDED ${all.length} rows from ${sha.slice(0, 8)} (gmInbox.ts blob ${meta.gmInboxBlob.slice(0, 8)}, drive ${DRIVE_HASH}) into scripts/data/gmInboxReplay.json, ${text.length} bytes`);
  }
  const rec = fs.existsSync(REPLAY_FILE) ? JSON.parse(fs.readFileSync(REPLAY_FILE, 'utf8')) : null;
  if (!rec) fail(1, 'there is no recording at scripts/data/gmInboxReplay.json: it is recorded from the base engine, never by hand');
  else {
    console.log(`   the recording: base ${rec.base.slice(0, 8)}, gmInbox.ts blob ${rec.gmInboxBlob.slice(0, 8)}, drive ${rec.drive}, ${Object.keys(rec.rows).length} rows`);
    if (rec.drive !== DRIVE_HASH) fail(1, `the frozen drive changed since the recording (${rec.drive} recorded, ${DRIVE_HASH} now): a re-record is the lead's call`);
    const want = SHARD ? Object.keys(rec.rows).filter(k => k.startsWith(`${SHARD}|`)) : Object.keys(rec.rows);
    const moved = [];
    for (const k of want) {
      const r = ROWS[k];
      const w = rec.rows[k];
      if (!r) { moved.push(`${k}: recorded, not run`); continue; }
      if (r.hash === w.hash && r.calls === w.calls && r.deals === w.deals) continue;
      const d = r.desks.findIndex((x, i) => x !== w.desks[i]);
      moved.push(`${k}: hash ${r.hash.slice(0, 12)} not ${w.hash.slice(0, 12)}, deck draws ${r.calls} not ${w.calls}, deals ${r.deals} not ${w.deals}, first desk that moved ${d}`);
    }
    for (const k of Object.keys(ROWS)) if (!rec.rows[k]) moved.push(`${k}: run, not recorded`);
    for (const m of moved.slice(0, 12)) console.error(`     ${m}`);
    if (moved.length) fail(1, `${moved.length} of ${want.length} rows differ from the recording`);
    else ok(`all ${want.length} rows byte equal to the base engine's recording (desk states, ids, answer lines, deck draws, deals)`);
  }
}

/* ═══ end ═══ */

console.log('');
console.log(`runtime ${secs()} s`);
if (failures > 0) {
  console.error(`simEventDeck: ${failures} failure${failures === 1 ? '' : 's'}, red sections ${[...red].sort((a, b) => a - b).join(', ')}${CONTROL ? ` (CONTROL=${CONTROL} fired)` : ''}`);
  process.exit(1);
}
console.log(`simEventDeck: green.${CONTROL ? ` CONTROL=${CONTROL} did not fire, which is itself a failure of the control.` : ''}`);
if (CONTROL) process.exit(3);
