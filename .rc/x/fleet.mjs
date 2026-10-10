/* Reviewer's old save fleet for Round 1220. Runs on the runner (sent as .rc/x/fleet.mjs).
   node .rc/x/fleet.mjs <path of a checkout of the base>
   It bundles the road engine of the BASE and of the HEAD and walks the same roads on both, with inputs from a
   keyed stream of its own (not the harness's seeds): every position, every era, every route, every approach.
   It prints counts and the first differences, and exits 1 if anything differs. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const HEAD = process.cwd();
const BASE = path.resolve(process.argv[2] || '/tmp/base');
const N = Number(process.env.FLEET_N || 120);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-'));
const req = createRequire(import.meta.url);

async function engine(root, name, withNight) {
  const out = path.join(tmp, `${name}.cjs`);
  await build({
    stdin: { contents: `
      import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
      import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
      import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
      import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
      export const sports = { nfl: NFL_CAREER_SPORT, nba: NBA_CAREER_SPORT, mlb: MLB_CAREER_SPORT, nhl: NHL_CAREER_SPORT };
      export * from '@/lib/careerPreDraft';
      ${withNight ? "export * from '@/lib/careerDraftNight';" : ''}
      export { createUsCareerProspect, loadUsCareerProspect } from '@/lib/usCareerProspect';
      export { defaultAppearance } from '@/lib/soccerCareerAppearance';
      export { keyedRng } from '@/lib/keyedRng';
    `, resolveDir: root, sourcefile: `fleet-${name}.ts`, loader: 'ts' },
    outfile: out, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(root, 'src') },
    nodePaths: [path.join(HEAD, 'node_modules')],
  });
  return req(out);
}
const B = await engine(BASE, 'base', false);
const H = await engine(HEAD, 'head', true);

let bad = 0;
const firsts = [];
const note = (what, detail) => { bad += 1; if (firsts.length < 12) firsts.push(`${what}: ${String(detail).slice(0, 260)}`); };
const J = x => JSON.stringify(x);
const count = { roads: 0, states: 0, loads: 0, continued: 0, nights: 0, drafted: 0, undrafted: 0, prospects: 0 };

/* One road on one engine. us[j] decides step j; returns every state as JSON, in order. */
function walk(E, desc, start, us, approach, from = 0) {
  const states = [];
  let s = start;
  let j = from;
  for (let g = 0; g < 30 && s.phase !== 'showcase'; g += 1, j += 1) {
    if (s.phase === 'season') s = E.preDraftPlaySeason(desc, s);
    else { const card = E.preDraftChoicePool(desc).find(c => c.id === s.pendingChoice); s = E.preDraftChoose(desc, s, Math.floor(us[j] * card.options.length)); }
    states.push(J(s));
  }
  s = E.preDraftShowcase(desc, s, approach); states.push(J(s));
  s = E.preDraftRunDraft(desc, s); states.push(J(s));
  return states;
}

for (const slug of ['nfl', 'nba', 'mlb', 'nhl']) {
  const sb = B.sports[slug], sh = H.sports[slug];
  for (const era of sh.create.eras) {
    const db = sb.preDraft(era.id), dh = sh.preDraft(era.id);
    const teams = dh.teamIds();
    const total = teams.length * dh.rounds;
    let pairBad = bad;
    for (const pos of sh.create.positions) for (let n = 0; n < N; n += 1) {
      const rng = H.keyedRng(`rvfleet|${slug}|${era.id}|${pos}|${n}`);
      const archs = sh.create.archetypes[pos];
      const input = { name: 'Fleet Walker', pos, archetypeId: archs[Math.floor(rng() * archs.length)].id, eraId: era.id, appearance: H.defaultAppearance(), seed: `rvfleet:${slug}:${era.id}:${pos}:${n}` };
      const pb = B.createUsCareerProspect(sb, input), ph = H.createUsCareerProspect(sh, input);
      count.prospects += 1;
      if (J(pb) !== J(ph)) { note(`${slug}:${era.id} prospect`, `${J(pb)} vs ${J(ph)}`); continue; }
      const route = dh.routes[Math.floor(rng() * dh.routes.length)];
      const approach = ['allout', 'steady', 'skip'][Math.floor(rng() * 3)];
      const us = Array.from({ length: 40 }, () => rng());
      const startArg = { seed: pb.seed, routeId: route.id, rating: pb.rating, pot: pb.pot, pos: pb.pos };
      const b0 = B.preDraftStart(db, startArg), h0 = H.preDraftStart(dh, startArg);
      if (J(b0) !== J(h0)) { note(`${slug}:${era.id} start`, `${J(b0)} vs ${J(h0)}`); continue; }
      const wb = walk(B, db, b0, us, approach), wh = walk(H, dh, h0, us, approach);
      count.roads += 1; count.states += wb.length;
      const at = wb.findIndex((s, i) => s !== wh[i]);
      if (wb.length !== wh.length || at !== -1) { note(`${slug}:${era.id} ${pos} road ${n} step ${at}`, `${wb[at]} vs ${wh[at]}`); continue; }
      /* Old saves: every state the base wrote loads on the head as the same bytes, with and without the descriptor. */
      for (const snap of [J(b0), ...wb]) {
        count.loads += 1;
        const a = H.loadPreDraft(JSON.parse(snap), dh), c = H.loadPreDraft(JSON.parse(snap));
        const a0 = B.loadPreDraft(JSON.parse(snap), db), c0 = B.loadPreDraft(JSON.parse(snap));
        if (J(a) !== J(a0) || J(c) !== J(c0)) note(`${slug}:${era.id} ${pos} road ${n} load differs from the base's load`, `${J(a0).slice(0, 120)} -> ${J(a).slice(0, 120)}`);
        if (J(a) !== snap) count.notRoundTrip = (count.notRoundTrip || 0) + 1;
        const raw = J({ ...pb, state: JSON.parse(snap) });
        const whole = H.loadUsCareerProspect(sh, JSON.parse(raw)), whole0 = B.loadUsCareerProspect(sb, JSON.parse(raw));
        if (J(whole) !== J(whole0)) note(`${slug}:${era.id} ${pos} road ${n} prospect load differs from the base's`, J(whole).slice(0, 200));
        if (J(whole) !== raw) count.prospectNotRoundTrip = (count.prospectNotRoundTrip || 0) + 1;
      }
      /* A save the base left in mid road, finished on the head, ends as the base would have ended it. */
      const pre = wb.slice(0, -2);
      if (pre.length > 1) {
        const i = Math.floor(rng() * (pre.length - 1));
        const mid = H.loadPreDraft(JSON.parse(pre[i]), dh);
        const rest = walk(H, dh, mid, us, approach, i + 1);
        count.continued += 1;
        if (rest[rest.length - 1] !== wb[wb.length - 1]) note(`${slug}:${era.id} ${pos} road ${n} continued from step ${i}`, `${rest[rest.length - 1].slice(0, 160)} vs ${wb[wb.length - 1].slice(0, 160)}`);
      }
      /* The night, built on the head from the save the base wrote. */
      const done = JSON.parse(wb[wb.length - 1]);
      const night = H.buildCareerDraftNight(dh, done);
      count.nights += 1;
      if (done.draft.pick === null) count.undrafted += 1; else count.drafted += 1;
      if (!night) { note(`${slug}:${era.id} ${pos} road ${n} night`, `built nothing for ${J(done.draft).slice(0, 160)}`); continue; }
      const last = night.board[night.board.length - 1];
      if (done.draft.pick === null ? (last.kind !== 'unpicked' || last.team !== done.draft.team) : (last.kind !== 'you' || last.pick !== done.draft.pick || last.team !== done.draft.team)) note(`${slug}:${era.id} night closing row`, J(last));
      const pr = night.projection;
      if (done.draft.pick === null ? !(pr.hi > total) : !(done.draft.pick >= pr.lo && done.draft.pick <= pr.hi)) note(`${slug}:${era.id} ${pos} range`, `pick ${done.draft.pick} range ${pr.lo} to ${pr.hi} of ${pr.total}`);
      if (J(JSON.parse(wb[wb.length - 1])) !== wb[wb.length - 1] || J(done) !== wb[wb.length - 1]) note('night changed the state', n);
    }
    console.log(`${slug}:${era.id}: ${sh.create.positions.length} positions x ${N} roads, ${total} picks, ${bad - pairBad} difference(s)`);
  }
}

/* The rank: the lifted function gives the base's number for every stock, draft size and draw. */
let rankChecks = 0;
for (const total of [58, 60, 210, 224, 600, 1500]) for (let stock = -5; stock <= 105; stock += 1) for (let k = 0; k <= 400; k += 1) {
  const u = k === 400 ? 0.9999999 : k / 400;
  rankChecks += 1;
  const b = B.preDraftBoardRank(stock, total, () => u), h = H.preDraftBoardRank(stock, total, () => u), at = H.preDraftBoardRankAt(stock, total, u);
  if (b !== h || h !== at) { note('rank', `stock ${stock} total ${total} u ${u}: base ${b} head ${h} at ${at}`); break; }
}

/* The range line at its edges: does what it SAYS hold for a draw that can really happen (u below 1)? */
const edge = { lines: 0, saysUndraftedButCannot: [], saysDraftedButCanMiss: [], saysOutsideButCanBePicked: [], oneNumberButTwo: [], kinds: {} };
for (const slug of ['nfl', 'nba', 'mlb', 'nhl']) for (const era of H.sports[slug].create.eras) {
  const d = H.sports[slug].preDraft(era.id);
  const total = d.teamIds().length * d.rounds;
  for (const pos of H.sports[slug].create.positions) for (let stock = 0; stock <= 100; stock += 1) {
    const p = H.preDraftProjection(d, { stock, pos });
    const off = d.pickOffset ? d.pickOffset(pos) || 0 : 0;
    const line = H.preDraftProjectionLine(p, 'have');
    const best = H.preDraftBoardRankAt(stock, total, 0) + off, worst = H.preDraftBoardRankAt(stock, total, 0.9999999) + off;
    edge.lines += 1;
    const kind = /outside/.test(line) ? 'outside' : /undrafted/.test(line) ? 'toUndrafted' : / at pick /.test(line) ? 'single' : 'between';
    edge.kinds[kind] = (edge.kinds[kind] || 0) + 1;
    const tagIt = `${slug}:${era.id} ${pos} stock ${stock}: "${line}" (best ${best}, worst reachable ${worst}, total ${total})`;
    if (kind === 'toUndrafted' && worst <= total) edge.saysUndraftedButCannot.push(tagIt);
    if ((kind === 'between' || kind === 'single') && worst > total) edge.saysDraftedButCanMiss.push(tagIt);
    if (kind === 'outside' && best <= total) edge.saysOutsideButCanBePicked.push(tagIt);
    if (kind === 'single' && best !== worst) edge.oneNumberButTwo.push(tagIt);
    if (p.lo < 1 || p.lo > p.hi) note('range order', tagIt);
  }
}
for (const k of ['saysUndraftedButCannot', 'saysDraftedButCanMiss', 'saysOutsideButCanBePicked', 'oneNumberButTwo']) {
  console.log(`range line ${k}: ${edge[k].length}${edge[k].length ? ` first: ${edge[k].slice(0, 2).join(' || ')}` : ''}`);
}
console.log(`range lines read: ${edge.lines} ${JSON.stringify(edge.kinds)}`);
if (edge.saysDraftedButCanMiss.length || edge.saysOutsideButCanBePicked.length) note('range line says something false', (edge.saysDraftedButCanMiss[0] || edge.saysOutsideButCanBePicked[0]));

console.log(`rank checks ${rankChecks}; counts ${JSON.stringify(count)}`);
if (firsts.length) console.log(`FIRST DIFFERENCES:\n  ${firsts.join('\n  ')}`);
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'fleet.json'), JSON.stringify({ count, bad, firsts, edge }, null, 1));
console.log(`fleet: ${bad === 0 ? 'NO DIFFERENCE between the base engine and the head' : `${bad} DIFFERENCE(S)`}`);
process.exit(bad === 0 ? 0 : 1);
