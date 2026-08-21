/**
 * Round 184 harness: the press room in all four career games.
 *
 * What Round 184 shipped (the last of the five named CM parity systems):
 * the careers' media life stopped being one generic podcast card. The
 * press now reads the season's actual facts: a title puts you on the
 * podium (guaranteed, preempting the ordinary deck), a collapse puts you
 * in the accountability scrum (same), a team change brings the
 * introduction, the bench brings the role question, an MVP brings the
 * trophy interview, a final contract year brings the future question.
 * Three answers per presser, diplomat, honest and firebrand, and the
 * firebrand genuinely gambles. One shared engine (usCareerPress.ts), the
 * four sport libs map it into their own event decks, zero new UI.
 *
 * The speaker is always the fictional player; questions come from
 * unnamed reporters. The engine takes no real-name inputs at all.
 *
 * Run: node scripts/simCareerPress.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/careerPressEntry.mjs';
const BUNDLE = '/tmp/careerPress.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const nfl = await import('${ROOT}/src/lib/nflMyCareer.ts');
const nba = await import('${ROOT}/src/lib/nbaMyCareer.ts');
const nhl = await import('${ROOT}/src/lib/nhlMyCareer.ts');
const mlb = await import('${ROOT}/src/lib/mlbMyCareer.ts');
const press = await import('${ROOT}/src/lib/usCareerPress.ts');
export { nfl, nba, nhl, mlb, press };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { nfl, nba, nhl, mlb, press } = await import(BUNDLE);
const { buildPressMoment, applyPressChoice, pressFactsFrom, PRESS_WORDS } = press;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

/* A doctored NFL career in a chosen situation. */
function nflCareerWith(shape, rng) {
  const c = nfl.startCareer('Press Test', 'QB', nfl.ARCHETYPES.QB[0], rng, null, undefined);
  c.role = 'starter'; c.contractYears = 3; c.fanbase = 60;
  const season = (team, teamResult, awards = []) => ({ year: 2026, team, age: 23, ovr: 80, games: 17, awards, teamResult, salary: 5 });
  c.seasons = [season(c.team, 'Lost in the Divisional round'), season(c.team, 'Lost in the Divisional round')];
  Object.assign(c, shape.state ?? {});
  if (shape.lastResult) c.seasons[1] = season(shape.lastTeam ?? c.team, shape.lastResult, shape.lastAwards ?? []);
  return c;
}

/* ---------- 1. The right presser fires for the right season ---------- */
console.log('1) Triggers: podium, scrum, introduction, role, quiet summers stay quiet');
{
  const rng = seeded(11);
  for (let i = 0; i < 100; i++) {
    const c = nflCareerWith({ lastResult: 'WON THE SUPER BOWL' }, rng);
    const ev = nfl.drawEvent(c, rng);
    if (ev.id !== 'pressTitle') { fail(`a championship offseason drew '${ev.id}', not the podium`); break; }
  }
  for (let i = 0; i < 100; i++) {
    const c = nflCareerWith({ lastResult: 'Missed the playoffs', state: { fanbase: 38 } }, rng);
    const ev = nfl.drawEvent(c, rng);
    if (ev.id !== 'pressDisaster') { fail(`a collapse offseason drew '${ev.id}', not the scrum`); break; }
  }
  /* Quiet: made the playoffs, starter, mid-contract, same team. NO press
     card may ever appear. */
  let pressSeen = 0;
  for (let i = 0; i < 400; i++) {
    const c = nflCareerWith({}, rng);
    const ev = nfl.drawEvent(c, rng);
    if (String(ev.id).startsWith('press')) pressSeen++;
  }
  if (pressSeen > 0) fail(`${pressSeen} of 400 quiet offseasons produced a press card, quiet must stay quiet`);
  /* The role question joins the deck for a backup: sometimes, not always. */
  let roleSeen = 0;
  for (let i = 0; i < 400; i++) {
    const c = nflCareerWith({ state: { role: 'backup' } }, rng);
    const ev = nfl.drawEvent(c, rng);
    if (ev.id === 'pressRole') roleSeen++;
  }
  if (roleSeen === 0) fail('a benched career never got the role question in 400 draws');
  if (roleSeen === 400) fail('the role question preempts the whole deck, it should join it');
  /* The introduction knows the new city by name. */
  const c2 = nflCareerWith({ lastTeam: 'DAL', lastResult: 'Lost in the Divisional round' }, rng);
  c2.team = 'DAL';
  const facts = pressFactsFrom(c2, 'Dallas Cowboys');
  if (!facts.movedTeams) fail('a team change was not read as a move');
  const intro = buildPressMoment('nfl', facts, rng);
  if (!intro || intro.id !== 'pressIntro') fail('a fresh arrival did not get the introduction');
  else if (!intro.body.includes('Dallas Cowboys')) fail('the introduction does not name the new team');
}

/* ---------- 2. Priority: the podium beats every other question ---------- */
console.log('2) A champion on the bench who just moved still gets the podium');
{
  const rng = seeded(21);
  const facts = {
    wonTitle: true, wonMvp: true, missedPlayoffs: false, fanbase: 30, isBackup: true,
    movedTeams: true, newTeamLabel: 'Somewhere FC', finalContractYear: true, seasonsPlayed: 5,
  };
  for (const sport of ['nfl', 'nba', 'nhl', 'mlb']) {
    const m = buildPressMoment(sport, facts, rng);
    if (!m || m.id !== 'pressTitle') fail(`${sport}: the podium lost priority to '${m?.id}'`);
  }
}

/* ---------- 3. Answers do exactly what the card says ---------- */
console.log('3) Effects: exact diplomat deltas, honest gamble odds, hard clamps');
{
  const rng = seeded(31);
  const facts = { wonTitle: true, wonMvp: false, missedPlayoffs: false, fanbase: 50, isBackup: false, movedTeams: false, newTeamLabel: null, finalContractYear: false, seasonsPlayed: 3 };
  const m = buildPressMoment('nfl', facts, rng);
  const t = { morale: 50, fanbase: 50 };
  applyPressChoice(t, m.options[0], rng);
  if (t.morale !== 56 || t.fanbase !== 54) fail(`the diplomat podium answer moved (${t.morale}, ${t.fanbase}), expected (56, 54)`);
  /* The firebrand gamble: odds 0.65, measure the landing rate. */
  let landed = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const x = { morale: 50, fanbase: 50 };
    const line = applyPressChoice(x, m.options[2], rng);
    if (line.includes('LANDED')) {
      landed++;
      if (x.fanbase !== 62) fail(`a landed gamble left fanbase at ${x.fanbase}, expected 62`);
    } else if (x.fanbase !== 44) fail(`a backfired gamble left fanbase at ${x.fanbase}, expected 44`);
  }
  const rate = landed / N;
  if (rate < 0.58 || rate > 0.72) fail(`the 0.65 gamble landed ${(rate * 100).toFixed(1)}% of the time over ${N} rolls`);
  /* Clamps hold. */
  const low = { morale: 1, fanbase: 2 };
  applyPressChoice(low, { label: '', effectLine: '', effect: { morale: -10, fanbase: -10 } }, rng);
  if (low.morale !== 0 || low.fanbase !== 0) fail('effects punched through the zero clamp');
  const high = { morale: 99, fanbase: 98 };
  applyPressChoice(high, { label: '', effectLine: '', effect: { morale: 10, fanbase: 10 } }, rng);
  if (high.morale !== 100 || high.fanbase !== 100) fail('effects punched through the hundred clamp');
}

/* ---------- 4. Every sport speaks its own language ---------- */
console.log('4) Vocabulary: the right trophy in the right room, never a borrowed one');
{
  const rng = seeded(41);
  const wordOf = { nfl: 'Super Bowl', nba: 'Finals', nhl: 'Stanley Cup', mlb: 'World Series' };
  for (const sport of ['nfl', 'nba', 'nhl', 'mlb']) {
    const facts = id => ({
      wonTitle: id === 'pressTitle', wonMvp: id === 'pressAward',
      missedPlayoffs: id === 'pressDisaster', fanbase: id === 'pressDisaster' ? 30 : 60,
      isBackup: id === 'pressRole', movedTeams: id === 'pressIntro',
      newTeamLabel: id === 'pressIntro' ? 'Test Town' : null,
      finalContractYear: false, seasonsPlayed: 4,
    });
    for (const id of ['pressTitle', 'pressDisaster', 'pressIntro', 'pressRole', 'pressAward']) {
      const m = buildPressMoment(sport, facts(id), rng);
      if (!m || m.id !== id) { fail(`${sport}: fixture for ${id} produced '${m?.id}'`); continue; }
      const text = m.title + ' ' + m.body + ' ' + m.options.map(o => o.label + o.effectLine).join(' ');
      for (const [other, word] of Object.entries(wordOf)) {
        if (other !== sport && text.includes(word)) fail(`${sport}'s ${id} borrows ${other}'s trophy word`);
      }
      if (id === 'pressTitle' && !m.body.includes(wordOf[sport])) fail(`${sport}'s podium never names ${wordOf[sport]}`);
      if (id === 'pressDisaster' && !m.body.includes(PRESS_WORDS[sport].playoffs)) fail(`${sport}'s scrum never names the postseason it missed`);
    }
  }
}

/* ---------- 5. Full careers keep working with the press in the deck ---------- */
console.log('5) Whole careers answer the press and nothing breaks');
for (const S of [
  { key: 'nfl', start: r => nfl.startCareer('X', 'WR', nfl.ARCHETYPES.WR[0], r, null, undefined), sim: nfl.simSeason, prog: nfl.progress, draw: nfl.drawEvent, retire: nfl.shouldRetire },
  { key: 'nba', start: r => nba.startNbaCareer('X', 'PG', nba.NBA_ARCHETYPES.PG[0], r, null, undefined), sim: nba.simNbaSeason, prog: nba.nbaProgress, draw: nba.drawNbaEvent, retire: nba.nbaShouldRetire },
  { key: 'nhl', start: r => nhl.startNhlCareer('X', 'C', nhl.NHL_ARCHETYPES.C[0], r, null, undefined), sim: nhl.simNhlSeason, prog: nhl.nhlProgress, draw: nhl.drawNhlEvent, retire: nhl.nhlShouldRetire },
  { key: 'mlb', start: r => mlb.startMlbCareer('X', 'SS', mlb.MLB_ARCHETYPES.SS[0], r, null, undefined), sim: mlb.simMlbSeason, prog: mlb.mlbProgress, draw: mlb.drawMlbEvent, retire: mlb.mlbShouldRetire },
]) {
  const rng = seeded(51);
  let pressAnswered = 0;
  for (let i = 0; i < 120; i++) {
    const c = S.start(rng);
    c.contractYears = 99; /* keep the loop on events, FA is 179's harness */
    let guard = 0;
    while (!c.retired && c.seasons.length < 15 && guard++ < 30) {
      S.sim(c, 78, rng);
      S.prog(c, rng);
      c.contractYears = 99;
      const ev = S.draw(c, rng);
      const pick = ev.options[Math.floor(rng() * ev.options.length)];
      const out = pick.apply(c, rng);
      if (String(ev.id).startsWith('press')) {
        pressAnswered++;
        if (typeof out !== 'string' || out.length === 0) fail(`${S.key}: a press answer returned no feed line`);
        if (c.morale < 0 || c.morale > 100 || c.fanbase < 0 || c.fanbase > 100) fail(`${S.key}: a press answer broke the meters`);
      }
      if (S.retire(c)) c.retired = true;
    }
  }
  if (pressAnswered === 0) fail(`${S.key}: 120 full careers never met the press once`);
}

/* ---------- verdict ---------- */
if (failures > 0) {
  console.error(`\n${failures} CAREER PRESS CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL CAREER PRESS CHECKS PASSED');
