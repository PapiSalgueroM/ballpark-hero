/*
 * Round 567 harness: buying a player leaves exactly one of him, and leaving the
 * site does not cost a career.
 *
 * Two live player reports, filed 2026-09-13 through the site's own report
 * button and forwarded by the owner:
 *
 *   "Manager career doesnt save if you leave the website"
 *   "So in manager career the players duplicate if you buy them and it doesnt
 *    save like player career does sometimes"
 *
 * They turned out to be two defects rather than one, and both are measured
 * here against the shipped engine, the shipped hook and the shipped viewer.
 *
 * ONE OF HIM. A squad id is built from the player's name through slug(), and
 * slug() is not injective: foldSpecialLatin folds the Polish barred l onto a
 * plain l and the NFD pass strips the acute. Two pairs in the shipped market
 * land on one string, both measured rather than imagined:
 *
 *   sign-ederson-s1     Ederson of Atalanta (CM 26) and Ederson of Fenerbahce
 *                       (GK 32). Two different men, both really called that,
 *                       both signable in one window.
 *   p-michal-karbownik  the two Hertha BSC roster rows that are one man
 *                       spelled twice, same age, same value, same rating.
 *
 * Two squad members under one id are two rows drawn under one React key, and
 * every lookup in the engine is find(p => p.id === id), which resolves to the
 * first of the pair: the second man cannot be put in the XI, a set piece job
 * handed to him lands on the first, and selling either one runs
 * squad.filter(x => x.id !== playerId) and takes both off the books. Round 567
 * makes the id unique where it is handed out (freeSquadId, withUniqueIds) and
 * repairs a save that already carries a pair (ensureSquadIds), rather than
 * filtering afterwards, which would have to throw one real footballer away.
 *
 * LEAVING THE SITE. The hook persists from an effect keyed on the career
 * object. Measured across fourteen transitions, that write is reliable for
 * everything done while the page is up: the save on disk was byte identical to
 * the career in memory after every one, and a reload came back identical. What
 * it cannot do is write a change decided at the moment the page goes away,
 * because a setCareer from a pagehide listener or an unmount cleanup is a state
 * update on a tree React is tearing down: it never commits, so the effect never
 * runs. Round 543 added exactly such a handler to the live match viewer for the
 * clock, for the case its own comment names ("tapping Back, or the DoUKnowBall
 * logo, or any nav link"), and on the shipped code it did nothing in that case:
 * the viewer on screen in the 19th minute, the save at minute 0, and still at 0
 * after the route unmounted, so the half was replayed from the start. It worked
 * only when the viewer alone unmounted and the page stayed, which is the one
 * case it was not written for.
 *
 * Sections:
 *   1) The engine, headless. Every path that puts a player in the squad, run
 *      against the real bake: the instant buy, the release clause, the loan in,
 *      the option to buy, the personal terms table, the academy promotion, the
 *      recall from a loan out, and a mid season takeover. After each one the
 *      squad holds exactly one of him and no two players share an id. Then
 *      every playable club's day one squad, and the whole 3600 player market
 *      universe grouped by the id a signing would produce, so the collisions
 *      are counted rather than assumed.
 *   2) The hook and the viewer, rendered: src/test/clubManagerSave.test.tsx
 *      under vitest, six tests. It signs both Edersons through the real hook,
 *      walks fourteen transitions checking the disk after each, reloads, and
 *      unmounts the whole route mid match.
 *
 * Negative controls (house rule: prove the checks can fail):
 *   CM_SAVE_CONTROL=dupeid       rewrites copies of the engine and the roster
 *                                data with Round 567 taken back out: the bare
 *                                template literal id in completeSigning, no
 *                                withUniqueIds in ensureSquadCoverage, no
 *                                ensureSquadIds in loadCareer or playNextEntry,
 *                                and the second Hertha row put back. Section 1
 *                                must then find duplicate ids on the signing
 *                                paths AND on a club's day one squad.
 *   CM_SAVE_CONTROL=unloadwrite  writes a copy of the hook with markMinute back
 *                                to its pre Round 567 line (setCareer only, no
 *                                write) and points the test file at it through
 *                                CM_HOOK. The "leaving the site mid match" test
 *                                must then go red with the save at 0.
 * Each control refuses to run if any of its rewrites did not find its text, and
 * the worktree checks out CRLF while the anchors below are written LF, so every
 * read is folded to LF first. A control that silently changes nothing is a
 * control that reports green for the wrong reason.
 *
 * MEASURED. On the default seed, and on SIM_SEED 1, 2 and 3.
 *
 *   metric                                    fixed            control
 *   duplicate ids after signing both Edersons 0                1 (dupeid)
 *   Hertha BSC day one duplicate ids          0                1 (dupeid)
 *   clubs with a duplicate day one id         0 of 330         1 of 330 (dupeid)
 *   signing paths leaving one of him          8 of 8           8 of 8
 *   transitions whose save matched memory     14 of 14         14 of 14
 *   save minute after leaving mid match       19 (screen 19)   0 (unloadwrite)
 *
 * Nothing here reads dist or the clock, so it is safe to run between builds.
 *
 * Run: node scripts/simClubManagerSave.mjs
 */
import './lib/seedRandom.mjs';
import { execSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/cmSave.entry.mjs`;
const BUNDLE = `${TMP}/cmSave.bundle.mjs`;

const CONTROL = process.env.CM_SAVE_CONTROL || '';
const KNOWN = ['dupeid', 'unloadwrite'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`CM_SAVE_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const abort = m => { console.error(m); process.exit(1); };
const swap = (src, from, to, where) => {
  if (!src.includes(from)) {
    console.error(`control cannot run: ${where} is not in the shape CM_SAVE_CONTROL=${CONTROL} rewrites`);
    console.error(`  looked for: ${JSON.stringify(from)}`);
    process.exit(1);
  }
  return src.replace(from, to);
};

const ENGINE_PATH = `${ROOT_URL}/src/lib/clubManager.ts`;
let enginePath = ENGINE_PATH;
let rosterAlias = '';

/* ---------- the dupeid control: Round 567 taken back out ---------- */
const NEW_ID = "    id: freeSquadId(career.squad, `sign-${slug(mp.name)}-s${career.season}`),";
const OLD_ID = "    id: `sign-${slug(mp.name)}-s${career.season}`,";
const NEW_COVER = '  return withUniqueIds(out);\n';
const OLD_COVER = '  return out;\n';
const LOAD_CALL = '    ensureSquadIds(parsed);\n';
const PLAY_CALL = '  ensureSquadIds(state);\n';
const HERTHA_ONE = "    { n: 'Michal Karbownik', p: 'LB', a: 24, v: 1.5, r: 68 },\n";
const HERTHA_TWO = "    { n: 'Michal Karbownik', p: 'LB', a: 24, v: 1.5, r: 68 },\n    { n: 'Michał Karbownik', p: 'RB', a: 24, v: 1.5, r: 68 },\n";

if (CONTROL === 'dupeid') {
  let engine = readLF(`${ROOT}/src/lib/clubManager.ts`);
  engine = swap(engine, NEW_ID, OLD_ID, 'clubManager.ts (the signing id)');
  engine = swap(engine, NEW_COVER, OLD_COVER, 'clubManager.ts (ensureSquadCoverage)');
  engine = swap(engine, LOAD_CALL, '', 'clubManager.ts (ensureSquadIds in loadCareer)');
  engine = swap(engine, PLAY_CALL, '', 'clubManager.ts (ensureSquadIds in playNextEntry)');
  let rosters = readLF(`${ROOT}/src/data/clubManagerRosters.ts`);
  rosters = swap(rosters, HERTHA_ONE, HERTHA_TWO, 'clubManagerRosters.ts (the Hertha row)');
  const rosterCopy = `${TMP}/cmSave.control.rosters.ts`;
  fs.writeFileSync(rosterCopy, rosters);
  /* The engine copy must reach the REWRITTEN roster file rather than the real
     one, so the import is made explicit instead of relying on alias order. */
  engine = swap(engine, "} from '@/data/clubManagerRosters';", `} from '${rosterCopy}';`, 'clubManager.ts (the roster import)');
  const engineCopy = `${TMP}/cmSave.control.engine.ts`;
  fs.writeFileSync(engineCopy, engine);
  enginePath = engineCopy;
  rosterAlias = rosterCopy;
}

fs.writeFileSync(ENTRY, `
/* A real in-memory slot, not a no-op stub: this harness saves and loads. */
let slot = {};
globalThis.localStorage = {
  getItem: k => (k in slot ? slot[k] : null),
  setItem: (k, v) => { slot[k] = String(v); },
  removeItem: k => { delete slot[k]; },
  clear: () => { slot = {}; },
};
export const cm = await import('${enginePath.replaceAll('\\', '/')}');
export const cal = await import('${ROOT_URL}/src/lib/clubManagerCalendar.ts');
`);
/* The roster data is read by clubManagerEras.ts as well as by the engine, and
   projectedRoster (which is what startCareer actually builds a squad from)
   lives there, so the control's copy has to be reached through an alias rather
   than by rewriting one import line. */
const rosterFlag = rosterAlias ? ` --alias:@/data/clubManagerRosters=${rosterAlias}` : '';
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error${rosterFlag} --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { cm, cal } = await import(pathToFileURL(BUNDLE).href);

const {
  startCareer, buildMarket, buyPlayer, payClause, releaseClauseOf, loanIn, loanEligible,
  exerciseLoanOption, startNegotiation, makeOffer, offerTerms, promoteProspect,
  loanOutPlayer, recallLoanedPlayer, playNextEntry, finishSeason, startNextSeason,
  saveCareer, loadCareer, REAL_LEAGUES, playableClubs,
} = cm;
const { startMidSeason } = cal;
for (const [name, fn] of Object.entries({
  startCareer, buildMarket, buyPlayer, payClause, releaseClauseOf, loanIn, loanEligible,
  exerciseLoanOption, startNegotiation, makeOffer, offerTerms, promoteProspect,
  loanOutPlayer, recallLoanedPlayer, playNextEntry, finishSeason, startNextSeason,
  saveCareer, loadCareer, playableClubs, startMidSeason,
})) {
  if (typeof fn !== 'function') abort(`the harness could not reach ${name}; the bundle is not the shape it expects`);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** Every id held by more than one player, with who is holding it. */
function duplicateIds(squad) {
  const byId = new Map();
  for (const p of squad) {
    if (!byId.has(p.id)) byId.set(p.id, []);
    byId.get(p.id).push(`${p.name} (${p.position})`);
  }
  return [...byId.entries()].filter(([, who]) => who.length > 1);
}
const countOf = (squad, name) => squad.filter(p => p.name === name).length;
const show = d => d.map(([id, who]) => `${id} <= ${who.join(' | ')}`).join('; ');

/* ================================================================== */
console.log('1) Every path that puts a player in the squad leaves exactly one of him, under an id nobody else holds');
/* ================================================================== */

/* Real Madrid: the biggest budget in the bake, so no path is refused on money,
   and neither Ederson is in its squad so both are on the market. */
const base = startCareer('Real Madrid');
const market = buildMarket(base);
console.log(`   Real Madrid, budget ${base.budget}, squad ${base.squad.length}, market ${market.length}`);

/* 1a. The two real Edersons, the pair the report is about. */
const pair = market.filter(m => m.name === 'Éderson' || m.name === 'Ederson');
if (pair.length !== 2) {
  fail(`the market no longer offers both Edersons (found ${pair.length}), so the pair this section measures is gone; re-derive it rather than deleting the check`);
} else {
  console.log(`   the pair: ${pair.map(m => `${m.name} ${m.position} @${m.club} ${m.price}`).join(' | ')}`);
  let s = base;
  for (const mp of pair) {
    const next = buyPlayer(s, mp);
    if (!next) { fail(`buying ${mp.name} was refused`); break; }
    s = next;
  }
  const d = duplicateIds(s.squad);
  console.log(`   both signed: squad ${base.squad.length} -> ${s.squad.length}, duplicate ids ${d.length}${d.length ? ' (' + show(d) + ')' : ''}`);
  if (s.squad.length !== base.squad.length + 2) fail(`signing both Edersons left ${s.squad.length - base.squad.length} players, not 2`);
  if (d.length) fail(`two men are sharing an id after two signings: ${show(d)}`);
  /* And it survives the round trip a player actually takes. loadCareer fills in
     whatever a save is missing (the staff desk, the skill trees, the start
     options), so a career that has never been through playNextEntry
     legitimately grows on the way in. What must hold is that nothing is LOST,
     and that a second trip changes nothing at all, because a repair that is not
     a fixed point rewrites the save on every visit. */
  saveCareer(s);
  const back = loadCareer();
  if (!back) fail('the career with both of them did not load back');
  else {
    const bd = duplicateIds(back.squad);
    if (bd.length) fail(`two men are sharing an id after a reload: ${show(bd)}`);
    const wentIn = s.squad.map(p => `${p.id}|${p.name}`).join(',');
    const cameBack = back.squad.map(p => `${p.id}|${p.name}`).join(',');
    if (wentIn !== cameBack) fail('the squad that came back is not the squad that went in');
    for (const k of ['budget', 'week', 'season', 'clubName', 'boardConfidence']) {
      if (JSON.stringify(back[k]) !== JSON.stringify(s[k])) {
        fail(`${k} changed across the reload: ${JSON.stringify(s[k])} became ${JSON.stringify(back[k])}`);
      }
    }
    saveCareer(back);
    const twice = loadCareer();
    const settled = JSON.stringify(twice) === JSON.stringify(back);
    if (!settled) fail('the repairs on the way in are not a fixed point, so every reload rewrites the save');
    console.log(`   reloaded: ${back.squad.length} players, duplicate ids ${bd.length}, squad identical ${wentIn === cameBack}, second trip identical ${settled}`);
  }
}

/* 1b. Each purchase path in turn, from its own fresh career. */
const paths = [];
const addPath = (label, run) => paths.push([label, run]);

addPath('instant buy', () => {
  const mp = market.find(m => m.price <= base.budget && !loanEligible(base, m));
  return { state: buyPlayer(base, mp), name: mp.name };
});
addPath('release clause', () => {
  const mp = market.find(m => {
    const c = releaseClauseOf(m, base.season);
    return c !== null && c <= base.budget;
  });
  return { state: payClause(base, mp), name: mp.name };
});
addPath('loan in', () => {
  const mp = market.find(m => loanEligible(base, m));
  return { state: loanIn(base, mp), name: mp.name };
});
addPath('option to buy on a loanee', () => {
  const mp = market.find(m => loanEligible(base, m));
  const loaned = loanIn(base, mp);
  if (!loaned) return { state: null, name: mp.name };
  const him = loaned.squad.find(p => p.name === mp.name);
  return { state: exerciseLoanOption(loaned, him.id), name: mp.name };
});
addPath('the personal terms table', () => {
  const mp = market.find(m => m.price <= base.budget * 0.4 && !loanEligible(base, m));
  let s = startNegotiation(base, mp);
  if (!s) return { state: null, name: mp.name };
  /* Well over the ask, so the clubs agree and the terms table opens. */
  for (let i = 0; i < 6 && s.negotiation && s.negotiation.status === 'open' && s.negotiation.phase !== 'terms'; i++) {
    const next = makeOffer(s, Math.min(base.budget, Math.ceil((s.negotiation.ask ?? mp.price) * 1.6)));
    if (!next) break;
    s = next;
  }
  const neg = s.negotiation;
  if (!neg || neg.phase !== 'terms' || !neg.terms) return { state: null, name: mp.name, why: `the terms table never opened (phase ${neg && neg.phase})` };
  const signed = offerTerms(s, { ...neg.terms.want });
  return { state: signed, name: mp.name };
});
addPath('academy promotion', () => {
  let s = base;
  /* The academy fills over a season and its intake lands at the rollover, so up
     to three seasons are played until somebody is actually in the building. */
  for (let season = 0; season < 3; season++) {
    for (let i = 0; i < 400; i++) {
      const res = playNextEntry(s);
      s = res.state;
      if (res.kind === 'seasonOver' || s.sacked) break;
      if (s.academy && s.academy.prospects.length) break;
    }
    if (s.sacked || (s.academy && s.academy.prospects.length)) break;
    s = startNextSeason(finishSeason(s).state);
  }
  const pr = s.academy && s.academy.prospects[0];
  if (!pr) return { state: null, name: '(no prospect)', why: 'the academy produced nobody in three seasons' };
  /* A signing fee for a kid is not what this section measures, so the kitty is
     topped up rather than the season replayed until one is cheap enough. */
  const funded = { ...s, budget: Math.max(s.budget, pr.fee + 1) };
  return { state: promoteProspect(funded, pr.id), name: pr.name, from: funded };
});
addPath('recall from a loan out', () => {
  const him = base.squad[base.squad.length - 1];
  const out = loanOutPlayer(base, him.id, 'Elsewhere', 1);
  if (!out) return { state: null, name: him.name, why: 'the loan out was refused' };
  return { state: recallLoanedPlayer(out, him.id), name: him.name, from: out };
});
addPath('a mid season takeover, then a signing', () => {
  let taken = startMidSeason(startCareer('Real Madrid'), 'newYear');
  /* The handover lands just before the January window rather than inside it,
     so the run continues to the first week the market is actually open. */
  for (let i = 0; i < 60 && taken.transferWindow === null; i++) {
    const res = playNextEntry(taken);
    taken = res.state;
    if (res.kind === 'seasonOver' || taken.sacked) break;
  }
  if (taken.transferWindow === null) return { state: null, name: '(no window)', why: 'no transfer window opened after the takeover' };
  const mkt = buildMarket(taken);
  const mp = mkt.find(m => m.price <= taken.budget && !loanEligible(taken, m));
  if (!mp) return { state: null, name: '(nobody affordable)', why: 'the takeover left no affordable target' };
  return { state: buyPlayer(taken, mp), name: mp.name, from: taken };
});

let pathsOk = 0;
for (const [label, run] of paths) {
  let out;
  try { out = run(); } catch (e) { fail(`${label} threw: ${e.message}`); continue; }
  if (!out.state) { fail(`${label} produced no career (${out.why ?? 'the engine refused the deal'})`); continue; }
  const d = duplicateIds(out.state.squad);
  const n = countOf(out.state.squad, out.name);
  console.log(`   ${label.padEnd(34)} ${out.name.padEnd(24)} in the squad ${n}x, squad ${out.state.squad.length}, duplicate ids ${d.length}${d.length ? ' (' + show(d) + ')' : ''}`);
  if (n !== 1) fail(`${label}: ${out.name} is in the squad ${n} times, not once`);
  if (d.length) fail(`${label}: two men are sharing an id (${show(d)})`);
  if (n === 1 && !d.length) pathsOk += 1;
}
console.log(`   purchase paths leaving exactly one of him under his own id: ${pathsOk} of ${paths.length}`);
if (pathsOk === 0) fail('no purchase path could be measured at all, so this section proves nothing');

/* ================================================================== */
console.log('2) No club anywhere starts a career with two players under one id');
/* ================================================================== */
let clubsChecked = 0;
let clubsBad = 0;
const badExamples = [];
for (const lg of REAL_LEAGUES) {
  for (const club of playableClubs(lg.id)) {
    const name = typeof club === 'string' ? club : club.name;
    let c;
    try { c = startCareer(name); } catch (e) { fail(`${name} could not start a career: ${e.message}`); continue; }
    clubsChecked += 1;
    const d = duplicateIds(c.squad);
    if (d.length) {
      clubsBad += 1;
      if (badExamples.length < 6) badExamples.push(`${name}: ${show(d)}`);
    }
  }
}
console.log(`   ${clubsChecked} clubs checked, ${clubsBad} start with a duplicate id`);
for (const e of badExamples) console.log(`     ${e}`);
if (clubsChecked < 300) fail(`only ${clubsChecked} clubs were reachable, so this section is not measuring the game`);
if (clubsBad) fail(`${clubsBad} of ${clubsChecked} clubs hand the manager two players under one id on day one`);

/* ================================================================== */
console.log('3) The market universe, grouped by the id a signing would produce');
/* ================================================================== */
/* The collisions are counted rather than banned: two real footballers whose
   names fold to one string are two real footballers, and the engine has to
   keep both. What must hold is that signing a colliding pair leaves two ids. */
const bySigningId = new Map();
for (const m of market) {
  /* The id the engine would build, read off the engine itself by signing him
     into an empty-ish squad rather than by re-implementing slug() here. */
  const one = buyPlayer({ ...base, squad: [], budget: 1e9 }, m);
  if (!one) continue;
  const id = one.squad[0].id;
  if (!bySigningId.has(id)) bySigningId.set(id, []);
  bySigningId.get(id).push(`${m.name}@${m.club}`);
}
const collisions = [...bySigningId.entries()].filter(([, names]) => names.length > 1);
console.log(`   ${market.length} market entries, ${bySigningId.size} distinct base ids, ${collisions.length} names folding together`);
for (const [id, names] of collisions) console.log(`     ${id} <= ${names.join(' | ')}`);
if (bySigningId.size < 3000) fail(`only ${bySigningId.size} market ids were built, so this section is not measuring the market`);
for (const [, names] of collisions) {
  /* Both of a colliding pair, into one squad. */
  const two = names.map(n => market.find(m => `${m.name}@${m.club}` === n));
  let s = base;
  let ok = true;
  for (const mp of two) {
    const next = buyPlayer(s, mp);
    if (!next) { ok = false; break; }
    s = next;
  }
  if (!ok) { fail(`a colliding pair could not both be signed: ${names.join(' | ')}`); continue; }
  const d = duplicateIds(s.squad);
  if (d.length) fail(`signing the colliding pair ${names.join(' | ')} put two men on one id: ${show(d)}`);
  if (s.squad.length !== base.squad.length + two.length) fail(`signing the colliding pair ${names.join(' | ')} did not leave ${two.length} new players`);
}

/* ================================================================== */
console.log('4) The hook and the viewer, rendered: the save after every transition, and after leaving the site');
/* ================================================================== */
const TEST = 'src/test/clubManagerSave.test.tsx';

/* The pre Round 567 write path, put back in full: markMinute through setCareer
   alone, and no hide-and-unload handler at all. */
const NEW_MARK = [
  '  const markMinute = useCallback((minute: number) => {',
  '    const now = careerRef.current;',
  '    if (!now) return;',
  '    const next = markLiveMinute(now, minute);',
  '    if (next === now) return;',
  '    careerRef.current = next;',
  '    saveCareer(next);',
  '    setCareer(prev => (prev ? markLiveMinute(prev, minute) : prev));',
  '  }, []);',
  '',
].join('\n');
const OLD_MARK = [
  '  const markMinute = useCallback((minute: number) => {',
  '    setCareer(prev => (prev ? markLiveMinute(prev, minute) : prev));',
  '  }, []);',
  '',
].join('\n');
const HANDLER_HEAD = '  useEffect(() => {\n    const write = () => { const c = careerRef.current; if (c) saveCareer(c); };';
const HANDLER_TAIL = '      write();\n    };\n  }, []);\n';

let hookCopyDir = null;
const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
if (CONTROL === 'unloadwrite') {
  let hook = readLF(path.join(ROOT, 'src/hooks/useClubManager.ts'));
  hook = swap(hook, NEW_MARK, OLD_MARK, 'useClubManager.ts (markMinute)');
  const at = hook.indexOf(HANDLER_HEAD);
  if (at < 0) abort('control cannot run: useClubManager.ts carries no Round 567 hide-and-unload handler to remove');
  const end = hook.indexOf(HANDLER_TAIL, at);
  if (end < 0) abort('control cannot run: the Round 567 handler does not end where this control expects');
  hook = hook.slice(0, at) + hook.slice(end + HANDLER_TAIL.length);
  if (hook.includes('saveCareer(next)')) abort('control cannot run: the direct write is still in the rewritten hook');
  /* Under dist, inside the project root: vite refuses to load a module from
     outside the root, and dist is gitignored so a crashed run cannot leave a
     hook copy where tsc would read it. Removed again below. */
  hookCopyDir = path.join(ROOT, 'dist', '.cm-save-control');
  fs.mkdirSync(hookCopyDir, { recursive: true });
  const hookCopy = path.join(hookCopyDir, 'useClubManager.control.ts');
  fs.writeFileSync(hookCopy, hook);
  env.CM_HOOK = hookCopy.replaceAll('\\', '/');
  console.log('   NEGATIVE CONTROL ON: the test runs against a copy of the hook with the Round 567 write removed');
}

let run;
try {
  run = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST],
    { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
} finally {
  if (hookCopyDir) fs.rmSync(hookCopyDir, { recursive: true, force: true });
}
/* vitest colours its output, so the codes come off before anything is matched. */
const ESC = String.fromCharCode(27);
const raw = (run.stdout || '') + (run.stderr || '');
const out = raw.split(new RegExp(ESC + '\\[[0-9;]*m', 'g')).join('');
if (!out.includes('clubManagerSave.test.tsx')) {
  abort('vitest did not report on the test file at all, so nothing was checked:\n' + out.slice(-2000));
}
for (const line of out.split('\n')) {
  if (/^ {2}\S/.test(line) && !line.includes('stdout |')) { console.log('  ' + line.trimEnd()); continue; }
  if (/(Test Files|Tests) +\d/.test(line)) console.log('   ' + line.trim());
  if (/AssertionError/.test(line)) console.log('   ' + line.trim());
}

if (CONTROL === 'unloadwrite') {
  /* Only an assertion counts. A copy that failed to load is a load error, not
     the check firing. */
  if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(out)) {
    abort('control cannot run: the rewritten hook did not load:\n' + out.slice(-2000));
  }
  const leftRed = /[x\u00d7].*leaving the site mid match keeps the clock/.test(out);
  const viewerGreen = /[\u2713v].*leaving only the viewer/.test(out);
  console.log('   control: the leaving-the-site check went red ' + leftRed + ', the viewer-only check is still green ' + viewerGreen);
  if (!leftRed) fail('the control did not make "leaving the site mid match keeps the clock" fail, so that check is unproven');
  else fail('CONTROL FIRED as it should: with the Round 567 write removed the save stays at minute 0 and the half is replayed');
  if (run.status === 0) fail('the control left the whole file green');
} else if (run.status !== 0) {
  fail('the rendered tests failed (vitest exit ' + run.status + '); the output is above');
}

if (failures) {
  /* A control is meant to go red. That is the proof, not a regression. */
  const why = CONTROL ? `CM_SAVE_CONTROL=${CONTROL} reproduced the defect, which is what it is for` : 'the checks found something';
  console.error(`\nsimClubManagerSave: ${failures} failure${failures === 1 ? '' : 's'} (${why})`);
  process.exit(1);
}
if (CONTROL) {
  console.error(`\nsimClubManagerSave: CM_SAVE_CONTROL=${CONTROL} changed the code and nothing went red, so the checks it targets are not proving anything`);
  process.exit(1);
}
console.log('\nsimClubManagerSave: all sections green');
