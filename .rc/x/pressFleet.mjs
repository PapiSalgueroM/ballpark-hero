// Release AX review (engine-saves): a wide fleet of whole Soccer Careers on the HEAD engine that answers the press
// every year (a promise whenever one is offered), with RANDOM event choices, transfers taken, loans, rehab roads,
// Keep playing, farewell seasons. Asks: does the pressRoom part the game itself wrote ever become unreadable, by
// which road, is the room open again on the next playing screen (ruling C3), does anything throw, is every pending
// promise settled by the next played row. usage: node .rc/x/pressFleet.mjs [careers] [seedOffset]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HEAD = process.cwd();
const N = Number(process.argv[2] || 300), OFFSET = Number(process.argv[3] || 5000);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'press-fleet-'));
const ENTRY = "export * as SOC from './src/lib/soccerCareerEngine';\nexport * as PRESS from './src/lib/soccerCareerPress';\n";
const outfile = path.join(tmp, 'head.mjs');
await build({ stdin: { contents: ENTRY, resolveDir: HEAD, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error',
  alias: { '@': path.join(HEAD, 'src') }, nodePaths: [path.join(HEAD, 'node_modules')], define: { 'process.env.NODE_ENV': '"production"' },
  banner: { js: 'globalThis.__store ??= new Map(); globalThis.localStorage ??= { getItem: k => (globalThis.__store.has(k) ? globalThis.__store.get(k) : null), setItem: (k, v) => { globalThis.__store.set(k, String(v)); }, removeItem: k => { globalThis.__store.delete(k); } };' } });
const { SOC, PRESS } = await import(pathToFileURL(outfile).href);
const clubs = SOC.FALLBACK_CLUBS;
const mulberry = seed => { let a = seed | 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy', 'Belgium', 'Netherlands'];
const POS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB', 'CDM', 'CF', 'RW', 'LB', 'RM'];
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const clone = v => JSON.parse(JSON.stringify(v));
const readable = c => c.pressRoom === undefined || (Array.isArray(c.pressRoom.history) && PRESS.pressRoomView(c).history.length === c.pressRoom.history.length);
const FIELDS = ['type', 'year', 'club', 'apps', 'goals', 'assists', 'cleanSheets', 'rating'];
function diagnose(c) {
  const out = [];
  for (const h of c.pressRoom?.history ?? []) {
    const row = c.seasons[h.source.index];
    if (!row) { out.push(`source row ${h.source.index} is gone`); continue; }
    const bad = FIELDS.filter(f => f !== 'type' && (row[f] ?? null) !== (h.source[f] ?? null) && !(f === 'rating' && h.source.rating === null));
    if (row.type !== 'playing') bad.push('type=' + row.type);
    if (bad.length) out.push(`source ${h.source.index} (${h.source.year} ${h.source.club}) differs in ${bad.map(f => `${f}: saved ${h.source[f]} row ${row[f]}`).join(', ')}`);
    const p = h.promise;
    if (p && p.outcome !== 'pending') {
      const s = c.seasons[p.settledIndex];
      if (!s) out.push(`settled row ${p.settledIndex} is gone`);
      else if ((s[p.metric] ?? null) !== (p.actual ?? null) || s.year !== p.settledYear) out.push(`settled promise (${p.metric}, ${p.outcome}) of source ${h.source.index}: saved actual ${p.actual} in ${p.settledYear}, row ${p.settledIndex} holds ${s[p.metric]} in ${s.year} at ${s.club}`);
      else if (p.actualRating !== undefined && p.actualRating !== s.rating) out.push(`settled promise rating: saved ${p.actualRating}, row ${s.rating}`);
    }
  }
  return out.length ? out.join(' ; ') : 'no differing figure found by this probe';
}
const tally = { careers: 0, steps: 0, rows: 0, answers: 0, promises: 0, settled: {}, moves: 0, loans: 0, farewells: 0, kept: 0, outYears: 0, severe: 0, throws: 0, unreadable: 0, reopened: 0, shut: 0, unsettled: 0, loadDiffers: 0, retired: 0, phasesEnded: {} };
const roads = {};
const say = [];
function step(c, pick) {
  switch (c.phase) {
    case 'youth': return SOC.advanceYouthYear(c, clubs);
    case 'contract_offer': { const o = c.pendingOffers || []; return o.length ? SOC.acceptOffer(c, o[Math.floor(pick() * o.length)]) : { ...c, phase: 'playing' }; }
    case 'playing': return SOC.advanceProSeason(c, clubs);
    case 'newspaper': return SOC.dismissNewspaper(c);
    case 'season_summary': return SOC.dismissSummary(c, clubs);
    case 'random_events': { const e = c.pendingEvents?.[0]; return e ? SOC.applyEventChoice(c, Math.floor(pick() * (e.choices?.length || 1)), clubs) : { ...c, pendingEvents: [], phase: 'playing' }; }
    case 'moral_dilemma': return SOC.dismissMoralDilemma(c, clubs);
    case 'social_media_action': return SOC.dismissSocialMediaPhase(c, clubs);
    case 'red_card_appeal_result': return SOC.dismissAppealResult(c, clubs);
    case 'international_debut': return SOC.dismissDebut(c, clubs);
    case 'world_cup': return SOC.dismissWorldCup(c, clubs);
    case 'rivalry_event': return SOC.dismissRivalryEvent(c, clubs);
    case 'ballon_dor': return SOC.dismissBallonDor(c, clubs);
    case 'rehab_choice': return SOC.applyRehabChoice(c, Math.floor(pick() * 3));
    case 'retirement_suggestion': { const r = pick(); if (r < 0.7) { tally.kept += 1; return SOC.declineRetirementSuggestion(c, clubs); } if (r < 0.9) { tally.farewells += 1; return SOC.announceFarewellSeason(c, clubs); } return SOC.acceptRetirementSuggestion(c); }
    case 'transfer_window': {
      const t = c.transferSituation, go = pick() < 0.6;
      const o = t?.type === 'one_offer' || t?.type === 'dream_club' ? t.offer : t?.type === 'bidding_war' ? (pick() < 0.5 ? t.offerA : t.offerB) : t?.type === 'frozen_out' ? t.offers?.[0] : null;
      if (o && (go || t.type === 'frozen_out')) { tally.moves += 1; return o.isLoan ? SOC.acceptLoan(c, o) : SOC.acceptOffer(c, o); }
      return SOC.stayAtClub(c, clubs);
    }
    default: return null;
  }
}
for (let k = 0; k < N; k += 1) {
  const seed = OFFSET + k, pick = mulberry(seed * 7919 + 13), real = Math.random;
  Math.random = mulberry(seed);
  tally.careers += 1;
  let broken = false, phaseBefore = 'init';
  try {
    let c = SOC.initCareer('Fleet ' + seed, NATIONS[seed % NATIONS.length], POS[seed % POS.length], seed % 3 ? '2010-14' : 'modern', flat(58 + (seed % 6)), 58 + (seed % 6), seed % 3 ? 2010 : 2020, clubs, null, 80 + (seed % 19));
    const check = where => {
      const ok = readable(c);
      if (ok !== readable(SOC.repairCareer(clone(c)))) { tally.loadDiffers += 1; if (say.length < 12) say.push(`seed ${seed}: a save and a load change what is read, ${where}`); }
      if (ok) { broken = false; return; }
      if (broken) return;
      broken = true; tally.unreadable += 1;
      const road = `after ${where}; lastEventId ${c.lastEventId}; ${diagnose(c).replace(/\d+/g, '#')}`.slice(0, 220);
      roads[road] = (roads[road] ?? 0) + 1;
      if (say.length < 12) say.push(`seed ${seed} UNREADABLE ${where}, ${c.seasons.length} rows, ${c.pressRoom.history.length} answers: ${diagnose(c)} | events ${JSON.stringify(c.events.slice(-2))}`.slice(0, 700));
    };
    for (let g = 0; g < 1200 && !c.retired; g += 1) {
      if (c.phase === 'playing') {
        const loanLate = pick() < 0.5;
        const loan = () => { if (pick() < 0.6) { const loans = SOC.determineLoanOffers(c, clubs); if (loans?.length) { c = SOC.acceptLoan(c, loans[0]); if (c.loan) tally.loans += 1; check('a loan'); } } };
        if (!loanLate) loan();
        if (c.age >= 33 && pick() < 0.15) { const f = SOC.announceFarewellSeason(c, clubs); if (f !== c) { c = f; tally.farewells += 1; check('announcing a farewell'); } }
        if (c.phase === 'playing') {
          const view = PRESS.pressRoomView(c), wasBroken = broken;
          if (wasBroken && !view.eligible && view.source && !/already answered/.test(view.reason ?? '')) { tally.shut += 1; if (say.length < 12) say.push(`seed ${seed}: broken part and the room is shut: ${view.reason}`); }
          if (view.eligible) {
            const choice = view.options.find(o => o.id === 'ambitious')?.eligible ? 'ambitious' : pick() < 0.5 ? 'accountable' : 'calm';
            const next = PRESS.answerSoccerPress(c, choice);
            if (next !== c) { tally.answers += 1; if (choice === 'ambitious') tally.promises += 1; }
            c = next; check('answering ' + choice);
            if (wasBroken && readable(c) && c.pressRoom?.history.length === 1) tally.reopened += 1;
          }
        }
        /* a loan taken AFTER the answer: the promise names the parent club and the year is played elsewhere */
        if (loanLate && c.phase === 'playing') loan();
      }
      const before = c.seasons.length, pendingBefore = readable(c) ? (c.pressRoom?.history ?? []).find(h => h.promise?.outcome === 'pending') : null;
      phaseBefore = c.phase;
      const next = step(c, pick);
      if (!next) { tally.phasesEnded[c.phase] = (tally.phasesEnded[c.phase] ?? 0) + 1; break; }
      c = next; tally.steps += 1;
      for (const row of c.seasons.slice(before)) {
        tally.rows += 1;
        if (['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'].includes(row.club)) tally.outYears += 1;
        if (row.injurySevere) tally.severe += 1;
        if (pendingBefore && row.type === 'playing' && row.year > pendingBefore.source.year) {
          const now = (c.pressRoom?.history ?? []).find(h => h.source.index === pendingBefore.source.index)?.promise;
          if (!now || now.outcome === 'pending') { tally.unsettled += 1; if (say.length < 12) say.push(`seed ${seed}: a played row (${row.year} ${row.club}) did not settle the pending promise, after ${phaseBefore}`); }
          else tally.settled[now.outcome] = (tally.settled[now.outcome] ?? 0) + 1;
        }
      }
      check(`${phaseBefore} -> ${c.phase}`);
    }
    if (c.retired) tally.retired += 1;
  } catch (e) { tally.throws += 1; if (say.length < 12) say.push(`seed ${seed} THREW after ${phaseBefore}: ${String(e?.stack ?? e).slice(0, 400)}`); }
  finally { Math.random = real; }
}
for (const s of say) console.log(s);
console.log('ROADS to an unreadable part (digits masked):');
for (const [road, n] of Object.entries(roads).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${n} x ${road}`);
console.log('TALLY ' + JSON.stringify(tally));
const bad = tally.throws + tally.shut + tally.unsettled + tally.loadDiffers;
console.log(`pressFleet: ${N} careers from seed ${OFFSET}; ${tally.unreadable} unreadable part(s), ${tally.reopened} answered again; ${bad} hard failure(s) (throws ${tally.throws}, shut ${tally.shut}, unsettled ${tally.unsettled}, load differs ${tally.loadDiffers}). ${bad ? 'RED' : 'No throw, no shut room, every pending promise settled by its next played row.'}`);
process.exit(bad ? 1 : 0);
