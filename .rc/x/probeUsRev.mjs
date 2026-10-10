/* Reviewer probe, US careers, Release AU (us-careers lens). Sent to a runner as .rc/x/probeUsRev.mjs, never committed.
   node .rc/x/probeUsRev.mjs --root <tree> --mode fleet --out f.json [--saves s.json]   plain or hooked board loop, digests
   node .rc/x/probeUsRev.mjs --root . --mode resume --in s.json --out r.json           old saves played on with the hooks
   node .rc/x/probeUsRev.mjs --mode compare --a x.json --b y.json                      exit 1 on any difference
   node .rc/x/probeUsRev.mjs --root . --mode plans|damage                               head only
   No network, no database, no clock. */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = path.resolve(arg('root') ?? '.'), MODE = arg('mode') ?? 'fleet';
const N = Number(arg('n') ?? 120), SEASONS = Number(arg('seasons') ?? 14);
const HAS = fs.existsSync(path.join(ROOT, 'src/lib/usCareerProgramme.ts'));
const HOOKED = HAS && arg('hooks') !== 'off';
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
const clone = v => JSON.parse(JSON.stringify(v));
const hashStr = s => { let h = 0x811c9dc5 >>> 0; for (let k = 0; k < s.length; k += 1) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
function keyed(key) {
  let a = hashStr('rev:' + key);
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
let draws = 0;
const useStream = key => { const s = keyed(key); draws = 0; Math.random = () => { draws += 1; return s(); }; };
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };

async function load() {
  const entry = [
    "export { NFL_CAREER_SPORT as nfl } from './src/lib/nflCareerSport.ts';",
    "export { NBA_CAREER_SPORT as nba } from './src/lib/nbaCareerSport.ts';",
    "export { MLB_CAREER_SPORT as mlb } from './src/lib/mlbCareerSport.ts';",
    "export { NHL_CAREER_SPORT as nhl } from './src/lib/nhlCareerSport.ts';",
    "export { startSummer, answerSummerCard } from './src/lib/usCareerSummer.ts';",
    "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';",
    HAS ? "export * as prog from './src/lib/usCareerProgramme.ts';" : '',
  ].join('\n');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'probeus-' + process.pid + '-'));
  const out = path.join(dir, 'b.mjs');
  await build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(process.cwd(), 'node_modules')] });
  return import(pathToFileURL(out).href);
}

function newCareer(M, slug, i, key) {
  const sport = M[slug];
  const positions = sport.create.positions, pos = positions[i % positions.length];
  const archs = sport.create.archetypes[pos], eras = sport.create.eras;
  const c = sport.startCareer('Probe ' + key, pos, archs[Math.floor(i / positions.length) % archs.length], Math.random, null, eras[i % eras.length].id);
  const tq = sport.rollTeamQuality(null, Math.random);
  sport.assignRole(c, tq, Math.random);
  return { c, tq };
}

/* One press of Play and the summer after it, in the board's order (UsCareerBoard.tsx playSeason). With hooked the
   five programme calls sit exactly where the board has them; persist() runs expire before every write. */
function playOne(M, sport, S, hooked, pick, watch) {
  const P = M.prog; let c = S.c; let line = null, prep = null, result = null;
  if (hooked) P.expireUsCareerProgramme(c);
  if ((c.suspendedSeasons ?? 0) > 0) {
    c.suspendedSeasons -= 1; line = sport.suspendedLine(c); c.seasons.push(line);
    sport.progress(c, Math.random);
    if (hooked) result = P.settleUsCareerProgramme(c, line, sport.slug);
  } else {
    if (c.contractYears <= 0) {
      const fa = sport.buildFaWindow(c, S.tq, Math.random), open = fa.offers.filter(x => !x.gone);
      if (open.length) { const offer = open[Math.floor(pick() * open.length)]; M.applyFaSigning(c, offer); sport.campBattle(c, offer.quality, Math.random); S.tq = offer.quality; }
      if (hooked) P.expireUsCareerProgramme(c);
    }
    sport.campBattle(c, S.tq, Math.random);
    if (watch) watch.pre = { health: c.health, morale: c.morale, arch: clone(c.archetype) };
    if (hooked) prep = P.prepareUsCareerProgramme(c, sport.slug);
    if (watch) watch.mid = { health: c.health, morale: c.morale, arch: clone(c.archetype) };
    line = sport.simSeason(c, S.tq, Math.random).line;
    if (watch) watch.post = { health: c.health, morale: c.morale, arch: clone(c.archetype) };
    if (hooked) P.restoreUsCareerProgramme(c, prep);
    if (watch) watch.rest = { health: c.health, morale: c.morale, arch: clone(c.archetype) };
    sport.progress(c, Math.random);
    if (watch) watch.beforeSettle = clone(c);
    if (hooked) result = P.settleUsCareerProgramme(c, line, sport.slug, prep);
    if (watch) {
      watch.prep = prep; watch.result = result; watch.line = clone(line); watch.afterSettle = clone(c);
      if (hooked) { watch.second = P.settleUsCareerProgramme(c, line, sport.slug, prep); watch.afterSecond = clone(c); }
    }
  }
  if (sport.shouldRetire(c)) { c.retired = true; if (hooked) P.expireUsCareerProgramme(c); return line; }
  let ev = M.startSummer(c, sport, Math.random, null);
  while (ev) { ev = M.answerSummerCard(c, sport, ev, Math.floor(pick() * ev.options.length), Math.random, null).next; }
  S.tq = sport.rollTeamQuality(S.tq, Math.random);
  const unread = (c.phoneInbox ?? []).find(m => m.answered === undefined);
  if (unread) sport.answerInbox(c, unread.id, Math.floor(pick() * unread.choices.length));
  if (c.pendingRivalryEvent) c = sport.dismissRivalryEvent(c).state;
  if (c.pendingRivalryChoice) { const r = sport.resolveRivalryChoice(c, Math.floor(pick() * c.pendingRivalryChoice.choices.length), Math.random); if (r) c = r.state; }
  S.c = c;
  if (hooked) P.expireUsCareerProgramme(c);
  return line;
}
const digestOf = (S, line) => sha(JSON.stringify(S.c) + '|' + JSON.stringify(line) + '|' + S.tq + '|' + draws);

async function fleet() {
  const M = await load(), keep = Math.random, out = {}, saves = {};
  for (const slug of SPORTS) for (let i = 0; i < N; i += 1) {
    const key = slug + ':' + i, cut = 1 + (i % 7); let pick = keyed('pick:' + key);
    useStream('a:' + key);
    const S = newCareer(M, slug, i, key), d = [];
    for (let n = 0; n < SEASONS && !S.c.retired; n += 1) {
      if (n === cut) { saves[key] = JSON.stringify({ c: S.c, tq: S.tq }); useStream('b:' + key); pick = keyed('pick2:' + key); }
      /* the control arm: every season starts with one plan chosen, so the comparison MUST go red */
      if (HOOKED && arg('plan')) S.c = M.prog.saveUsCareerProgramme(S.c, slug, { ...M.prog.usProgrammeDefaults(), workload: arg('plan') });
      const line = playOne(M, M[slug], S, HOOKED, pick); d.push(digestOf(S, line));
    }
    out[key] = d;
  }
  Math.random = keep;
  fs.writeFileSync(arg('out'), JSON.stringify(out));
  if (arg('saves')) fs.writeFileSync(arg('saves'), JSON.stringify(saves));
  const seasons = Object.values(out).reduce((a, d) => a + d.length, 0);
  console.log('probeUsRev fleet: root ' + ROOT + ', hooks ' + (HOOKED ? 'ON (no plan chosen)' : 'off') + ', ' + Object.keys(out).length + ' careers, ' + seasons + ' seasons, ' + Object.keys(saves).length + ' saves cut');
}

async function resume() {
  const M = await load(), keep = Math.random, saves = JSON.parse(fs.readFileSync(arg('in'), 'utf8')), out = {};
  let carried = 0;
  for (const key of Object.keys(saves)) {
    const [slug, iStr] = key.split(':'), i = Number(iStr), cut = 1 + (i % 7), pick = keyed('pick2:' + key);
    const S = JSON.parse(saves[key]);
    if ('programme' in S.c || 'programmeResults' in S.c || 'programmePartnership' in S.c) carried += 1;
    useStream('b:' + key);
    const d = [];
    for (let n = cut; n < SEASONS && !S.c.retired; n += 1) { const line = playOne(M, M[slug], S, HOOKED, pick); d.push(digestOf(S, line)); }
    out[key] = { cut, d, fields: ['programme', 'programmeResults', 'programmePartnership'].filter(f => f in S.c) };
  }
  Math.random = keep;
  fs.writeFileSync(arg('out'), JSON.stringify(out));
  console.log('probeUsRev resume: ' + Object.keys(out).length + ' old saves loaded and played on with hooks ' + (HOOKED ? 'ON' : 'off') + '; saves that arrived with a plan field: ' + carried + '; saves that ended with one: ' + Object.values(out).filter(o => o.fields.length).length);
}

function compare() {
  const A = JSON.parse(fs.readFileSync(arg('a'), 'utf8')), B = JSON.parse(fs.readFileSync(arg('b'), 'utf8'));
  let careers = 0, seasons = 0, bad = 0; const first = [];
  for (const key of Object.keys(B)) {
    const b = Array.isArray(B[key]) ? B[key] : B[key].d;
    const a = Array.isArray(B[key]) ? A[key] : (A[key] ?? []).slice(B[key].cut);
    careers += 1; seasons += b.length;
    const same = !!a && a.length === b.length && a.every((x, k) => x === b[k]);
    if (!same) { bad += 1; if (first.length < 6) first.push(key + ' first differs at season ' + (a ? a.findIndex((x, k) => x !== b[k]) : 'n/a') + ' (' + (a ? a.length : 0) + ' vs ' + b.length + ')'); }
  }
  if (Array.isArray(Object.values(B)[0]) && Object.keys(A).length !== Object.keys(B).length) bad += 1;
  for (const f of first) console.log('  DIFF ' + f);
  console.log('probeUsRev compare ' + (arg('label') ?? '') + ': ' + careers + ' careers, ' + seasons + ' seasons compared (save, line, team quality and draw count each season), ' + bad + ' differ. ' + (bad ? 'RED' : 'BYTE EQUAL'));
  process.exit(bad ? 1 : 0);
}

const r4 = n => Math.round(n * 10000) / 10000;
function settleChecks(P, slug, tag, who, S, S0, menu, opt, w) {
  const M = settleChecks.M, sport = M[slug], b = w.beforeSettle, a = w.afterSettle, res = w.result, line = w.line, played = line.games > 0;
  if (!res) { note(tag + ' SETTLE RETURNED NULL (no result row, plan dropped silently)', who + ' team ' + b.team + ' line team ' + line.team); return; }
  if (a.programme !== undefined) note(tag + ' PLAN STILL ON THE SAVE after it settled', who);
  if ((a.programmeResults ?? []).length !== 1) note(tag + ' RESULT ROWS after one season: ' + (a.programmeResults ?? []).length, who);
  if (w.second !== null || JSON.stringify(w.afterSecond) !== JSON.stringify(a)) note(tag + ' SETTLED TWICE: a second call changed the save', who);
  const d = res.decisions.find(x => x.section === menu.id);
  if (!d) { note(tag + ' NO DECISION ROW in the result', who); return; }
  note(tag + ' outcome ' + d.outcome);
  const dM = a.morale - b.morale, dH = a.health - b.health, dE = r4(a.earnings - b.earnings);
  if (menu.id === 'expectation') {
    const card = Number((opt.effect.match(/Play (\d+) games/) ?? [])[1]), stretch = opt.id === 'stretch';
    if (played && d.target !== card) note(tag + ' TARGET on the result (' + d.target + ') is not the card\'s (' + card + ')', who);
    if (played && (line.games >= card) !== (d.outcome === 'completed')) note(tag + ' OUTCOME disagrees with the card target', who + ' games ' + line.games + ' card ' + card);
    const want = !played ? 0 : d.outcome === 'completed' ? (stretch ? 6 : 3) : (stretch ? -5 : -3);
    if (dM !== want) note(tag + ' CARD SAYS morale ' + want + ' at the end, save got ' + dM, who + ' morale before ' + b.morale);
  } else if (menu.id === 'bonus') {
    const m = opt.effect.match(/^([\d.]+) (.+?) and (\d+) games: (\d)% of season salary/) ?? [];
    const target = Number(m[1]), games = Number(m[3]), pct = Number(m[4]) / 100;
    if (played && d.target !== target) note(tag + ' TARGET on the result (' + d.target + ') is not the card\'s (' + target + ')', who);
    const hit = played && typeof d.actual === 'number' && d.actual >= target && line.games >= games;
    if (played && hit !== (d.outcome === 'completed')) note(tag + ' OUTCOME disagrees with the card (stat ' + d.actual + ' of ' + target + ', games ' + line.games + ' of ' + games + ')', who);
    if (d.outcome === 'completed') {
      const gross = r4(line.salary * pct), net = r4(gross * 0.45), dN = r4((a.netWorth ?? 0) - (b.netWorth ?? 0));
      if (!near(dE, gross)) note(tag + ' GROSS paid ' + dE + ', card says ' + gross, who);
      if (b.netWorth !== undefined && !near(dN, net)) note(tag + ' BANKED ' + dN + ', card says ' + net, who);
      note(tag + ' paid: net ' + (net < 0.05 ? 'under 0.05M (below the one decimal the bank is kept in)' : '0.05M or more'));
      /* does the banked money outlive the next season's own rounding of the bank? twin with the bonus taken out again */
      const keepR = Math.random, A = { c: clone(S.c), tq: S.tq }, B = { c: clone(S.c), tq: S.tq };
      B.c.earnings = r4(B.c.earnings - gross); B.c.netWorth = r4((B.c.netWorth ?? 0) - net);
      if (!A.c.retired && (A.c.suspendedSeasons ?? 0) === 0 && A.c.contractYears > 0) {
        useStream('next:' + tag + who); playOne(M, sport, A, false, keyed('n:' + tag + who));
        useStream('next:' + tag + who); playOne(M, sport, B, false, keyed('n:' + tag + who));
        const kept = r4((A.c.netWorth ?? 0) - (B.c.netWorth ?? 0));
        note(tag + ' one season later the bank holds ' + (near(kept, 0) ? 'NOTHING of it (rounded away)' : kept > net + 1e-9 ? 'MORE than was banked' : near(kept, net) ? 'all of it' : 'part of it'), 'banked ' + net + ', bank differs by ' + kept + ' (' + who + ')');
      }
      Math.random = keepR;
    } else if (!near(dE, 0)) note(tag + ' MONEY MOVED on a missed bonus: ' + dE, who);
  } else if (menu.id === 'partnership') {
    const card = Number((opt.effect.match(/At least (\d+) games/) ?? [])[1]);
    if (d.target !== card) note(tag + ' TARGET on the result (' + d.target + ') is not the card\'s (' + card + ')', who);
    const want = played && line.games >= card ? 1 : 0;
    if (res.partnershipProgress !== want) note(tag + ' PROGRESS ' + res.partnershipProgress + ', card says ' + want, who);
  } else if (menu.id === 'reinvention') {
    const want = played ? Math.min(3, 100 - b.health) : 0;
    if (dH !== want) note(tag + ' CARD SAYS health +3 after games played, save got ' + dH, who + ' health ' + b.health);
    if (played && b.health > 97) note(tag + ' health +3 cut by the cap of 100');
  }
  if (menu.id !== 'expectation' && dM !== 0) note(tag + ' SETTLE MOVED MORALE by ' + dM, who);
  if (menu.id !== 'reinvention' && dH !== 0) note(tag + ' SETTLE MOVED HEALTH by ' + dH, who);
  if (menu.id !== 'bonus' && !near(dE, 0)) note(tag + ' SETTLE MOVED EARNINGS by ' + dE, who);
}

const tally = new Map();
const note =(tag, example) => { const t = tally.get(tag) ?? { n: 0, ex: [] }; t.n += 1; if (example && t.ex.length < 3) t.ex.push(example); tally.set(tag, t); };
const near = (a, b) => Math.abs(a - b) < 1e-9;

/* What each card SAYS it does at the start of the season, as numbers. */
function claimed(slug, c, section, id) {
  const k = { dh: 0, dm: 0, dd: 0, kind: 'none' };
  if (section === 'workload') { k.dh = id === 'push' ? -8 : 8; k.dm = id === 'push' ? 6 : -6; k.kind = 'hm'; }
  if (section === 'reinvention') { k.dd = 0.06; k.dm = -4; k.kind = 'hm'; }
  if (section === 'tactics') {
    if (slug === 'nba') k.kind = 'nba';
    else if (slug === 'nhl' && c.pos !== 'G') k.kind = 'nhl';
    else { k.kind = 'hm'; k.dm = id === 'attack' ? 6 : -3; k.dd = id === 'attack' ? -0.06 : 0.06; }
  }
  return k;
}

async function plans() {
  const M = await load(), P = M.prog, keep = Math.random;
  settleChecks.M = M;
  const K = Number(arg('k') ?? 3);
  for (const slug of SPORTS) {
    const sport = M[slug], positions = sport.create.positions;
    for (let pi = 0; pi < positions.length; pi += 1) for (let ai = 0; ai < 3; ai += 1) for (let seed = 0; seed < K; seed += 1) for (const adv of [0, 3, 8, 12]) {
      const i = pi + ai * positions.length, key = slug + ':' + i + ':' + seed + ':' + adv, pick = keyed('p:' + key);
      useStream('plans:' + key);
      const S0 = newCareer(M, slug, i + seed * 97, key);
      for (let n = 0; n < adv && !S0.c.retired; n += 1) playOne(M, sport, S0, false, pick);
      if (S0.c.retired || (S0.c.suspendedSeasons ?? 0) > 0 || S0.c.contractYears <= 0) { note(slug + ' skipped (retired, banned or out of contract)'); continue; }
      const menus = P.usProgrammeMenus(S0.c, slug);
      for (const menu of menus) for (const opt of menu.options) {
        if (opt.id === 'normal') continue;
        const tag = slug + ' ' + menu.id + ':' + opt.id;
        const S = clone(S0), who = S.c.pos + '/' + S.c.archetype.id + ' age ' + S.c.age;
        const saved = P.saveUsCareerProgramme(S.c, slug, { ...P.usProgrammeDefaults(), [menu.id]: opt.id });
        if (!saved.programme) { note(tag + ' NOT SAVED', who); continue; }
        S.c = saved; note(tag + ' chosen');
        const w = {}; useStream('season:' + key + menu.id + opt.id);
        playOne(M, sport, S, true, keyed('q:' + key), w);
        if (!w.prep) { note(tag + ' PREPARE RETURNED NULL', who); continue; }
        const k = claimed(slug, S0.c, menu.id, opt.id);
        const dh = w.mid.health - w.pre.health, dm = w.mid.morale - w.pre.morale, dd = (w.mid.arch.durability ?? 0) - (w.pre.arch.durability ?? 0);
        if (k.kind === 'hm') {
          if (dh !== k.dh) note(tag + ' CARD SAYS health ' + k.dh + ', season got ' + dh, who + ' health ' + w.pre.health);
          if (dm !== k.dm) note(tag + ' CARD SAYS morale ' + k.dm + ', season got ' + dm, who + ' morale ' + w.pre.morale);
          if (!near(dd, k.dd)) note(tag + ' CARD SAYS durability ' + k.dd + ', season got ' + dd.toFixed(2), who + ' durability ' + w.pre.arch.durability);
        }
        if (k.kind === 'nba') {
          const sup = S0.c.pos === 'PF' || S0.c.pos === 'C' ? 'rebounding' : 'playmaking';
          const rs = w.mid.arch.scoring / w.pre.arch.scoring, ru = w.mid.arch[sup] / w.pre.arch[sup];
          const ws = opt.id === 'attack' ? 1.08 : 0.92, wu = opt.id === 'attack' ? 0.92 : 1.08;
          if (!near(rs, ws) || !near(ru, wu)) note(tag + ' CARD SAYS scoring x' + ws + ' and ' + sup + ' x' + wu + ', season got x' + rs + ' and x' + ru, who);
          if (dh !== 0 || dm !== 0 || !near(dd, 0)) note(tag + ' moved health, morale or durability too', who);
        }
        if (k.kind === 'nhl') {
          const d = w.mid.arch.scoringMult - w.pre.arch.scoringMult, want = opt.id === 'attack' ? 0.08 : -0.08;
          if (!near(d, want)) note(tag + ' CARD SAYS scoring multiplier ' + want + ', season got ' + d.toFixed(3), who + ' mult ' + w.pre.arch.scoringMult);
        }
        if (k.kind === 'none' && (dh !== 0 || dm !== 0 || JSON.stringify(w.mid.arch) !== JSON.stringify(w.pre.arch))) note(tag + ' CHANGED AN ENGINE INPUT its card does not name', who);
        /* the season must not touch the archetype, and the restore must give back exactly what the season left */
        if (JSON.stringify(w.post.arch) !== JSON.stringify(w.mid.arch)) note(tag + ' the season itself changed the archetype (restore would throw that away)', who);
        if (JSON.stringify(w.rest.arch) !== JSON.stringify(w.pre.arch)) note(tag + ' ARCHETYPE NOT RESTORED before progression', who);
        const wantH = w.pre.health + (w.post.health - w.mid.health), wantM = w.pre.morale + (w.post.morale - w.mid.morale);
        if (w.rest.health !== wantH) note(tag + ' HEALTH after restore is ' + w.rest.health + ', the same season with no plan input leaves ' + wantH, who);
        if (w.rest.morale !== wantM) note(tag + ' MORALE after restore is ' + w.rest.morale + ', want ' + wantM, who);
        settleChecks(P, slug, tag, who, S, S0, menu, opt, w);
        /* a partnership kept up: what the next three seasons add at the start, year by year */
        if (menu.id === 'partnership') for (let y = 2; y <= 4; y += 1) {
          if (S.c.retired || (S.c.suspendedSeasons ?? 0) > 0 || S.c.contractYears <= 0) break;
          const had = S.c.programmePartnership, team = S.c.team;
          const again = P.saveUsCareerProgramme(S.c, slug, { ...P.usProgrammeDefaults(), partnership: 'build' });
          if (!again.programme) { note(tag + ' year ' + y + ' NOT SAVED', who); break; }
          S.c = again; const w2 = {}; playOne(M, sport, S, true, keyed('q' + y + key), w2);
          if (!w2.prep) { note(tag + ' year ' + y + ' PREPARE RETURNED NULL', who); break; }
          const live = had && had.team === team && had.lastYear === w2.line.year - 1 ? Math.min(3, had.progress) : 0;
          const got = w2.mid.morale - w2.pre.morale;
          if (got !== live * 2) note(tag + ' year ' + y + ' CARD SAYS morale +' + (live * 2) + ' for ' + live + ' completed year(s), season got ' + got, who + ' morale ' + w2.pre.morale);
          else note(tag + ' year ' + y + ': ' + live + ' completed year(s) gave morale +' + got);
          if (w2.rest.morale !== w2.pre.morale + (w2.post.morale - w2.mid.morale)) note(tag + ' year ' + y + ' MORALE NOT RESTORED', who);
        }
      }
    }
  }
  Math.random = keep;
  const rows = [...tally.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [tag, t] of rows) console.log(String(t.n).padStart(6) + '  ' + tag + (t.ex.length ? '   e.g. ' + t.ex.join(' | ') : ''));
  const loud = rows.filter(([tag]) => /[A-Z]{4}/.test(tag.replace(/^(nfl|nba|mlb|nhl)/, '')));
  console.log('probeUsRev plans: ' + rows.length + ' tallies, ' + loud.length + ' of them name a disagreement between a card and the season.');
}

/* A damaged optional field: no throw anywhere, and the season is the season of the same save with the field gone. */
async function damage() {
  const M = await load(), P = M.prog, keep = Math.random;
  let cases = 0, threw = 0, effect = 0, locked = 0, dropped = 0; const lines = [];
  for (const slug of SPORTS) for (let i = 0; i < 6; i += 1) {
    const sport = M[slug], key = slug + ':dmg:' + i, pick = keyed('p:' + key);
    useStream('dmg:' + key);
    const S0 = newCareer(M, slug, i * 5, key);
    for (let n = 0; n < 2 + i && !S0.c.retired; n += 1) playOne(M, sport, S0, false, pick);
    if (S0.c.retired || (S0.c.suspendedSeasons ?? 0) > 0 || S0.c.contractYears <= 0) continue;
    const c0 = S0.c, good = { ...P.usProgrammeDefaults(), workload: 'push', partnership: 'build', sport: slug, year: c0.year, team: c0.team };
    const okRow = { sport: slug, year: c0.year - 1, team: c0.team, outcome: 'completed', decisions: [], bonusGross: 0, bonusNet: 0, partnershipProgress: 1 };
    const V = {
      'programme null': { programme: null }, 'programme a string': { programme: 'push' }, 'programme a number': { programme: 7 },
      'programme an array': { programme: [] }, 'programme empty object': { programme: {} },
      'programme with no choices': { programme: { sport: slug, year: c0.year, team: c0.team } },
      'programme with an unknown choice': { programme: { ...good, workload: 'banana' } },
      'programme of another sport': { programme: { ...good, sport: slug === 'nfl' ? 'nba' : 'nfl' } },
      'programme year as text': { programme: { ...good, year: String(c0.year) } },
      'programme year NaN (null in JSON)': { programme: { ...good, year: null } },
      'programme team a number': { programme: { ...good, team: 5 } },
      'programme choices nested objects': { programme: { ...good, workload: { toString: 1 } } },
      'veteran choice under 30': c0.age < 30 ? { programme: { ...good, reinvention: 'maintain' } } : null,
      'good plan, results null': { programme: good, programmeResults: null },
      'good plan, results a string': { programme: good, programmeResults: 'x' },
      'good plan, results an object': { programme: good, programmeResults: {} },
      'good plan, results [null]': { programme: good, programmeResults: [null] },
      'good plan, results [{}]': { programme: good, programmeResults: [{}] },
      'good plan, a result with a negative bonus': { programme: good, programmeResults: [{ ...okRow, bonusGross: -1 }] },
      'good plan, a result whose decisions is text': { programme: good, programmeResults: [{ ...okRow, decisions: 'x' }] },
      'good plan, a result with progress 9': { programme: good, programmeResults: [{ ...okRow, partnershipProgress: 9 }] },
      'good plan, partnership null': { programme: good, programmePartnership: null },
      'good plan, partnership a number': { programme: good, programmePartnership: 5 },
      'good plan, partnership progress as text': { programme: good, programmePartnership: { sport: slug, team: c0.team, progress: '3', lastYear: c0.year - 1 } },
      'good plan, partnership progress 99': { programme: good, programmePartnership: { sport: slug, team: c0.team, progress: 99, lastYear: c0.year - 1 } },
      'no plan, partnership at another club damaged': { programmePartnership: { sport: slug, team: 'ZZZ', progress: 'x', lastYear: 'y' } },
    };
    const run = (extra, label) => {
      const S = clone(S0); if (extra) Object.assign(S.c, clone(extra));
      useStream('dmgseason:' + key);
      try {
        P.usProgrammeMenus(S.c, slug); P.usProgrammeResults(S.c); P.usProgrammeStateValid(S.c); P.currentUsCareerProgramme(S.c, slug);
        const line = playOne(M, sport, S, true, keyed('dq:' + key));
        const core = clone(S.c); delete core.programme; delete core.programmeResults; delete core.programmePartnership;
        const stillBad = !P.usProgrammeStateValid(S.c);
        const tryPlan = P.saveUsCareerProgramme(S.c, slug, { ...P.usProgrammeDefaults(), workload: 'push' });
        return { digest: sha(JSON.stringify(core) + JSON.stringify(line) + draws), stillBad, canPlan: !!tryPlan.programme, left: ['programme', 'programmeResults', 'programmePartnership'].filter(f => f in S.c) };
      } catch (e) { return { error: label + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e) }; }
    };
    const clean = run(null, 'clean'), goodOnly = run({ programme: good }, 'the good plan alone');
    for (const [name, extra] of Object.entries(V)) {
      if (!extra) continue; cases += 1;
      const r = run(extra, name);
      if (r.error) { threw += 1; lines.push('  THREW ' + slug + ' ' + r.error); continue; }
      /* a damaged field beside a GOOD plan: either the plan is ignored (the clean season) or the damaged field is
         dropped and the player's own plan plays (the season of that plan alone). Anything else is an effect. */
      if (r.digest === goodOnly.digest && r.digest !== clean.digest) { dropped += 1; if (i === 0) lines.push('  DROPPED ' + slug + ' "' + name + '": the damaged field went and the good plan played as chosen'); }
      else if (r.digest !== clean.digest) { effect += 1; lines.push('  EFFECT ' + slug + ' "' + name + '": the season is neither the clean season nor the season of the good plan alone'); }
      if (!r.canPlan) { locked += 1; if (i === 0) lines.push('  LOCKED ' + slug + ' "' + name + '": one season later the panel still refuses a plan (fields left: ' + r.left.join(', ') + ')'); }
    }
  }
  Math.random = keep;
  for (const l of lines.slice(0, 60)) console.log(l);
  console.log('probeUsRev damage: ' + cases + ' damaged saves over four sports, ' + threw + ' threw, ' + effect + ' changed the season, ' + dropped + ' dropped the damaged field and played the good plan, ' + locked + ' leave the panel locked a season later. ' + (threw || effect ? 'RED' : 'no throw, no effect'));
  process.exit(threw || effect ? 1 : 0);
}

const run = { fleet, resume, compare, plans, damage }[MODE];
if (!run) { console.error('probeUsRev: unknown mode ' + MODE); process.exit(2); }
await run();
