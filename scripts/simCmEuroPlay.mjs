/* Round 1593: your own club plays the Europa League in Club Manager (round A of the European cups program). This
 * harness grows with the round's steps; each section names the step it proves and its negative controls.
 *
 * SECTION 5, THE WEEKS THAT TICK (decision 6, the critic's correction 8, the step that ships first). A night (a
 * super cup since Round 1510, a Europa League night from this round) is a match and never a charged week, so the
 * readers that mean "weeks of the season" count worldNights.ts tickingWeeksIn and its two siblings. Measured over a
 * fleet of today's world's clubs that win things (so some seasons carry a super cup night) and clubs that do not,
 * two seasons each, on a counter stream per step (scripts/lib/worldUclFleet.mjs tape):
 *   5.1 the finance projection's weeks at week 0 of every season (backed out of the staff wages row, the one row
 *       whose weekly figure is fixed) equal the weeks the books charged by the season's end (books.season.weeks),
 *       exactly, on every save; and the same for a one year contract's settlement weeks (severanceFor);
 *   5.2 the fleet holds saves with a night (else 5.1 proves nothing about nights): at least WEEKS_MIN_NIGHT seasons;
 *   5.3 the step changes nothing on a save with no night in any season: with the step reverted (TICKING_EDITS of
 *       scripts/lib/tickingWeeks1593.mjs) every step's state and every Math.random draw is the same;
 *   5.4 the attribution, COMPUTED and printed, never asserted: the saves with a night that the step moves, by club,
 *       seed and season, and the first step where they part.
 * Control `rawlength`: section 5.1 runs on the reverted engine, so the projection charges each night as a week; it
 * must fail on exactly the seasons that hold a night (printed), and nothing else.
 *
 * Measured on the first run (2026-10-30, head of step A-weeks): see the closing report finish-1593.md.
 * Run: node scripts/simCmEuroPlay.mjs   (CM_EURO_PLAY_ONLY=5, CM_EURO_PLAY_SEEDS=1,2, CM_EURO_PLAY_CONTROL=rawlength)
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { tape } from './lib/worldUclFleet.mjs';
import { TICKING_EDITS } from './lib/tickingWeeks1593.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CM_EURO_PLAY_CONTROL || '';
const ONLY = (process.env.CM_EURO_PLAY_ONLY || '').split(',').filter(Boolean).map(Number);
const SEEDS = (process.env.CM_EURO_PLAY_SEEDS || '1,2').split(',').map(Number);
const cannot = why => { console.log(`simCmEuroPlay: cannot run: ${why}`); process.exit(2); };
const CONTROLS = { rawlength: [5, /^5\.1 /] };
if (CONTROL && !CONTROLS[CONTROL]) cannot(`no control named ${CONTROL}`);
const runs = n => (CONTROL ? CONTROLS[CONTROL][0] === n : ONLY.length === 0 || ONLY.includes(n));

const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
const lf = s => s.split('\r\n').join('\n');
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 16);

const ENTRY = [
  "export * as cm from './src/lib/clubManager';",
  "export * as cal from './src/lib/clubManagerCalendar';",
  "export * as fin from './src/lib/clubManagerFinances';",
  "export * as wn from './src/lib/worldNights';",
  "export * as eras from './src/lib/clubManagerEras';",
].join('\n');

/** The engine from the files on disk with `edits` ({ file, from, to }, each `from` exactly once) applied in the
 *  bundle only; every journey runs in a fresh vm context with the clock held and the network refused. */
async function engine(label, edits = []) {
  const applied = edits.map(() => 0);
  const plugin = {
    name: 'cm-euro-play-source',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        let text = lf(fs.readFileSync(args.path, 'utf8'));
        edits.forEach((e, i) => {
          if (e.file !== rel) return;
          const n = text.split(e.from).length - 1;
          if (n !== 1) cannot(`${label}: the line to edit stands in ${rel} ${n} times, it must be exactly once (${e.from.slice(0, 70).replaceAll('\n', ' ')})`);
          text = text.replace(e.from, e.to);
          applied[i] += 1;
        });
        return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const out = await build({ stdin: { contents: ENTRY, resolveDir: ROOT, sourcefile: `cm-euro-play-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  applied.forEach((n, i) => { if (n !== 1) cannot(`${label}: the edit of ${edits[i].file} was made ${n} times`); });
  const script = new vm.Script(out.outputFiles[0].text, { filename: `cm-euro-play-${label}.cjs` });
  return {
    label,
    async fresh() {
      const module = { exports: {} };
      const store = new Map();
      const NOW = 1791633600000;
      class HeldDate extends Date {
        constructor(...a) { super(...(a.length ? a : [NOW])); }
        static now() { return NOW; }
      }
      const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
        console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
        setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
      script.runInContext(ctx);
      await module.exports.eras.ensureAllEraRosters();
      return { ...module.exports, store };
    },
  };
}

/** One journey: startCareer, every playNextEntry, finishSeason, startNextSeason, through `seasons`. Every step on
 *  its own stretch of the counter stream; each step's state hash and draws are kept; `onStep` sees every state. */
async function journey(E, club, seed, seasons, onStep) {
  const M = await E.fresh();
  const opts = { skipHalftime: true, noCoach: true };
  const steps = [];
  let s = null;
  let k = 0;
  const step = (label, fn) => {
    k += 1;
    const r = tape((seed * 0x9e3779b1 + k * 7919) >>> 0, () => fn(s));
    if (r.value?.state) s = r.value.state;
    steps.push({ label, h: s ? sha(JSON.stringify(s)) : null, d: sha(JSON.stringify(r.draws)), n: r.draws.length });
    onStep?.(M, s, label);
  };
  step('start', () => ({ state: M.cm.startCareer(club, 'now') }));
  for (let season = 1; season <= seasons; season += 1) {
    let over = false;
    for (let i = 0; i < 300 && !over; i += 1) {
      step(`s${season}-e${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, opts); over = r.kind === 'seasonOver'; return { state: r.state }; });
    }
    if (!over) throw new Error(`${club} seed ${seed}: season ${season} did not end in 300 entries`);
    step(`s${season}-finish`, cur => ({ state: M.cm.finishSeason(cur).state }));
    if (season < seasons) step(`s${season}-rollover`, cur => ({ state: M.cm.startNextSeason(cur) }));
  }
  return steps;
}

/* ── Section 5: the weeks that tick ─────────────────────────────────────────────────────────────────────────── */
/* Clubs that win things (a league title or a cup in season one puts a super cup night in season two) and clubs that
   seldom do, all of today's world. Each is checked to be a club of the world before it plays. */
const WEEK_FLEET_ALL = ['Arsenal', 'Manchester City', 'Bayern Munich', 'Real Madrid', 'Barcelona', 'PSG', 'Inter Milan', 'Celtic', 'Everton', 'Getafe'];
const WEEK_FLEET = WEEK_FLEET_ALL.filter(c => !process.env.CM_EURO_PLAY_FLEET || process.env.CM_EURO_PLAY_FLEET.split(',').includes(c));
const WEEKS_MIN_NIGHT = Number(process.env.CM_EURO_PLAY_MIN_NIGHT || 3);

async function section5() {
  const head = await engine('head');
  const off = await engine('ticking-off', TICKING_EDITS);
  const E = CONTROL === 'rawlength' ? off : head;
  const probe = await head.fresh();
  const world = new Set(probe.cm.REAL_LEAGUES.flatMap(l => l.clubs));
  for (const c of WEEK_FLEET) if (!world.has(c)) cannot(`${c} is not a club of today's world`);
  let nightSeasons = 0;
  let moved = 0;
  let still = 0;
  const firedOn = [];
  for (const club of WEEK_FLEET) for (const seed of SEEDS) {
    const seasons = [];
    let cur = null;
    const onStep = (M, s, label) => {
      if (!s) return;
      if (label === 'start' || /-rollover$/.test(label)) {
        const one = s.squad.find(p => !p.loanFrom) ?? s.squad[0];
        cur = { season: s.season, nights: s.calendar.filter(e => e.night).length, raw: s.calendar.length,
          projWeeks: M.fin.projectFinances(s).weeksLeft, sevWeeks: M.cm.severanceFor(s, { ...one, contractYears: 1 }).weeksLeft, chargedLive: null };
        seasons.push(cur);
      }
      if (cur && /^s\d+-e\d+$/.test(label)) cur.chargedLive = M.fin.booksOf(s).season.weeks;
    };
    const steps = await journey(E, club, seed, 2, onStep);
    for (const r of seasons) {
      const charged = r.chargedLive;
      const where = `${club} seed ${seed} season ${r.season} (${r.nights} night${r.nights === 1 ? '' : 's'}, ${r.raw} entries)`;
      if (r.nights) nightSeasons += 1;
      ok(r.projWeeks === charged, `5.1 ${where}: the projection counts ${r.projWeeks} weeks at week 0, the books charged ${charged}`);
      ok(r.sevWeeks === charged, `5.1 ${where}: a one year settlement counts ${r.sevWeeks} weeks at week 0, the books charged ${charged}`);
      if (r.projWeeks !== charged) firedOn.push(where);
      /* Under the control only a season with a night may fail: the raw length and the ticking count agree otherwise. */
      if (CONTROL === 'rawlength') ok(r.nights > 0 || (r.projWeeks === charged && r.sevWeeks === charged), `5.0 ${where}: the control moved a season with no night`);
    }
    if (CONTROL) continue;
    /* 5.3 and 5.4: the same save on the reverted engine, step by step. */
    const twin = await journey(off, club, seed, 2);
    const anyNight = seasons.some(r => r.nights > 0);
    const part = steps.findIndex((x, i) => x.h !== twin[i]?.h || x.d !== twin[i]?.d);
    if (!anyNight) { still += 1; ok(part < 0 && steps.length === twin.length, `5.3 ${club} seed ${seed}: no night in any season, yet the step moves it at ${steps[part]?.label}`); }
    else if (part >= 0) { moved += 1; console.log(`  5.4 moved: ${club} seed ${seed}, nights by season ${seasons.map(r => r.nights).join('/')}, first at ${steps[part].label}`); }
    else console.log(`  5.4 not moved: ${club} seed ${seed}, nights by season ${seasons.map(r => r.nights).join('/')}`);
  }
  ok(nightSeasons >= WEEKS_MIN_NIGHT, `5.2 only ${nightSeasons} seasons of the fleet hold a night, at least ${WEEKS_MIN_NIGHT} are needed`);
  console.log(`  5 weeks: ${WEEK_FLEET.length * SEEDS.length} saves, ${nightSeasons} seasons with a night, ${still} saves with none (byte equal to the step reverted), ${moved} moved by the step`);
  if (CONTROL === 'rawlength') console.log(`  5 control rawlength failed on: ${firedOn.join('; ') || 'nothing'}`);
}

/* ── Run ───────────────────────────────────────────────────────────────────────────────────────────────────── */
if (runs(5)) await section5();
if (CONTROL) {
  const [, must] = CONTROLS[CONTROL];
  const own = fails.filter(f => must.test(f));
  const other = fails.filter(f => !must.test(f));
  if (own.length && !other.length) { console.log(`simCmEuroPlay: control ${CONTROL} FIRED (${own.length} failures, all its own)`); process.exit(1); }
  for (const f of fails.slice(0, 30)) console.log(`  FAIL ${f}`);
  console.log(`simCmEuroPlay: control ${CONTROL} DID NOT FIRE as it must (${own.length} own, ${other.length} other failures)`);
  process.exit(3);
}
for (const f of fails.slice(0, 40)) console.log(`  FAIL ${f}`);
console.log(fails.length ? `simCmEuroPlay: RED, ${checks} checks, ${fails.length} failures` : `simCmEuroPlay: green, ${checks} checks, 0 failures`);
process.exit(fails.length ? 1 : 0);
