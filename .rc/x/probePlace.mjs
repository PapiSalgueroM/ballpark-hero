// Round 1308 review (run lens): the card's words and rows against an oracle written here from the NFL's own rules
// (2 v 7, 3 v 6, 4 v 5; the top seed meets the lowest seed left; the better seed hosts; the conference winners meet),
// for every club after EVERY single playoff game of many seasons. PROBE_CONTROL=fixed makes the oracle forget the
// reseeding (the top seed meets the 4 v 5 winner): it must then disagree, or the oracle proves nothing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const CONTROL = process.env.PROBE_CONTROL || '';
const SEASONS = Number(process.env.SEASONS || 120);
const out = path.join(os.tmpdir(), `probe-place-${process.pid}.mjs`);
await build({
  stdin: { contents: [
    "export * as E from './src/lib/frontOffice.ts';",
    "export * as B from './src/lib/gmBracket.ts';",
    "export * as V from './src/lib/gmBracketView.ts';",
    "export * as NP from './src/lib/frontOfficePostseason.ts';",
    "export { nflSeedOf, nflWeekLabel } from './src/components/front-office/NflBracket.tsx';",
    "export { FO_TEAM_MAP } from './src/data/frontOfficePlayers.ts';",
  ].join('\n'), resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
});
const { E, B, V, NP, nflSeedOf, nflWeekLabel, FO_TEAM_MAP } = await import(pathToFileURL(out).href);
fs.unlinkSync(out);
const name = id => FO_TEAM_MAP.get(id)?.name ?? id;
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* the oracle: the NFL bracket from seeds and the games played so far, by its own rules */
function oracle(seeds, played) {
  const res = {}; // tie id -> { home, away, winner, loser } once played
  for (const p of played) { const g = p.games[p.games.length - 1]; res[p.id] = { home: p.home, away: p.away, winner: g.winner, loser: g.winner === p.home ? p.away : p.home }; }
  const ties = [];
  for (const [c, conf] of [[0, 'AFC'], [1, 'NFC']]) {
    const s = n => seeds[c * 7 + n - 1];
    const seedOf = id => seeds.indexOf(id) - c * 7 + 1;
    const wc = [[2, 7], [3, 6], [4, 5]].map(([h, a], k) => ({ id: `${conf}-WC-${k + 1}`, week: 1, round: `${conf} Wild Card`, home: s(h), away: s(a) }));
    ties.push(...wc);
    const wcDone = wc.every(t => res[t.id]);
    let div = [{ id: `${conf}-DIV-1`, week: 2, round: `${conf} Divisional`, home: s(1), away: null }, { id: `${conf}-DIV-2`, week: 2, round: `${conf} Divisional`, home: null, away: null }];
    if (wcDone) {
      const left = wc.map(t => res[t.id].winner).sort((a, b) => seedOf(a) - seedOf(b));
      if (CONTROL === 'fixed') div = [{ ...div[0], away: res[`${conf}-WC-3`].winner }, { ...div[1], home: [res[`${conf}-WC-1`].winner, res[`${conf}-WC-2`].winner].sort((a, b) => seedOf(a) - seedOf(b))[0], away: [res[`${conf}-WC-1`].winner, res[`${conf}-WC-2`].winner].sort((a, b) => seedOf(a) - seedOf(b))[1] }];
      else div = [{ ...div[0], away: left[2] }, { ...div[1], home: left[0], away: left[1] }];
    }
    ties.push(...div);
    const divDone = div.every(t => res[t.id]);
    const cc = { id: `${conf}-CC`, week: 3, round: `${conf} Championship`, home: null, away: null };
    if (divDone) { const w = div.map(t => res[t.id].winner).sort((a, b) => seedOf(a) - seedOf(b)); cc.home = w[0]; cc.away = w[1]; }
    ties.push(cc);
  }
  const afc = res['AFC-CC'], nfc = res['NFC-CC'];
  ties.push({ id: 'SB', week: 4, round: 'Super Bowl', home: afc && nfc ? afc.winner : null, away: afc && nfc ? nfc.winner : null });
  return { ties, res };
}
function expectLine(seeds, played, club) {
  if (!seeds.includes(club)) return 'No playoffs this year.';
  const { ties, res } = oracle(seeds, played);
  if (res.SB && res.SB.winner === club) return 'Champions.';
  const lost = ties.filter(t => res[t.id] && res[t.id].loser === club);
  if (lost.length) return `Out in the ${lost[lost.length - 1].round}.`;
  const week = [1, 2, 3, 4].find(w => ties.some(t => t.week === w && !res[t.id]));
  const mine = ties.find(t => t.week === week && (t.home === club || t.away === club));
  if (!mine) return 'You have the bye.';
  if (res[mine.id]) return 'Through. The rest of this round is still to play.';
  const other = mine.home === club ? mine.away : mine.home;
  return other ? `Next: the ${mine.round}, against ${name(other)}.` : `Next: the ${mine.round}.`;
}

const format = NP.NFL_POSTSEASON.formatFor(2026);
let checks = 0, bad = 0, rowsBad = 0, games = 0;
const firstBad = [];
for (let i = 0; i < SEASONS; i += 1) {
  const rng = mulberry(9000 + i);
  const real = Math.random; Math.random = rng;
  const lg = E.initLeague(Math.random, {});
  for (let w = 1; w <= E.REGULAR_WEEKS; w += 1) { E.injuryPass(lg.teams, Math.random); E.aiWeeklyMoves(lg, 'BUF', Math.random); for (const g of lg.schedule[lg.week - 1]) E.simGame(g, lg.teams, Math.random); if (lg.week < E.REGULAR_WEEKS) lg.week += 1; }
  Math.random = real;
  const seeds = NP.NFL_POSTSEASON.seeds(lg);
  const play = NP.nflPlayTie(lg.teams, rng, lg.season, undefined, []);
  let save = B.openBracket(format, lg.season, seeds);
  /* a tie at a time, each week's ties in a shuffled order, checking every club after every game */
  for (let step = 0; step <= 13; step += 1) {
    for (const club of Object.keys(lg.teams)) {
      checks += 1;
      const got = V.gmBracketPlace(format, save, club, name).line;
      const want = expectLine(seeds, save.played, club);
      if (got !== want) { bad += 1; if (firstBad.length < 6) firstBad.push(`season ${i} step ${step} ${club}: card "${got}", oracle "${want}"`); }
    }
    /* the rows of the open week: sides as the oracle names them, his scores on his side, seeds 1 to 7 a conference */
    const { open } = V.gmBracketWeeks(format, save);
    const { ties, res } = oracle(seeds, save.played);
    for (const r of V.gmBracketRows(format, save, open, seeds[0])) {
      const o = ties.find(t => t.id === r.id);
      const p = save.played.find(x => x.id === r.id);
      const g = p ? p.games[p.games.length - 1] : null;
      const ok = r.sides[0].club === o.home && r.sides[1].club === o.away && (!g || (r.sides[0].score === g.homeScore && r.sides[1].score === g.awayScore))
        && r.sides.every(s => !s.club || nflSeedOf(seeds, s.club) === (seeds.indexOf(s.club) % 7) + 1) && r.decided === !!res[r.id];
      if (!ok) { rowsBad += 1; if (firstBad.length < 6) firstBad.push(`season ${i} step ${step} row ${r.id}: ${JSON.stringify(r.sides)} oracle ${o.home} v ${o.away}`); }
    }
    if (step === 13) break;
    const week = B.bracketWeek(format, save);
    const left = format.ties.filter(t => t.week === week && !save.played.some(p => p.id === t.id));
    const pick = left[Math.floor(rng() * left.length)];
    save = JSON.parse(JSON.stringify(B.playBracketGame(format, save, pick.id, play)));
    games += 1;
  }
}
console.log(`weeks named ${[1, 2, 3, 4].map(nflWeekLabel).join(', ')}`);
for (const b of firstBad) console.log(`  DIFF ${b}`);
console.log(`probePlace${CONTROL ? ` (control ${CONTROL})` : ''}: ${SEASONS} seasons, ${games} playoff games one at a time, ${checks} place lines checked, ${bad} differ from the oracle; ${rowsBad} rows differ`);
process.exit(bad + rowsBad === 0 ? 0 : 1);
