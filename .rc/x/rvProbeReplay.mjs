/* Reviewer probe (Round 1046): is a season the picker OPENS later the season he watched live?
   For every probe career, derive each played season at the step it is live, then again from the
   career's LAST state, and compare, split by the entry's own rule (open or locked). Reads nothing
   but the repo; no network. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const { bundleAwardsNight } = await imp('scripts/lib/careerAwardsNightBundle.mjs');
const { probeAwardsNight } = await imp('scripts/lib/careerAwardsNightProbe.mjs');
const B = await bundleAwardsNight(ROOT, { extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts' } });
const { soccer, season: S, core: C } = B;
const CLUBS = soccer.FALLBACK_CLUBS;

const plain = v => JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x));
const live = new Map();   // `${c}|${at}` -> { d, ctx, key, mode, finish, year, club }
const last = new Map();   // c -> final state
probeAwardsNight(B, {
  onStep: (s, c) => {
    last.set(c, s);
    if (!['newspaper', 'season_summary', 'rehab_choice'].includes(s.phase)) return;
    const at = s.seasons.length - 1;
    const row = s.seasons[at];
    if (!row || row.type !== 'playing' || !(row.apps > 0)) return;
    const id = `${c}|${at}`;
    if (live.has(id)) return;
    const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
    const key = S.SOCCER.seasonKey(row, ctx);
    const d = key ? C.deriveSeason(S.SOCCER, row, ctx) : null;
    live.set(id, { d: plain(d), ctx: plain(ctx), key, mode: ctx.mode, finish: ctx.finish?.finish ?? null, year: row.year, club: row.club, worldYear: s.phone?.world?.year ?? null, row: plain(row) });
  },
});

const out = { seasons: 0, open: 0, locked: 0, openSame: 0, openDiff: 0, lockedSame: 0, lockedDiff: 0, keyMoved: 0, rowMoved: 0, liveWorldNotYear: 0, openCtxDiff: 0, modeMoved: 0 };
const firstDiff = [];
const ctxFields = new Map();
for (const [id, L] of live) {
  const [c, at] = id.split('|').map(Number);
  const fin = last.get(c);
  const row = fin.seasons[at];
  if (!row) continue;
  if (at === fin.seasons.length - 1) continue; // still the live season at the end: not a replay
  out.seasons += 1;
  if (L.worldYear !== L.year) out.liveWorldNotYear += 1;
  if (plain(row) !== L.row) out.rowMoved += 1;
  const ctx = S.buildSoccerSeasonCtx(fin, CLUBS, row);
  const key = S.SOCCER.seasonKey(row, ctx);
  if (key !== L.key) out.keyMoved += 1;
  if (ctx.mode !== L.mode) out.modeMoved += 1;
  const d = key ? plain(C.deriveSeason(S.SOCCER, row, ctx)) : 'null';
  const opens = ctx.mode !== 'table' || ctx.finish?.finish === 1 || fin.phone?.world?.year === row.year;
  const same = d === L.d;
  if (opens) { out.open += 1; if (same) out.openSame += 1; else { out.openDiff += 1; if (firstDiff.length < 6) firstDiff.push({ id, year: L.year, club: L.club, modeLive: L.mode, modeNow: ctx.mode, finishLive: L.finish, finishNow: ctx.finish?.finish ?? null, rowMoved: plain(row) !== L.row, keyMoved: key !== L.key, phaseNote: "live step was the first of newspaper/summary/rehab" }); } }
  else { out.locked += 1; if (same) out.lockedSame += 1; else out.lockedDiff += 1; }
  if (opens && plain(ctx) !== L.ctx) {
    out.openCtxDiff += 1;
    const a = JSON.parse(L.ctx), b = JSON.parse(plain(ctx));
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) ctxFields.set(k, (ctxFields.get(k) ?? 0) + 1);
  }
}
console.log(JSON.stringify(out));
console.log('ctx fields that differ on OPEN replays:', JSON.stringify([...ctxFields.entries()]));
console.log('first open seasons that differ:', JSON.stringify(firstDiff));
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'probeReplay.json'), JSON.stringify({ out, ctxFields: [...ctxFields.entries()], firstDiff }, null, 1));
console.log(`rvProbeReplay: ${out.open} open replays, ${out.openDiff} differ from the season watched live`);
process.exit(out.openDiff > 0 ? 1 : 0);
