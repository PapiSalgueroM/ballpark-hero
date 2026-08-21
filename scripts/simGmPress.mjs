/**
 * Round 192 harness: the GM press room in all four Front Office games.
 *
 * What Round 192 shipped: the last named gap in the S-5 parity push. The
 * player careers got a press room in 184; the GM games now get theirs via
 * one shared engine, foGmPress.ts. The season's real facts pick the
 * presser (podium, accountability scrum, the trade question, or the
 * introduction at hire), every answer moves the Round 180 trust meter,
 * and season-end answers can TILT next season's mandate one tier through
 * buildOwnerMandate's new tilt parameter.
 *
 * The checks are logical, not statistical, except section 6's gamble-odds
 * read which uses a 4000-roll seeded sample: at odds 0.45 the binomial sd
 * is sqrt(.45*.55/4000) = 0.0079, so the +-0.03 window is 3.8 sigma and
 * a red here means the odds wiring changed, not noise.
 *
 * Run: node scripts/simGmPress.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/gmPressEntry.mjs';
const BUNDLE = '/tmp/gmPress.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const press = await import('${ROOT}/src/lib/foGmPress.ts');
const owner = await import('${ROOT}/src/lib/foOwnerMandate.ts');
export { press, owner };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { press, owner } = await import(BUNDLE);
const { buildGmPresser, applyGmPressChoice } = press;
const { buildOwnerMandate, tiltTier } = owner;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

const WORDS = {
  nfl: { title: 'the Super Bowl', playoffs: 'the playoffs', round: 'a playoff round', games: 17 },
  nba: { title: 'the Finals', playoffs: 'the playoffs', round: 'a series', games: 80 },
  nhl: { title: 'the Stanley Cup', playoffs: 'the playoffs', round: 'a series', games: 80 },
  mlb: { title: 'the World Series', playoffs: 'October', round: 'a series', games: 162 },
};

const facts = over => ({
  justHired: false, teamLabel: 'Testville Testers', fired: false, wonTitle: false,
  gradeResult: 'met', tradeLine: null, seasonsPlayed: 3, ...over,
});

/* ---------- 1. The right presser for the right season, all sports ---------- */
console.log('1) The season facts pick the presser, in every league');
for (const [key, words] of Object.entries(WORDS)) {
  const intro = buildGmPresser(words, facts({ justHired: true, gradeResult: null, seasonsPlayed: 0 }));
  if (!intro || intro.id !== 'gmPressIntro') fail(`${key}: hiring day did not produce the introduction`);
  if (intro && !intro.body.includes('Testville Testers')) fail(`${key}: the introduction never names the team`);
  if (intro && !intro.options[2].label.includes(words.title)) fail(`${key}: the bold introduction never names ${words.title}`);
  if (intro && intro.options.some(o => o.effect.tilt !== 0)) fail(`${key}: an introduction answer tilts a mandate that is already on the table`);

  const podium = buildGmPresser(words, facts({ wonTitle: true, gradeResult: 'title' }));
  if (!podium || podium.id !== 'gmPressPodium') fail(`${key}: a championship did not produce the podium`);

  for (const g of ['missed', 'badly']) {
    const scrum = buildGmPresser(words, facts({ gradeResult: g }));
    if (!scrum || scrum.id !== 'gmPressScrum') fail(`${key}: a ${g} season did not produce the scrum`);
  }

  const trade = buildGmPresser(words, facts({ tradeLine: 'the deal that brought Test Player in' }));
  if (!trade || trade.id !== 'gmPressTrade') fail(`${key}: a steady season with a headline deal did not produce the trade question`);
  if (trade && !trade.body.includes('the deal that brought Test Player in')) fail(`${key}: the trade question never quotes the deal`);
  if (trade && !trade.options[2].label.includes(words.title)) fail(`${key}: the bold trade answer never names ${words.title}`);
}

/* ---------- 2. Priority and the provably quiet summer ---------- */
console.log('2) Priority holds, and a quiet summer is provably quiet');
{
  const w = WORDS.nfl;
  const p1 = buildGmPresser(w, facts({ wonTitle: true, gradeResult: 'title', tradeLine: 'the deal that brought X in' }));
  if (!p1 || p1.id !== 'gmPressPodium') fail('a title with a trade should still be the podium');
  const p2 = buildGmPresser(w, facts({ gradeResult: 'badly', tradeLine: 'the deal that brought X in' }));
  if (!p2 || p2.id !== 'gmPressScrum') fail('a collapse with a trade should still be the scrum');
  for (const g of ['met', 'overachieved']) {
    const q = buildGmPresser(w, facts({ gradeResult: g }));
    if (q !== null) fail(`a ${g} season with no title and no deal must be a quiet summer, got ${q && q.id}`);
  }
}

/* ---------- 3. A fired GM gets no presser, ever ---------- */
console.log('3) The door shuts with one shake: no presser for the fired');
{
  const w = WORDS.mlb;
  const combos = [
    facts({ fired: true, gradeResult: 'badly' }),
    facts({ fired: true, gradeResult: 'missed', tradeLine: 'the deal that brought X in' }),
    facts({ fired: true, wonTitle: true, gradeResult: 'title' }), /* unreachable in play, pinned anyway */
    facts({ fired: true, justHired: true, gradeResult: null }),
  ];
  for (const f of combos) {
    if (buildGmPresser(w, f) !== null) fail(`fired combo produced a presser: ${JSON.stringify(f)}`);
  }
}

/* ---------- 4. Every answer's arithmetic, exactly ---------- */
console.log('4) Flat answers move trust exactly; gambles land or backfire');
{
  const w = WORDS.nba;
  const scrum = buildGmPresser(w, facts({ gradeResult: 'missed' }));
  const measured = applyGmPressChoice(50, scrum.options[0], seeded(1));
  if (measured.trust !== 51 || measured.tilt !== 0) fail(`scrum measured: expected 51/tilt 0, got ${measured.trust}/${measured.tilt}`);
  const patience = applyGmPressChoice(50, scrum.options[1], seeded(2));
  if (patience.trust !== 49 || patience.tilt !== -1) fail(`scrum patience: expected 49/tilt -1, got ${patience.trust}/${patience.tilt}`);
  if (scrum.options[1].effect.gamble) fail('the patience answer must be a certainty, not a gamble');
  const landed = applyGmPressChoice(50, scrum.options[2], () => 0.0);
  if (landed.trust !== 50 + 0 + 9 || landed.tilt !== 1) fail(`scrum bold landed: expected 59/tilt 1, got ${landed.trust}/${landed.tilt}`);
  if (!landed.line.includes('LANDED')) fail('a landed gamble must say so');
  const backfired = applyGmPressChoice(50, scrum.options[2], () => 0.99);
  if (backfired.trust !== 50 + 0 - 7) fail(`scrum bold backfired: expected 43, got ${backfired.trust}`);
  if (!backfired.line.includes('backfired')) fail('a backfired gamble must say so');
}

/* ---------- 5. The room can bruise you, only a season can end you ---------- */
console.log('5) Press trust floors at 1 and caps at 100');
{
  const w = WORDS.nhl;
  const scrum = buildGmPresser(w, facts({ gradeResult: 'badly' }));
  const floor = applyGmPressChoice(3, scrum.options[2], () => 0.99); /* 3 + 0 - 7 */
  if (floor.trust !== 1) fail(`worst answer at trust 3 must floor at 1, got ${floor.trust}`);
  const podium = buildGmPresser(w, facts({ wonTitle: true, gradeResult: 'title' }));
  const cap = applyGmPressChoice(99, podium.options[2], () => 0.0); /* 99 + 2 + 8 */
  if (cap.trust !== 100) fail(`best answer at trust 99 must cap at 100, got ${cap.trust}`);
  /* A 500-answer walk of worst-case scrums never reaches 0. */
  const rng = seeded(42);
  let t = 2, min = 2;
  for (let i = 0; i < 500; i++) {
    t = applyGmPressChoice(t, scrum.options[2], rng).trust;
    min = Math.min(min, t);
  }
  if (min < 1) fail(`the walk reached ${min}; a presser fired somebody`);
}

/* ---------- 6. The gamble odds are the odds on the card ---------- */
console.log('6) 4000 seeded rolls land within 3.8 sigma of the stated odds');
{
  const scrum = buildGmPresser(WORDS.nfl, facts({ gradeResult: 'missed' }));
  const odds = scrum.options[2].effect.gamble.odds;
  const rng = seeded(7);
  let landedCount = 0;
  for (let i = 0; i < 4000; i++) {
    if (applyGmPressChoice(50, scrum.options[2], rng).line.includes('LANDED')) landedCount += 1;
  }
  const frac = landedCount / 4000;
  if (Math.abs(frac - odds) > 0.03) fail(`stated odds ${odds}, observed ${frac.toFixed(3)} over 4000 rolls`);
}

/* ---------- 7. The tilt ladder and the tilted mandate ---------- */
console.log('7) tiltTier walks the ladder; buildOwnerMandate honors the tilt');
{
  const ladder = ['rebuild', 'respect', 'playoffs', 'contend', 'title'];
  for (let i = 0; i < ladder.length; i++) {
    if (tiltTier(ladder[i], 0) !== ladder[i]) fail(`tilt 0 moved ${ladder[i]}`);
    const up = tiltTier(ladder[i], 1);
    if (up !== ladder[Math.min(ladder.length - 1, i + 1)]) fail(`tilt +1 from ${ladder[i]} gave ${up}`);
    const down = tiltTier(ladder[i], -1);
    if (down !== ladder[Math.max(0, i - 1)]) fail(`tilt -1 from ${ladder[i]} gave ${down}`);
  }
  const w = WORDS.nfl;
  /* Rank 16 of 32 sits in the playoffs band (frac 0.484). */
  const base = buildOwnerMandate(16, 32, false, w, 2026);
  if (base.tier !== 'playoffs') fail(`rank 16/32 should ask for the playoffs, got ${base.tier}`);
  const soft = buildOwnerMandate(16, 32, false, w, 2026, -1);
  if (soft.tier !== 'respect' || soft.reqLevel !== 0 || soft.winFloor <= 0) fail(`tilt -1 from playoffs should be a respect win floor, got ${soft.tier}/${soft.reqLevel}/${soft.winFloor}`);
  if (!soft.text.includes(String(soft.winFloor))) fail('the softened mandate never states its win floor');
  const hard = buildOwnerMandate(16, 32, false, w, 2026, 1);
  if (hard.tier !== 'contend' || hard.reqLevel !== 2) fail(`tilt +1 from playoffs should demand a round win, got ${hard.tier}/${hard.reqLevel}`);
  /* Clamps at both ends. */
  if (buildOwnerMandate(1, 32, false, w, 2026, 1).tier !== 'title') fail('tilt +1 from title must stay title');
  if (buildOwnerMandate(32, 32, false, w, 2026, -1).tier !== 'rebuild') fail('tilt -1 from rebuild must stay rebuild');
  /* The champion floor survives a temper: ownership hears what it wants. */
  const champSoft = buildOwnerMandate(20, 32, true, w, 2026, -1);
  if (champSoft.tier !== 'contend') fail(`a defending champ tempering still owes a deep run, got ${champSoft.tier}`);
}

/* ---------- 8. Tilt 0 is byte-identical to the pre-192 mandate ---------- */
console.log('8) Omitted tilt changes nothing for every rank in every league');
for (const [key, words] of Object.entries(WORDS)) {
  const teamCount = key === 'nfl' ? 32 : 30;
  for (let rank = 1; rank <= teamCount; rank++) {
    for (const champ of [false, true]) {
      const a = JSON.stringify(buildOwnerMandate(rank, teamCount, champ, words, 2026));
      const b = JSON.stringify(buildOwnerMandate(rank, teamCount, champ, words, 2026, 0));
      if (a !== b) fail(`${key} rank ${rank} champ ${champ}: tilt 0 differs from omitted`);
    }
  }
}

/* ---------- 9. Purity and copy discipline ---------- */
console.log('9) Same facts, same presser; no em or en dash anywhere in the room');
{
  const w = WORDS.mlb;
  const f = facts({ gradeResult: 'badly' });
  if (JSON.stringify(buildGmPresser(w, f)) !== JSON.stringify(buildGmPresser(w, f))) fail('buildGmPresser is not pure');
  const everyString = [];
  for (const [, words] of Object.entries(WORDS)) {
    for (const fx of [
      facts({ justHired: true, gradeResult: null, seasonsPlayed: 0 }),
      facts({ wonTitle: true, gradeResult: 'title' }),
      facts({ gradeResult: 'missed' }),
      facts({ gradeResult: 'badly' }),
      facts({ tradeLine: 'the deal that brought Test Player in' }),
    ]) {
      const p = buildGmPresser(words, fx);
      if (!p) continue;
      everyString.push(p.title, p.body, ...p.options.flatMap(o => [o.label, o.effectLine]));
      if (p.options.length !== 3) fail(`${p.id}: a presser is three answers, got ${p.options.length}`);
    }
  }
  const DASHES = /[\u2013\u2014]/; /* en and em dash by codepoint, the simEras convention */
  for (const s of everyString) {
    if (DASHES.test(s)) fail(`an em or en dash reached press copy: "${s}"`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simGmPress: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simGmPress: green. The GM faces the room, the room moves the meter that matters.');
