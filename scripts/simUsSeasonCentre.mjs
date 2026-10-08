/**
 * Round 1048: the US Season Center shows the season the career saved.
 *
 * NBA My Career and NFL My Career draw a whole season in one press and save
 * totals. The Season Center derives that season game by game AFTER the fact
 * (src/lib/season/core.ts through the US binding src/lib/season/us.ts and a
 * number file per sport, nba.ts and nfl.ts) and stores nothing. This harness
 * plays real careers through each binding's own engine calls and checks what
 * the viewer would show against what the save holds.
 *
 * Population: CAREERS seeded careers a sport and a seed set (default 40),
 * both eras, every position, played to retirement with the binding's own
 * loop (startCareer, rollTeamQuality, assignRole, campBattle, simSeason,
 * progress, the first option of the drawn card, the first offer of every
 * market), plus TARGETED careers that start late enough to reach the
 * seasons organic careers rarely do (a throwback career whose `year` is
 * advanced before its first season: said here because that is not how a
 * player gets there). Targeted and organic seasons are counted apart.
 *
 * Sections:
 *  1 the engines' own words and ranges        5 the schedule and the names
 *  2 held is held                              6 nothing moves (A and B runs)
 *  3 the season shown is the season saved      7 realism, measured
 *  4 the playoff path                          8 lazy by source
 *
 * Section 3 is an INDEPENDENT checker: it never calls the core's
 * `disagreements` or a bind's `check`, and it looks the record band up from
 * its own table by exact equality with the saved team result.
 *
 * Controls (US_SEASON_CONTROL=), each patches exact strings as the code is
 * bundled (refusing to run when a string is not there exactly once) and must
 * turn its NAMED section red; a control run always exits 1 and says whether
 * the red was at the named check:
 *   stream   one Math.random inside buildUsSeason              -> section 6
 *   record   the record target ignored                         -> section 3
 *   length   the held gate removed                             -> section 2
 *   stage    the engine writes a result its own list lacks     -> sections 1 and 4
 *   short82  the NBA engine back on 82 games in every year
 *            (Round 1103 plays the ledger's 66 and 72)         -> section 1
 *   names    the shape window opened for the throwback era,
 *            the binding's id guard off                        -> section 5
 *   window   the same window with the guard ON: the ledger
 *            check goes red and the binding still names nobody -> section 5
 *   formula  a division rival hosted three times, the bind's
 *            own schedule check off                            -> section 5
 *   static   a static import of the viewer planted in a route
 *            file (in memory; the same text in a comment stays
 *            green)                                            -> section 8
 *
 * MEASURED (filled in from the five seed sets, 2026-10-07): see the block
 * above the bands in section 7.
 *
 * Green is the closing "simUsSeasonCentre: ... 0 failed" line AND exit 0.
 * Nothing here reaches the network.
 */
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const CAREERS = Number(process.env.CAREERS ?? 40);
const SEEDSETS = (process.env.SEEDSET ?? '0,1,2,3,4').split(',').map(Number);
const CONTROL = process.env.US_SEASON_CONTROL ?? '';
const ASKED = (process.env.SPORTS ?? 'nba,nfl').split(',').map(s => s.trim()).filter(Boolean);

/* ─── Controls: exact strings, patched in the bundle only ─── */
const US = 'src/lib/season/us.ts';
const NBA = 'src/lib/season/nba.ts';
const WINDOW = { file: 'src/data/usLeagueShape.ts', from: "  { sport: 'nba', era: 'now', from: 2025, to: null, shape: NBA_2025 },", to: "  { sport: 'nba', era: 'now', from: 2025, to: null, shape: NBA_2025 },\n  { sport: 'nba', era: 'y2004', from: 2003, to: null, shape: NBA_2025 }," };
const CONTROLS = {
  stream: { section: 6, patches: [{ file: US, from: 'const key = usSeasonKey(bind, career, row);', to: 'const key = usSeasonKey(bind, career, row); Math.random();' }] },
  record: { section: 3, patches: [{ file: US, from: "const target: TeamTarget = band ? { kind: 'record', winsMin: band[0], winsMax: band[1] } : { kind: 'none' };", to: "const target: TeamTarget = { kind: 'none' };" }] },
  length: { section: 2, patches: [{ file: US, from: 'if (length === null || length !== bind.fullSeason) {', to: 'if (length === null) {' }] },
  stage: { section: 1, also: 4, patches: [{ file: 'src/lib/nbaMyCareer.ts', from: '    result = stages[stage];', to: "    result = stages[stage] + ' ';" }] },
  short82: { section: 1, patches: [{ file: 'src/lib/nbaMyCareer.ts', from: "  return usSeasonLength('nba', year) ?? 82;", to: '  return 82;' }] },
  names: { section: 5, patches: [WINDOW, { file: US, from: '  if (ledger.length !== own.length || new Set(ledger).size !== ledger.length) return null;\n  const ownSet = new Set(own);\n  if (ownSet.size !== own.length || !ledger.every(id => ownSet.has(id))) return null;\n', to: '  const ownSet = new Set(own);\n' }] },
  window: { section: 5, patches: [WINDOW] },
  formula: { section: 5, patches: [{ file: NBA, from: 'for (let s = 1; s <= d; s += 1) add(s, 2, 2);', to: 'for (let s = 1; s <= d; s += 1) add(s, 3, 1);' }, { file: NBA, from: '  if (ctx.shape) out.push(...nbaDealProblems(ctx, s.games));\n', to: '' }] },
  static: { section: 8, patches: [] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown US_SEASON_CONTROL ${CONTROL}`); process.exit(2); }

const norm = s => s.replace(/\r\n/g, '\n');
const fired = new Set();
const controlPlugin = {
  name: 'us-season-control',
  setup(b) {
    if (!CONTROL) return;
    const patches = CONTROLS[CONTROL].patches;
    b.onLoad({ filter: /\.tsx?$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      const mine = patches.filter(p => p.file === rel);
      if (mine.length === 0) return undefined;
      let src = norm(readFileSync(args.path, 'utf8'));
      for (const p of mine) {
        if (src.split(p.from).length !== 2) throw new Error(`control ${CONTROL}: its string is not exactly once in ${p.file}, refusing to run: ${p.from.slice(0, 70)}`);
        src = src.replace(p.from, () => p.to);
        fired.add(p);
      }
      return { contents: src, loader: args.path.endsWith('x') ? 'tsx' : 'ts' };
    });
  },
};

/* Round 1103: the NBA engine plays the ledger's length (66 games in 2011-12, 72 in 2020-21, 82 in a held year),
   so its two windows of games played are restated by season, off the LEDGER and never off the engine's own
   read of it (control short82 puts the engine back on 82 and this must go red): a healthy man misses up to
   four, a hurt one misses 8 to 42 of 82, scaled to the length and rounded the way gamesFor rounds them. At 82
   these are the 40 to 74 and 78 to 82 this row typed before. M is the bundle below, read when a check runs. */
const nbaWindows = year => { const L = M.usSeasonLength('nba', year) ?? 82; return { L, hurtMin: L - Math.round((42 * L) / 82), hurtMax: L - Math.round((8 * L) / 82) }; };
const nbaShortYear = year => nbaWindows(year).L !== 82;

/* ─── The bundle: the two real bindings, the season modules, the ledgers ─── */
const SPORT_DEFS = {
  nba: { binding: 'NBA_CAREER_SPORT', bindingFile: 'src/lib/nbaCareerSport.ts', bindName: 'NBA_SEASON', numberFile: 'src/lib/season/nba.ts', positions: ['PG', 'SG', 'SF', 'PF', 'C'], eras: ['now', 'y2004'], gamesOk: (g, year) => { const w = nbaWindows(year); return (g >= w.hurtMin && g <= w.hurtMax) || (g >= w.L - 4 && g <= w.L); }, injury: l => l.games <= nbaWindows(l.year).hurtMax, targetedFrom: { era: 'y2004', year: 2016 } },
  nfl: { binding: 'NFL_CAREER_SPORT', bindingFile: 'src/lib/nflCareerSport.ts', bindName: 'NFL_SEASON', numberFile: 'src/lib/season/nfl.ts', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], eras: ['now', 'y2005'], gamesOk: g => g >= 1 && g <= 17, injury: l => l.games < 17, targetedFrom: { era: 'y2005', year: 2018 } },
};
/* A sport is run when its number file exists. A sport whose BINDING already
   has a loader may never be skipped: that would be a shipped button nobody checked. */
const SPORTS = [];
for (const slug of Object.keys(SPORT_DEFS)) {
  const d = SPORT_DEFS[slug];
  const has = existsSync(path.join(ROOT, d.numberFile));
  const bound = /loadSeasonCentre\s*:/.test(norm(readFileSync(path.join(ROOT, d.bindingFile), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, ''));
  if (has && ASKED.includes(slug)) SPORTS.push(slug);
  else console.log(`SKIPPED ${slug}: ${has ? 'not asked for (SPORTS)' : 'no number file yet'}`);
  if (!SPORTS.includes(slug) && bound) { console.error(`FAIL: the ${slug} binding has a Season Center loader and was skipped`); process.exit(1); }
}
if (SPORTS.length === 0) { console.error('simUsSeasonCentre: no sport to run'); process.exit(1); }

const OUT = path.join(os.tmpdir(), `us-season-centre-${CONTROL || 'base'}-${process.pid}.mjs`);
const entry = [
  ...SPORTS.map(s => `export { ${SPORT_DEFS[s].binding} } from './${SPORT_DEFS[s].bindingFile}';`),
  ...SPORTS.map(s => `export { ${SPORT_DEFS[s].bindName} } from './${SPORT_DEFS[s].numberFile}';`),
  "export { buildUsSeason, usPlayoffPath, usPlayoffDepth, usBandOf, usSeasonKey } from './src/lib/season/us.ts';",
  "export { deriveSeasonOrWhy, soFar } from './src/lib/season/core.ts';",
  "export { usSeasonLength, usSeasonHeldLine, US_FULL_SEASON } from './src/data/usSeasonLengths.ts';",
  "export { usLeagueShape, US_LEAGUE_SHAPES, NBA_SCORING, nflHosts17 } from './src/data/usLeagueShape.ts';",
  "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';",
  "export { nbaEraTeamIds } from './src/lib/nbaMyCareer.ts';",
  "export { NFL_ERAS } from './src/lib/nflMyCareer.ts';",
  "export { FO_TEAMS } from './src/data/frontOfficePlayers.ts';",
].join('\n');
const t0 = Date.now();
await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT,
  logLevel: 'error', alias: { '@': './src' }, plugins: [controlPlugin], jsx: 'automatic',
  banner: { js: "import { createRequire as __usRequire } from 'node:module'; const require = __usRequire(import.meta.url);" },
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const M = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* the temp file is only a copy */ }
if (CONTROL && fired.size !== CONTROLS[CONTROL].patches.length) { console.error(`control ${CONTROL}: ${fired.size} of ${CONTROLS[CONTROL].patches.length} patches reached their file, refusing to report`); process.exit(2); }
console.log(`bundled in ${Date.now() - t0} ms; sports ${SPORTS.join(', ')}; ${CAREERS} careers a sport and a seed set; seed sets ${SEEDSETS.join(', ')}${CONTROL ? `; CONTROL ${CONTROL}` : ''}`);

/* ─── Failure bookkeeping, by section ─── */
let checks = 0;
const failsBy = new Map();
const fail = (section, msg) => { if (!failsBy.has(section)) failsBy.set(section, []); failsBy.get(section).push(msg); };
const check = (section, ok, label) => { checks += 1; if (ok) console.log(`ok   ${section} ${label}`); else { console.log(`FAIL ${section} ${label}`); fail(section, label); } };
/** Many items under one label: counts them, prints the first three. */
const tally = (section, label, bad, total) => {
  checks += 1;
  if (bad.length === 0) console.log(`ok   ${section} ${label} (${total} checked)`);
  else { console.log(`FAIL ${section} ${label}: ${bad.length} of ${total}; ${bad.slice(0, 3).join(' || ')}`); fail(section, label); }
};

/* ─── The population ─── */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashOf = v => createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 16);

/** Plays one career to retirement with the binding's own calls. `onSeason(c, line)`
 *  runs right after each season with Math.random swapped for a counting trap
 *  that forwards to the career's generator. Returns a hash a season. */
function playCareer(slug, i, seedset, targeted, onSeason, trap) {
  const d = SPORT_DEFS[slug];
  const SB = M[d.binding];
  const rng = mulberry32(i * 7919 + 11 + seedset * 100003 + (targeted ? 500009 : 0) + (slug === 'nfl' ? 77 : 0));
  const real = Math.random;
  Math.random = rng;
  const hashes = [];
  try {
    const pos = d.positions[i % d.positions.length];
    const eraId = targeted ? d.targetedFrom.era : d.eras[Math.floor(i / d.positions.length) % d.eras.length];
    const archs = SB.create.archetypes[pos];
    const c = SB.startCareer(`${targeted ? 'Late' : 'Week'} ${seedset}.${i}`, pos, archs[i % archs.length], rng, null, eraId);
    if (targeted) c.year = d.targetedFrom.year;
    let tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    for (let guard = 0; guard < 34 && !c.retired; guard += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push(SB.suspendedLine(c));
        SB.progress(c, rng);
        hashes.push(hashOf(c));
        continue;
      }
      if (c.contractYears <= 0) {
        const fa = SB.buildFaWindow(c, tq, rng);
        const offer = fa.offers.find(o => !o.gone) ?? fa.offers[0];
        if (offer) { M.applyFaSigning(c, offer); SB.campBattle(c, offer.quality, rng); tq = offer.quality; }
      }
      SB.campBattle(c, tq, rng);
      const { line } = SB.simSeason(c, tq, rng);
      SB.progress(c, rng);
      if (onSeason) {
        Math.random = () => { trap.count += 1; return rng(); };
        try { onSeason(c, line, { slug, i, seedset, targeted, eraId, pos }); } finally { Math.random = rng; }
      }
      hashes.push(hashOf(c));
      if (SB.shouldRetire(c)) { c.retired = true; break; }
      const ev = SB.drawEvent(c, rng);
      if (ev && ev.options.length) ev.options[0].apply(c, rng);
      tq = SB.rollTeamQuality(tq, rng);
    }
  } finally { Math.random = real; }
  return hashes;
}

const TARGETED = Math.max(4, Math.round(CAREERS / 5));
function playAll(onSeason, trap) {
  const out = [];
  for (const slug of SPORTS) for (const seedset of SEEDSETS) {
    for (let i = 0; i < CAREERS; i += 1) out.push(playCareer(slug, i, seedset, false, onSeason, trap));
    for (let i = 0; i < TARGETED; i += 1) out.push(playCareer(slug, i, seedset, true, onSeason, trap));
  }
  return out;
}

/* ─── The harness's OWN restatement of what a season must show (never the module's) ─── */
const OWN = {
  nba: {
    games: 82, clock: 48, missed: 'Missed the playoffs',
    results: ['Lost in the first round', 'Lost in the conference semis', 'Lost the Conference Finals', 'Lost the NBA Finals', 'WON THE NBA FINALS'],
    bands: [[17, 40], [41, 52], [45, 57], [48, 61], [50, 64], [52, 67]],
    series: [4, 7],
  },
  nfl: {
    games: 17, clock: 60, missed: 'Missed the playoffs',
    results: ['Lost in the Wild Card round', 'Lost in the Divisional round', 'Lost the Conference Championship', 'Lost the Super Bowl', 'WON THE SUPER BOWL'],
    bands: [[2, 9], [9, 12], [10, 13], [11, 14], [11, 15], [11, 15]],
    series: null,
  },
};
const ownBand = (slug, teamResult) => {
  const o = OWN[slug];
  if (teamResult === o.missed) return o.bands[0];
  const i = o.results.indexOf(teamResult);
  return i < 0 ? null : o.bands[i + 1];
};
const gameIds = (slug, eraId) => (slug === 'nba' ? M.nbaEraTeamIds(eraId) : (M.NFL_ERAS.find(e => e.id === (eraId ?? 'now')) ?? M.NFL_ERAS[0]).teams.map(t => t.abbr));
const isNum = v => typeof v === 'number' && Number.isFinite(v);

/** Section 3, NBA: every item recomputed from the row and the derived games. */
function shownIsSavedNba(row, s) {
  const out = [];
  const on = s.games.filter(g => g.played);
  if (s.games.length !== OWN.nba.games) out.push(`games ${s.games.length}`);
  if (on.length !== row.games) out.push(`played ${on.length} != ${row.games}`);
  const mean = k => on.reduce((a, g) => a + (g.line[k] ?? 0), 0) / Math.max(1, on.length);
  if (isNum(row.ppg) && Math.round(mean('pts')) !== Math.round(row.ppg)) out.push(`ppg ${mean('pts').toFixed(2)} != ${row.ppg}`);
  if (isNum(row.rpg) && Math.round(mean('reb') * 10) !== Math.round(row.rpg * 10)) out.push(`rpg ${mean('reb').toFixed(3)} != ${row.rpg}`);
  if (isNum(row.apg) && Math.round(mean('ast') * 10) !== Math.round(row.apg * 10)) out.push(`apg ${mean('ast').toFixed(3)} != ${row.apg}`);
  for (const g of on) {
    for (const k of ['pts', 'reb', 'ast']) if (!Number.isInteger(g.line[k]) || g.line[k] < 0) out.push(`md ${g.md}: ${k} ${g.line[k]}`);
    if (g.line.pts >= g.us) out.push(`md ${g.md}: his ${g.line.pts} against his team's ${g.us}`);
  }
  for (const g of s.games) {
    if (g.us === g.them) out.push(`md ${g.md}: level`);
    if (!g.played && Object.keys(g.line).length) out.push(`md ${g.md}: a line in a game he missed`);
  }
  return out;
}

/** Section 3, any sport: the events' points make each side's score at full
 *  time and never pass it or fall at any minute the bug can show. */
function boardIsTrue(slug, s) {
  const out = [];
  const L = OWN[slug].clock;
  for (const g of s.games) {
    let us = 0; let them = 0; let last = 0;
    const sorted = g.events.every((e, i) => i === 0 || g.events[i - 1].min <= e.min);
    if (!sorted) out.push(`md ${g.md}: events out of order`);
    for (const e of g.events) {
      if (!(e.min >= 0 && e.min <= L)) out.push(`md ${g.md}: an event at minute ${e.min}`);
      if (e.min < last) continue;
      last = e.min;
      if ((e.pts ?? 0) < 0) out.push(`md ${g.md}: negative points`);
      if (e.side === 'us') us += e.pts ?? 0; else them += e.pts ?? 0;
      if (us > g.us || them > g.them) out.push(`md ${g.md}: the board passes the final at minute ${e.min}`);
    }
    if (us !== g.us || them !== g.them) out.push(`md ${g.md}: the board ends ${us}-${them}, the game ${g.us}-${g.them}`);
  }
  return out;
}

/** Section 4: the path against the harness's own reading of the saved result. */
function pathProblems(slug, row, path, target) {
  const out = [];
  const o = OWN[slug];
  const i = o.results.indexOf(row.teamResult);
  if (i < 0) {
    if (path) out.push('a path for a season with no playoff result');
    if (row.teamResult !== o.missed && target.kind !== 'none') out.push('a band for a result the list does not hold');
    return out;
  }
  const n = Math.min(4, i + 1);
  if (!path) { if (!(slug === 'nfl' && isNum(row.poGames) && row.poGames !== n)) out.push('no path for a playoff season'); return out; }
  if (path.steps.length !== n) out.push(`rounds ${path.steps.length} != ${n}`);
  path.steps.forEach((st, r) => { if (st.won !== (r < n - 1 || i === 4)) out.push(`round ${r + 1} won ${st.won}`); });
  if (o.series) {
    const fits = Number.isInteger(row.poGames) && row.poGames >= o.series[0] * n && row.poGames <= o.series[1] * n;
    if (!fits) { if (path.steps.some(st => st.score !== null)) out.push('a series score with playoff games that do not fit'); return out; }
    let sum = 0;
    for (const st of path.steps) {
      const m = /^(\d+)-(\d+)$/.exec(st.score ?? '');
      if (!m) { out.push('a series with no score'); continue; }
      const a = Number(m[1]); const b = Number(m[2]);
      if ((st.won ? a : b) !== o.series[0] || (st.won ? b : a) >= o.series[0] || a + b > o.series[1]) out.push(`series ${st.score}`);
      sum += a + b;
    }
    if (sum !== row.poGames) out.push(`series games ${sum} != ${row.poGames}`);
  } else {
    if (isNum(row.poGames) && path.steps.length !== row.poGames) out.push(`playoff games ${path.steps.length} != ${row.poGames}`);
    for (const st of path.steps) {
      const m = /^(\d+)-(\d+)$/.exec(st.score ?? '');
      if (!m) { out.push('a playoff game with no score'); continue; }
      if ((Number(m[1]) > Number(m[2])) !== st.won) out.push(`a playoff score ${st.score} against won ${st.won}`);
    }
  }
  return out;
}

/** Section 5: opponents and names, from the ledger read here and the game's own list. */
function scheduleProblems(slug, SB, row, eraId, s, named) {
  const out = [];
  const ids = gameIds(slug, eraId);
  if (s.labels[0].key !== row.team || s.labels[0].name !== SB.teamLabelOf(row.team, eraId)) out.push('slot 0 is not his team');
  if (!named) {
    if (s.labels.slice(1).some(l => l.named || l.name !== 'another team')) out.push('an unnamed season prints a name');
    const homes = s.games.filter(g => g.home).length;
    if (Math.abs(2 * homes - s.games.length) > 1) out.push(`home games ${homes} of ${s.games.length}`);
    if (new Set(s.games.map(g => g.opp)).size !== s.games.length) out.push('an unnamed opponent met twice');
    return out;
  }
  const shape = M.usLeagueShape(slug, eraId, row.year);
  if (!shape) { out.push('named with no ledger shape'); return out; }
  for (const l of s.labels) if (!ids.includes(l.key) || l.name !== SB.teamLabelOf(l.key, eraId)) out.push(`a name the era's list does not vouch for: ${l.name} (${l.key})`);
  if (new Set(s.labels.map(l => l.name)).size !== s.labels.length) out.push('a name twice');
  const divOf = id => shape.divisions.find(d => d.teams.includes(id));
  const mine = divOf(row.team);
  if (!mine) { out.push('his team is in no division'); return out; }
  const count = new Map(); const home = new Map();
  for (const g of s.games) { const id = s.labels[g.opp].key; count.set(id, (count.get(id) ?? 0) + 1); if (g.home) home.set(id, (home.get(id) ?? 0) + 1); }
  const kinds = { div: [], conf: [], other: [] };
  for (const l of s.labels.slice(1)) {
    const dv = divOf(l.key);
    kinds[dv === mine ? 'div' : dv && dv.conf === mine.conf ? 'conf' : 'other'].push({ id: l.key, n: count.get(l.key) ?? 0, h: home.get(l.key) ?? 0 });
  }
  const homes = s.games.filter(g => g.home).length;
  if (slug === 'nba') {
    for (const t of kinds.div) if (t.n !== 4 || t.h !== 2) out.push(`division rival ${t.id}: ${t.n} games, ${t.h} at home`);
    const four = kinds.conf.filter(t => t.n === 4 && t.h === 2).length;
    const three = kinds.conf.filter(t => t.n === 3 && (t.h === 1 || t.h === 2));
    if (kinds.div.length !== 4 || kinds.conf.length !== 10 || four !== 6 || three.length !== 4 || three.filter(t => t.h === 2).length !== 2) out.push(`conference split: ${four} at four, ${three.length} at three`);
    for (const t of kinds.other) if (t.n !== 2 || t.h !== 1) out.push(`other conference ${t.id}: ${t.n} games, ${t.h} at home`);
    if (kinds.other.length !== 15 || homes !== 41) out.push(`home games ${homes}`);
  }
  return out;
}

/* ─── Section 7's bands, each set from the spread measured over the five seed sets ───
   MEASURED 2026-10-07, SEEDSET 0 to 4 one at a time, CAREERS 40 (plus 8 targeted) a sport.
   NBA (801 to 820 derived seasons a set, 4057 pooled):
     seasons refused            0, 0, 0, 0, 0 of about 810      band: at most 1%
     no repair needed           88.5, 87.7, 88.7, 89.7, 89.4 %  band: at least 80% (headroom 7.7 points; the
                                                                sets spread over 2.0)
     points a team game, now    115.72, 115.72, 115.78, 115.77, 115.72 against 115.6   band: within 1.0
     points a team game, y2004  93.64, 93.50, 93.61, 93.64, 93.60 against 93.4         (worst gap 0.24; the
                                                                72 point floor lifts the old era a touch)
     his share of his team's
     points, 99th percentile    0.442, 0.437, 0.414, 0.416, 0.442   band: under 0.50
     median wins by result, pooled (asserted only with 20 or more seasons): missed 29 (band 17 to 40),
     first round 46 (41 to 52), semis 49 (45 to 57), conference finals 54 (48 to 61), lost the Finals 56
     (50 to 64), champions 58 (52 to 67): every one inside the middle half of its band, so strengthFor's
     7.9 was kept as designed.
   A refused season is not a wrong season (the player gets the plain tile), but more than 1 in 100 would
   be a hole a player meets, so that is where the band sits. */
const REFUSED_MAX = { nba: 0.01, nfl: 0.5 };
const NO_REPAIR_MIN = { nba: 0.8, nfl: 0.0 };
const NBA_POINTS_TOL = 1.0;
const NBA_SHARE_P99_MAX = 0.5;

/* ─── Run B: every season observed right after it is played ─── */
const seen = [];
const points = {};   // slug|era -> { sum, n } his team's and the other side's points
const shares = { nba: [] };
function observe(c, line, who) {
  const d = SPORT_DEFS[who.slug];
  const SB = M[d.binding];
  const bind = M[d.bindName];
  /* what the hub hands the viewer: the SAVED career and its last line */
  const career = JSON.parse(JSON.stringify(c));
  const row = career.seasons[career.seasons.length - 1];
  const rec = {
    ...who, year: row.year, games: row.games, teamResult: row.teamResult, backup: c.role === 'backup',
    heldLine: M.usSeasonHeldLine(who.slug, row.year), p3: [], p4: [], p5: [], p6: [],
  };
  seen.push(rec);
  const b = M.buildUsSeason(bind, career, row, SB.teamLabelOf);
  rec.build = b.ok ? 'ok' : b.why;
  if (!b.ok) return;
  const s = M.deriveSeasonOrWhy(b.sport, row, b.ctx);
  if (typeof s === 'string') { rec.why = s.startsWith('self:') ? 'self' : s; rec.whyFull = s; return; }
  rec.derived = true;
  rec.named = !!b.ctx.shape;
  rec.repairs = s.repairs;
  rec.attempt = s.attempt;
  rec.wins = s.games.filter(g => g.us > g.them).length;
  rec.level = s.games.filter(g => g.us === g.them).length;
  /* section 3 */
  if (who.slug === 'nba') rec.p3.push(...shownIsSavedNba(row, s));
  else if (typeof shownIsSavedNfl === 'function') rec.p3.push(...shownIsSavedNfl(row, career.pos, s));
  rec.p3.push(...boardIsTrue(who.slug, s));
  const band = ownBand(who.slug, row.teamResult);
  if (band && (rec.wins < band[0] || rec.wins > band[1])) rec.p3.push(`wins ${rec.wins} outside ${band[0]} to ${band[1]} for "${row.teamResult}"`);
  if (!band && s.target.kind !== 'none') rec.p3.push(`a band for the unknown result "${row.teamResult}"`);
  /* section 4 */
  const pathNow = M.usPlayoffPath(bind, row, b.ctx, b.key);
  rec.path = !!pathNow;
  rec.p4.push(...pathProblems(who.slug, row, pathNow, s.target));
  /* section 5 */
  rec.p5.push(...scheduleProblems(who.slug, SB, row, career.eraId, s, rec.named));
  /* section 6: twice, from a JSON round trip, and soFar at every game */
  const again = JSON.parse(JSON.stringify({ career, row }));
  const b2 = M.buildUsSeason(bind, again.career, again.row, SB.teamLabelOf);
  const s2 = b2.ok ? M.deriveSeasonOrWhy(b2.sport, again.row, b2.ctx) : 'build';
  if (JSON.stringify(s2) !== JSON.stringify(s)) rec.p6.push('a second derive from a JSON round trip differs');
  if (JSON.stringify(b2.ok ? M.usPlayoffPath(bind, again.row, b2.ctx, b2.key) : null) !== JSON.stringify(pathNow)) rec.p6.push('the path differs on a second read');
  let apps = 0;
  for (let md = 1; md <= s.games.length; md += 1) apps = M.soFar(s, md).apps;
  if (apps !== row.games) rec.p6.push(`soFar ends on ${apps} games`);
  /* section 7 numbers */
  const k = `${who.slug}|${career.eraId ?? 'now'}`;
  points[k] ??= { sum: 0, n: 0 };
  for (const g of s.games) { points[k].sum += g.us + g.them; points[k].n += 2; }
  if (who.slug === 'nba') for (const g of s.games) if (g.played) shares.nba.push(g.line.pts / g.us);
}

const trapA = { count: 0 };
const trapB = { count: 0 };
const tA = Date.now();
const runA = playAll(null, trapA);
const runB = playAll(observe, trapB);
console.log(`played ${runA.length} careers twice in ${Date.now() - tA} ms; ${seen.length} seasons observed`);

const median = xs => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : NaN; };
const pct = (xs, p) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN; };
const share = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');

for (const slug of SPORTS) {
  const d = SPORT_DEFS[slug];
  const o = OWN[slug];
  const all = seen.filter(r => r.slug === slug);
  const live = all.filter(r => r.teamResult !== 'SUSPENDED');
  console.log(`\n===== ${slug.toUpperCase()}: ${all.length} seasons (${all.filter(r => r.targeted).length} targeted), ${live.length} played =====`);

  /* 1 */
  const unknown = live.filter(r => r.teamResult !== o.missed && !o.results.includes(r.teamResult));
  tally('1', `${slug} every team result is the engine's missed word or one of its five`, unknown.slice(0, 5).map(r => JSON.stringify(r.teamResult)), live.length);
  tally('1', `${slug} games played sit in the engine's ranges`, live.filter(r => !d.gamesOk(r.games, r.year)).map(r => `${r.games} in ${r.year}`), live.length);
  if (slug === 'nba') check('1', live.filter(r => nbaShortYear(r.year)).length >= 100, `nba short seasons (66 or 72 games) are in the population (${live.filter(r => nbaShortYear(r.year)).length}, floor 100: 220 measured on 2026-10-08)`);
  const depthN = o.results.map(t => live.filter(r => r.teamResult === t).length);
  console.log(`     by result: missed ${live.filter(r => r.teamResult === o.missed).length}, ${o.results.map((t, i) => `${depthN[i]}`).join(' / ')} (depth 0 to title)`);
  check('1', depthN.every(n => n > 0), `${slug} every playoff depth and a title are in the population`);
  check('1', live.some(r => d.injury(r)), `${slug} an injury season is in the population (${live.filter(r => d.injury(r)).length})`);
  check('1', live.some(r => r.backup), `${slug} a backup season is in the population (${live.filter(r => r.backup).length})`);
  check('1', d.positions.every(p => live.some(r => r.pos === p)), `${slug} every position is in the population`);
  check('1', d.eras.every(e => live.some(r => r.eraId === e)), `${slug} both eras are in the population`);

  /* 2 */
  tally('2', `${slug} the hub's held line is there exactly when the binding holds the season`,
    live.filter(r => (r.heldLine !== null) !== (r.build === 'held')).map(r => `${r.year}: line ${r.heldLine ? 'yes' : 'no'}, build ${r.build}`), live.length);
  tally('2', `${slug} no held season yields a derived season`, live.filter(r => r.heldLine !== null && r.derived).map(r => `${r.year}`), live.filter(r => r.heldLine !== null).length);
  const heldYears = slug === 'nba' ? [2011, 2012, 2019, 2020] : [2005, 2012, 2020];
  for (const y of heldYears) {
    const at = live.filter(r => r.year === y);
    const org = at.filter(r => !r.targeted).length;
    console.log(`     ${y}: ${at.length} seasons (${org} organic, ${at.length - org} targeted), ${at.filter(r => r.build === 'held').length} held`);
    check('2', at.length > 0 && at.every(r => r.build === 'held'), `${slug} ${y} is in the population and every one is held`);
  }
  const tgtHeld = live.filter(r => r.targeted && r.build === 'held').length;
  check('2', tgtHeld > 0, `${slug} the targeted careers reach held seasons (${tgtHeld})`);

  /* 3 */
  const open = live.filter(r => r.build === 'ok');
  const derived = open.filter(r => r.derived);
  const refused = open.filter(r => !r.derived);
  const byWhy = {};
  for (const r of refused) byWhy[r.why] = (byWhy[r.why] ?? 0) + 1;
  console.log(`     open ${open.length}, derived ${derived.length}, refused ${refused.length} (${share(refused.length, open.length)}) ${JSON.stringify(byWhy)}`);
  if (refused.length) console.log(`     first refusals: ${refused.slice(0, 3).map(r => `${r.year} ${r.pos} ${r.games}g "${r.teamResult}": ${r.whyFull}`).join(' || ')}`);
  check('3', open.length > 100, `${slug} enough open seasons to mean anything (${open.length})`);
  check('3', refused.length <= open.length * REFUSED_MAX[slug], `${slug} seasons that cannot be laid out stay under ${(100 * REFUSED_MAX[slug]).toFixed(1)}% (${share(refused.length, open.length)})`);
  tally('3', `${slug} the season shown is the season saved (independent checker)`, derived.filter(r => r.p3.length).map(r => `${r.year} ${r.pos}: ${r.p3[0]}`), derived.length);

  /* 4 */
  tally('4', `${slug} the playoff path follows the saved result and playoff games`, derived.filter(r => r.p4.length).map(r => `${r.year} "${r.teamResult}": ${r.p4[0]}`), derived.length);
  console.log(`     paths shown: ${derived.filter(r => r.path).length}; playoff seasons ${derived.filter(r => o.results.includes(r.teamResult)).length}`);

  /* 5 */
  tally('5', `${slug} the schedule follows the formula and every name is the game's own`, derived.filter(r => r.p5.length).map(r => `${r.year} ${r.eraId}: ${r.p5[0]}`), derived.length);
  const namedN = derived.filter(r => r.named).length;
  console.log(`     named ${namedN}, unnamed ${derived.length - namedN} (organic unnamed ${derived.filter(r => !r.named && !r.targeted).length}, targeted unnamed ${derived.filter(r => !r.named && r.targeted).length})`);
  check('5', namedN > 0 && derived.length - namedN > 0, `${slug} named and unnamed seasons are both in the population`);
  for (const w of M.US_LEAGUE_SHAPES.filter(x => x.sport === slug)) {
    const ledger = w.shape.divisions.flatMap(dv => dv.teams).slice().sort();
    const own = [...gameIds(slug, w.era)].sort();
    check('5', JSON.stringify(ledger) === JSON.stringify(own), `${slug} the ledger's ids for era ${w.era} are exactly the game's list (${ledger.length} against ${own.length})`);
  }
  tally('5', `${slug} a throwback season never names an opponent`, derived.filter(r => r.named && r.eraId !== 'now').map(r => `${r.year} ${r.eraId}`), derived.filter(r => r.eraId !== 'now').length);

  /* 6 (per sport part) */
  tally('6', `${slug} deriving twice, from a JSON round trip, gives the same season, path and totals`, derived.filter(r => r.p6.length).map(r => `${r.year}: ${r.p6[0]}`), derived.length);

  /* 7 */
  const noRepair = derived.filter(r => r.repairs === 0).length;
  console.log(`     repairs: none in ${share(noRepair, derived.length)}, median ${median(derived.map(r => r.repairs))}, p90 ${pct(derived.map(r => r.repairs), 0.9)}; attempts after the first in ${share(derived.filter(r => r.attempt > 0).length, derived.length)}`);
  for (const ss of SEEDSETS) {
    const dd = derived.filter(r => r.seedset === ss);
    console.log(`       seed set ${ss}: ${dd.length} derived, no repair ${share(dd.filter(r => r.repairs === 0).length, dd.length)}, refused ${share(open.filter(r => r.seedset === ss && !r.derived).length, open.filter(r => r.seedset === ss).length)}`);
  }
  check('7', noRepair >= derived.length * NO_REPAIR_MIN[slug], `${slug} at least ${(100 * NO_REPAIR_MIN[slug]).toFixed(0)}% of seasons need no repair (${share(noRepair, derived.length)})`);
  [o.missed, ...o.results].forEach((t, i) => {
    const w = derived.filter(r => r.teamResult === t).map(r => r.wins);
    const [lo, hi] = o.bands[i];
    const q1 = lo + (hi - lo) * 0.25; const q3 = lo + (hi - lo) * 0.75;
    const med = median(w);
    console.log(`     wins for "${t}": n ${w.length}, median ${med}, p10 ${pct(w, 0.1)}, p90 ${pct(w, 0.9)} (band ${lo} to ${hi}, middle half ${q1} to ${q3})`);
    if (w.length >= 20) check('7', med >= q1 && med <= q3, `${slug} the median record for "${t}" sits in the middle half of its band`);
    else console.log(`     (not asserted: ${w.length} seasons is too few for a median)`);
  });
  for (const era of d.eras) {
    const p = points[`${slug}|${era}`];
    if (!p) continue;
    const m = p.sum / p.n;
    console.log(`     points a team game, era ${era}: ${m.toFixed(2)} over ${p.n / 2} games${slug === 'nba' ? ` (league mean ${M.NBA_SCORING[era]})` : ''}`);
    if (slug === 'nba') check('7', Math.abs(m - M.NBA_SCORING[era]) <= NBA_POINTS_TOL, `nba points a team game in era ${era} within ${NBA_POINTS_TOL} of the league mean (${m.toFixed(2)} against ${M.NBA_SCORING[era]})`);
  }
  if (slug === 'nba') {
    const p99 = pct(shares.nba, 0.99);
    console.log(`     his share of his team's points: median ${median(shares.nba).toFixed(3)}, p99 ${p99.toFixed(3)} over ${shares.nba.length} games`);
    check('7', p99 <= NBA_SHARE_P99_MAX, `nba his share of his team's points at the 99th percentile stays under ${NBA_SHARE_P99_MAX} (${p99.toFixed(3)})`);
  }
}

/* 6: nothing moves */
console.log('\n===== 6: nothing moves =====');
check('6', trapA.count === 0 && trapB.count === 0, `Math.random is never drawn while a season is derived (trap ${trapB.count})`);
let moved = 0; let seasons = 0;
runA.forEach((a, i) => { const b = runB[i]; seasons += a.length; if (a.length !== b.length) moved += 1; else a.forEach((h, k) => { if (h !== b[k]) moved += 1; }); });
check('6', moved === 0 && seasons > 0, `every career saved the same bytes with and without the viewer (${seasons} season hashes, ${moved} differ)`);

/* ─── 8: lazy by source ─── */
console.log('\n===== 8: lazy by source =====');
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
/** Static imports and re exports only: `import type` is erased and import() loads on demand. */
function staticImports(code) {
  const out = [];
  const re = /(?:^|[\n;])\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
  for (const m of code.matchAll(re)) if (!m[1]) out.push(m[2]);
  return out;
}
const EXTS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
function resolveSpec(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const e of EXTS) {
    const p = base + e;
    if (/\.(tsx?|mjs|js)$/.test(p) && existsSync(path.join(ROOT, p))) return p;
  }
  return base;
}
function staticClosure(roots, overrides = {}) {
  const seenFiles = new Set();
  const queue = [...roots];
  while (queue.length) {
    const f = queue.pop();
    if (seenFiles.has(f)) continue;
    seenFiles.add(f);
    const full = path.join(ROOT, f);
    if (!(f in overrides) && !existsSync(full)) continue;
    if (!/\.(tsx?|mjs|js)$/.test(f)) continue;
    const code = stripComments(f in overrides ? overrides[f] : readFileSync(full, 'utf8').replace(/\r\n/g, '\n'));
    for (const spec of staticImports(code)) { const r = resolveSpec(spec, f); if (r) queue.push(r); }
  }
  return seenFiles;
}
const LAZY_ONLY = f => f.startsWith('src/lib/season/') || f.startsWith('src/components/season-centre/')
  || f.startsWith('src/components/us-career/season/UsSeasonCentre') && !/UsSeasonCentre(Entry|Host)/.test(f)
  || f.startsWith('src/data/usLeagueShape');
const ROUTE_ROOTS = [
  'src/components/us-career/UsCareerBoard.tsx',
  'src/components/nba-my-career/NbaMyCareerBoard.tsx', 'src/components/nfl-my-career/NflMyCareerBoard.tsx',
  'src/lib/nbaCareerSport.ts', 'src/lib/nflCareerSport.ts',
];
const HOST = 'src/components/us-career/season/UsSeasonCentreHost.tsx';
const PLANT_IN = existsSync(path.join(ROOT, HOST)) ? HOST : ROUTE_ROOTS[1];
const PLANT = "import UsSeasonCentre from '@/components/us-career/season/UsSeasonCentre';\n";
const plantSrc = norm(readFileSync(path.join(ROOT, PLANT_IN), 'utf8'));
const closureNow = staticClosure(ROUTE_ROOTS, CONTROL === 'static' ? { [PLANT_IN]: PLANT + plantSrc } : {});
const leaked = [...closureNow].filter(LAZY_ONLY);
check('8', closureNow.size > 100, `the static closure of the two routes was walked (${closureNow.size} files)`);
check('8', closureNow.has(PLANT_IN), `the walk reaches ${PLANT_IN}`);
tally('8', 'no eager file of the two routes statically imports the season modules, the viewer or the league shape', leaked, closureNow.size);
/* the fence can fail, and reads the code, not the comments (always on) */
const planted = [...staticClosure(ROUTE_ROOTS, { [PLANT_IN]: PLANT + plantSrc })].filter(LAZY_ONLY);
const inComment = [...staticClosure(ROUTE_ROOTS, { [PLANT_IN]: `/* ${PLANT.trim()} */\n// ${PLANT.trim()}\n${plantSrc}` })].filter(LAZY_ONLY);
check('8', planted.length > leaked.length || CONTROL === 'static', `a planted static import of the viewer in ${path.basename(PLANT_IN)} is named (${planted.length} files)`);
check('8', inComment.length === (CONTROL === 'static' ? 0 : leaked.length), 'the same text in a comment is spared');
for (const f of ['src/lib/season/us.ts', ...SPORTS.map(s => SPORT_DEFS[s].numberFile)]) {
  const code = stripComments(norm(readFileSync(path.join(ROOT, f), 'utf8')));
  check('8', !/Math\.random/.test(code) && !/new Rng\(/.test(code), `${f} holds no Math.random and no new Rng(`);
}

/* ─── Closing ─── */
const failed = [...failsBy.values()].reduce((a, l) => a + l.length, 0);
console.log('');
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const red = [...failsBy.keys()].sort();
  const labels = failsBy.get(String(c.section)) ?? [];
  let ok = labels.length > 0;
  let note = '';
  /* Round 1103: the engine back on 82 must fail the games windows and nothing else. */
  if (CONTROL === 'short82') ok = ok && labels.some(l => l.includes("nba games played sit in the engine's ranges")) && red.length === 1;
  if (CONTROL === 'stage') {
    /* the season with the unknown string derives with no band and no path, and section 4 has nothing to say about it */
    const unk = seen.filter(r => r.slug === 'nba' && r.derived && r.teamResult !== OWN.nba.missed && !OWN.nba.results.includes(r.teamResult));
    const clean = unk.filter(r => !r.path && r.p4.length === 0 && !r.p3.some(p => p.includes('band')));
    ok = ok && unk.length > 0 && clean.length === unk.length;
    note = `; ${unk.length} seasons carry the unknown result, ${clean.length} of them shown with no band and no path`;
  }
  if (CONTROL === 'names') ok = ok && labels.some(l => l.includes('never names an opponent')) && labels.some(l => l.includes("every name is the game's own"));
  if (CONTROL === 'window') { ok = ok && labels.some(l => l.includes("are exactly the game's list")) && !labels.some(l => l.includes('never names an opponent')); note = '; the binding still named no throwback opponent'; }
  if (CONTROL === 'formula') ok = ok && labels.some(l => l.includes('follows the formula'));
  if (CONTROL === 'record') ok = ok && labels.some(l => l.includes('independent checker'));
  console.log(ok
    ? `control ${CONTROL}: RED AT THE NAMED CHECK (section ${c.section}); sections red: ${red.join(', ')}${note}`
    : `control ${CONTROL}: DID NOT FIRE AT ITS NAMED CHECK (section ${c.section}); sections red: ${red.join(', ') || 'none'}${note}`);
  console.log(`simUsSeasonCentre: ${checks} checks, ${failed} failed (control ${CONTROL})`);
  process.exit(ok ? 1 : 2);
}
console.log(`simUsSeasonCentre: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
