/* Reviewer probe (runs lens, Round 1514). Engine level, offline, no network. PROBE_PART=real|old|bytes|all.
 * real: a club that REALLY won the Champions League in season one (no edit) plays season two's UEFA Super Cup;
 *       a season two mid season move (before and after the UEFA night) carries worldComps.usc; usc nights never fall.
 * old:  saves written by the base engine (origin/main 92290f81, and the tree before Round 1509) load on the head,
 *       finish season one, roll over and play season two.
 * bytes: head against 92290f81 over clubs the builder's proof did not hold (France, Italy, other countries, tiers),
 *       every step compared with worldComps.dsc and worldComps.usc taken out, and the draws compared. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { engineOf, tape } from '../../scripts/lib/worldUclFleet.mjs';

const ROOT = process.cwd();
const PART = process.env.PROBE_PART || 'all';
const OUT = process.env.RC_OUT || '/tmp/probe-out';
fs.mkdirSync(OUT, { recursive: true });
const cannot = why => { console.log(`probe: cannot run: ${why}`); process.exit(2); };
const fails = [];
let checks = 0;
const ok = (c, m) => { checks += 1; if (!c) { fails.push(m); console.log(`   FAIL ${m}`); } };
const OPTS = { skipHalftime: true, noCoach: true };
const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 12);

function runner(seed) {
  let k = 0;
  return fn => { k += 1; return tape((seed * 0x9e3779b1 + k * 7919) >>> 0, fn); };
}
/** Plays entries until the season is over or `stop(state, i)` says so; calls `each` after every entry. */
function play(M, st, T, { stop = null, each = null } = {}) {
  for (let i = 0; i < 300; i += 1) {
    if (stop && stop(st, i)) return { st, over: false };
    const r = T(() => M.cm.playNextEntry(st, OPTS)).value;
    st = r.state;
    each?.(st, i);
    if (r.kind === 'seasonOver') return { st, over: true };
  }
  throw new Error('the season did not end in 300 entries');
}
const leagueOfClub = (M, club) => M.cm.REAL_LEAGUES.find(l => l.clubs.includes(club));
function join(M, cur, club) {
  const lg = leagueOfClub(M, club);
  const open = { club, league: lg.id, tier: 3, season: cur.season, week: cur.week, matchesLeft: 0, roll: 0, status: 'accepted' };
  return M.cal.joinClubNow({ ...cur, jobHunt: { open, cooldowns: [], sentSeason: cur.season, sent: 1, summerMove: null } });
}
const uscNights = s => (s.calendar ?? []).map((e, i) => (e.night?.k === 'usc' ? i : -1)).filter(i => i >= 0);
const iso = d => (d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : 'none');

const E = await engineOf(ROOT, 'head', {}, cannot);

/* ---------- real: a genuine Champions League winner plays the UEFA Super Cup ---------- */
async function partReal() {
  const probe = await E.fresh();
  const want = ['Real Madrid', 'Arsenal', 'Bayern Munich', 'PSG', 'Manchester City', 'Liverpool', 'Inter Milan', 'Barcelona'];
  const clubs = want.filter(c => leagueOfClub(probe, c));
  console.log(`real: candidates ${clubs.join(', ')}`);
  let winners = 0, tries = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    for (const club of clubs) {
      if (winners >= 3) break;
      tries += 1;
      const M = await E.fresh();
      const T = runner(seed);
      let st = T(() => M.cm.startCareer(club)).value;
      st = play(M, st, T).st;
      const fin = T(() => M.cm.finishSeason(st)).value.state;
      const final = fin.uclBracket?.find(t => t.round === 'F');
      if (final?.winner !== club) continue;
      winners += 1;
      const holder = M.cm.uclHolderOf(fin), uel = M.cm.uelHolderOf(fin);
      const next = T(() => M.cm.startNextSeason(fin)).value;
      const usc = next.worldComps?.usc;
      const tag = `${club} seed ${seed}`;
      ok(holder === club, `real ${tag}: uclHolderOf is ${holder}, my club won the final`);
      ok(!!usc && !usc.skip && usc.clubs?.[0] === club && usc.clubs?.[1] === uel, `real ${tag}: season two's UEFA Super Cup holds ${usc?.skip ?? usc?.clubs?.join(' v ')} (Europa League winner ${uel})`);
      const nights = uscNights(next);
      const dates = M.cal.entryDatesOf(next);
      ok(nights.length === 1, `real ${tag}: ${nights.length} UEFA Super Cup nights on my calendar`);
      const firstLeague = next.calendar.findIndex(e => e.type === 'league');
      console.log(`real ${tag}: WON the Champions League; season two UEFA Super Cup ${usc?.clubs?.join(' v ')}, night entry ${nights[0]} (${iso(dates[nights[0]])}), first league entry ${firstLeague} (${iso(dates[firstLeague])})`);
      ok(nights[0] > firstLeague, `real ${tag}: the UEFA night is not after the opener`);
      /* save and reload with the night ahead */
      M.store.clear();
      ok(M.cm.saveCareer(next), `real ${tag}: the engine refused to save season two`);
      const re = M.cm.loadCareer();
      ok(JSON.stringify(re?.worldComps?.usc) === JSON.stringify(usc) && JSON.stringify(uscNights(re)) === JSON.stringify(nights), `real ${tag}: the reload changed the UEFA Super Cup or its night`);
      let last = 0;
      const after = play(M, re, T, { each: s => { const d = M.cm.oneOffNightsDone(s, 'usc'); ok(d >= last, `real ${tag}: usc nights done fell ${last} to ${d} at week ${s.week}`); last = d; } }).st;
      const fin2 = T(() => M.cm.finishSeason(after)).value.state;
      const res = M.cm.evalOneOff(fin2, undefined, 'usc');
      const mine = fin2.worldComps?.usc?.mine ?? {};
      const cups = (fin2.trophies ?? []).filter(t => t.name === 'UEFA Super Cup' && t.season === 2);
      ok(Object.keys(mine).length === 1, `real ${tag}: my UEFA Super Cup result count ${Object.keys(mine).length}`);
      ok(!!res?.done && cups.length === (res.winner === club ? 1 : 0), `real ${tag}: winner ${res?.winner}, cabinet holds ${cups.length}`);
      console.log(`real ${tag}: played ${JSON.stringify(mine)}, winner ${res?.winner}, cabinet ${cups.length}`);
    }
  }
  console.log(`real: ${winners} real Champions League winners in ${tries} season ones`);
  if (winners === 0) console.log('real: NO real winner found, the path stays unexercised here');
}

/* ---------- move: a season two mid season move while a UEFA Super Cup is live ---------- */
async function partMove() {
  const cases = [['Chelsea', 'after'], ['Chelsea', 'before'], ['Liverpool', 'into-after'], ['Liverpool', 'into-before']];
  for (const seed of [1, 2]) {
    for (const [club, mode] of cases) {
      const M = await E.fresh();
      const T = runner(seed);
      const tag = `${club} seed ${seed} ${mode}`;
      let st = T(() => M.cm.startCareer(club)).value;
      st = play(M, st, T).st;
      const fin = T(() => M.cm.finishSeason(st)).value.state;
      let s2 = T(() => M.cm.startNextSeason(fin)).value;
      const usc = s2.worldComps?.usc;
      if (!usc || usc.skip || usc.clubs.includes(club)) { console.log(`move ${tag}: no followed UEFA Super Cup to move with (${JSON.stringify(usc)?.slice(0, 120)})`); continue; }
      const into = mode.startsWith('into');
      const target = into ? usc.clubs.find(c => leagueOfClub(M, c)) : ['Manchester City', 'Tottenham Hotspur', 'Aston Villa', 'Newcastle United'].find(c => c !== club && leagueOfClub(M, c) && !usc.clubs.includes(c));
      if (!target) { console.log(`move ${tag}: no target club`); continue; }
      const early = mode.endsWith('before');
      s2 = play(M, s2, T, { stop: s => (early ? true : M.cm.oneOffNightsDone(s, 'usc') >= 1) }).st;
      const doneB = M.cm.oneOffNightsDone(s2, 'usc');
      const evB = M.cm.evalOneOff(s2, undefined, 'usc');
      const joined = T(() => join(M, s2, target)).value;
      if (!joined) { console.log(`move ${tag}: joinClubNow refused ${target}`); continue; }
      const j = joined.worldComps?.usc;
      const doneA = M.cm.oneOffNightsDone(joined, 'usc');
      const evA = M.cm.evalOneOff(joined, undefined, 'usc');
      console.log(`move ${tag}: week ${s2.week} to ${target}; before ${JSON.stringify(usc.clubs)} done ${doneB} winner ${evB?.winner ?? '-'}; after ${j ? (j.skip ? `stub ${j.skip}` : `${j.clubs.join(' v ')} seen ${j.seen ?? 0}`) : 'NO usc'} done ${doneA} winner ${evA?.winner ?? '-'}; nights on the new calendar ${uscNights(joined).length}`);
      ok(!!j, `move ${tag}: the UEFA Super Cup is gone after the move`);
      if (j && into && doneB === 0) ok(j.skip === 'joined', `move ${tag}: joined an entrant before its night and holds ${j.skip ?? 'a live slice'}`);
      if (j && doneB > 0) ok(doneA >= doneB && evA?.winner === evB?.winner, `move ${tag}: the night shown before the move (winner ${evB?.winner}) shows ${doneA} nights, winner ${evA?.winner}`);
      ok(uscNights(joined).length === 0, `move ${tag}: a UEFA night on the new club's calendar after a mid season move`);
      let last = doneA;
      const end = play(M, joined, T, { each: s => { const d = M.cm.oneOffNightsDone(s, 'usc'); ok(d >= last, `move ${tag}: usc nights done fell ${last} to ${d}`); last = d; } }).st;
      const fin2 = T(() => M.cm.finishSeason(end)).value.state;
      const s3 = T(() => M.cm.startNextSeason(fin2)).value;
      const u3 = s3.worldComps?.usc;
      ok(!!u3 && u3.s === 3, `move ${tag}: season three holds ${JSON.stringify(u3)?.slice(0, 100)}`);
      ok(!(fin2.trophies ?? []).some(t => t.name === 'UEFA Super Cup'), `move ${tag}: a UEFA Super Cup in the cabinet of a manager who never played it`);
    }
  }
}

/* The harness's oracle (simOneOffCups oracleOf), ported: the finished season's champions and cup winners. */
function oracleOf(M, prev) {
  const lg = M.cm.careerLeagueOf(prev);
  const nation = M.cm.leagueRulesOf(lg.id).nationId;
  const top = M.cm.worldLeagueDefs(prev).find(l => { const r = M.cm.leagueRulesOf(l.id); return r.nationId === nation && r.ladder === 'top'; });
  const rows = !top ? [] : top.id === lg.id ? M.cm.sortedLeagueTable(prev) : (prev.world?.[top.id] ? M.cm.sortedWorldTable(prev, top.id, prev.world[top.id].table) : []);
  const table = rows.map(r => r.club);
  const cupWinner = prev.cupBracket?.find(t => t.round === 'F')?.winner ?? null;
  const champ = table[0] ?? null;
  const doubled = !!cupWinner && cupWinner === champ;
  return { nation, clubs: champ && cupWinner ? [champ, doubled ? table[1] : cupWinner] : null };
}
const ROW_OF = { germany: 'ger-2026', france: 'fra-2026', england: 'eng-2026' };

/* ---------- old: base saves loaded on the head ---------- */
async function partOld() {
  const bases = [['B0', '92290f81'], ['B1', '77556430']];
  const clubs = ['Juventus', 'Bayer Leverkusen', 'Marseille', 'Chelsea', 'Bayern Munich'];
  for (const [b, base] of bases) {
    let Eb = null;
    try { Eb = await engineOf(ROOT, `base-${b}`, { base }, why => { throw new Error(why); }); } catch (e) { ok(false, `old ${b}: the base engine did not bundle: ${String(e).slice(0, 200)}`); continue; }
    for (const club of clubs) {
      for (const at of ['mid', 'end']) {
        const tag = `${b} ${club} ${at}`;
        try {
          const Mb = await Eb.fresh();
          const T = runner(7);
          let st = T(() => Mb.cm.startCareer(club)).value;
          if (at === 'mid') st = play(Mb, st, T, { stop: (s, i) => i >= 12 }).st;
          else st = T(() => Mb.cm.finishSeason(play(Mb, st, T).st)).value.state;
          Mb.store.clear();
          if (!Mb.cm.saveCareer(st)) { ok(false, `old ${tag}: the base refused to save`); continue; }
          const items = [...Mb.store.entries()];
          const M = await E.fresh();
          for (const [k, v] of items) M.store.set(k, v);
          const s = M.cm.loadCareer();
          ok(!!s && s.season === 1 && s.clubName === club, `old ${tag}: loaded ${s?.clubName} season ${s?.season}`);
          if (!s) continue;
          const k1 = Object.keys(s.worldComps ?? {}).join(' ') || 'none';
          const fin = at === 'mid' ? T(() => M.cm.finishSeason(play(M, s, T).st)).value.state : s;
          const want = oracleOf(M, fin);
          const ucl = M.cm.uclHolderOf(fin), uel = M.cm.uelHolderOf(fin);
          const s2 = T(() => M.cm.startNextSeason(fin)).value;
          const dsc = s2.worldComps?.dsc, usc = s2.worldComps?.usc;
          const row = ROW_OF[want.nation] ?? null;
          if (row) ok(!!dsc && dsc.row === row && (dsc.skip || JSON.stringify(dsc.clubs) === JSON.stringify(want.clubs)), `old ${tag}: season two's super cup ${dsc?.row} ${dsc?.skip ?? dsc?.clubs?.join(' v ')}, the oracle says ${row} ${want.clubs?.join(' v ')}`);
          else ok(!dsc, `old ${tag}: season two holds ${dsc?.row}, ${want.nation} plays none in 2027-28`);
          if (ucl && uel && ucl !== uel) ok(!!usc && !usc.skip && JSON.stringify(usc.clubs) === JSON.stringify([ucl, uel]), `old ${tag}: usc ${usc?.skip ?? usc?.clubs?.join(' v ')} against ${ucl} v ${uel}`);
          else ok(usc?.skip === 'noWinner' || usc?.skip === 'unfinished', `old ${tag}: a winner unknown (${ucl}, ${uel}) and usc holds ${usc?.skip ?? usc?.clubs?.join(' v ')}`);
          const end = play(M, s2, T).st;
          const fin2 = T(() => M.cm.finishSeason(end)).value.state;
          const ev = usc && !usc.skip ? M.cm.evalOneOff(fin2, undefined, 'usc') : null;
          if (usc && !usc.skip) ok(!!ev?.done, `old ${tag}: season two ended with the UEFA Super Cup not done`);
          M.store.clear();
          ok(M.cm.saveCareer(fin2), `old ${tag}: the head refused to save season two`);
          const bytes = [...M.store.values()].reduce((n, v) => n + v.length, 0);
          console.log(`old ${tag}: loaded keys ${k1}; s2 dsc ${dsc ? `${dsc.row} ${dsc.skip ?? dsc.clubs.join(' v ')}` : 'none'}; usc ${usc ? (usc.skip ?? usc.clubs.join(' v ')) : 'none'} (ucl ${ucl}, uel ${uel}); s2 usc winner ${ev?.winner ?? '-'}; save ${bytes} chars`);
        } catch (e) {
          ok(false, `old ${tag}: threw ${String(e?.stack ?? e).slice(0, 300)}`);
        }
      }
    }
  }
}

/* ---------- bytes: head against 92290f81, the two new keys taken out ---------- */
const sortKeys = v => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v);
function strip(st) {
  const c = structuredClone(st);
  if (c.worldComps) { delete c.worldComps.dsc; delete c.worldComps.usc; if (!Object.keys(c.worldComps).length) delete c.worldComps; }
  c.calendar = (c.calendar ?? []).filter(e => !(e.night && (e.night.k === 'dsc' || e.night.k === 'usc')));
  return c;
}
async function journeyRec(Eng, club, seed) {
  const M = await Eng.fresh();
  const T = runner(seed);
  const rec = [];
  const note = (label, r) => { const s = r.value?.state ?? r.value; rec.push({ label, st: s, draws: sha(JSON.stringify(r.draws)), n: r.draws.length }); return s; };
  let st = note('start', T(() => M.cm.startCareer(club)));
  for (let season = 1; season <= 2; season += 1) {
    for (let i = 0; i < 300; i += 1) {
      const r = T(() => M.cm.playNextEntry(st, OPTS));
      st = r.value.state;
      rec.push({ label: `s${season}-e${i + 1}`, st, draws: sha(JSON.stringify(r.draws)), n: r.draws.length });
      if (r.value.kind === 'seasonOver') break;
    }
    st = note(`s${season}-finish`, T(() => M.cm.finishSeason(st)));
    if (season === 1) st = note('s1-rollover', T(() => M.cm.startNextSeason(st)));
  }
  return rec;
}
async function partBytes() {
  const Eb = await engineOf(ROOT, 'bytes-base', { base: '92290f81' }, cannot);
  const probe = await E.fresh();
  const pick = ['Marseille', 'Juventus', 'Napoli', 'Ajax', 'Benfica', 'Celtic', 'LA Galaxy', 'Bayer Leverkusen'].filter(n => leagueOfClub(probe, n));
  for (const re of [/mx/i, /bundesliga.?2|2.?bundesliga/i, /serie.?b/i, /ligue.?2/i, /mls/i]) { const l = probe.cm.REAL_LEAGUES.find(x => re.test(x.id)); if (l) pick.push(l.clubs[l.clubs.length - 1]); }
  console.log(`bytes: clubs ${pick.join(', ')}`);
  let equal = 0, total = 0;
  for (const club of pick) {
    for (const seed of [1, 2]) {
      total += 1;
      const a = await journeyRec(Eb, club, seed), h = await journeyRec(E, club, seed);
      let first = null;
      for (let i = 0; i < Math.min(a.length, h.length) && !first; i += 1) {
        const sa = JSON.stringify(strip(a[i].st)), sh = JSON.stringify(strip(h[i].st));
        if (sa !== sh || a[i].draws !== h[i].draws || a[i].label !== h[i].label) {
          const orderOnly = sa !== sh && JSON.stringify(sortKeys(strip(a[i].st))) === JSON.stringify(sortKeys(strip(h[i].st)));
          const keys = Object.keys({ ...a[i].st, ...h[i].st }).filter(k => JSON.stringify(strip(a[i].st)[k]) !== JSON.stringify(strip(h[i].st)[k]));
          const hs = h[i].st;
          const part = !!hs?.worldComps?.dsc?.clubs?.includes(club) || !!hs?.worldComps?.usc?.clubs?.includes(club);
          first = `${a[i].label}/${h[i].label}: ${orderOnly ? 'key order only' : `keys ${keys.slice(0, 8).join(' ')}`}; draws ${a[i].n} v ${h[i].n}; participant ${part} (dsc ${hs?.worldComps?.dsc?.row ?? '-'} ${hs?.worldComps?.dsc?.clubs?.join(' v ') ?? hs?.worldComps?.dsc?.skip ?? ''}; usc ${hs?.worldComps?.usc?.clubs?.join(' v ') ?? hs?.worldComps?.usc?.skip ?? '-'})`;
        }
      }
      if (!first && a.length !== h.length) first = `step counts ${a.length} v ${h.length}`;
      if (!first) equal += 1;
      console.log(`bytes ${club} seed ${seed}: ${first ? `DIFFERS at ${first}` : `equal over ${a.length} steps`}`);
      if (first && !/participant true/.test(first)) ok(false, `bytes ${club} seed ${seed}: a watcher moves: ${first}`);
    }
  }
  console.log(`bytes: ${equal} of ${total} journeys equal to 92290f81 with dsc and usc taken out`);
}

/* ---------- jump: a watcher's UEFA night shown at once by a week 0 move (seen in p-move) ---------- */
async function partJump() {
  const show = (M, s) => { const d = M.cal.entryDatesOf(s); return (s.calendar ?? []).slice(0, 5).map((e, i) => `${i}:${e.type}${e.night ? `/${e.night.k}` : ''}@${iso(d[i])}`).join(' '); };
  for (const seed of [1, 2]) {
    for (const wk of [0, 1]) {
      for (const target of ['Manchester City', 'Aston Villa', 'Juventus']) {
        const M = await E.fresh();
        const T = runner(seed);
        let st = T(() => M.cm.startCareer('Chelsea')).value;
        st = play(M, st, T).st;
        const fin = T(() => M.cm.finishSeason(st)).value.state;
        let s2 = T(() => M.cm.startNextSeason(fin)).value;
        s2 = play(M, s2, T, { stop: s => s.week >= wk }).st;
        const usc = s2.worldComps?.usc;
        if (!usc || usc.skip || usc.clubs.includes(target)) { console.log(`jump seed ${seed} w${wk} ${target}: skipped (${usc?.skip ?? usc?.clubs?.join(' v ')})`); continue; }
        const pB = M.cm.oneOffNightPlaces(s2, 'usc'), dB = M.cm.oneOffNightsDone(s2, 'usc');
        const j = T(() => join(M, s2, target)).value;
        if (!j) { console.log(`jump seed ${seed} w${wk} ${target}: refused`); continue; }
        const pA = M.cm.oneOffNightPlaces(j, 'usc'), dA = M.cm.oneOffNightsDone(j, 'usc');
        const uB = M.cm.worldUclNightsDone?.(s2), uA = M.cm.worldUclNightsDone?.(j);
        console.log(`jump seed ${seed} w${wk} to ${target}: BEFORE week ${s2.week} [${show(M, s2)}] usc places ${JSON.stringify(pB)} done ${dB}; AFTER week ${j.week} [${show(M, j)}] usc places ${JSON.stringify(pA)} done ${dA} seen ${j.worldComps?.usc?.seen ?? 0}; ucl nights done ${uB} then ${uA}`);
        ok(!(dB === 0 && dA > 0 && j.week <= 1), `jump seed ${seed} w${wk} ${target}: the UEFA night (not yet played before the move) is shown as played right after it, at week ${j.week}`);
      }
    }
  }
}

if (PART === 'jump') await partJump();
if (PART === 'all' || PART === 'real') await partReal();
if (PART === 'all' || PART === 'move') await partMove();
if (PART === 'all' || PART === 'old') await partOld();
if (PART === 'all' || PART === 'bytes') await partBytes();
console.log(`probe ${PART}: ${checks} checks, ${fails.length} failures${fails.length ? `: ${fails.slice(0, 3).join(' / ')}` : ''}`);
process.exit(fails.length ? 1 : 0);
