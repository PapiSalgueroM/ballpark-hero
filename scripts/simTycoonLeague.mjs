/**
 * Round 582 harness: Stadium Tycoon's league. Third round of the tycoon merge
 * (docs/design/round-580-tycoon-merge.md, section 8 and the Round 582 plan).
 *
 * Until this round a ground climbed ten divisions on its home win count and every
 * match drew a fresh name. Now each division is a small league of named rivals
 * with a table, and only the champion goes up. Everything below drives the real
 * lib's tick() at the hook's real cadence, read out of useStadiumTycoon.ts (the
 * simTycoonClock rule: the clock bug only existed at the cadence the app used).
 *
 *  1. Promoted if and only if champion. The harness sorts every final table
 *     itself (points, goal difference, goals for, a dead heat to you, name) and requires the club
 *     that went up to be the club on top, with both counts non-zero.
 *  2. Table integrity. After every matchday: played = W + D + L = the matchday for
 *     every club, points = 3 x W + D, total goals for = total goals against, and at
 *     season end every club has played the whole season. Your goals for and against
 *     equal the goal and conceded events of your league matches.
 *  3. Strength decides. The title rate with the squad pinned high beats the rate
 *     with it pinned low, against a neutral arm where the squad does nothing.
 *  4. Pace. The greedy floor bot's first promotion comes no later than its first
 *     reachable Sell up, and no later than it did under the old win count
 *     (scripts/data/tycoonLeagueBaseline.json, captured before the first edit).
 *  5. No reroll. A save and reload in the middle of a match finishes the season
 *     with a table identical to the run that never reloaded.
 *  6. Migration. For every home win count from 0 to 250, a save written by the
 *     frozen V1 build loads into the division that count had reached, with money,
 *     lifetime, rep, legacy points, best division, badges and milestones as V1
 *     loads them, and the save this build writes loads in the V1 build with its
 *     league intact.
 *  7. Names. Every league any ground can meet: unique, no longer than the lib's
 *     LEAGUE_NAME_MAX (17, measured by playLeagueTableFit),
 *     from the checked bank, and the name picker offers three names nobody in the
 *     league already has. None is a real club.
 *  8. Rebuild still plays the calendar it moved out of. rebuildDeck.ts imports
 *     roundRobinCalendar and tableOrder from leagueCore.ts, leagueCore imports
 *     nothing, and the four Rebuild harnesses stay green.
 *
 *  9. No wall (Round 582 review): clubs with a squad of 3 and of 6 get promoted
 *     out of the bottom league within three hours in all but a few seeded runs.
 * 10. The loader (Round 582 review): a league failing a check keeps its division,
 *     a doctored division above the career best is refused, an impossible table
 *     is refused, a kept "Your club" is remembered, a dead heat goes your way.
 *
 * Controls, each a patched copy of the lib bundled in place of the real one:
 *   threshold  a non-champion goes up when its win count would have promoted it  red 1
 *   flat       the squad stops changing either side's scoring chance             red 3
 *   doubleleg  the bottom divisions play home and away                           red 4
 *   reroll     the other fixtures roll Math.random                                red 5
 *   spread     the league latch reads the spread save instead of the raw one      red 6
 *   globalclimb   opponents strengthen by the career match count again            red 9
 *   dropdivision  a failed league is rebuilt from the old win count again         red 10
 *   uncapped      a stored league above the career best is trusted                red 10
 *   lopsided      a stored table that cannot add up is trusted                    red 10
 *   nametie       a dead heat at the top is settled by name again                 red 10
 *
 * Run: node scripts/simTycoonLeague.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const FROZEN = path.join(ROOT, 'scripts/fixtures/tycoonV1/stadiumTycoon.ts');
const BASELINE = path.join(ROOT, 'scripts/data/tycoonLeagueBaseline.json');
const NOW = 1767225600000;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const hook = read(path.join(ROOT, 'src/hooks/useStadiumTycoon.ts'));
const cadence = hook.match(/if \(acc >= ([0-9.]+)\)/);
if (!cadence) abort('cannot read the tick threshold out of useStadiumTycoon.ts, so the cadence here would be a guess');
const DT = Number(cadence[1]);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoonleague-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });

async function bundle(file, name) {
  const out = path.join(tmp, `${name}-${Math.random().toString(36).slice(2)}.mjs`);
  execSync(`npx --no-install esbuild "${file}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${out}" --log-level=error`, { cwd: ROOT, shell: true });
  return import('file:///' + out.replace(/\\/g, '/'));
}
async function patchedLib(name, rewrites) {
  let text = read(LIB);
  for (const [from, to] of rewrites) {
    if (text.split(from).length - 1 !== 1) abort(`control ${name}: the lib does not carry exactly one ${JSON.stringify(from.slice(0, 80))}, so this control would prove nothing`);
    text = text.replace(from, to);
  }
  const file = path.join(tmp, `${name}.ts`);
  fs.writeFileSync(file, text);
  return bundle(file, name);
}

const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
/** The table order the rules state: points, goal difference, goals for, a dead
 *  heat to your club (row 0), then name. Written here independently of the lib. */
const orderFor = you => (a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || (a.name === you ? -1 : b.name === you ? 1 : 0) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

/** Play one state at the real cadence until `seasons` seasons have ended, calling
 *  onTick(prev, result) after every tick. */
function playSeasons(T, state, roll, seasons, onTick, guardMinutes = 600) {
  let s = state;
  let ended = 0;
  for (let step = 0; step < Math.round((guardMinutes * 60) / DT) && ended < seasons; step += 1) {
    const prev = s;
    const r = T.tick(s, DT, roll);
    s = r.state;
    if (onTick) onTick(prev, r);
    ended += r.events.filter(e => e.kind === 'title' || e.kind === 'seasonEnd').length;
  }
  return { state: s, ended };
}

/** A club with its squad pinned, strong enough or weak enough to make the point. */
const pinned = (T, squad) => ({ ...T.newTycoon(0), fanbase: 800, levels: { ...T.newTycoon(0).levels, squad, stands: 20 } });

/* ---------- section bodies, each returning its failures ---------- */

function sectionPromotion(T) {
  const out = [];
  let champions = 0; let others = 0; let promotions = 0;
  for (let seed = 1; seed <= 8; seed += 1) {
    for (const squad of [0, 12, 30]) {
      playSeasons(T, pinned(T, squad), mulberry(seed * 31 + squad), 4, (prev, r) => {
        const end = r.events.find(e => e.kind === 'title' || e.kind === 'seasonEnd');
        if (!end) return;
        if (!Array.isArray(end.table)) { out.push('a season ended without its final table on the event'); return; }
        const order = orderFor(end.table[0].name);
        const top = [...end.table].sort(order)[0];
        const youWon = top === end.table[0] || top.name === end.table[0].name;
        const wentUp = r.events.some(e => e.kind === 'promoted');
        const titled = r.events.some(e => e.kind === 'title');
        if (youWon) champions += 1; else others += 1;
        if (wentUp) promotions += 1;
        if (wentUp && !youWon) out.push(`a club that finished ${[...end.table].sort(order).indexOf(end.table.find(c => c.name === end.table[0].name)) + 1} went up`);
        if (youWon && !titled) out.push('the club on top of the final table was not given the title');
        if (youWon && !wentUp && prev.league.division < 9) out.push('a champion below The Summit did not go up');
      });
    }
  }
  if (champions === 0) out.push('no season ended with the club on top, so "promoted if champion" was never tested');
  if (others === 0) out.push('no season ended with the club below the top, so "only if champion" was never tested');
  return { out, note: `${champions} titles and ${promotions} promotions across ${champions + others} seasons; ${others} seasons finished below the top and none of those went up` };
}

function sectionTable(T) {
  const out = [];
  let matchdaysChecked = 0;
  for (let seed = 1; seed <= 4; seed += 1) {
    let goals = 0; let conceded = 0;
    playSeasons(T, pinned(T, 10), mulberry(seed * 7), 3, (prev, r) => {
      for (const e of r.events) { if (e.kind === 'goal') goals += 1; if (e.kind === 'conceded') conceded += 1; }
      const lg = r.state.league;
      const end = r.events.find(e => e.kind === 'title' || e.kind === 'seasonEnd');
      const rows = end ? end.table : (lg.matchday !== prev.league.matchday ? lg.clubs : null);
      if (!rows) return;
      matchdaysChecked += 1;
      const played = end ? T.leagueShape(prev.league.division).matchdays : lg.matchday;
      for (const c of rows) {
        if (c.w + c.d + c.l !== played) out.push(`${c.name} has played ${c.w + c.d + c.l} of ${played} matchdays`);
        if (c.pts !== 3 * c.w + c.d) out.push(`${c.name} holds ${c.pts} points for ${c.w} wins and ${c.d} draws`);
      }
      const gf = rows.reduce((a, c) => a + c.gf, 0); const ga = rows.reduce((a, c) => a + c.ga, 0);
      if (gf !== ga) out.push(`the table scores ${gf} goals for and ${ga} against`);
      if (rows[0].gf !== goals || rows[0].ga !== conceded) out.push(`your row reads ${rows[0].gf}-${rows[0].ga} where your matches produced ${goals} goals and ${conceded} conceded`);
      if (end) { goals = 0; conceded = 0; }
    });
  }
  if (matchdaysChecked < 30) out.push(`only ${matchdaysChecked} matchdays were checked`);
  return { out: [...new Set(out)].slice(0, 5), note: `${matchdaysChecked} matchday tables checked: every club played every matchday, points are 3W+D, goals balance, your row matches your match events` };
}

function titleRate(T, squad, seasons) {
  let titles = 0; let played = 0;
  for (let seed = 1; seed <= seasons; seed += 1) {
    const s = pinned(T, squad);
    const { state } = playSeasons(T, s, mulberry(seed * 977 + squad), 1, (_p, r) => {
      if (r.events.some(e => e.kind === 'title')) titles += 1;
    });
    if (state.league.season > 0 || state.league.division > 0) played += 1;
  }
  return { rate: titles / Math.max(1, played), played };
}

async function sectionStrength(T) {
  const out = [];
  const SEASONS = 40;
  const flat = await patchedLib('neutral-arm', FLAT_REWRITES);
  const hi = titleRate(T, 30, SEASONS); const lo = titleRate(T, 0, SEASONS);
  const nHi = titleRate(flat, 30, SEASONS); const nLo = titleRate(flat, 0, SEASONS);
  const gap = hi.rate - lo.rate; const neutral = nHi.rate - nLo.rate;
  /* Measured 2026-09-14 over these 40 seeded seasons per arm: squad 30 took
     the bottom league's title in 100% of seasons and squad 0 in 10%, a gap of
     0.90, while the neutral arm (squad does nothing) read 13% against 10%, a gap
     of 0.02. The fence at 0.35 is well under half the measured gap and far above
     anything the neutral arm produces. */
  if (gap < 0.35) out.push(`a squad of 30 won ${(hi.rate * 100).toFixed(0)}% of titles and a squad of 0 won ${(lo.rate * 100).toFixed(0)}%, a gap of ${gap.toFixed(2)}, under the 0.35 fence`);
  if (Math.abs(neutral) >= gap / 2) out.push(`the neutral arm, where the squad does nothing, shows a gap of ${neutral.toFixed(2)} against the real ${gap.toFixed(2)}, so the measure cannot tell strength from noise`);
  return { out, note: `title rate squad 30 ${(hi.rate * 100).toFixed(0)}%, squad 0 ${(lo.rate * 100).toFixed(0)}% (gap ${gap.toFixed(2)}); neutral arm ${(nHi.rate * 100).toFixed(0)}% vs ${(nLo.rate * 100).toFixed(0)}% (gap ${neutral.toFixed(2)})` };
}

function greedyPace(T, seed, minutes) {
  const roll = mulberry(seed);
  let s = T.newTycoon(0);
  let promotion = null; let sellUp = null;
  const everyTwo = Math.round(2 / DT);
  for (let step = 0; step < Math.round((minutes * 60) / DT); step += 1) {
    const r = T.tick(s, DT, roll);
    s = r.state;
    if (promotion === null && r.events.some(e => e.kind === 'promoted')) promotion = (step + 1) * DT / 60;
    if (sellUp === null && T.canPrestige(s)) sellUp = (step + 1) * DT / 60;
    if ((step + 1) % everyTwo === 0) {
      for (let i = 0; i < 6; i += 1) s = T.tap(s);
      for (let guard = 0; guard < 25; guard += 1) {
        const full = T.attendance(s) >= T.capacity(s) - 5;
        const options = T.TRACKS.filter(tr => T.canBuy(s, tr.id)).sort((a, b) =>
          T.costOf(s, a.id) * (full && a.id === 'stands' ? 0.55 : 1) - T.costOf(s, b.id) * (full && b.id === 'stands' ? 0.55 : 1));
        if (!options.length) break;
        s = T.buy(s, options[0].id);
      }
    }
    if (promotion !== null && sellUp !== null) break;
  }
  return { promotion: promotion ?? Infinity, sellUp: sellUp ?? Infinity };
}

function sectionPace(T) {
  const out = [];
  const base = JSON.parse(read(BASELINE));
  const runs = Array.from({ length: 10 }, (_, i) => greedyPace(T, i + 1, 60));
  const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const promo = median(runs.map(r => r.promotion)); const sell = median(runs.map(r => r.sellUp));
  if (promo > sell) out.push(`the first promotion comes at a median ${promo.toFixed(2)} minutes, after the first reachable Sell up at ${sell.toFixed(2)}`);
  if (promo > base.medianFirstPromotionMin) out.push(`the first promotion comes at a median ${promo.toFixed(2)} minutes, slower than the ${base.medianFirstPromotionMin} it took under the old win count`);
  const first = runs.filter(r => r.promotion <= r.sellUp).length;
  return { out, note: `median first promotion ${Number.isFinite(promo) ? promo.toFixed(2) : 'never'} min against first Sell up ${sell.toFixed(2)} min (promotion first in ${first}/10); before the league: ${base.medianFirstPromotionMin} and ${Number(base.medianFirstSellUpMin).toFixed(2)}` };
}

function sectionReroll(T) {
  const out = [];
  let compared = 0;
  for (let seed = 1; seed <= 6; seed += 1) {
    const straightRoll = mulberry(seed * 101);
    let straight = null;
    playSeasons(T, pinned(T, 8), straightRoll, 1, (_p, r) => { const e = r.events.find(x => x.kind === 'title' || x.kind === 'seasonEnd'); if (e) straight = e.table; });

    const roll = mulberry(seed * 101);
    let s = pinned(T, 8);
    const stopAt = Math.round(((2 * 126) + 37 + seed * 11) / DT);
    for (let step = 0; step < stopAt; step += 1) s = T.tick(s, DT, roll).state;
    s = T.deserializeTycoon(T.serializeTycoon(s, NOW), NOW);
    let reloaded = null;
    playSeasons(T, s, roll, 1, (_p, r) => { const e = r.events.find(x => x.kind === 'title' || x.kind === 'seasonEnd'); if (e) reloaded = e.table; });
    if (!straight || !reloaded) { out.push(`seed ${seed}: a season did not finish`); continue; }
    compared += 1;
    if (JSON.stringify(straight) !== JSON.stringify(reloaded)) out.push(`seed ${seed}: reloading mid-match finished the season with a different table`);
  }
  return { out, note: `${compared} seasons reloaded mid-match finished with tables identical to the runs that never reloaded` };
}

async function sectionMigration(T) {
  const out = [];
  const V1 = await bundle(FROZEN, 'v1');
  let checked = 0;
  for (let gw = 0; gw <= 250; gw += 1) {
    const v1 = { ...V1.newTycoon(NOW), groundWins: gw, money: 1000 + gw, lifetime: 50000 + gw, rep: gw % 4, legacyPoints: gw % 7, bestDivision: V1.divisionIndex({ ...V1.newTycoon(NOW), groundWins: gw }), ach: ['af500'], claimed: ['win1'], minute: gw % 90, goalsFor: gw % 3 };
    const raw = V1.serializeTycoon(v1, NOW);
    const was = V1.deserializeTycoon(raw, NOW);
    const now = T.deserializeTycoon(raw, NOW);
    if (!now || !now.league) { out.push(`${gw} wins: the save did not load with a league`); continue; }
    const expected = V1.divisionIndex(was);
    if (now.league.division !== expected) out.push(`${gw} home wins loaded into division ${now.league.division}, V1 had it in ${expected}`);
    for (const k of ['money', 'lifetime', 'rep', 'legacyPoints', 'bestDivision']) if (now[k] !== was[k]) out.push(`${gw} wins: ${k} loaded as ${now[k]}, V1 loads ${was[k]}`);
    for (const k of ['ach', 'claimed']) if (JSON.stringify(now[k]) !== JSON.stringify(was[k])) out.push(`${gw} wins: ${k} changed on load`);
    const back = V1.deserializeTycoon(T.serializeTycoon(now, NOW), NOW);
    if (!back) out.push(`${gw} wins: the V1 build refuses the save this build writes`);
    else if (JSON.stringify(back.league) !== JSON.stringify(now.league)) out.push(`${gw} wins: the V1 build does not carry the league through`);
    checked += 1;
  }
  return { out: out.slice(0, 6), note: `${checked} V1 saves from 0 to 250 home wins loaded into the division their win count reached, everything else as V1 loads it, and each loads back in V1 with its league` };
}

function sectionNames(T, realClubs) {
  const out = [];
  const bank = new Set(T.leagueNameBank());
  let leagues = 0;
  for (let rep = 0; rep <= 20; rep += 1) {
    for (let division = 0; division <= 9; division += 1) {
      for (let season = 0; season <= 6; season += 1) {
        const lg = T.newLeague(rep, division, season);
        leagues += 1;
        const names = lg.clubs.map(c => c.name);
        if (names.length !== T.leagueShape(division).clubs) out.push(`a division ${division} league has ${names.length} clubs`);
        if (new Set(names).size !== names.length) out.push(`a league repeats a club: ${names.join(', ')}`);
        for (const n of names.slice(1)) {
          if (n.length > T.LEAGUE_NAME_MAX) out.push(`${n} is too long for the table`);
          if (!bank.has(n)) out.push(`${n} is not from the checked bank`);
          if (realClubs.has(n)) out.push(`${n} is a real club`);
        }
        const options = T.clubNameOptions({ ...T.newTycoon(0), rep, league: lg });
        if (options.length !== 3 || new Set(options).size !== 3 || options.some(o => names.includes(o) || realClubs.has(o))) out.push(`the name picker offered ${options.join(', ')} beside ${names.join(', ')}`);
      }
    }
  }
  if (realClubs.size < 200) out.push(`only ${realClubs.size} real clubs loaded, so the collision check is not checking much`);
  return { out: [...new Set(out)].slice(0, 6), note: `${leagues} leagues across 21 reps, 10 divisions and 7 seasons: names unique, short enough, from the bank, never one of ${realClubs.size} real clubs; the picker never offers a taken name` };
}

function sectionRebuild() {
  const out = [];
  const deck = strip(read(path.join(ROOT, 'src/lib/rebuildDeck.ts')));
  const core = strip(read(path.join(ROOT, 'src/lib/leagueCore.ts')));
  if (!/import\s*\{[^}]*\broundRobinCalendar\b[^}]*\btableOrder\b[^}]*\}\s*from\s*'@\/lib\/leagueCore'/.test(deck)) out.push('rebuildDeck.ts does not import roundRobinCalendar and tableOrder from leagueCore');
  if (/function\s+roundRobinCalendar|const\s+tableOrder\s*=/.test(deck)) out.push('rebuildDeck.ts still defines its own copy of the calendar or the table order');
  if (/^\s*import\s/m.test(core)) out.push('leagueCore.ts imports something, so it can drag a module onto the stadium\'s first load');
  const ran = [];
  for (const h of ['simRebuildSeats', 'simRebuildSave', 'simRebuildLoop', 'simRebuildEconomy']) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', `${h}.mjs`)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    if (r.status !== 0) out.push(`${h} went red after the calendar moved: ${((r.stdout || '') + (r.stderr || '')).split('\n').filter(l => /FAIL/.test(l)).slice(0, 2).join(' | ')}`);
    else ran.push(h);
  }
  return { out, note: `rebuildDeck imports the shared calendar, leagueCore imports nothing, ${ran.length} of 4 Rebuild harnesses green` };
}

/* Round 582 review: the first draft strengthened opponents by the career match
   count, and under a title-only league that was a wall: a club with a squad of 3
   never left the bottom league in 91 of 200 three hour runs, where the old win
   count had promoted all 200. Measured after the fix (a division's rivals keep
   the strength they had when it was drawn): 0 of 200. */
function sectionNoWall(T) {
  const out = [];
  const SEEDS = 30;
  const stuck = { 3: 0, 6: 0 };
  const minutes = { 3: [], 6: [] };
  for (const squad of [3, 6]) {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      let promotedAt = null;
      let step = 0;
      playSeasons(T, pinned(T, squad), mulberry(seed * 7919 + squad), 1000, (_p, r) => {
        step += 1;
        if (promotedAt === null && r.events.some(e => e.kind === 'promoted')) promotedAt = step * DT / 60;
      }, 180);
      if (promotedAt === null) stuck[squad] += 1; else minutes[squad].push(promotedAt);
    }
  }
  /* Fence: 3 of 30. The fix measured 0 of 200 for both squads; the wall it
     replaced measured about 14 of 30 for squad 3. */
  for (const squad of [3, 6]) {
    if (stuck[squad] > 3) out.push(`a club with a squad of ${squad} never left the bottom league in ${stuck[squad]} of ${SEEDS} three hour runs`);
  }
  const med = xs => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)].toFixed(1) : 'never');
  return { out, note: `never promoted in three hours: squad 3 ${stuck[3]}/${SEEDS}, squad 6 ${stuck[6]}/${SEEDS}; median first promotion ${med(minutes[3])} and ${med(minutes[6])} min` };
}

/* The loader, as the review attacked it: a league that fails a check keeps its
   division (capped at the career best), a doctored division above the career
   best is refused, a table that cannot add up is refused, a kept "Your club" is
   remembered, and a dead heat at the top goes to your club. */
function sectionLoader(T) {
  const out = [];
  const roll = mulberry(4242);
  /* A real climb to a high division, then reloaded with one broken field. */
  let s = pinned(T, 40);
  const { state: climbed } = playSeasons(T, s, roll, 12, null, 600);
  s = climbed;
  /* A climb stops the tick a season ends, on an all-zero table, where "every
     rival lost every match" changes nothing. Play into the season first. */
  for (let guard = 0; guard < 20000 && s.league.matchday < 3; guard += 1) s = T.tick(s, DT, roll).state;
  if (s.league.matchday < 3) out.push('the loader test never reached a table with results in it');
  const division = s.league.division;
  if (division < 3) out.push(`the climb only reached division ${division}, so the fallback was not tested high enough`);
  const good = JSON.parse(T.serializeTycoon(s, NOW));
  const back = T.deserializeTycoon(JSON.stringify(good), NOW);
  if (!back || back.league.division !== division || JSON.stringify(back.league) !== JSON.stringify(s.league)) out.push('an honest league did not reload exactly as it was saved');
  const broken = JSON.parse(JSON.stringify(good));
  broken.league.clubs[1].name = 'Not A Generated Name';
  /* The review measured a greedy club reaching division 6 on 57 home wins, which
     the old ladder calls division 4: a strong squad here wins more and would hide
     the drop, so the save carries the win count a real fast climber has. */
  broken.groundWins = 57;
  const kept = T.deserializeTycoon(JSON.stringify(broken), NOW);
  if (!kept || kept.league.division !== division) out.push(`a division ${division} league with one bad rival name reloaded in division ${kept && kept.league.division}`);
  const doctored = { ...JSON.parse(T.serializeTycoon(T.newTycoon(0), NOW)) };
  doctored.league = { ...T.newLeague(0, 9, 0), baseMatchNo: 0 };
  const capped = T.deserializeTycoon(JSON.stringify(doctored), NOW);
  if (!capped || capped.league.division !== 0) out.push(`a save claiming The Summit on a career whose best is the bottom loaded in division ${capped && capped.league.division}`);
  const lopsided = JSON.parse(JSON.stringify(good));
  lopsided.league.clubs.forEach((c, i) => { if (i > 0) { c.l = c.w + c.d + c.l; c.w = 0; c.d = 0; c.ga += c.gf; c.gf = 0; c.pts = 0; } });
  const lop = T.deserializeTycoon(JSON.stringify(lopsided), NOW);
  if (!lop || JSON.stringify(lop.league.clubs) === JSON.stringify(lopsided.league.clubs.map(c => ({ ...c, pts: 3 * c.w + c.d })))) out.push('a table where every rival lost every match was accepted');
  if (lop && lop.league.division !== division) out.push('refusing an impossible table dropped the club a division');
  const kept2 = T.setClubName(T.newTycoon(0), T.YOUR_CLUB);
  const reloadedName = T.deserializeTycoon(T.serializeTycoon(kept2, NOW), NOW);
  if (!reloadedName || reloadedName.clubName !== T.YOUR_CLUB) out.push('keeping "Your club" was not remembered, so the name picker comes back on every reload');
  const heat = T.newLeague(0, 0, 0);
  const tied = { ...heat, matchday: 1, clubs: heat.clubs.map(c => ({ ...c, w: 0, d: 1, l: 0, gf: 1, ga: 1, pts: 1 })) };
  if (T.leagueStandings(tied)[0] !== tied.clubs[0]) out.push('a dead heat at the top went to a rival on name');
  return { out, note: `a division ${division} league reloads exactly, keeps its division with a bad field, a doctored Summit loads at the career best, an impossible table is refused, a kept name sticks, a dead heat goes your way` };
}

/* ---------- controls ---------- */

const FLAT_REWRITES = [
  ["  const sq = levelOf(s, 'squad');\n  return Math.min(0.16, 0.028 + sq * 0.0016);", '  return Math.min(0.16, 0.028);'],
  ['  const base = Math.max(0.008, Math.min(0.14, opp - sq * 0.0008));', '  const base = Math.max(0.008, Math.min(0.14, opp));'],
];
const CONTROLS = [
  { name: 'threshold', why: 'a club that did not win the league goes up when its home win count would have promoted it', section: 1,
    rewrites: [['  if (position !== 1) {', '  if (position !== 1 && legacyDivisionIndex(st.groundWins ?? 0) <= played.division) {']] },
  { name: 'flat', why: 'the squad stops changing either side\'s scoring chance', section: 3, rewrites: FLAT_REWRITES },
  { name: 'doubleleg', why: 'the bottom divisions play home and away, a 21 minute season', section: 4,
    rewrites: [['export const SINGLE_LEG_BELOW = 3;', 'export const SINGLE_LEG_BELOW = 0;']] },
  { name: 'reroll', why: 'the other fixtures roll Math.random instead of the league\'s seeded stream', section: 5,
    rewrites: [['  const rnd = mulberry32(hash32(lg.seed, lg.season, lg.matchday, 7));', '  const rnd = Math.random;']] },
  { name: 'spread', why: 'the league latch reads the spread save, which always carries a fresh bottom league', section: 6,
    rewrites: [['    const rawLeague = (p as { league?: unknown }).league;', '    const rawLeague = (s as { league?: unknown }).league;']] },
  { name: 'globalclimb', why: 'opponents are strengthened by the career match count again, the first draft', section: 9,
    rewrites: [['  return Number.isFinite(base) ? Math.min(s.matchNo, base as number) : s.matchNo;', '  return base === undefined || base !== null ? s.matchNo : s.matchNo;']] },
  { name: 'dropdivision', why: 'a league that fails a check is rebuilt from the old win count again', section: 10,
    rewrites: [['newLeague(s.rep, Number.isInteger(claimed) ? Math.min(Math.max(0, claimed as number), best) : Math.min(legacyDivisionIndex(s.groundWins ?? 0), best), 0, youName, s.matchNo);', 'newLeague(s.rep, Math.min(legacyDivisionIndex(s.groundWins ?? 0), best), 0, youName, s.matchNo);']] },
  { name: 'uncapped', why: 'a stored league above the career best is trusted', section: 10,
    rewrites: [['  if ((division as number) > bestDivision) return null;', '']] },
  { name: 'lopsided', why: 'a stored table that cannot add up is trusted', section: 10,
    rewrites: [["  if (sum('w') !== sum('l') || sum('gf') !== sum('ga')) return null;", '']] },
  { name: 'nametie', why: 'a dead heat at the top is settled by name again', section: 10,
    rewrites: [['(a === you ? -1 : b === you ? 1 : 0) || ', '']] },
];

/* ---------- run ---------- */

console.log(`Round 582: the Stadium Tycoon league, at the hook's cadence (dt ${DT}s)`);
const T = await bundle(LIB, 'league');
const cmEntry = path.join(tmp, 'cm-entry.mjs');
fs.writeFileSync(cmEntry, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };\nconst cm = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');\nexport const real = cm.REAL_LEAGUES; export const eras = cm.ERA_LEAGUES;\n`);
const CM = await bundle(cmEntry, 'cm');
const realClubs = new Set();
for (const lg of CM.real ?? []) for (const c of lg.clubs) realClubs.add(c);
for (const leagues of Object.values(CM.eras ?? {})) for (const lg of leagues) for (const c of lg.clubs) realClubs.add(c);

const SECTIONS = {
  1: ['Promoted if and only if champion', lib => sectionPromotion(lib)],
  2: ['Table integrity', lib => sectionTable(lib)],
  3: ['Strength decides the title', lib => sectionStrength(lib)],
  4: ['Pace against the first Sell up and the old ladder', lib => sectionPace(lib)],
  5: ['No reroll across a reload', lib => sectionReroll(lib)],
  6: ['Migration from V1 saves', lib => sectionMigration(lib)],
  7: ['Names', lib => sectionNames(lib, realClubs)],
  8: ['Rebuild still plays the shared calendar', () => sectionRebuild()],
  9: ['No wall: a club that can compete gets promoted in time', lib => sectionNoWall(lib)],
  10: ['The loader keeps divisions, refuses doctored leagues, and ties go your way', lib => sectionLoader(lib)],
};

for (const [n, [title, run]] of Object.entries(SECTIONS)) {
  console.log(`${n}) ${title}`);
  const { out, note } = await run(T);
  if (out.length) for (const m of out) fail(`section ${n}: ${m}`);
  else console.log(`   ${note}`);
}

for (const control of CONTROLS) {
  console.log('');
  console.log(`control ${control.name}: ${control.why}`);
  const broken = await patchedLib(control.name, control.rewrites);
  const [title, run] = SECTIONS[control.section];
  const { out } = await run(broken);
  if (!out.length) fail(`control ${control.name}: section ${control.section} (${title}) stayed green, so that check is dead`);
  else console.log(`   ok, section ${control.section} went red: ${out[0].slice(0, 200)}`);
  const { out: other } = await SECTIONS[2][1](broken);
  if (control.section !== 2 && other.length) fail(`control ${control.name}: table integrity went red too (${other[0]}), so the control breaks more than it claims`);
}

console.log('');
if (failures > 0) {
  console.error(`simTycoonLeague: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simTycoonLeague: green.');
console.log('   Only the champion goes up, the tables add up, the squad decides the title, and a reload replays nothing.');
console.log('   A new club is promoted before its first Sell up and sooner than the old win count managed.');
console.log('   Every older save lands in the division it had earned, no club that can compete is walled in, and all ten controls fired.');
