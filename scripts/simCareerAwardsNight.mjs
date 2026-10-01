/**
 * Round 834: the shared awards night (src/lib/careerAwardsNight.ts and
 * src/components/career/AwardsNightCard.tsx) and Soccer Career bound onto it.
 *
 * The owner's words were "my careers are nothing like the soccer ones". The
 * program answer is one engine, many sports: lift each of Soccer Career's
 * systems into a shared module behind a sport descriptor, then bind every US
 * career to it. This round lifts the awards night. Soccer must come out of the
 * lift exactly as it went in, and the shared module must keep its promises for
 * whichever sport binds it next.
 *
 *   1. Soccer unchanged, HARD. scripts/lib/careerAwardsNightProbe.mjs drives 48
 *      seeded careers through every screen and records the whole save's hash
 *      after every step (10,029 of them), every Ballon d'Or night in clear
 *      (shortlist order, points, the player's place, 851 nights, 26 won), what
 *      every speech does on every won night and tournament (405 tournaments,
 *      54 won), 192 direct speech draws on real saves, and the ceremony and
 *      tournament cards' server rendered markup. It was recorded into
 *      scripts/data/careerAwardsNightFixture.json from origin/main 3fb92eea
 *      BEFORE any code moved; this replays it on the current tree and requires
 *      the output to be identical. Soccer calls Math.random directly in a fixed
 *      order, so a single reordered draw anywhere breaks it.
 *   2. The contract, on a synthetic sport (2,000 nights with repeated names,
 *      short fields, fillers that repeat themselves, and verdict rules that
 *      throw points about): the shortlist never names a rival twice, the list
 *      is ranked so the winner is the top, the player's place is his index on
 *      the list or the wider ranking's number, the night says whether he made
 *      the ballot; a speech moves exactly the meters its steps name by exactly
 *      their deltas, draws once only when it has a risk, writes one line; the
 *      settle writes the place, the win, the cabinet and the right steps.
 *   3. Soccer's speeches are honest, on a save made by initCareer: 2,000 draws
 *      (250 per option, eight options). Every "Popularity -10" a line prints
 *      must be the move the option made, every meter it moves must be one it
 *      names, the gates hide what they say they hide, and each gamble lands on
 *      both sides near its stated chance.
 *   4. Rival names. A new sport's field must be generated people; only the
 *      Soccer engine may declare 'legacy-real-era-stars' (the era's real stars
 *      with invented goals, an open decision for the owner).
 *   5. No second copy. The inline shortlist, the wider ranking and the four
 *      hand written speech buttons must not come back beside the shared ones,
 *      and Soccer must keep calling them.
 *
 * Negative controls (SIM_AWARDS_NIGHT_CONTROL), each must turn its section red:
 *   reorderdraw   the era star loop draws assists before goals   -> section 1
 *   winnernottop  the night is no longer re-ranked after a rule  -> section 2
 *   speechleak    a gamble's hit also lands its miss steps       -> sections 2 and 3
 *   legacyreal    a second file declares real era stars          -> section 4
 *   secondcopy    an inline wider ranking reappears in the engine -> section 5
 * Each patch is refused unless the exact text it replaces is present, so a
 * control can never pass by changing nothing. Measured on the round's tree:
 * every control turns its own section red (reorderdraw and winnernottop also
 * break section 1, speechleak sections 1 and 3).
 *
 * Bands, all on fixed seeds so the same numbers come back every run: the
 * synthetic 35% gamble came up 338 of 1,000 (band 30 to 40%); Soccer's
 * greatest_ever 103 of 250 on 35% and call_out_doubters 104 of 250 on 40%
 * (band: within 10 points of the stated chance, one standard deviation at 250
 * draws is about 3).
 *
 * Run: node scripts/simCareerAwardsNight.mjs   (about 15 seconds)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeAwardsNight, mulberry32 } from './lib/careerAwardsNightProbe.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_AWARDS_NIGHT_CONTROL ?? '';
const CONTROLS = {
  reorderdraw: {
    section: 1,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: 'const goals = rand(star.baseGoals[0], star.baseGoals[1]);\n      const assists = rand(3, 18);',
      to: 'const assists = rand(3, 18);\n      const goals = rand(star.baseGoals[0], star.baseGoals[1]);',
    }],
  },
  winnernottop: {
    section: 2,
    patches: [{
      file: 'src/lib/careerAwardsNight.ts',
      from: '    verdict(nominees, place);\n    nominees.sort(byPoints);',
      to: '    verdict(nominees, place);',
    }],
  },
  speechleak: {
    section: 2,
    patches: [{
      file: 'src/lib/careerAwardsNight.ts',
      from: 'applyMeterSteps(sport.meters, s, hit ? option.risk.hit : option.risk.miss);',
      to: 'applyMeterSteps(sport.meters, s, hit ? [...option.risk.hit, ...option.risk.miss] : option.risk.miss);',
    }],
  },
  legacyreal: { section: 4, patches: [] },
  secondcopy: { section: 5, patches: [] },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`unknown SIM_AWARDS_NIGHT_CONTROL "${CONTROL}" (known: ${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const patches = CONTROLS[CONTROL]?.patches ?? [];
if (CONTROL) console.log(`CONTROL ${CONTROL} active: section ${CONTROLS[CONTROL].section} must go red\n`);

let failures = 0;
const failedSections = new Set();
let section = 0;
const fail = m => { failures += 1; failedSections.add(section); console.error(`  FAIL: ${m}`); };
let checks = 0;
const check = (ok, m) => { checks += 1; if (!ok) fail(m); };

const B = await bundleAwardsNight(ROOT, { patches, extra: { awards: 'src/lib/careerAwardsNight.ts' } });
const { soccer, awards: A } = B;

/* ---------- 1. Soccer unchanged ---------- */
section = 1;
console.log('1) Soccer Career replays the pre-lift fixture byte for byte');
{
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerAwardsNightFixture.json'), 'utf8'));
  const fresh = JSON.parse(JSON.stringify(probeAwardsNight(B)));
  const stepCount = fixture.careers.reduce((a, c) => a + c.steps.split(' ').length, 0);
  console.log(`   fixture: ${fixture.careers.length} careers, ${stepCount} saves, ${fixture.nights.length} nights (${fixture.nights.filter(n => n.rank === 1).length} won), ${fixture.tournaments.length} tournaments, ${fixture.speeches.length} speeches, ${fixture.markup.length} kept cards`);
  check(fixture.careers.length >= 40 && stepCount > 5000 && fixture.nights.length > 500, 'the fixture is smaller than the round recorded, it cannot prove much');
  const resolve = list => list.split(' ').map(t => {
    const [who, pts] = t.split(':');
    return `${who === 'P' ? 'YOU' : fixture.names[Number(who)] ?? fresh.names[Number(who)] ?? who}:${pts}`;
  }).join(', ');
  for (const key of Object.keys(fixture)) {
    const want = fixture[key], got = fresh[key];
    if (JSON.stringify(want) === JSON.stringify(got)) { console.log(`   ${key.padEnd(12)} identical`); checks += 1; continue;
    }
    if (key === 'careers') {
      const i = want.findIndex((c, k) => JSON.stringify(c) !== JSON.stringify(got?.[k]));
      const a = want[i].steps.split(' '), b = (got?.[i]?.steps ?? '').split(' ');
      const j = a.findIndex((t, k) => t !== b[k]);
      fail(`career ${want[i].c} parts at step ${j} of ${a.length}: fixture ${a[j]} (phase ${a[j]?.slice(0, 2)}), now ${b[j] ?? 'nothing'}; the step before matched ${j > 0 ? a[j - 1] : '(none)'}`);
    } else if (key === 'nights') {
      const i = want.findIndex((n, k) => JSON.stringify(n) !== JSON.stringify(got?.[k]));
      const w = want[i], g = got?.[i];
      fail(`night ${i} (career ${w.c}, ${w.year}) differs: fixture rank ${w.rank} [${resolve(w.list)}], now rank ${g?.rank} [${g ? resolve(g.list) : 'missing'}]`);
    } else if (Array.isArray(want)) {
      const i = want.findIndex((n, k) => JSON.stringify(n) !== JSON.stringify(got?.[k]));
      fail(`${key}[${i}] differs: fixture ${JSON.stringify(want[i]).slice(0, 300)}, now ${JSON.stringify(got?.[i]).slice(0, 300)}`);
    } else {
      fail(`${key} differs`);
    }
  }
  /* The fixture has to exercise what it claims to: both sides of both gambles. */
  const seen = new Set(fixture.speeches.map(s => `${s.id}:${s.d.popularity ?? 'clamped'}`));
  for (const want of ['greatest_ever:-10', 'greatest_ever:8', 'call_out_doubters:-8', 'call_out_doubters:10']) {
    check(seen.has(want), `the fixture never saw ${want}, so it cannot prove that branch kept its draw`);
  }
}

/* ---------- 2. The contract on a synthetic sport ---------- */
section = 2;
console.log('\n2) The shared contract, on a synthetic sport');
{
  const rng = mulberry32(834);
  const award = { id: 'synthetic', name: 'Synthetic Cup', emoji: '🏆', shortlistSize: 8, widerSize: 20, podiumSize: 3, rivals: 'generated' };
  let nights = 0, repeatsOffered = 0, rerankedByRule = 0, widerPlaced = 0, onList = 0, filled = 0;
  const bad = { repeat: 0, order: 0, place: 0, wider: 0, nominated: 0, size: 0 };
  for (let night = 0; night < 2000; night += 1) {
    const fieldSize = 2 + Math.floor(rng() * 20);
    const field = [];
    for (let i = 0; i < fieldSize; i += 1) field.push({ name: `Gen ${Math.floor(rng() * 22)}`, points: Math.floor(rng() * 100), isPlayer: false });
    field.sort((a, b) => b.points - a.points);
    if (new Set(field.map(f => f.name)).size < field.length) repeatsOffered += 1;
    const playerPoints = Math.floor(rng() * 100);
    const player = rng() < 0.6 ? { name: 'You', points: playerPoints, isPlayer: true } : null;
    const verdicts = [
      list => { if (list.length > 1 && rng() < 0.5) { list[list.length - 1].points += 70; rerankedByRule += 1; } },
      (list, place) => { if (place !== null && rng() < 0.4) { const me = list.find(c => c.isPlayer); if (me) me.points -= 45; } },
    ];
    const fill = (list, need) => {
      let k = 0;
      while (list.length < need && k < 30) { list.push({ name: `Filler ${Math.floor(rng() * 5)}`, points: Math.floor(rng() * 50), isPlayer: false }); k += 1; }
    };
    const ballot = { field, player, playerPoints, fill: rng() < 0.7 ? fill : undefined, verdicts, widerEligible: rng() < 0.8 };
    const out = A.runAwardsNight(award, 2000 + night, ballot);
    nights += 1;
    if (ballot.fill && fieldSize < 8) filled += 1;
    const rivals = out.nominees.filter(c => !c.isPlayer);
    if (new Set(rivals.map(c => c.name)).size !== rivals.length || out.nominees.filter(c => c.isPlayer).length > 1) bad.repeat += 1;
    if (out.nominees.length > award.shortlistSize) bad.size += 1;
    for (let i = 1; i < out.nominees.length; i += 1) if (out.nominees[i].points > out.nominees[i - 1].points) { bad.order += 1; break; }
    const idx = out.nominees.findIndex(c => c.isPlayer);
    if (idx >= 0) {
      onList += 1;
      if (out.playerRank !== idx + 1) bad.place += 1;
    } else if (out.playerRank !== null) {
      widerPlaced += 1;
      const better = ballot.field.filter(n => !n.isPlayer && n.points > playerPoints).length;
      const want = Math.max(award.shortlistSize + 1, better + 1);
      if (!ballot.widerEligible || out.playerRank !== want || want > award.widerSize) bad.wider += 1;
    } else if (ballot.widerEligible) {
      const better = ballot.field.filter(n => !n.isPlayer && n.points > playerPoints).length;
      if (Math.max(award.shortlistSize + 1, better + 1) <= award.widerSize) bad.wider += 1;
    }
    if (out.playerNominated !== (player !== null)) bad.nominated += 1;
  }
  console.log(`   ${nights} nights: ${repeatsOffered} fields offered a repeated name, ${filled} short fields topped up, ${rerankedByRule} rules moved a name, player on the list ${onList}, placed in the wider ranking ${widerPlaced}`);
  check(repeatsOffered > 500 && rerankedByRule > 500 && onList > 500 && widerPlaced > 50, 'the synthetic nights did not exercise the contract (too few repeats, rule moves or placements)');
  check(bad.repeat === 0, `${bad.repeat} shortlists named someone twice`);
  check(bad.size === 0, `${bad.size} shortlists ran past their size`);
  check(bad.order === 0, `${bad.order} nights were not ranked after a rule moved points, so the winner was not the top ranked`);
  check(bad.place === 0, `${bad.place} nights gave the player a place that is not his spot on the list`);
  check(bad.wider === 0, `${bad.wider} nights placed (or failed to place) the player in the wider ranking against the rule`);
  check(bad.nominated === 0, `${bad.nominated} nights said the wrong thing about the player making the ballot`);

  /* Speeches on a plain meter set: no clamps, so every move is visible. */
  const meters = {};
  for (const [id, label] of [['a', 'Alpha'], ['b', 'Beta'], ['c', 'Gamma'], ['d', 'Delta']]) meters[id] = { label, add: (s, x) => { s[id] += x; } };
  const sport = { meters, say: (s, line) => { s.log = [...s.log, line]; } };
  const options = [
    { id: 'sure', emoji: '🎤', label: 'Sure thing', tone: 'gold', effect: [{ meter: 'a', delta: 3 }, { meter: 'b', delta: -2 }], line: () => 'sure' },
    { id: 'coin', emoji: '🐐', label: 'A gamble', tone: 'bold', effect: [{ meter: 'c', delta: 1 }], risk: { chance: 0.35, hit: [{ meter: 'a', delta: -5 }, { meter: 'd', delta: 4 }], miss: [{ meter: 'b', delta: 6 }] }, line: (_s, o) => o },
    { id: 'gated', emoji: '👶', label: 'Gated', tone: 'quiet', available: s => s.ok, effect: [{ meter: 'd', delta: 7 }], line: () => 'gated' },
  ];
  const speechBad = { keys: 0, delta: 0, draws: 0, line: 0 };
  let hits = 0, coins = 0;
  for (let n = 0; n < 3000; n += 1) {
    const opt = options[n % options.length];
    const s = { a: 50 + (n % 7), b: 40, c: 30, d: 20, ok: n % 2 === 0, log: ['before'] };
    const before = { ...s };
    let draws = 0;
    const r = mulberry32(n * 31 + 9);
    const counted = () => { draws += 1; return r(); };
    const line = A.applySpeech(sport, options, s, opt.id, counted);
    let outcome = 'sure';
    if (opt.risk) { coins += 1; outcome = mulberry32(n * 31 + 9)() < opt.risk.chance ? 'hit' : 'miss'; if (outcome === 'hit') hits += 1; }
    const steps = [...opt.effect, ...(outcome === 'hit' ? opt.risk.hit : outcome === 'miss' ? opt.risk.miss : [])];
    const want = {};
    for (const st of steps) want[st.meter] = (want[st.meter] ?? 0) + st.delta;
    const moved = Object.keys(meters).filter(k => s[k] !== before[k]);
    if (moved.sort().join() !== Object.keys(want).sort().join()) speechBad.keys += 1;
    for (const k of Object.keys(want)) if (s[k] - before[k] !== want[k]) speechBad.delta += 1;
    if (draws !== (opt.risk ? 1 : 0)) speechBad.draws += 1;
    if (s.log.length !== 2 || s.log[1] !== line || (opt.risk && line !== outcome)) speechBad.line += 1;
  }
  console.log(`   3,000 speeches: ${coins} gambles, ${hits} came up (${(hits / coins * 100).toFixed(1)}% on a stated 35%)`);
  check(speechBad.keys === 0, `${speechBad.keys} speeches moved a meter their steps do not name, or missed one they do`);
  check(speechBad.delta === 0, `${speechBad.delta} meter moves were not the stated delta`);
  check(speechBad.draws === 0, `${speechBad.draws} speeches drew a number they had no risk for, or drew twice`);
  check(speechBad.line === 0, `${speechBad.line} speeches wrote the wrong line, or not exactly one`);
  check(hits / coins > 0.3 && hits / coins < 0.4, `a stated 35% gamble came up ${(hits / coins * 100).toFixed(1)}% of the time`);
  {
    const s = { a: 1, b: 1, c: 1, d: 1, log: [] };
    let drew = false;
    const out = A.applySpeech(sport, options, s, 'nope', () => { drew = true; return 0; });
    check(out === null && !drew && s.log.length === 0 && s.a === 1, 'a speech id the list does not carry still moved something');
  }
  check(A.availableSpeeches(options, { ok: false }).map(o => o.id).join() === 'sure,coin'
    && A.availableSpeeches(options, { ok: true }).map(o => o.id).join() === 'sure,coin,gated', 'availableSpeeches does not apply the gates');

  /* The settle: what the save keeps for each place. */
  for (const place of [1, 2, 3, 4, 8, 12, null]) {
    const calls = [];
    const s = { a: 10, b: 10, c: 10, d: 10, log: [] };
    const rec = {};
    const bound = {
      award: { ...award }, meters,
      winnerSteps: [{ meter: 'a', delta: 9 }], podiumSteps: [{ meter: 'b', delta: 2 }],
      stage: () => calls.push('stage'), recordPlace: (r, p) => { r.place = p; calls.push('place'); },
      recordWin: r => { r.won = true; calls.push('win'); }, addToCabinet: (_s, e) => calls.push(`cabinet:${e.name}:${e.year}`),
      onPodium: () => calls.push('podium'), say: () => calls.push('say'), copy: {},
    };
    A.settleAwardsNight(bound, s, rec, { year: 2031, nominees: [], playerRank: place, playerPoints: 0, playerNominated: place !== null && place <= 8 });
    const want = place === null ? 'stage'
      : place === 1 ? 'stage,place,win,cabinet:Synthetic Cup:2031'
        : place <= 3 ? 'stage,place,podium' : 'stage,place';
    check(calls.join() === want, `settle at place ${place} did ${calls.join()} instead of ${want}`);
    check(s.a === (place === 1 ? 19 : 10) && s.b === (place !== null && place > 1 && place <= 3 ? 12 : 10), `settle at place ${place} moved the wrong meters`);
    check(place === null ? rec.place === undefined : rec.place === place, `settle at place ${place} recorded ${rec.place}`);
  }
}

/* ---------- 3. Soccer's speeches are honest ---------- */
section = 3;
console.log('\n3) Soccer Career speeches: 2,000 draws on a real save');
{
  const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  const keep = Math.random;
  Math.random = mulberry32(8341);
  let base;
  try {
    base = soccer.initCareer('Honest Test', 'England', 'ST', '2020-24', stats(72), 72, 2020, soccer.FALLBACK_CLUBS, null, 88);
  } finally {
    Math.random = keep;
  }
  Object.assign(base, { popularity: 50, morale: 50, integrityBonus: 0, rivalryIntensity: 50, socialMediaFollowers: 10, marketValue: 20 });
  const METERS = soccer.SOCCER_BALLON_DOR.meters;
  const ids = Object.keys(METERS);
  const labelRe = new RegExp(`(${ids.map(k => METERS[k].label).join('|')}) ([+-]\\d+(?:\\.\\d+)?)`, 'g');
  const labelToId = Object.fromEntries(ids.map(k => [METERS[k].label, k]));
  let mentions = 0, draws = 0;
  for (const [kind, list] of [['Ballon d\'Or', soccer.SOCCER_BDOR_SPEECHES], ['tournament', soccer.SOCCER_WORLD_CUP_SPEECHES]]) {
    for (const opt of list) {
      const r = mulberry32(opt.id.length * 7919 + 5);
      let hits = 0;
      const bad = { keys: 0, words: 0 };
      for (let n = 0; n < 250; n += 1) {
        const s = { ...base, events: [...base.events], rival: { name: 'Generated Rival', retired: false } };
        const before = { ...s };
        let hit = null;
        const coin = () => { const v = r(); hit = v < opt.risk.chance; return v; };
        const line = A.applySpeech(soccer.SOCCER_BALLON_DOR, list, s, opt.id, opt.risk ? coin : () => { throw new Error('drew without a risk'); });
        draws += 1;
        if (hit) hits += 1;
        const steps = [...opt.effect, ...(opt.risk ? (hit ? opt.risk.hit : opt.risk.miss) : [])];
        const want = {};
        for (const st of steps) want[st.meter] = Math.round(((want[st.meter] ?? 0) + st.delta) * 100) / 100;
        const moved = ids.filter(k => s[k] !== before[k]);
        if (moved.sort().join() !== Object.keys(want).sort().join()) bad.keys += 1;
        for (const m of line.matchAll(labelRe)) {
          mentions += 1;
          const id = labelToId[m[1]];
          const did = Math.round((s[id] - before[id]) * 100) / 100;
          if (did !== Number(m[2])) bad.words += 1;
        }
        if (s.events.length !== before.events.length + 1 || s.events[s.events.length - 1] !== line) bad.words += 1;
      }
      const note = opt.risk ? `, came up ${hits} of 250 on a stated ${Math.round(opt.risk.chance * 100)}%` : '';
      console.log(`   ${kind.padEnd(11)} ${opt.id.padEnd(18)} moves ${[...new Set([...opt.effect, ...(opt.risk ? [...opt.risk.hit, ...opt.risk.miss] : [])].map(x => x.meter))].join(', ')}${note}`);
      check(bad.keys === 0, `${opt.id}: ${bad.keys} of 250 moved a meter it does not name, or missed one it does`);
      check(bad.words === 0, `${opt.id}: ${bad.words} of 250 printed a number it did not do, or no single log line`);
      if (opt.risk) {
        /* Seeded, so this is the same count every run. 250 draws put one
           standard deviation near 3 points; the band is ten either side. */
        check(hits > 0 && hits < 250, `${opt.id}: the gamble only ever landed one way`);
        check(Math.abs(hits / 250 - opt.risk.chance) < 0.1, `${opt.id}: came up ${hits} of 250 against a stated ${opt.risk.chance}`);
      }
      check(!/[–—]/.test(`${opt.label} ${opt.line(base, 'hit')} ${opt.line(base, 'miss')}`), `${opt.id}: a dash in the copy`);
    }
  }
  console.log(`   ${draws} speeches, ${mentions} numbers in the lines checked against what the speech did`);
  check(draws === 2000, `ran ${draws} speeches, not 2,000`);
  check(mentions >= 500, 'too few numbers in the lines to prove the words match the moves');
  const gate = (s, id) => A.availableSpeeches(soccer.SOCCER_BDOR_SPEECHES, s).some(o => o.id === id);
  const fam = n => ({ ...base.family, children: n });
  check(!gate({ ...base, rival: null, family: fam(0) }, 'thank_rival') && !gate({ ...base, rival: { name: 'R', retired: true }, family: fam(0) }, 'thank_rival')
    && gate({ ...base, rival: { name: 'R', retired: false }, family: fam(0) }, 'thank_rival'), 'the rival speech is not gated on a rival who is still playing');
  check(!gate({ ...base, rival: null, family: fam(0) }, 'family_on_stage') && gate({ ...base, rival: null, family: fam(2) }, 'family_on_stage'), 'the family speech is not gated on having a child');
  check(A.availableSpeeches(soccer.SOCCER_WORLD_CUP_SPEECHES, base).length === 4, 'a tournament winner should always see all four speeches');
  /* Reported, not gated: the ceremony card's copy names a meter the night does
     not move. Changing it is a player visible change and the lead's call. */
  const words = [...soccer.SOCCER_BALLON_DOR.copy.winnerLine.matchAll(/([A-Z][a-z]+(?: [A-Z][a-z]+)?) \+/g)].map(m => m[1]);
  const moves = soccer.SOCCER_BALLON_DOR.winnerSteps.map(x => `${METERS[x.meter].label} ${x.delta > 0 ? '+' : ''}${x.delta}`);
  console.log(`   NOTE (not gated): the winner line names ${words.join(' and ')}; winning moves ${moves.join(' and ')}`);
}

/* ---------- source helpers ---------- */
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
});

/* ---------- 4. Rival names ---------- */
section = 4;
console.log('\n4) Only the Soccer engine may rank real people');
{
  const files = walk(path.join(ROOT, 'src')).map(f => ({ rel: path.relative(ROOT, f).replaceAll('\\', '/'), text: fs.readFileSync(f, 'utf8') }));
  if (CONTROL === 'legacyreal') files.push({ rel: 'src/lib/controlCareerSport.ts', text: 'export const X = { award: { rivals: "legacy-real-era-stars" } };\n' });
  const declare = /rivals\s*:\s*["'`]legacy-real-era-stars["'`]/;
  const declaring = files.filter(f => declare.test(stripComments(f.text))).map(f => f.rel);
  console.log(`   ${files.length} source files scanned, declared in: ${declaring.join(', ') || 'none'}`);
  check(declaring.includes('src/lib/soccerCareerEngine.ts'), 'the Soccer engine no longer declares its era stars, so this fence is reading the wrong thing');
  check(declaring.every(f => f === 'src/lib/soccerCareerEngine.ts'), `a sport other than Soccer ranks real people: ${declaring.filter(f => f !== 'src/lib/soccerCareerEngine.ts').join(', ')}`);
}

/* ---------- 5. No second copy ---------- */
section = 5;
console.log('\n5) One awards night: no second copy beside the shared one');
{
  const read = rel => stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  let engine = read('src/lib/soccerCareerEngine.ts');
  if (CONTROL === 'secondcopy') engine += '\nconst extendedRank = Math.max(11, better + 1);\n';
  const page = read('src/pages/SoccerCareer.tsx');
  const intl = read('src/components/soccer-career/InternationalPanel.tsx');
  const banned = [
    ['src/lib/soccerCareerEngine.ts', engine, /\bextendedRank\b|\btopNPCs\b|const top10 = /, 'an inline shortlist or wider ranking'],
    ['src/lib/soccerCareerEngine.ts', engine, /case "greatest_ever"|case "call_out_doubters"/, 'a hand written speech switch'],
    ['src/pages/SoccerCareer.tsx', page, /\brankEmoji\b|BALLON D'OR WINNER!/, 'an inline ceremony card'],
    ['src/pages/SoccerCareer.tsx', page, /onSpeech\("for_the_country"\)/, 'hand written speech buttons'],
    ['src/components/soccer-career/InternationalPanel.tsx', intl, /onSpeech\("for_the_country"\)/, 'hand written speech buttons'],
  ];
  for (const [rel, text, re, what] of banned) check(!re.test(text), `${rel} carries ${what} again`);
  const needed = [
    ['src/lib/soccerCareerEngine.ts', engine, /runAwardsNight</, 'the shared night'],
    ['src/lib/soccerCareerEngine.ts', engine, /settleAwardsNight\(SOCCER_BALLON_DOR/, 'the shared settle'],
    ['src/lib/soccerCareerEngine.ts', engine, /applySpeech\(SOCCER_BALLON_DOR, SOCCER_BDOR_SPEECHES/, 'the shared Ballon d\'Or speech'],
    ['src/lib/soccerCareerEngine.ts', engine, /applySpeech\(SOCCER_BALLON_DOR, SOCCER_WORLD_CUP_SPEECHES/, 'the shared tournament speech'],
    ['src/pages/SoccerCareer.tsx', page, /<AwardsNightCard/, 'the shared ceremony card'],
    ['src/pages/SoccerCareer.tsx', page, /<SpeechChoices[^>]*SOCCER_WORLD_CUP_SPEECHES/, 'the shared speech buttons'],
    ['src/components/soccer-career/InternationalPanel.tsx', intl, /<SpeechChoices[^>]*SOCCER_WORLD_CUP_SPEECHES/, 'the shared speech buttons'],
  ];
  for (const [rel, text, re, what] of needed) check(re.test(text), `${rel} no longer uses ${what}`);
  console.log(`   ${banned.length} old copies absent, ${needed.length} shared calls present`);
}

console.log('');
if (CONTROL) {
  const target = CONTROLS[CONTROL].section;
  console.log(`CONTROL ${CONTROL}: section ${target} ${failedSections.has(target) ? 'FIRED' : 'DID NOT FIRE'} (red sections: ${[...failedSections].join(', ') || 'none'})`);
  if (!failedSections.has(target)) failures += 1;
}
console.log(failures === 0 ? `simCareerAwardsNight: ALL ${checks} CHECKS PASSED` : `simCareerAwardsNight: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
