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
 * SECTIONS 1 TO 4 AND 6, YOUR CLUB PLAYS IT (step A-play), over PLAY_FLEET (a club per league size that earns a place
 * often, plus Liverpool and Real Betis, whose real fifth place was a Champions League one), seeds 1 to 4, two seasons:
 *   1 the nights: a participant season holds 17 'uel' entries in order, each on a Thursday, none on another entry's
 *     day, a week apart at least, no other entry's date moved, and its tail count is step A0's table (TAIL); a
 *     watcher's calendar holds none; the date the Europa League screen gives each night (worldCompNightDates) is its
 *     entry's own Thursday (the critic's correction 6a). Controls `nothursday`, `friday`.
 *   2 one competition: a winner crowned, my club an entrant, 8 league phase games a club, no club in both
 *     competitions, each night's log score is its record in orientation; the season review's line (summary.uelRun)
 *     is how far my club went, worked out here from the evaluation, a season with no Europa League has no line, and a
 *     winner's review says next season's Champions League. Controls `mineflip`, `nouelucl` (the review's line back on the
 *     league place alone).
 *  2b a job move in the middle of a participant season (three nights played; the first MOVE_SAVES such seasons), to
 *     one of its entrants and to a club outside its field: the save stops playing it, and the season still crowns a
 *     winner with all 36 clubs on eight league phase games (the critic's correction 3). Control `nocarry` (the carry
 *     back on the watcher's rule: the move to an entrant drops the competition). And a third move, to a club of this
 *     season's Champions League (its own stream): after every move no club is in both competitions. Control
 *     `carryall` (fix-1509's guard stood down for every slice of mine, as the round first wrote it).
 *   3 the tie path: a two legged tie of mine is decided on its aggregate, penalties only when level, first legs and
 *     league phase nights never; the match report's through/out agrees. Control `legfromucl`.
 *   4 who plays: season one never (the critic's correction 1), from season two exactly on routes L, C and P.
 *     Control `noplaygate`.
 *   6 the head with the participant open and the ticking weeks reverted is the base (CM_EURO_PLAY_BASE, 14a9af704)
 *     byte for byte, every step and every draw; a save with no night in any season is the base as it stands.
 *     Control `noplayrevert`.
 * SECTION 7, CRAFTED RUNS (added by the fixes after the reviews of 2026-10-30): one participant season played out by
 * the engine (Everton in the Championship and the Europa League by its cup, playCmEuroPlay's season one streams, then
 * the first of CRAFT_STREAMS where it keeps its job and is not promoted), then my nights rewritten by a plan (lose
 * the league phase, go out in the play-off, the round of 16, the quarter-finals, the semi-finals, the final, or win):
 *   7.1 each plan's run ends where it says, and the board's rank (uelProgressRank) and a Europa League target of 1
 *       and of 2 grade it by the table CRAFT_RANK (advice 16: the play-off counts as the knockouts, a quarter-final
 *       exit is not the semi-finals). Control `uelrank`.
 *   7.2 the winner: its European place is the Champions League (euroPlaceOf), its review says so, and next season it
 *       plays the Champions League from a league with no European places, its group to matchday 6, and is not in
 *       the Europa League too. Controls `noplace`, `nouelucl` (sections 2 and 7, so a seed set with no winner in the
 *       fleet still fires it), `nowinnerucl`.
 *   7.3 every night's fixture before it is played: the final on a neutral ground, extra time exactly on a night that
 *       settles its tie (Round 670's deflator). Controls `notneutral`, `noet`.
 *   7.4 the critic's correction 7: one state's evaluation read before a night is recorded and after it shows the
 *       record. Control `inplace`.
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
/* A control names the section (or sections) it runs and the failures that are its own. */
const CONTROLS = { rawlength: [5, /^5.1 /], nothursday: [1, /^1 /], mineflip: [2, /^2 /], noplaygate: [4, /^4 /], noplayrevert: [6, /^6 /], legfromucl: [3, /^3 /], nocarry: [2, /^2b /],
  nouelucl: [[2, 7], /^[27] .*review does not say next season's Champions League/], friday: [1, /^1 .*the screen dates/],
  uelrank: [7, /^7 /], noplace: [7, /^7 /], nowinnerucl: [7, /^7 /], notneutral: [7, /^7 /], noet: [7, /^7 /], inplace: [7, /^7 /], carryall: [2, /^2b .*in both competitions/] };
if (CONTROL && !CONTROLS[CONTROL]) cannot(`no control named ${CONTROL}`);
const runs = n => (CONTROL ? [].concat(CONTROLS[CONTROL][0]).includes(n) : ONLY.length === 0 || ONLY.includes(n));

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
    onStep?.(M, s, label, r.value);
  };
  step('start', () => ({ state: M.cm.startCareer(club, 'now') }));
  for (let season = 1; season <= seasons; season += 1) {
    let over = false;
    for (let i = 0; i < 300 && !over; i += 1) {
      step(`s${season}-e${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, opts); over = r.kind === 'seasonOver'; return { state: r.state, report: r.report }; });
    }
    if (!over) throw new Error(`${club} seed ${seed}: season ${season} did not end in 300 entries`);
    /* The summary rides along for section 2's review line (the step's hash reads the state and the draws only). */
    step(`s${season}-finish`, cur => { const f = M.cm.finishSeason(cur); return { state: f.state, summary: f.summary }; });
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

/* ── Sections 1, 2, 4 and 6: your club plays the Europa League ──────────────────────────────────────────────── */
/* Clubs that earn a Europa League place often (one per league size where the game has one), and the two clubs whose
   real fifth place was a Champions League one (season one must never play: the critic's correction 1). Each is
   checked to be a club of today's world. Two seasons each, so season two is the first that can play. */
const PLAY_FLEET_ALL = ['Aston Villa', 'Real Sociedad', 'Lazio', 'Eintracht Frankfurt', 'Lyon', 'AZ Alkmaar', 'Braga', 'Rangers', 'Hajduk Split', 'Liverpool', 'Real Betis'];
const PLAY_FLEET = PLAY_FLEET_ALL.filter(c => !process.env.CM_EURO_PLAY_FLEET || process.env.CM_EURO_PLAY_FLEET.split(',').includes(c));
const PLAY_SEEDS = (process.env.CM_EURO_PLAY_PLAY_SEEDS || '1,2,3,4').split(',').map(Number);
const PLAY_MIN = Number(process.env.CM_EURO_PLAY_MIN_PLAY || 4);
const BASE = process.env.CM_EURO_PLAY_BASE || '14a9af704';
/* Step A0's table (results-g/rc-1593.txt): tail nights by league size, a league without a cup marked. */
const TAIL = { 10: 5, 12: 3, 14: 2, 15: 1, 16: 1, 18: 1, '18nocup': 0, 20: 0, 24: 0 };
const CM_FILE = 'src/lib/clubManager.ts';
const CAL_FILE = 'src/lib/clubManagerCalendar.ts';
const counts3 = { ties: 0 };
const CONTROL_EDITS = {
  /* The first leg read from nowhere (as from the Champions League's bracket, which a Europa League tie is never in). */
  legfromucl: [{ file: CM_FILE, from: '  if (!my?.firstLeg) return null;\n', to: '  return null;\n' }],
  nothursday: [{ file: CAL_FILE, from: 'addDays(last, wasSaturday ? 5 : 1)', to: 'addDays(last, wasSaturday ? 4 : 1)' }],
  mineflip: [{ file: CM_FILE, from: '{ h: my.atHome ? mine : theirs, a: my.atHome ? theirs : mine }', to: '{ h: my.atHome ? theirs : mine, a: my.atHome ? mine : theirs }' }],
  noplaygate: [{ file: CM_FILE, from: "  if (play && tables && mine.clubs.length === UCL_LEAGUE.clubs && (earned === 'L'", to: "  if (mine.clubs.length === UCL_LEAGUE.clubs && (earned === 'L'" }],
  /* Section 2: the review's Champions League line back on the league place alone (the critic's correction 13). */
  nouelucl: [{ file: CM_FILE, from: '    qualifiedUcl: position <= uclPlacesIn(careerLeagueOf(state)) || wonUelThisSeason(state),', to: '    qualifiedUcl: position <= uclPlacesIn(careerLeagueOf(state)),' }],
  /* Section 2b: carryWorldComp back on the watcher's rule, so a move to an entrant drops the competition. */
  nocarry: [{ file: CM_FILE, from: '(!!slice.me || !names.some(c => slice.clubs.includes(c)))', to: '!names.some(c => slice.clubs.includes(c))' }],
  /* Section 1: the screen's date of a participant night back on the watcher's rule, the day after (correction 6a). */
  friday: [{ file: CAL_FILE, from: "    if (p.entry && state.calendar[p.at]?.type === 'uel') return dates[p.at];\n", to: '' }],
  /* Section 7: a quarter-final exit counted as the semi-finals reached (advice 16). */
  uelrank: [{ file: CM_FILE, from: '{ PO: 1, R16: 1, QF: 1, SF: 2, F: 3 }', to: '{ PO: 1, R16: 1, QF: 2, SF: 2, F: 3 }' }],
  /* Section 7: the board's Champions League rung forgets the Europa League winner (correction 13's second reader). */
  noplace: [{ file: CM_FILE, from: 'if ((league.euro && pos > 0 && pos <= places) || wonUelThisSeason(career)) place', to: 'if ((league.euro && pos > 0 && pos <= places)) place' }],
  /* Section 7: the winner's Champions League place lost again where the next league has no European places. */
  nowinnerucl: [{ file: CM_FILE, from: '  const wonUelHere = !moving && wonUelPlayed;', to: '  const wonUelHere = false;' }],
  /* Section 7: the one match final at the bracket's home club. */
  notneutral: [{ file: CM_FILE, from: "      home: my.night.stage === 'F' ? null : my.atHome,", to: '      home: my.atHome,' }],
  /* Section 7: a Europa League decider off the extra time deflator. */
  noet: [{ file: CM_FILE, from: '      ...(my.settles ? { extraTime: true } : {}),\n', to: '' }],
  /* Section 7: completeWorldNight writes into the slice instead of replacing it (correction 7). */
  inplace: [{ file: CM_FILE, from: "  setWorldComp(state, 'uel', { ...slice, mine: { ...(slice.mine ?? {}), [n]: res } });", to: '  slice.mine = { ...(slice.mine ?? {}), [n]: res };' }],
  /* Section 2b: fix-1509's Champions League guard stood down for every slice of mine, not only a move to an entrant. */
  carryall: [{ file: CM_FILE, from: "comp === 'uel' && held && !toEntrant && uclEntrantsOf(joined)", to: "comp === 'uel' && held && !held.me && uclEntrantsOf(joined)" }],
};
const iso = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const dayNo = d => Date.UTC(d.y, d.m - 1, d.d) / 86400000;

/** Section 1 on a participant season's opening state: the nights on the calendar. */
function nightsCheck(M, s, where, counts) {
  const cal = s.calendar;
  const dates = M.cal.entryDatesOf(s);
  const uel = cal.flatMap((e, i) => (e.type === 'uel' ? [{ n: e.night?.n, i, d: dates[i] }] : []));
  ok(uel.length === 17 && uel.every((x, k) => x.n === k), `1 ${where}: ${uel.length} Europa League nights, in order ${uel.map(x => x.n).join(',')}`);
  const plain = cal.filter(e => e.type !== 'uel');
  const plainDates = M.cal.dateOfEntries(M.cal.worldYearOf(s), plain, null);
  ok(same(dates.filter((_, i) => cal[i].type !== 'uel').map(iso), plainDates.map(iso)), `1 ${where}: an entry moved when the nights went in`);
  uel.forEach((x, k) => {
    const dow = new Date(Date.UTC(x.d.y, x.d.m - 1, x.d.d)).getUTCDay();
    ok(dow === 4, `1 ${where}: night ${x.n} on ${iso(x.d)} is no Thursday`);
    ok(!dates.some((d, i) => i !== x.i && iso(d) === iso(x.d)), `1 ${where}: night ${x.n} shares ${iso(x.d)} with another entry`);
    if (k > 0) ok(dayNo(x.d) - dayNo(uel[k - 1].d) >= 7, `1 ${where}: night ${x.n} on ${iso(x.d)} is less than a week after the last`);
  });
  /* The critic's correction 6a: the date the Europa League screen gives each night (worldCompNightDates, read by its
     run rows) is the entry's own Thursday, never the watcher's day after. Control `friday`. */
  const shown = M.cal.worldCompNightDates(s, 'uel') ?? [];
  uel.forEach(x => ok(!!shown[x.n] && iso(shown[x.n]) === iso(x.d), `1 ${where}: the screen dates night ${x.n} ${shown[x.n] ? iso(shown[x.n]) : 'nowhere'}, its entry is on ${iso(x.d)}`));
  const lastPlain = cal.reduce((a, e, i) => (e.type !== 'uel' ? i : a), -1);
  const tail = uel.filter(x => x.i > lastPlain).length;
  const lg = M.cm.careerLeagueOf(s);
  const key = lg.cupName === null ? `${lg.clubs.length}nocup` : lg.clubs.length;
  ok(TAIL[key] === tail, `1 ${where}: ${tail} tail nights, step A0's table says ${TAIL[key]} for ${key}`);
  counts.tail[key] = tail;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Section 2 on a participant season's last state before finishSeason: one competition, my results recorded. */
function competitionCheck(M, s, where, throughs = []) {
  const slice = s.worldComps?.uel;
  const res = M.cm.evalWorldComp(s, 'uel', Infinity);
  ok(!!res?.done && !!res.winner, `2 ${where}: the Europa League crowned no winner`);
  ok(slice.clubs.includes(s.clubName), `2 ${where}: my club is not an entrant`);
  ok((res?.table ?? []).every(r => r.w + r.d + r.l === 8), `2 ${where}: a club did not play eight league phase matches`);
  const ucl = new Set(M.cm.uclEntrantsOf(s));
  ok(!slice.clubs.some(c => ucl.has(c)), `2 ${where}: a club is in both competitions`);
  const played = (s.resultLog ?? []).filter(r => r.competition === 'uel');
  ok(played.length === Object.keys(slice.mine ?? {}).length, `2 ${where}: ${played.length} nights in the result log, ${Object.keys(slice.mine ?? {}).length} recorded`);
  for (const r of played) {
    const n = s.calendar[r.week]?.night?.n;
    const rec = slice.mine?.[n];
    const fx = res?.nights[n]?.fixtures.find(x => x.home === s.clubName || x.away === s.clubName);
    const [gf, ga] = r.score.split('-').map(Number);
    const mine = fx?.home === s.clubName ? [rec?.h, rec?.a] : [rec?.a, rec?.h];
    ok(!!rec && mine[0] === gf && mine[1] === ga, `2 ${where}: night ${n} is ${r.score} in the log, recorded ${JSON.stringify(rec)}`);
  }
  /* Section 3, the tie path (critic-1348 correction 1): every tie of mine settled over two legs is decided on the
     aggregate of its two records, extra time and a shootout only where the aggregate is level, and the evaluation's
     winner is the aggregate's; a final or a league phase night carries a shootout only when level. */
  if (runs(3)) {
    for (const t of (res?.ties ?? []).filter(x => (x.home === s.clubName || x.away === s.clubName) && x.winner)) {
      const n1 = res.nights.findIndex(x => x.stage === t.round && (x.leg ?? 1) === 1);
      const n2 = res.nights.findIndex(x => x.stage === t.round && x.leg === 2);
      const r1 = slice.mine?.[n1];
      const r2 = n2 >= 0 ? slice.mine?.[n2] : undefined;
      if (!r1 || (n2 >= 0 && !r2)) continue;
      counts3.ties += 1;
      const homeAgg = r1.h + (r2 ? r2.a : 0);
      const awayAgg = r1.a + (r2 ? r2.h : 0);
      const level = homeAgg === awayAgg;
      const pens = r2 ? r2.pens : r1.pens;
      ok(level === !!pens, `3 ${where}: the ${t.round} tie is ${homeAgg}-${awayAgg} on aggregate and ${pens ? 'went' : 'did not go'} to penalties`);
      if (!level) ok(t.winner === (homeAgg > awayAgg ? t.home : t.away), `3 ${where}: the ${t.round} tie went to ${t.winner} against its aggregate ${homeAgg}-${awayAgg}`);
      if (r2) ok(!r1.et && !r1.pens, `3 ${where}: the ${t.round} first leg carries extra time or a shootout`);
    }
    /* What the match itself told the manager (its report's tie line) agrees with the tie the competition records. */
    for (const x of throughs) {
      const t = (res?.ties ?? []).find(v => v.round === x.round && (v.home === s.clubName || v.away === s.clubName));
      ok(!!t && (t.winner === s.clubName) === x.through, `3 ${where}: the ${x.round} second leg told the manager ${x.through ? 'through' : 'out'}, the competition says ${t?.winner}`);
    }
    for (let n = 0; n < 8; n += 1) if (slice.mine?.[n]) ok(!slice.mine[n].et && !slice.mine[n].pens, `3 ${where}: league phase night ${n} carries extra time or a shootout`);
  }
  return played.length;
}

/** Section 2b (the critic's correction 3): a job move in the middle of a participant season (three nights played), to
 *  one of its entrants and to a club outside its field: the save no longer plays it, and the season still crowns a
 *  winner with every club on eight league phase games (my old club's nights to come drawn from their streams). */
const MOVE_SAVES = 3;
function moveCheck(M, s, where, counts) {
  const slice = s.worldComps.uel;
  const leagues = M.cm.REAL_LEAGUES.filter(l => l.euro);
  const home = leagues.find(l => l.clubs.includes(s.clubName));
  const entrant = [...slice.clubs].sort().find(c => c !== s.clubName && leagues.some(l => l !== home && l.clubs.includes(c)));
  const outside = leagues.filter(l => l !== home).map(l => l.clubs[l.clubs.length - 1]).find(c => !slice.clubs.includes(c));
  /* The read review's minor 1: and to a club of this season's Champions League (its own stream, so the two moves
     above draw as they always did). Wherever the save lands, no club is in both competitions. */
  const inUcl = [...(s.worldComps.ucl?.clubs ?? [])].sort().find(c => !slice.clubs.includes(c) && leagues.some(l => l !== home && l.clubs.includes(c)));
  const both = st => (st.worldComps?.uel ? M.cm.uclEntrantsOf(st).filter(c => st.worldComps.uel.clubs.includes(c)) : []);
  for (const [kind, club] of [['entrant', entrant], ['outside', outside], ['ucl', inUcl]]) {
    if (!club) { ok(false, `2b ${where}: no ${kind} club to move to`); continue; }
    const lg = leagues.find(l => l.clubs.includes(club));
    const open = { club, league: lg.id, tier: 3, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted' };
    const base = JSON.parse(JSON.stringify(s));
    const seed = kind === 'ucl' ? 0x2c000 + (counts.uclMoves ?? 0) : 0x2b000 + (counts.moves ?? 0);
    let st = tape(seed, () => M.cal.joinClubNow({ ...base, jobHunt: { open, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null } })).value;
    if (!st) { ok(false, `2b ${where} to ${club} (${kind}): the move was refused`); continue; }
    ok(!M.cm.uelParticipant(st), `2b ${where} to ${club} (${kind}): the save still plays the Europa League after the move`);
    ok(!both(st).length, `2b ${where} to ${club} (${kind}): ${both(st).join(', ')} in both competitions after the move`);
    if (kind === 'ucl') {
      counts.uclMoves = (counts.uclMoves ?? 0) + 1;
      if (st.uclGroup) counts.uclMovesInIt = (counts.uclMovesInIt ?? 0) + 1;
      if (st.worldComps?.uel) counts.uclMovesKept = (counts.uclMovesKept ?? 0) + 1;
      if (!st.worldComps?.uel) continue;
    }
    let over = false;
    for (let i = 0; i < 300 && !over; i += 1) {
      const r = tape(0x2b100 + i, () => M.cm.playNextEntry(st, { skipHalftime: true, noCoach: true })).value;
      st = r.state; over = r.kind === 'seasonOver';
    }
    const res = M.cm.evalWorldComp(st, 'uel', Infinity);
    ok(over && !!res?.done && !!res.winner, `2b ${where} to ${club} (${kind}): the Europa League crowned no winner after the move`);
    ok((res?.table ?? []).length === 36 && res.table.every(r => r.w + r.d + r.l === 8), `2b ${where} to ${club} (${kind}): a club did not play eight league phase games after the move`);
    if (kind !== 'ucl') counts.moves = (counts.moves ?? 0) + 1;
  }
}

/** Section 2, the season review: the line says how far my club went, worked out here from the evaluation (never
 *  through the engine's uelRunWords), and a Europa League won says next season's Champions League (correction 13). */
const RUN_WORDS = { PO: 'knockout play-off', R16: 'round of 16', QF: 'quarter-finals', SF: 'semi-finals', F: 'final' };
const ORDER = ['PO', 'R16', 'QF', 'SF', 'F'];
function reviewCheck(M, s, summary, where, counts) {
  const res = M.cm.evalWorldComp(s, 'uel', Infinity);
  const me = s.clubName;
  const mine = (res?.ties ?? []).filter(t => t.home === me || t.away === me).sort((a, b) => ORDER.indexOf(b.round) - ORDER.indexOf(a.round));
  const pos = (res?.table ?? []).findIndex(r => r.club === me) + 1;
  const sfx = n => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  const want = res?.winner === me ? 'won it'
    : mine[0] ? (mine[0].round === 'F' ? 'lost the final' : `out in the ${RUN_WORDS[mine[0].round]}`)
      : `${pos}${sfx(pos)} of ${res?.table?.length ?? 0} in the league phase`;
  ok(summary?.uelRun === want, `2 ${where}: the review's Europa League line reads "${summary?.uelRun}", the competition says "${want}"`);
  if (res?.winner === me) { counts.uelWon = (counts.uelWon ?? 0) + 1; ok(summary?.qualifiedUcl === true, `2 ${where}: won the Europa League and the review does not say next season's Champions League`); }
  counts.review = (counts.review ?? 0) + 1;
}

async function sectionPlay() {
  const head = await engine('head', CONTROL_EDITS[CONTROL] ?? []);
  const probe = await head.fresh();
  const world = new Set(probe.cm.REAL_LEAGUES.flatMap(l => l.clubs));
  for (const c of PLAY_FLEET) if (!world.has(c)) cannot(`${c} is not a club of today's world`);
  const counts = { tail: {}, participant: 0, watcher: 0, nightsPlayed: 0, seasonOneMe: 0 };
  const runs6 = runs(6);
  const lib6 = runs6 ? await import('./lib/worldUclFleet.mjs') : null;
  const { PLAY_EDITS } = await import('./lib/worldUelPlay.mjs');
  const B = runs6 ? await lib6.engineOf(ROOT, 'base', { base: BASE }, cannot) : null;
  const HR = runs6 ? await lib6.engineOf(ROOT, 'head-reverted', { edits: CONTROL === 'noplayrevert' ? TICKING_EDITS : [...PLAY_EDITS, ...TICKING_EDITS] }, cannot) : null;
  let identical = 0;
  let parted = 0;
  for (const club of PLAY_FLEET) for (const seed of PLAY_SEEDS) {
    const where0 = `${club} seed ${seed}`;
    let nights = false;
    let movedHere = false;
    let prevEnd = null;
    const throughs = [];
    const onStep = (M, s, label, got) => {
      if (!s) return;
      if (s.calendar?.some(e => e.night)) nights = true;
      const rep = got?.report;
      if (rep?.tie?.leg === 2 && typeof rep.tie.through === 'boolean' && s.calendar[s.week - 1]?.type === 'uel') {
        const night = M.cm.evalWorldComp(s, 'uel', Infinity)?.nights[s.calendar[s.week - 1].night.n];
        if (night) throughs.push({ round: night.stage, through: rep.tie.through });
      }
      const slice = s.worldComps?.uel;
      if (label === 'start' && (runs(4) || CONTROL === 'noplaygate')) {
        if (slice?.me) counts.seasonOneMe += 1;
        ok(!slice?.me, `4 ${where0}: season one plays the Europa League (route ${slice?.earned ?? 'none'}); its places were settled before you arrived`);
      }
      if (/-rollover$/.test(label)) {
        const plays = !!slice && slice.me === s.clubName;
        const earned = slice?.earned ?? null;
        if (runs(4)) ok(plays === (earned === 'L' || earned === 'C' || earned === 'P'), `4 ${where0} season ${s.season}: plays ${plays}, earned ${earned}`);
        if (plays) { counts.participant += 1; if (runs(1)) nightsCheck(M, s, `${where0} season ${s.season}`, counts); }
        else { counts.watcher += 1; if (runs(1)) ok(!s.calendar.some(e => e.type === 'uel'), `1 ${where0} season ${s.season}: a watcher's calendar holds a Europa League night`); }
      }
      if (/^s\d+-e\d+$/.test(label) && slice?.me === s.clubName) prevEnd = s;
      if (runs(2) && !movedHere && (counts.moveSaves ?? 0) < MOVE_SAVES && /^s\d+-e\d+$/.test(label) && slice?.me === s.clubName
        && slice.s === s.season && Object.keys(slice.mine ?? {}).length === 3) {
        movedHere = true;
        counts.moveSaves = (counts.moveSaves ?? 0) + 1;
        moveCheck(M, s, `${where0} season ${s.season}`, counts);
      }
      if (/-finish$/.test(label) && prevEnd && prevEnd.season === s.season - 0 && prevEnd.worldComps?.uel?.me === prevEnd.clubName) {
        if (runs(2) || runs(3)) counts.nightsPlayed += competitionCheck(M, prevEnd, `${where0} season ${prevEnd.season}`, throughs.splice(0));
        if (runs(2)) reviewCheck(M, prevEnd, got?.summary, `${where0} season ${prevEnd.season}`, counts);
        prevEnd = null;
      } else if (/-finish$/.test(label) && runs(2)) {
        ok(got?.summary && !('uelRun' in got.summary), `2 ${where0} season ${s.season}: a season that played no Europa League carries a review line "${got?.summary?.uelRun}"`);
      }
    };
    const steps = await journey(head, club, seed, 2, onStep);
    if (!runs6) continue;
    const base = await journey(B, club, seed, 2);
    const rev = await journey(HR, club, seed, 2);
    const at = rev.findIndex((x, i) => x.h !== base[i]?.h || x.d !== base[i]?.d);
    ok(at < 0 && rev.length === base.length, `6 ${where0}: with the participant open and the ticking weeks reverted the head parts from the base at ${rev[at]?.label}`);
    const part = steps.findIndex((x, i) => x.h !== base[i]?.h || x.d !== base[i]?.d);
    if (!nights) ok(part < 0, `6 ${where0}: no night in any season, yet the head parts from the base at ${steps[part]?.label}`);
    if (part < 0) identical += 1; else parted += 1;
  }
  if (runs(3)) ok(counts3.ties >= Math.min(PLAY_MIN, 3), `3 only ${counts3.ties} ties of mine settled over the fleet`);
  if (runs(1) || runs(4)) ok(counts.participant >= PLAY_MIN, `1 only ${counts.participant} participant seasons in the fleet, at least ${PLAY_MIN} are needed`);
  console.log(`  play: ${PLAY_FLEET.length * PLAY_SEEDS.length} saves, ${counts.participant} participant seasons, ${counts.watcher} watcher seasons, ${counts.nightsPlayed} nights played, tails ${JSON.stringify(counts.tail)}, season one participants ${counts.seasonOneMe}, ties of mine checked ${counts3.ties}`);
  if (runs(2)) console.log(`  2 review: ${counts.review ?? 0} participant seasons read on the review, ${counts.uelWon ?? 0} of them won it`);
  if (runs(2)) {
    ok((counts.moves ?? 0) >= 2 * MOVE_SAVES, `2b only ${counts.moves ?? 0} job moves played, ${2 * MOVE_SAVES} are wanted`);
    console.log(`  2b moves: ${counts.moves ?? 0} job moves out of ${counts.moveSaves ?? 0} participant seasons, each played to the season's end; ${counts.uclMoves ?? 0} moves to a Champions League club (${counts.uclMovesInIt ?? 0} joined with its group, ${counts.uclMovesKept ?? 0} kept the Europa League)`);
  }
  if (runs6) console.log(`  6 base ${BASE}: ${identical} saves byte equal to the base on the head, ${parted} parted (participants and super cup nights, by design)`);
}

/* ── Section 7: crafted runs of my own Europa League (the reviews of 2026-10-30) ───────────────────────────────── */
/* One participant season played out by the engine: playCmEuroPlay's case (a) streams for season one (Everton, its
   cup final handed to Everton, so season two is the Championship and the Europa League by the cup), then season two
   on the first of CRAFT_STREAMS where the club is not sacked and stays in a league with no European places. Then my
   nights are rewritten by a plan, a new slice for every night (the memo is per slice object), each night's fixture
   read off the evaluation that has reached it, and what the plan made of the run is graded against the table below,
   never against the engine's own ranks. completeWorldNight is exported in this bundle only (EXPORT_EDITS). */
const CRAFT_RANK = { LP: 0, PO: 1, R16: 1, QF: 1, SF: 2, F: 3, won: 4 };
const CRAFT_STREAMS = [0x7a00, 0x7b00, 0x7c00, 0x7d00, 0x7e00, 0x7f00];
const EXPORT_EDITS = [{ file: CM_FILE, from: '\nfunction completeWorldNight(', to: '\nexport function completeWorldNight(' }];
const WIN = [3, 0];
const LOSE = [0, 3];

/** `s0` with my nights before `upTo` recorded by `plan(night)` as [mine, theirs]. */
function craftRun(M, s0, plan, upTo = 17) {
  const s = JSON.parse(JSON.stringify(s0));
  const me = s.clubName;
  let mine = {};
  const put = () => { s.worldComps = { ...s.worldComps, uel: { ...s.worldComps.uel, mine } }; };
  put();
  for (let n = 0; n < upTo; n += 1) {
    const night = M.cm.evalWorldComp(s, 'uel', n)?.nights[n];
    const fx = night?.fixtures.find(x => x.home === me || x.away === me);
    if (!fx) continue;
    const [gf, ga] = plan(night);
    mine = { ...mine, [n]: fx.home === me ? { h: gf, a: ga } : { h: ga, a: gf } };
    put();
  }
  return s;
}
const outAt = stage => night => (night.stage === stage ? LOSE : WIN);
const poPlan = k => night => (night.stage === 'md' ? (night.md < k ? WIN : LOSE) : LOSE);

/** Season two of a crafted save: `club`'s season one (on playCmEuroPlay's case (a) streams for Everton), its cup
 *  final handed to it, the rollover, then season two on stream `base` to its end. `why` says what rules it out. */
const CRAFT_CLUBS = [['Everton', 0x1509a], ['Millwall', 0x15a0a], ['Charlton Athletic', 0x15b0a], ['Bristol City', 0x15c0a]];
async function craftSeasonTwo(E, club, one, base) {
  const M = await E.fresh();
  const opts = { skipHalftime: true, noCoach: true };
  let s = tape(one, () => M.cm.startCareer(club)).value;
  for (let i = 0; i < 400 && s.week < s.calendar.length; i += 1) s = tape(one + 1 + i, () => M.cm.playNextEntry(s, opts)).value.state;
  const fin = tape(one + 1, () => M.cm.finishSeason(s)).value.state;
  const final = (fin.cupBracket ?? []).find(t => t.round === 'F');
  if (!final) return { why: 'season one has no cup final to set' };
  final.winner = club;
  let p = tape(one + 2, () => M.cm.startNextSeason(fin)).value;
  if (!M.cm.uelParticipant(p) || p.worldComps.uel.earned !== 'C' || M.cm.careerLeagueOf(p).euro) {
    return { why: `season two is not a participant by its cup outside the European leagues (me ${p.worldComps?.uel?.me ?? 'none'}, route ${p.worldComps?.uel?.earned ?? 'none'}, ${M.cm.careerLeagueOf(p).name})` };
  }
  for (let i = 0; i < 400 && p.week < p.calendar.length; i += 1) p = tape(base + i, () => M.cm.playNextEntry(p, opts)).value.state;
  if (p.sacked) return { why: `sacked in season two (week ${p.week} of ${p.calendar.length})` };
  if (p.week < p.calendar.length) return { why: `season two stopped at week ${p.week} of ${p.calendar.length}` };
  return { M, end: p, why: null };
}

async function section7() {
  const E = await engine('craft', [...EXPORT_EDITS, ...(CONTROL_EDITS[CONTROL] ?? [])]);
  /* The save: a dry run to the rollover, which is where promotion shows. */
  let pick = null;
  const tried = [];
  for (const [club, one] of CRAFT_CLUBS) {
    for (const b of CRAFT_STREAMS) {
      const c = await craftSeasonTwo(E, club, one, b);
      if (c.why) { tried.push(`${club} 0x${b.toString(16)}: ${c.why}`); if (/^season (one|two is not)/.test(c.why)) break; continue; }
      const f0 = tape(0x7001, () => c.M.cm.finishSeason(craftRun(c.M, c.end, () => WIN))).value;
      const lg = c.M.cm.careerLeagueOf(tape(0x7002, () => c.M.cm.startNextSeason(f0.state)).value);
      if (!lg.euro) { pick = [club, one, b]; break; }
      tried.push(`${club} 0x${b.toString(16)}: up into the ${lg.name}`);
    }
    if (pick) break;
  }
  for (const x of tried) console.log(`  7 passed over: ${x}`);
  if (!pick) cannot('section 7: no crafted save stays in work and out of the European leagues');
  /* The same save again in a fresh context (the journeys replay byte for byte), graded before its rollover
     registers next season's leagues. */
  const [club, one, base] = pick;
  const { M, end } = await craftSeasonTwo(E, club, one, base);
  const me = end.clubName;
  const where = `${club} season ${end.season} (stream 0x${base.toString(16)}, ${M.cm.careerLeagueOf(end).name})`;
  const won = craftRun(M, end, () => WIN);
  ok(end.boardObjectives?.some(o => o.id === 'uel'), `7 ${where}: the board set no Europa League target`);

  /* 7.1 how far the plan went, the board's rank and its target at 1 and at 2 (advice 16). Control `uelrank`. */
  const cases = [['won', won], ['F', craftRun(M, end, outAt('F'))], ['SF', craftRun(M, end, outAt('SF'))], ['QF', craftRun(M, end, outAt('QF'))],
    ['R16', craftRun(M, end, outAt('R16'))], ['LP', craftRun(M, end, () => LOSE)]];
  for (const k of [4, 5, 3, 6]) {
    const s = craftRun(M, end, poPlan(k));
    const pos = (M.cm.evalWorldComp(s, 'uel', 8)?.table ?? []).findIndex(r => r.club === me) + 1;
    if (pos >= 9 && pos <= 24) { cases.push(['PO', s]); break; }
  }
  ok(cases.some(([kind]) => kind === 'PO'), `7 ${where}: no league phase record put the club 9th to 24th`);
  for (const [kind, s] of cases) {
    const res = M.cm.evalWorldComp(s, 'uel', Infinity);
    const ties = (res?.ties ?? []).filter(t => t.home === me || t.away === me);
    const deepest = ties.map(t => t.round).sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a))[0] ?? 'LP';
    const pos = (res?.table ?? []).findIndex(r => r.club === me) + 1;
    const went = kind === 'won' ? res?.winner === me : kind === 'LP' ? !ties.length && pos > 24 : deepest === kind && res?.winner !== me;
    ok(!!res?.done && went, `7 ${where} ${kind}: the plan did not end the run there (deepest ${deepest}, ${pos} in the league phase, winner ${res?.winner})`);
    const r = M.cm.uelProgressRank(s);
    ok(r.rank === CRAFT_RANK[kind] && r.alive === false, `7 ${where} ${kind}: the board's rank is ${r.rank} (alive ${r.alive}), the table says ${CRAFT_RANK[kind]}`);
    for (const target of [1, 2]) {
      const t = { ...s, boardObjectives: (s.boardObjectives ?? []).map(o => (o.id === 'uel' ? { ...o, target } : o)) };
      const st = M.cm.objectiveStatuses(t).find(x => x.objective.id === 'uel')?.status;
      ok(st === (CRAFT_RANK[kind] >= target ? 'done' : 'failed'), `7 ${where} ${kind}: a Europa League target of ${target} reads ${st}`);
    }
  }

  /* 7.2 the winner (correction 13 and the read review's major 1): its board place, its review, and next season's
     Champions League played from a league with no European places. Controls `noplace`, `nouelucl`, `nowinnerucl`. */
  ok(M.cm.euroPlaceOf(won) === 'ucl', `7 ${where}: the Europa League winner's European place is ${M.cm.euroPlaceOf(won)}, not the Champions League`);

  /* 7.3 each night's fixture before it is played (the won plan's records of the nights before it): the final on a
     neutral ground, extra time only on a night that settles its tie. Controls `notneutral`, `noet`. */
  const at = n => end.calendar.findIndex(e => e.type === 'uel' && e.night?.n === n);
  const allMine = won.worldComps.uel.mine;
  let fixtures = 0;
  for (let n = 0; n < 17; n += 1) {
    const t = JSON.parse(JSON.stringify(end));
    t.worldComps.uel = { ...t.worldComps.uel, mine: Object.fromEntries(Object.entries(allMine).filter(([k]) => Number(k) < n)) };
    t.week = at(n);
    const night = M.cm.evalWorldComp(t, 'uel', n)?.nights[n];
    const fx = M.cm.fixtureFor(t, t.calendar[t.week]);
    if (!night?.fixtures.some(x => x.home === me || x.away === me)) continue;
    fixtures += 1;
    const settles = night.stage !== 'md' && (night.stage === 'F' || night.leg === 2);
    ok(fx?.competition === 'uel', `7 ${where} night ${n}: no Europa League fixture before it is played`);
    if (night.stage === 'F') ok(fx?.home === null, `7 ${where}: the final is played at ${fx?.home ? 'home' : 'the opponent'}, not on a neutral ground`);
    else ok(typeof fx?.home === 'boolean', `7 ${where} night ${n}: the ${night.stage} fixture has no ground`);
    ok(!!fx?.extraTime === settles, `7 ${where} night ${n} (${night.stage}${night.leg ? ` leg ${night.leg}` : ''}): extra time ${!!fx?.extraTime}, the tie ${settles ? 'settles' : 'does not settle'} tonight`);
  }
  ok(fixtures === 17, `7 ${where}: the won plan reaches ${fixtures} nights of mine, not 17`);

  /* 7.4 the critic's correction 7: on ONE state, the evaluation read before a night is recorded and the one read
     after it (the memo is per slice object). Control `inplace`. */
  const t0 = JSON.parse(JSON.stringify(end));
  t0.worldComps.uel = { ...t0.worldComps.uel, mine: {} };
  t0.week = at(0);
  const fxOf = e => e?.nights[0]?.fixtures.find(x => x.home === me || x.away === me);
  const before = fxOf(M.cm.evalWorldComp(t0, 'uel', Infinity));
  M.cm.completeWorldNight(t0, t0.calendar[t0.week].night, 9, 0, false, null, []);
  const after = fxOf(M.cm.evalWorldComp(t0, 'uel', Infinity));
  const nine = x => !!x && (x.home === me ? x.hg === 9 && x.ag === 0 : x.ag === 9 && x.hg === 0);
  ok(!!before && !nine(before) && !!t0.worldComps.uel.mine?.[0], `7 ${where}: the night was not recorded, or its stream already read 9-0`);
  ok(nine(after), `7 ${where}: the evaluation read after the record shows ${after ? `${after.home} ${after.hg}-${after.ag} ${after.away}` : 'nothing'}, not the 9-0 recorded`);

  /* 7.2, the rest: the winner's review, and next season's Champions League played from a league with no European
     places (last, because the rollover registers next season's leagues in this context). */
  const f = tape(0x7001, () => M.cm.finishSeason(won)).value;
  ok(f.summary?.uelRun === 'won it', `7 ${where}: the winner's review line reads "${f.summary?.uelRun}"`);
  ok(f.summary?.qualifiedUcl === true, `7 ${where}: won the Europa League and the review does not say next season's Champions League`);
  const next = tape(0x7002, () => M.cm.startNextSeason(f.state)).value;
  const nextLeague = M.cm.careerLeagueOf(next).name;
  ok(!!next.uclGroup && next.uclGroup.table.some(r => r.club === me), `7 ${where}: the winner does not play next season's Champions League from the ${nextLeague}`);
  ok(!(next.worldComps?.uel?.clubs ?? []).includes(me), `7 ${where}: the winner is in next season's Europa League too`);
  let p = next;
  let over = false;
  for (let i = 0; i < 300 && !over; i += 1) {
    const r = tape(0x7100 + i, () => M.cm.playNextEntry(p, { skipHalftime: true, noCoach: true })).value;
    p = r.state; over = r.kind === 'seasonOver';
  }
  ok(over && p.uclGroup?.matchday === 6, `7 ${where}: the season after the win ended ${over} with ${p.uclGroup?.matchday ?? 'no'} Champions League group matchdays played`);
  console.log(`  7 crafted: ${where}, ${cases.length} runs graded, ${fixtures} fixtures read, next season ${nextLeague} with the Champions League group played to matchday ${p.uclGroup?.matchday ?? 'none'}`);
}

/* ── Run ───────────────────────────────────────────────────────────────────────────────────────────────────── */
if (runs(7)) await section7();
if (runs(1) || runs(2) || runs(3) || runs(4) || runs(6)) await sectionPlay();
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
