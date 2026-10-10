// Reviewer (sc-screens, Release AU): make Soccer Career saves with the tree in cwd, for a browser walk.
// usage: node review-sc-screens-mk.mjs <out.json> <tag>     (cwd = the tree that makes the saves)
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [file, tag = 'new'] = process.argv.slice(2);
if (!file) { console.error('usage: mk <out.json> <tag>'); process.exit(2); }
const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rev-sc-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
const rels = [
  ['soccer', 'src/lib/soccerCareerEngine.ts'], ['squad', 'src/lib/soccerClubSquad.ts'],
  ['programme', 'src/lib/soccerCareerProgramme.ts'], ['cups', 'src/lib/soccerSeasonCompetitions.ts'],
  ['calendar', 'src/lib/soccerSeasonCalendar.ts'], ['wheel', 'src/lib/careerChanceWheel.ts'],
];
const entry = path.join(work, 'e.ts'), outfile = path.join(work, 'e.cjs');
fs.writeFileSync(entry, rels.filter(([, rel]) => fs.existsSync(path.join(root, rel)))
  .map(([as, rel]) => `export * as ${as} from '${path.join(root, rel).split(path.sep).join('/')}';`).join('\n'));
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env': '{"PROD":true,"DEV":false}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const B = require(outfile);
const E = B.soccer, clubs = E.FALLBACK_CLUBS, P = B.programme, SQ = B.squad, CUPS = B.cups;
const realRandom = Math.random;
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const copy = v => JSON.parse(JSON.stringify(v));
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
// eventPick: which choice of a random event the stepper takes (0 = first, -1 = last)
function step(s, eventPick) {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'bdor_speech': return E.applyBdorSpeech(s, 0);
    case 'wc_speech': return E.applyWorldCupSpeech(s, 0);
    case 'moral_dilemma': return E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'retirement_suggestion': return E.acceptRetirementSuggestion(s);
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      return E.applyEventChoice(s, eventPick < 0 ? ev.choices.length - 1 : 0, clubs);
    }
    case 'contract_expiring': case 'transfer_window': return E.stayAtClub(s);
    default: return null;
  }
}
const played = s => (s.seasons || []).filter(r => r.type === 'playing').length;
/** Plays seeded careers until want(state) says this is the save; every phase is offered to want. */
function find(name, era, startYear, positions, want, opts = {}) {
  const careers = Number(process.env.MK_CAP || 0) || (opts.careers ?? 300), eventPick = opts.eventPick ?? 0, base = opts.ovr ?? 56;
  for (let c = 0; c < careers; c += 1) {
    seedRandom(c * 7919 + 1115 + (opts.salt ?? 0));
    const ovr = base + (c % 20);
    let s = E.initCareer('Sam Carter', 'England', positions[c % positions.length], era, abil(ovr), ovr, startYear, clubs, null);
    for (let guard = 0; s && !s.retired && guard < 260; guard += 1) {
      let ok = false;
      try { ok = !!want(s); } catch { ok = false; }
      if (ok) { Math.random = realRandom; console.log(`mk ${tag}: ${name} found in career ${c}, phase ${s.phase}, ${played(s)} played rows, ${s.currentClub}`); return copy(s); }
      /* a player answers the wheel before he goes on: the page marks the receipt seen, so the stepper does too */
      if (s.chanceWheel && !s.chanceWheel.seen && !opts.keepWheel) s = { ...s, chanceWheel: { ...s.chanceWheel, seen: true } };
      s = step(s, eventPick);
    }
  }
  Math.random = realRandom;
  console.log(`mk ${tag}: ${name} NOT FOUND in ${careers} careers`);
  return null;
}
const lastYear = s => s.seasons[s.seasons.length - 1]?.year ?? 0;
const quiet = s => !s.chanceWheel || s.chanceWheel.seen;
const out = { tag, madeBy: root, saves: {}, notes: {} };
const S = out.saves;

// ---- the saves ----
const sq = s => { try { return SQ.squadView(s); } catch { return null; } };
const comps = (s, row) => { try { return CUPS.savedSeasonCompetitions(s, row) || []; } catch { return []; } };
// plan: the default era, a pre season with three played rows, an invented squad, nothing waiting
S.plan = find('plan', '2025', 2025, ['ST', 'CM'], s => s.phase === 'playing' && played(s) === 3 && lastYear(s) >= 2027 && quiet(s) && sq(s)?.source === 'invented' && s.weeklyWage > 0);
// keeper: a goalkeeper's pre season (which plans say they are for outfield players)
S.keeper = find('keeper', '2025', 2025, ['GK'], s => s.phase === 'playing' && played(s) === 2 && quiet(s));
// real: a club and season with a checked real squad
S.real = find('real', '2015-19', 2015, ['CM', 'ST', 'CB'], s => s.phase === 'playing' && played(s) >= 1 && quiet(s) && sq(s)?.source === 'real', { ovr: 70 });
// roles: a real past season with no checked squad list
S.roles = find('roles', '1990-94', 1990, ['ST', 'CM'], s => s.phase === 'playing' && played(s) === 2 && quiet(s) && sq(s)?.source === 'roles');
const noEuro = s => !comps(s, s.pendingSummary).some(c => c.id === 'club');
// summaryWin / summaryOut: a season just played, its summary on screen, a domestic cup route kept
const cupOf = s => s.phase === 'season_summary' && s.pendingSummary?.type === 'playing' && s.pendingSummary.apps > 0 && s.pendingSummary.year >= 2026 ? s.pendingSummary.cupRun : null;
S.summaryWin = find('summaryWin', '2025', 2025, ['ST', 'CM', 'CB'], s => { const r = cupOf(s); return !!r && quiet(s) && noEuro(s) && r.stages?.[0]?.stage === 'early' && r.stages[0].won === true && r.stages.length >= 3; }, { ovr: 66 });
S.summaryOut = find('summaryOut', '2025', 2025, ['ST', 'CM', 'CB'], s => { const r = cupOf(s); return !!r && quiet(s) && noEuro(s) && r.stages?.[0]?.stage === 'early' && r.stages[0].won === false; }, { ovr: 60 });
// summaryEuro: a summary whose row kept a European campaign with games
S.summaryEuro = find('summaryEuro', '2025', 2025, ['ST', 'CM', 'CB'], s => !!cupOf(s) && quiet(s) && comps(s, s.pendingSummary).some(c => c.id === 'club' && c.matches.length >= 6), { ovr: 74, careers: 400 });
// offer: the transfer window with one permanent offer on the table
const oneOffer = s => s.phase === 'transfer_window' && s.transferSituation?.type === 'one_offer' && s.transferSituation.offer && !s.transferSituation.offer.isLoan && quiet(s) && played(s) >= 2;
const lastRating = s => [...s.seasons].reverse().find(r => r.type === 'playing')?.rating ?? 0;
S.offerNo = find('offerNo', '2025', 2025, ['ST', 'CM', 'CB'], s => oneOffer(s) && lastRating(s) < 7.5 && s.overall < 85, { ovr: 58 });
S.offerYes = find('offerYes', '2025', 2025, ['ST', 'CM'], s => oneOffer(s) && lastRating(s) >= 7.5, { ovr: 74, careers: 400 });
if (tag === 'new') {
  // event: a random event on screen with a choice that has odds (found by trying each choice on a copy)
  S.event = find('event', '2025', 2025, ['ST', 'CM'], s => {
    if (s.phase !== 'random_events' || !quiet(s) || !(s.pendingEvents || []).length || played(s) < 1) return false;
    const ev = s.pendingEvents[0];
    for (let i = 0; i < ev.choices.length; i += 1) {
      const keep = Math.random; Math.random = () => 0.42;
      let next = null; try { next = E.applyEventChoice(copy(s), i, clubs); } catch { next = null; }
      Math.random = keep;
      if (next?.chanceWheel && !next.chanceWheel.seen && next.chanceWheel.title !== s.chanceWheel?.title) { out.notes.event = { title: ev.title, choice: i, label: ev.choices[i].label, wheel: next.chanceWheel.title, chance: next.chanceWheel.chance }; return true; }
    }
    return false;
  });
  // appeal: a red card appeal just drawn, its own result card on screen and an unseen wheel receipt
  S.appeal = find('appeal', '2025', 2025, ['ST', 'CM', 'CB'], s => s.phase === 'red_card_appeal_result' && !!s.chanceWheel && !s.chanceWheel.seen, { eventPick: -1, careers: 500 });
  // unseenHub: a pre season save that still holds an unseen receipt (a reload after the choice, before the wheel)
  S.unseenHub = find('unseenHub', '2025', 2025, ['ST', 'CM'], s => s.phase === 'playing' && played(s) >= 2 && !!s.chanceWheel && !s.chanceWheel.seen, { eventPick: -1, keepWheel: true });
  // settled: the plan save with a starting promise, a bonus, a role and a duty, then one season played to the next pre season
  if (S.plan) {
    let s = copy(S.plan);
    for (const [id, choice] of [['tactics', 'finisher'], ['promise', 'starter'], ['bonuses', 'appearances'], ['set_pieces', 'penalties']]) s = P.chooseProgramme(s, id, choice);
    out.notes.planned = copy(s.programme?.plan ?? null);
    seedRandom(4242);
    s = E.advanceProSeason(s, clubs);
    S.settledSummary = null;
    for (let guard = 0; guard < 60 && s && !(s.phase === 'playing' && played(s) === 4); guard += 1) { if (s.phase === 'season_summary' && !S.settledSummary) S.settledSummary = copy(s); s = step(s, 0); }
    Math.random = realRandom;
    if (s?.chanceWheel && !s.chanceWheel.seen) s.chanceWheel.seen = true;
    S.settled = s ? copy(s) : null;
    out.notes.settledReceipt = copy(S.settled?.seasons?.[S.settled.seasons.length - 1]?.programme ?? null);
  }
  // captain, injured, loan: the plan save with the one field each plan asks for (edited by hand, said so in the report)
  if (S.plan) {
    const c = copy(S.plan); c.isClubCaptain = true; c.captainClub = c.currentClub; c.seriousInjuries = [...(c.seriousInjuries || []), { year: lastYear(c), name: 'Knee ligament', weeks: 30 }];
    S.edited = c;
  }
}
for (const [k, v] of Object.entries(S)) if (v) out.notes['size_' + k] = JSON.stringify(v).length;
fs.writeFileSync(file, JSON.stringify(out));
console.log(`mk ${tag}: wrote ${Object.values(S).filter(Boolean).length} of ${Object.keys(S).length} saves to ${file}; missing: ${Object.entries(S).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'none'}`);
console.log('mk notes: ' + JSON.stringify(out.notes).slice(0, 1500));
