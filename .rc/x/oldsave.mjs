/* Reviewer probe (Round 1346, run lens): saves made by the REAL base engine (origin/main checked out at /tmp/base)
   loaded and carried on by the head engine. Not a strip: the base files come from git.
   Coach: 4 sports x COACHES careers from the fixture's frozen playing careers, a random policy, up to 40 steps on
   base and head in lockstep on one seeded stream each; at a random step the base state is JSON'd (the old save),
   loaded by the head's ensureCoachCareer and carried on by the head while base carries on its own copy: bytes,
   notes and draw counts must match every step. Then the head retires it: only done changes.
   Prospect: 4 sports, every era, ROADS roads each to the showcase on the base engine; base skip state (an old save
   at phase draft) undone by the head gives the base pre-skip bytes; base and head agree on every approach and on
   the draft that follows. Prints counts; exits 1 on any mismatch. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE_TREE || '/tmp/base';
const COACHES = Number(process.env.COACHES || 250);
const ROADS = Number(process.env.ROADS || 300);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oldsave1346-'));
async function bundle(tree, name, contents) {
  const out = path.join(tmp, `${name}.cjs`);
  await build({
    stdin: { contents, resolveDir: tree, sourcefile: `${name}.ts`, loader: 'ts' },
    outfile: out, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent',
    alias: { '@': path.join(tree, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')],
  });
  const text = fs.readFileSync(out, 'utf8');
  if (text.includes('supabase.co')) { console.log(`${name} bundle reaches the database host. Refusing.`); process.exit(2); }
  return createRequire(import.meta.url)(out);
}
const engineSrc = "export * from '@/lib/usCoachCareer'; export * as pd from '@/lib/careerPreDraft';";
const B = await bundle(BASE, 'base', engineSrc);
const H = await bundle(ROOT, 'head', engineSrc);
const S = await bundle(ROOT, 'sports', `
  export { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
  export { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
  export { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
  export { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
  export { createUsCareerProspect } from '@/lib/usCareerProspect';
  export { defaultAppearance } from '@/lib/soccerCareerAppearance';
`);
if (B.retireCoachCareer !== undefined || B.pd.preDraftUndoSkip !== undefined) { console.log('BASE already has the round. Refusing.'); process.exit(2); }

function stream(seed) {
  let s = seed >>> 0, n = 0;
  const draw = () => { n += 1; s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { draw, count: () => n };
}
const J = v => JSON.stringify(v);
let bad = 0;
const fail = m => { bad += 1; if (bad <= 12) console.log(`  FAIL ${m}`); };
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));

/* ---------- coach ---------- */
const tally = { careers: 0, steps: 0, loaded: 0, employedAtLoad: 0, offersAtLoad: 0, accepted: 0 };
for (const sport of ['nfl', 'nba', 'mlb', 'nhl']) {
  const frozen = JSON.parse(fixture.sports[sport].saves.coach).c;
  for (let i = 0; i < COACHES; i++) {
    const policy = stream(1000003 * (i + 1) + sport.length);
    const seed = Math.floor(policy.draw() * 2 ** 32), steps = Math.floor(policy.draw() * 41), loadAt = Math.floor(policy.draw() * (steps + 1));
    const hr = stream(seed), br = stream(seed);
    let b = B.startCoachCareer(sport, JSON.parse(J(frozen)), frozen.year, br.draw);
    let h = H.startCoachCareer(sport, JSON.parse(J(frozen)), frozen.year, hr.draw);
    if (J(b) !== J(h)) fail(`${sport}#${i} start differs`);
    for (let k = 0; k < steps; k++) {
      if (k === loadAt) {
        const oldSave = J({ c: frozen, phase: 'coach', teamQuality: null, coach: b });
        const loadedB = B.ensureCoachCareer(JSON.parse(oldSave).coach, sport);
        const loadedH = H.ensureCoachCareer(JSON.parse(oldSave).coach, sport);
        if (J(loadedB) !== J(loadedH)) fail(`${sport}#${i} step ${k}: the head loads the old save differently`);
        if (loadedH.done !== false) fail(`${sport}#${i}: an old save loads as done`);
        tally.loaded += 1; if (loadedH.job && !loadedH.unemployed) tally.employedAtLoad += 1; if (loadedH.offers.length) tally.offersAtLoad += 1;
        b = loadedB; h = loadedH;
      }
      if (b.offers.length && policy.draw() < 0.5) {
        const idx = Math.floor(policy.draw() * b.offers.length);
        b = B.acceptCoachOffer(b, idx); h = H.acceptCoachOffer(h, idx); tally.accepted += 1;
      } else {
        const fn = b.unemployed ? 'sitOutCoachSeason' : 'playCoachSeason';
        const bo = B[fn](b, br.draw), ho = H[fn](h, hr.draw);
        if (J(bo.notes) !== J(ho.notes)) fail(`${sport}#${i} step ${k}: notes differ`);
        b = bo.state; h = ho.state;
      }
      tally.steps += 1;
      if (J(b) !== J(h)) { fail(`${sport}#${i} step ${k}: state differs`); break; }
      if (br.count() !== hr.count()) { fail(`${sport}#${i} step ${k}: draws ${br.count()} base, ${hr.count()} head`); break; }
    }
    const r = H.retireCoachCareer(h);
    if (J(r) !== J({ ...b, done: true })) fail(`${sport}#${i}: retiring changed more than done`);
    tally.careers += 1;
  }
}
console.log(`coach: ${tally.careers} careers, ${tally.steps} steps, ${tally.loaded} old saves loaded mid career (${tally.employedAtLoad} employed, ${tally.offersAtLoad} holding offers), ${tally.accepted} offers accepted`);

/* ---------- prospect ---------- */
const sports = [S.NFL_CAREER_SPORT, S.NBA_CAREER_SPORT, S.MLB_CAREER_SPORT, S.NHL_CAREER_SPORT];
const pt = { roads: 0, clamped: 0, undone: 0, graded: 0 };
for (const sport of sports) {
  const eras = (sport.create.eras || []).map(e => e.id).filter(Boolean);
  for (const eraId of (eras.length ? eras : ['now'])) {
    for (let i = 0; i < ROADS; i++) {
      const rnd = stream(7919 * (i + 1) + eraId.length);
      const posList = Object.keys(sport.create.archetypes);
      const pos = posList[Math.floor(rnd.draw() * posList.length)];
      let p;
      try { p = S.createUsCareerProspect(sport, { name: 'Probe Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId, appearance: S.defaultAppearance(), seed: `${sport.slug}:${eraId}:rev${i}` }); } catch { continue; }
      const desc = sport.preDraft(p.eraId);
      const route = desc.routes[Math.floor(rnd.draw() * desc.routes.length)];
      let s = B.pd.preDraftStart(desc, { ...p, routeId: route.id });
      for (let n = 0; n < 30 && s.phase !== 'showcase'; n++) {
        if (s.phase === 'season') s = B.pd.preDraftPlaySeason(desc, s);
        else { const ch = B.pd.preDraftChoicePool(desc).find(c => c.id === s.pendingChoice); const k = ch ? Math.floor(rnd.draw() * ch.options.length) : 0; s = B.pd.preDraftChoose(desc, s, k); }
      }
      if (s.phase !== 'showcase') continue;
      pt.roads += 1;
      const pre = J(s);
      const oldSkip = JSON.parse(J(B.pd.preDraftShowcase(desc, JSON.parse(pre), 'skip')));
      if (J(H.pd.preDraftShowcase(desc, JSON.parse(pre), 'skip')) !== J(oldSkip)) fail(`${sport.slug} ${eraId} #${i}: skip differs`);
      if (oldSkip.showcase.stockDelta !== -2) pt.clamped += 1;
      if (!H.pd.preDraftCanUndoSkip(oldSkip)) fail(`${sport.slug} ${eraId} #${i}: an old skip is not undoable`);
      const undone = H.pd.preDraftUndoSkip(oldSkip);
      if (J(undone) !== pre) fail(`${sport.slug} ${eraId} #${i}: undo of an old skip is not the pre skip bytes`); else pt.undone += 1;
      for (const a of ['allout', 'steady']) {
        const gb = B.pd.preDraftShowcase(desc, JSON.parse(pre), a), gh = H.pd.preDraftShowcase(desc, JSON.parse(pre), a);
        if (J(gb) !== J(gh)) fail(`${sport.slug} ${eraId} #${i}: ${a} differs`);
        if (H.pd.preDraftCanUndoSkip(gh) || H.pd.preDraftUndoSkip(gh) !== gh) fail(`${sport.slug} ${eraId} #${i}: ${a} offered an undo`);
        pt.graded += 1;
      }
      const db = B.pd.preDraftRunDraft(desc, oldSkip), dh = H.pd.preDraftRunDraft(desc, JSON.parse(J(oldSkip)));
      if (J(db) !== J(dh)) fail(`${sport.slug} ${eraId} #${i}: the draft after a skip differs`);
      if (H.pd.preDraftCanUndoSkip(dh)) fail(`${sport.slug} ${eraId} #${i}: undo offered after the draft`);
    }
  }
}
console.log(`prospect: ${pt.roads} roads to the showcase on base, ${pt.undone} old skips undone to the byte (${pt.clamped} clamped), ${pt.graded} graded showcases equal and never undoable`);
if (pt.roads < 100 || tally.loaded < 100) fail('the fleet is too thin to mean anything');
console.log(bad === 0 ? 'OLD SAVE PROBE: PASS' : `OLD SAVE PROBE: ${bad} FAILURES`);
process.exit(bad === 0 ? 0 : 1);
