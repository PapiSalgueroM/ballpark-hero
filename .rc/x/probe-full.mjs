// reviewer probe (runner only, never committed): node .rc/x/probe.mjs
// A: both views of one told game mirror each other. B: the save guards under random damage (throws, loops, an unsound repair).
// C: three named cases of repairGmBracket. D: a second sport with overtime bound to the same libraries.
import fs from 'node:fs';
import path from 'node:path';
import { bundle, seededGen } from '../../scripts/lib/gmGameDayFleet.mjs';

const { M } = await bundle([
  "export * as score from './src/lib/gmGameScore.ts';",
  "export * as day from './src/lib/gmGameDay.ts';",
  "export * as bracket from './src/lib/gmBracket.ts';",
  "export * as nflDay from './src/lib/gameLaws/nflGameDay.ts';",
  "export * as nflData from './src/data/gmBrackets/nfl.ts';",
  "export { NFL_SCORE_LAW } from './src/lib/gameLaws/nflScore.ts';",
  "export { FO_TEAMS } from './src/data/frontOfficePlayers.ts';",
  "export { keyedRng } from './src/lib/keyedRng.ts';",
], [], 'review-probe');
const { score: S, day: D, bracket: B, nflDay, nflData, NFL_SCORE_LAW: LAW } = M;
const GAME_DAY = nflDay.NFL_GAME_DAY;
const FORMAT = nflData.NFL_BRACKET;
const CLUBS = M.FO_TEAMS.map(t => t.abbr);
const CLUBSET = new Set(CLUBS);
const isClub = id => CLUBSET.has(id);
const out = { A: {}, B: {}, C: {}, D: {} };
const K = Number(process.env.PROBE_SCALE || 1);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ─ A: mirror ─ */
{
  const gen = seededGen('review probe A');
  let n = 0, nullStory = 0, mirrorBad = 0, labelBad = 0, lateBad = 0, first = '';
  for (let m = 1; m <= 60; m += 1) {
    const q = GAME_DAY.periods.of(m) + 1;
    if (!String(GAME_DAY.story.clock.label(m)).startsWith(`Q${q}`)) labelBad += 1;
  }
  for (let i = 0; i < Math.ceil(30000 * K); i += 1) {
    const pHome = 0.05 + 0.9 * gen.next();
    const f = { key: `probe|${i}`, home: CLUBS[i % 32], away: CLUBS[(i + 7) % 32], decided: { homeWon: gen.next() < pHome, pHome } };
    const h = D.tellGame(LAW, GAME_DAY, f, 'home');
    const a = D.tellGame(LAW, GAME_DAY, f, 'away');
    n += 1;
    if (!h || !a || !h.story || !a.story) { nullStory += 1; continue; }
    const flip = e => ({ ...e, side: e.side === 'us' ? 'them' : 'us' });
    const ok = same(h.told, a.told) && same(h.story.game.events.map(flip), a.story.game.events)
      && same(h.story.periods.us, a.story.periods.them) && same(h.story.periods.them, a.story.periods.us)
      && h.story.shape === a.story.shape && same(h.story.deciding.map(flip), a.story.deciding)
      && h.story.game.us === a.story.game.them && h.story.game.home === true && a.story.game.home === false;
    if (!ok) { mirrorBad += 1; if (!first) first = f.key; }
    if (h.story.shape === 'late') {
      const winner = h.story.game.us > h.story.game.them ? 'us' : 'them';
      let lead = 0, last = -1;
      h.story.game.events.forEach((e, k) => { lead += e.side === winner ? e.pts : -e.pts; if (lead <= 0) last = k; });
      if (!String(GAME_DAY.story.clock.label(h.story.game.events[last + 1].min)).startsWith('Q4')) lateBad += 1;
    }
  }
  out.A = { games: n, nullStory, mirrorBad, first, clockLabelDisagreesWithPeriods: labelBad, lateNotInQ4ByLabel: lateBad };
}

/* ─ B: the guards under random damage ─ */
function machineSave(gen, upToWeek) {
  const seeds = [...CLUBS].sort(() => gen.next() - 0.5).slice(0, 14);
  let save = B.openBracket(FORMAT, 2027, seeds);
  const play = (home, away) => { const hw = gen.next() < 0.55; const lo = Math.floor(gen.next() * 20); return { homeScore: hw ? lo + 3 : lo, awayScore: hw ? lo : lo + 3, winner: hw ? home : away }; };
  for (let w = 0; w < upToWeek; w += 1) save = B.playBracketWeek(FORMAT, save, play);
  return save;
}
const NASTY = [null, 0, -1, 1.5, 1e21, '', 'x', '__proto__', 'constructor', 'toString', [], {}, true, [null], { length: 3 }, 'KC', 2027, 2028];
function damage(gen, root) {
  const v = JSON.parse(JSON.stringify(root));
  const paths = [];
  const walk = (o, p) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) { paths.push([...p, k]); walk(o[k], [...p, k]); } };
  walk(v, []);
  const hits = 1 + Math.floor(gen.next() * 3);
  for (let h = 0; h < hits; h += 1) {
    const p = paths[Math.floor(gen.next() * paths.length)];
    let o = v;
    for (let i = 0; i < p.length - 1 && o && typeof o === 'object'; i += 1) o = o[p[i]];
    if (!o || typeof o !== 'object') continue;
    const k = p[p.length - 1];
    const mode = Math.floor(gen.next() * 5);
    if (mode === 0) { if (Array.isArray(o)) o.splice(Number(k), 1); else delete o[k]; }
    else if (mode === 1 && Array.isArray(o)) o.push(JSON.parse(JSON.stringify(o[Number(k)] ?? null)));
    else if (mode === 2 && Array.isArray(o) && o.length > 1) { const j = Math.floor(gen.next() * o.length); [o[Number(k)], o[j]] = [o[j], o[Number(k)]]; }
    else if (mode === 3 && typeof o[k] === 'string') o[k] = CLUBS[Math.floor(gen.next() * 32)];
    else o[k] = NASTY[Math.floor(gen.next() * NASTY.length)];
  }
  return v;
}
console.error('probe: A done');
{
  const gen = seededGen('review probe B');
  const tally = { tried: 0, throws: 0, loops: 0, guardPass: 0, soundAfterDamage: 0, repairUnsound: 0, repairNoChampion: 0, lastGameRead: 0, lastGameReadWithAHugeScore: 0 };
  const firsts = {};
  const soundKinds = {};
  const soundFirst = {};
  const note = (k, what) => { tally[k] += 1; if (!firsts[k]) firsts[k] = what; };
  const guarded = (label, v, fn) => { try { return fn(); } catch (e) { note(String(e && e.message).startsWith('LOOP') ? 'loops' : 'throws', `${label}: ${String(e && e.message).slice(0, 120)} on ${JSON.stringify(v).slice(0, 300)}`); return undefined; } };
  const capped = () => { let n = 0; return (home, away) => { n += 1; if (n > 400) throw new Error('LOOP: play called more than 400 times'); return { homeScore: 20, awayScore: 17, winner: home }; }; };
  for (let i = 0; i < Math.ceil(60000 * K); i += 1) {
    const base = machineSave(gen, i % 5);
    const v = damage(gen, base);
    tally.tried += 1;
    const reads = guarded('isGmBracketSave', v, () => B.isGmBracketSave(v, isClub));
    const problems = guarded('bracketProblems', v, () => B.bracketProblems(FORMAT, v, isClub));
    const rep = guarded('repairGmBracket', v, () => B.repairGmBracket(FORMAT, v, 2027, () => CLUBS.slice(0, 14), isClub));
    if (reads) {
      tally.guardPass += 1;
      guarded('bracketOutcomes', v, () => B.bracketOutcomes(FORMAT, v));
      const w = guarded('bracketWeek', v, () => B.bracketWeek(FORMAT, v));
      guarded('bracketPairings', v, () => B.bracketPairings(FORMAT, v, w ?? 1));
      guarded('bracketChampion', v, () => B.bracketChampion(FORMAT, v));
      guarded('bracketOut', v, () => B.bracketOut(FORMAT, v));
      guarded('bracketRounds', v, () => B.bracketRounds(FORMAT, v));
      guarded('playBracketWeek', v, () => B.playBracketWeek(FORMAT, v, capped()));
      guarded('playBracketAll', v, () => B.playBracketAll(FORMAT, v, capped()));
      if (problems && problems.length === 0 && !same(v, base)) {
        note('soundAfterDamage', JSON.stringify(v).slice(0, 400));
        /* which damage reads as sound: the kinds, counted */
        const kinds = [];
        if (v.season !== base.season) kinds.push('season');
        if (!same(v.seeds, base.seeds)) kinds.push(base.played.length ? 'seeds-of-a-played-bracket' : 'seeds-unplayed');
        if (!same(v.played, base.played)) {
          const strip = ps => ps.map(p => ({ id: p.id, home: p.home, away: p.away, winners: p.games.map(g => g.winner) }));
          const byId = ps => [...strip(ps)].sort((a, b) => (a.id < b.id ? -1 : 1));
          kinds.push(same(strip(v.played), strip(base.played)) ? 'scores-only' : same(byId(v.played), byId(base.played)) ? 'played-order' : v.played.length < base.played.length ? 'played-fewer' : 'played-other');
        }
        const kind = kinds.join('+') || 'other';
        soundKinds[kind] = (soundKinds[kind] ?? 0) + 1;
        if (!soundFirst[kind]) soundFirst[kind] = `${JSON.stringify(v).slice(0, 700)} WAS ${JSON.stringify(base).slice(0, 700)}`;
      }
    }
    if (rep) {
      const p2 = guarded('bracketProblems(repair)', v, () => B.bracketProblems(FORMAT, rep.save, isClub));
      if (!p2 || p2.length > 0 || rep.save.season !== 2027) note('repairUnsound', `${JSON.stringify(p2)} for ${JSON.stringify(v).slice(0, 300)}`);
      const end = guarded('playBracketAll(repair)', v, () => B.playBracketAll(FORMAT, rep.save, capped()));
      if (!end || !B.bracketChampion(FORMAT, end)) note('repairNoChampion', JSON.stringify(v).slice(0, 300));
    }
    /* the last game field, damaged the same way */
    const lg = D.makeGmLastGame({ key: `k${i}`, home: CLUBS[i % 32], away: CLUBS[(i + 5) % 32], homeScore: 24, awayScore: 17 }, 'w3');
    const dv = damage(gen, lg);
    const back = guarded('readGmLastGame', dv, () => D.readGmLastGame(dv, isClub));
    if (back) {
      tally.lastGameRead += 1;
      /* a huge whole score is READ by the guard; its story is not asked for here because it never comes back (bigscore.mjs shows that in a child process) */
      if (back.homeScore > 100000 || back.awayScore > 100000) note('lastGameReadWithAHugeScore', JSON.stringify(dv));
      else guarded('gameStory(read)', dv, () => D.gameStory(GAME_DAY, back, 'home'));
    }
  }
  out.B = { tally, firsts, soundKinds, soundFirst };
  console.error(`sound after damage, by kind: ${JSON.stringify(soundKinds)}`);
  for (const k of ['played-other', 'played-fewer', 'seeds-of-a-played-bracket']) if (soundFirst[k]) console.error(`  first ${k}: ${soundFirst[k]}`);
}

/* C: named cases */
{
  const gen = seededGen('review probe C');
  const sound = machineSave(gen, 2);
  const fresh = () => CLUBS.slice(0, 14);
  const r1 = B.repairGmBracket(FORMAT, sound, 2027, fresh, isClub, () => false);
  const r2 = B.repairGmBracket(FORMAT, undefined, 2027, fresh, isClub);
  const swapped = JSON.parse(JSON.stringify(B.openBracket(FORMAT, 2027, sound.seeds)));
  [swapped.seeds[0], swapped.seeds[13]] = [swapped.seeds[13], swapped.seeds[0]];
  const r3 = B.repairGmBracket(FORMAT, swapped, 2027, () => sound.seeds, isClub, s => same(s, sound.seeds));
  const protoClub = id => !!({ KC: 1, BUF: 1 })[id];
  out.C = {
    soundSaveWithSeedsOkFalse: { rebuilt: r1.rebuilt, problems: r1.problems },
    absentBlock: { rebuilt: r2.rebuilt, line: r2.line },
    unplayedSeedsSwappedAgainstSeedsOk: { rebuilt: r3.rebuilt, problems: r3.problems },
    lastGameWithAPrototypeNameAndALooseIsClub: D.readGmLastGame({ v: 1, key: 'k', where: 'w1', home: 'constructor', away: 'KC', homeScore: 3, awayScore: 0, winner: 'constructor' }, protoClub),
  };
}
console.error('probe: B and C done');
/* D: a second sport with overtime (three periods of 20, a five minute extra period), bound with data and events only */
{
  const pois = (rng, mean) => { let k = 0, p = Math.exp(-mean), s = p; const u = rng(); while (u > s && k < 12) { k += 1; p *= mean / k; s += p; } return k; };
  const HOCKEY_SCORE = { id: 'probe-hockey', score(pHome, rng, d) {
    if (d && d.beyond) { const lo = pois(rng, 2.4); return d.homeWon ? [lo + 1, lo] : [lo, lo + 1]; }
    return [pois(rng, 2.6 + 1.6 * (pHome - 0.5)), pois(rng, 2.6 - 1.6 * (pHome - 0.5))];
  } };
  const story = beyond => ({ id: 'probe-hockey', clock: { length: beyond ? 65 : 60, label: m => `${m}'`, start: 'Puck drop.', end: 'Final', endShort: 'FINAL' }, line: (e, club) => `Goal, ${club}.`,
    events(home, away, rng) {
      if (beyond && Math.abs(home - away) !== 1) return null;
      const ev = [];
      const used = new Set();
      const minute = (lo, hi) => { for (let t = 0; t < 200; t += 1) { const m = lo + Math.floor(rng() * (hi - lo + 1)); if (!used.has(m)) { used.add(m); return m; } } return null; };
      const hi = home > away ? 'us' : 'them';
      for (let i = 0; i < home; i += 1) ev.push({ side: 'us', kind: 'goal', pts: 1 });
      for (let i = 0; i < away; i += 1) ev.push({ side: 'them', kind: 'goal', pts: 1 });
      if (beyond) { const k = ev.findIndex(e => e.side === hi); const [w] = ev.splice(k, 1); for (const e of ev) e.min = minute(1, 60); w.min = minute(61, 65); ev.push(w); }
      else for (const e of ev) e.min = minute(1, 60);
      return ev.some(e => e.min === null) ? null : ev.sort((a, b) => a.min - b.min);
    } });
  const dayLaw = beyond => ({ story: story(beyond), periods: { count: beyond ? 4 : 3, of: m => Math.min(beyond ? 3 : 2, Math.max(0, Math.ceil(m / 20) - 1)), name: i => (i === 3 ? 'OT' : `P${i + 1}`) }, shape: { rout: 4, comeback: 2, say: (s, w) => `${w}: ${s}` } });
  const gen = seededGen('review probe D');
  const t = { games: 0, refused: 0, nullStory: 0, beyond: 0, beyondStoryEndsInOt: 0, beyondLevelAfterRegulation: 0, regulationFinalsTheOtLawWouldAlsoTell: 0, regulation: 0, wrongWinner: 0, swapped: 0, lastGameKeepsBeyond: 0 };
  for (let i = 0; i < Math.ceil(20000 * K); i += 1) {
    const pHome = 0.2 + 0.6 * gen.next();
    const beyond = gen.next() < 0.23;
    const f = { key: `hk|${i}`, home: 'AAA', away: 'BBB', decided: { homeWon: gen.next() < pHome, pHome, beyond } };
    const how = S.decidedScore(HOCKEY_SCORE, f.decided, f.key);
    const told = D.tellGame(HOCKEY_SCORE, dayLaw(beyond), f, 'home');
    t.games += 1;
    if (!told) { t.refused += 1; continue; }
    if (how && how.swapped) t.swapped += 1;
    if ((told.told.homeScore > told.told.awayScore) !== f.decided.homeWon) t.wrongWinner += 1;
    if (!told.story) { t.nullStory += 1; continue; }
    const saved = D.readGmLastGame(JSON.parse(JSON.stringify({ ...D.makeGmLastGame(told.told, 'w1'), beyond })), id => id === 'AAA' || id === 'BBB');
    if (saved && 'beyond' in saved) t.lastGameKeepsBeyond += 1;
    if (beyond) {
      t.beyond += 1;
      const p = told.story.periods;
      if (p.us[3] + p.them[3] === 1) t.beyondStoryEndsInOt += 1;
      if (p.us.slice(0, 3).reduce((a, b) => a + b, 0) === p.them.slice(0, 3).reduce((a, b) => a + b, 0)) t.beyondLevelAfterRegulation += 1;
    } else {
      t.regulation += 1;
      /* what a reload has to go on: the saved final alone. A one goal regulation final reads the same as an overtime one. */
      if (D.gameStory(dayLaw(true), told.told, 'home') !== null) t.regulationFinalsTheOtLawWouldAlsoTell += 1;
    }
  }
  out.D = t;
}

const dir = process.env.RC_OUT || '.';
fs.writeFileSync(path.join(dir, 'probe.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.A));
console.log(JSON.stringify(out.B.tally));
for (const [k, v] of Object.entries(out.B.firsts)) console.log(`  first ${k}: ${v}`);
console.log(JSON.stringify(out.C));
console.log(JSON.stringify(out.D));
console.log('probe: done');
