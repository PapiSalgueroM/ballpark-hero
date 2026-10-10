// Reviewer sc-screens, Release AT. Makes Soccer Career saves with ONE tree's engine (cwd), for a browser walk on another.
// usage: node scMake.mjs <old|new> <out.json>     cwd = the tree whose code makes the saves
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [kind, file] = process.argv.slice(2);
if (!['old', 'new'].includes(kind) || !file) { console.error('usage: scMake.mjs old|new <out.json>'); process.exit(2); }
const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-make-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
async function load(name, rels) {
  const entry = path.join(work, `${name}.ts`), outfile = path.join(work, `${name}.cjs`);
  fs.writeFileSync(entry, rels.filter(([, rel]) => fs.existsSync(path.join(root, rel)))
    .map(([as, rel]) => `export * as ${as} from '${path.join(root, rel).split(path.sep).join('/')}';`).join('\n'));
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
  return require(outfile);
}
const realRandom = Math.random;
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });
const POSITIONS = ['ST', 'ST', 'CM', 'GK', 'LW', 'CB', 'ST', 'CAM'];
const NATIONS = ['England', 'Spain', 'Brazil', 'Germany', 'France', 'Argentina'];
const B = await load('bundle', [
  ['soccer', 'src/lib/soccerCareerEngine.ts'], ['ambitions', 'src/lib/soccerCareerAmbitions.ts'], ['preparation', 'src/lib/soccerCareerPreparation.ts'],
  ['role', 'src/lib/soccerCareerRole.ts'], ['milestone', 'src/lib/soccerCareerMilestone.ts'], ['records', 'src/lib/soccerCareerRecords.ts'],
  ['derbyHistory', 'src/lib/soccerCareerDerbyHistory.ts'],
]);
const E = B.soccer, clubs = E.FALLBACK_CLUBS;
const policy = kind === 'new';
const played = s => (s.seasons || []).filter(r => r.type === 'playing').length;
const copy = s => JSON.parse(JSON.stringify(s));

function step(s) {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? E.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'playing': {
      let c = s;
      if (policy && B.ambitions && B.preparation) {
        const opts = B.ambitions.ambitionOptions(c);
        if (opts.length && !B.ambitions.ambitionForNextSeason(c)) c = B.ambitions.pickCareerAmbition(c, opts[played(c) % opts.length].id);
        if (!B.preparation.preparationForSeason(c)) c = B.preparation.pickCareerPreparation(c, played(c) % 3 === 2 ? 'recovery' : 'push');
      }
      return E.advanceProSeason(c, clubs);
    }
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
    case 'retirement_ceremony': return E.choosePostRetirement(s, 'retire', clubs);
    case 'retired': return { ...s, retired: true };
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      const pick = policy && ev.title === 'Youth Mentor' ? 0 : policy && ev.title === 'New Manager!' ? 1 : ev.choices.length - 1;
      return E.applyEventChoice(s, pick, clubs);
    }
    case 'contract_expiring': case 'transfer_window': return E.stayAtClub(s);
    default: { const n = E.advanceProSeason(s, clubs); return n.phase === s.phase ? { ...n, retired: true } : n; }
  }
}

const best = {};   // tag -> { score, state, note }
const offer = (tag, score, s, note) => { if (score > 0 && (!best[tag] || score > best[tag].score)) best[tag] = { score, state: copy(s), note }; };
const cupRows = s => s.seasons.filter(r => r.type === 'playing' && r.clubCupRun && (r.championsLeague || r.clubCupTitle)).length;
const derbyRows = s => s.seasons.filter(r => Array.isArray(r.derbies) && r.derbies.length).length;
function look(s, seed) {
  const n = played(s), row = s.seasons[s.seasons.length - 1];
  const tags = `seed ${seed} ${s.position} ${n} senior seasons`;
  if (s.phase === 'playing' && !s.retired) {
    offer('home', Math.min(n, 12) + (s.mentor ? 6 : 0) + Math.min(cupRows(s), 3) * 4 + Math.min(derbyRows(s), 4) + (s.loan ? -5 : 0), s, tags);
    if (n === 0) offer('first', 1, s, tags);
    if (s.position === 'GK') offer('gk', Math.min(n, 9), s, tags);
    if (B.role?.reducedRoleForSeason(s)) offer('role-plan', 1 + Math.min(n, 9), s, tags);
    if (n >= 1 && n <= 1) offer('one-season', 1, s, tags);
  }
  if (s.phase === 'season_summary' && row) {
    const m = B.milestone?.personalGoalMilestone(s.seasons, row);
    const role = B.role?.readReducedRoleResult(row);
    offer('summary', (row.ambition ? 2 : 0) + (row.preparation ? 2 : 0) + (role ? 5 : 0) + (m ? 4 : 0) + (row.injury ? 1 : 0) + (n >= 4 ? 1 : 0), s, tags);
    if (m) offer('summary-milestone', 1 + (row.ambition ? 1 : 0) + (m.threshold === 100 ? 1 : 0), s, `${tags} milestone ${JSON.stringify(m)}`);
    if (role) offer('summary-role', 1 + (role.outcome === 'served' ? 1 : 0), s, `${tags} role ${role.outcome}`);
  }
  if (s.phase === 'newspaper' && (s.pendingNews || []).some(a => a.type === 'milestone')) offer('news-milestone', 1, s, tags);
  if (s.phase === 'random_events') {
    const ev = (s.pendingEvents || [])[0];
    if (ev?.title === 'Youth Mentor' && !s.mentor) offer('event-mentor', 1 + Math.min(n, 5), s, tags);
    if (ev?.title === 'New Manager!') offer('event-manager', 1 + Math.min(n, 5), s, tags);
  }
  if (s.phase === 'retired') offer('retired', Math.min(n, 15) + (s.mentor ? 6 : 0) + Math.min(cupRows(s), 3) * 3, s, tags);
  if (s.phase === 'retirement_ceremony') offer('ceremony', Math.min(n, 15), s, tags);
}

const CAREERS = Number(process.env.SC_CAREERS || (policy ? 40 : 16));
let seasons = 0;
for (let seed = 1; seed <= CAREERS; seed++) {
  Math.random = seeded(seed * 7919 + 13);
  try {
    const v = 74 + (seed % 4) * 5;
    let c = E.initCareer(`Rev ${kind} ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length], '2020-24', stats(v), v, 2020, clubs, null, 82);
    for (let guard = 0; guard < 900 && c.phase !== 'retired'; guard++) { look(c, seed); c = step(c); }
    look(c, seed); seasons += played(c);
  } catch (error) { console.log(`career ${seed} threw: ${String(error && error.stack || error).split('\n').slice(0, 3).join(' | ')}`); }
  finally { Math.random = realRandom; }
}
const out = {};
for (const [tag, row] of Object.entries(best)) {
  const s = row.state; out[`${kind}-${tag}`] = s;
  const book = B.records?.careerRecordBook(s), derby = B.derbyHistory?.savedDerbyHistory(s);
  console.log(`${kind}-${tag}: score ${row.score}; ${row.note}; phase ${s.phase}; club ${s.currentClub}; mentor ${s.mentor ? s.mentor.name + ' ' + s.mentor.status + ' ' + s.mentor.progress : 'none'}; cup rows ${cupRows(s)}; derby rows ${derbyRows(s)}; book apps ${book?.totals.apps ?? 'n/a'}; derby meetings ${derby?.team.meetings ?? 'n/a'}`);
}
fs.writeFileSync(file, JSON.stringify(out));
console.log(`scMake ${kind}: ${Object.keys(out).length} saves from ${CAREERS} careers and ${seasons} senior seasons, by the code in ${root}`);
