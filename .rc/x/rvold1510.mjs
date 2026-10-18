/* Review of Round 1510 (lens: runs things), the old saves probe. Run on a runner from the repo root:
 *   node .rc/x/rvold1510.mjs [baseSha]
 * A save written by the LIVE engine (origin/main, Release BJ, 77556430 by default) at two reload points (mid season
 * one, and the season over before the rollover) is opened by the head engine and by the live engine, both played on
 * with one counter stream through the rollover and season two. Asserted: the head loads every save; no save gains a
 * super cup at load (no load repair, the round's promise); until the rollover every step equals the live engine's
 * with worldComps.uel and .dsc taken out (canonical JSON, and the draws); after it a watcher's season two equals the
 * live engine's the same way, and a participant's season two holds its night first and, once played, a result in its
 * slice that agrees with the cabinet. Then the other way: a head participant save opened by the live engine plays on
 * without throwing (a rollback). Exit 0 green, 1 red, 2 could not run. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.argv[2] || '77556430';
/* The engine the head is compared with: Round 1509's closed head, this round's merge parent, so a difference is
   this round's and not the Europa League's. The live engine (BASE) only writes the saves and takes the rollback. */
const REF_SHA = process.argv[3] || 'f2bb6325';
const { engineOf, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const cannot = why => { console.log(`rvold1510: cannot run: ${why}`); process.exit(2); };
const fails = [];
let checks = 0;
const ok = (c, m) => { checks += 1; if (!c) fails.push(m); };
const canon = v => (Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object'
  ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v));
const bare = st => {
  const c = { ...st };
  if (c.worldComps) { const w = { ...c.worldComps }; delete w.uel; delete w.dsc; if (Object.keys(w).length) c.worldComps = w; else delete c.worldComps; }
  if (Array.isArray(c.calendar)) c.calendar = c.calendar.filter(e => !e.night);
  return canon(c);
};

const MAIN = await engineOf(ROOT, 'main', { base: BASE }, cannot);
const HEAD = await engineOf(ROOT, 'head', {}, cannot);
const REF = await engineOf(ROOT, 'ref', { base: REF_SHA }, cannot);
const opts = { skipHalftime: true, noCoach: true };
const CLUBS = (process.env.RVOLD_CLUBS || 'Arsenal,Manchester City,Liverpool,Chelsea,Everton,Real Madrid').split(',');
const SEEDS = (process.env.RVOLD_SEEDS || '1,2').split(',').map(Number);
const stats = { saves: 0, loaded: 0, gainedAtLoad: 0, stepsEqual: 0, watchers2: 0, participants2: 0, nightsPlayed: 0, won: 0, rollback: 0 };

function playSeason(M, s, seed, k0, until = Infinity) {
  let k = k0;
  const steps = [];
  for (let i = 0; i < 300 && s.week < s.calendar.length && i < until; i += 1) {
    const r = tape((seed * 0x9e3779b1 + (k += 1) * 7919) >>> 0, () => M.cm.playNextEntry(s, opts));
    s = r.value.state;
    steps.push({ s, draws: r.draws.length });
  }
  return { s, steps, k };
}
const saveWith = (M, s) => { M.store.clear(); if (!M.cm.saveCareer(s)) cannot('a save was refused'); return [...M.store.entries()]; };
const loadWith = async (E, items) => { const M = await E.fresh(); for (const [k, v] of items) M.store.set(k, v); return { M, s: M.cm.loadCareer() }; };

for (const club of CLUBS) {
  for (const seed of SEEDS) {
    const M = await MAIN.fresh();
    let s = tape(seed, () => M.cm.startCareer(club)).value;
    const mid = playSeason(M, s, seed, 0, 12);
    const points = [{ at: 'mid', items: saveWith(M, mid.s), k: mid.k }];
    const end = playSeason(M, mid.s, seed, mid.k);
    const fin = tape(seed + 77, () => M.cm.finishSeason(end.s)).value.state;
    points.push({ at: 'end', items: saveWith(M, fin), k: end.k });
    /* A live save whose club won the season's cup (the final's winner set, as playOneOffCups (d) does), so the
       head meets a participant from an old save on every English club. */
    const cupped = JSON.parse(JSON.stringify(fin));
    const final = (cupped.cupBracket ?? []).find(t => t.round === 'F');
    if (final && club !== 'Real Madrid') { final.winner = club; points.push({ at: 'endcup', items: saveWith(M, cupped), k: end.k }); }
    for (const p of points) {
      const tag = `${club} seed ${seed} ${p.at}`;
      stats.saves += 1;
      const h = await loadWith(HEAD, p.items), b = await loadWith(REF, p.items);
      ok(!!h.s, `${tag}: the head does not load a live save`);
      if (!h.s || !b.s) continue;
      stats.loaded += 1;
      if (h.s.worldComps?.dsc) stats.gainedAtLoad += 1;
      ok(!h.s.worldComps?.dsc && !h.s.calendar.some(e => e.night), `${tag}: a live save gained a super cup at load`);
      ok(bare(h.s) === bare(b.s), `${tag}: loaded, the head's state is not the live engine's (uel and dsc aside)`);
      let hs = h.s, bs = b.s, k = p.k;
      if (p.at === 'mid') {
        const x = playSeason(h.M, hs, seed, k), y = playSeason(b.M, bs, seed, k);
        for (let i = 0; i < Math.min(x.steps.length, y.steps.length); i += 1) {
          const same = bare(x.steps[i].s) === bare(y.steps[i].s) && x.steps[i].draws === y.steps[i].draws;
          if (!same) { ok(false, `${tag}: season one step ${i} differs from the live engine (draws ${x.steps[i].draws} against ${y.steps[i].draws})`); break; }
          stats.stepsEqual += 1;
        }
        hs = tape(seed + 77, () => h.M.cm.finishSeason(x.s)).value.state;
        bs = tape(seed + 77, () => b.M.cm.finishSeason(y.s)).value.state;
        k = x.k;
      }
      const hn = tape(seed + 99, () => h.M.cm.startNextSeason(hs)).value, bn = tape(seed + 99, () => b.M.cm.startNextSeason(bs)).value;
      const dsc = hn.worldComps?.dsc;
      const mine = !!dsc && !dsc.skip && dsc.clubs?.includes(hn.clubName);
      console.log(`  ${tag}: season two ${dsc ? (dsc.skip ? `stub ${dsc.skip}` : `${dsc.clubs.join(' v ')}${mine ? ' (mine)' : ''}`) : 'no super cup'}`);
      if (club !== 'Real Madrid') ok(!!dsc, `${tag}: an English save meets no super cup at its next rollover`);
      if (!mine) {
        stats.watchers2 += 1;
        ok(bare(hn) === bare(bn), `${tag}: the rollover's state differs from the live engine (uel and dsc aside)`);
        const x = playSeason(h.M, hn, seed, k + 500), y = playSeason(b.M, bn, seed, k + 500);
        for (let i = 0; i < Math.min(x.steps.length, y.steps.length); i += 1) {
          const same = bare(x.steps[i].s) === bare(y.steps[i].s) && x.steps[i].draws === y.steps[i].draws;
          if (!same) { ok(false, `${tag}: watcher season two step ${i} differs from the live engine`); break; }
          stats.stepsEqual += 1;
        }
        continue;
      }
      stats.participants2 += 1;
      ok(hn.calendar[0]?.type === 'oneOff' && hn.calendar[0]?.night?.k === 'dsc', `${tag}: a participant's season two does not open with its night`);
      ok(bare(hn) === bare(bn), `${tag}: a participant's rollover differs from the live engine's beyond its night (uel and dsc aside)`);
      const after = tape(seed + 123, () => h.M.cm.playNextEntry(hn, opts)).value.state;
      const res = h.M.cm.evalOneOff(after);
      const won = after.trophies.some(t => t.minor && t.season === after.season);
      stats.nightsPlayed += 1; if (won) stats.won += 1;
      ok(!!res?.done && (res.winner === after.clubName) === won, `${tag}: the night's result (${res?.winner}) and the cabinet (${won ? 'won' : 'not won'}) disagree`);
      ok(after.books?.season?.weeks === hn.books?.season?.weeks, `${tag}: the night charged a wage week (${hn.books?.season?.weeks} then ${after.books?.season?.weeks})`);
      /* The rollback: the live engine opens this participant save and plays on. */
      try {
        const back = await loadWith(MAIN, saveWith(h.M, hn));
        ok(!!back.s, `${tag}: the live engine does not load a head participant save`);
        if (back.s) { let t = back.s; for (let i = 0; i < 3; i += 1) t = tape(seed + 200 + i, () => back.M.cm.playNextEntry(t, opts)).value.state; stats.rollback += 1; }
      } catch (e) { ok(false, `${tag}: the live engine throws on a head participant save: ${String(e).slice(0, 160)}`); }
    }
  }
}
console.log(`  stats: ${JSON.stringify(stats)}`);
for (const f of fails.slice(0, 30)) console.log(`  FAIL ${f}`);
console.log(fails.length ? `rvold1510: ${fails.length} FAILURES of ${checks} checks` : `rvold1510: green, ${checks} checks (base ${BASE})`);
process.exit(fails.length ? 1 : 0);
