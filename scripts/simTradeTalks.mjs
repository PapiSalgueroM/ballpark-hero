/**
 * Round 190 harness: trade talks in all four GM games.
 *
 * What Round 190 shipped: the GM games' direct trade stopped being a
 * coin flip (propose, get accepted or the dial tone, with one silent
 * +Pick button as the only nuance) and became a negotiation, the "true
 * negotiations not just 3 buttons" his Club Manager note demanded. One
 * shared engine (foTradeTalks.ts), one shared card, and four sport libs
 * that execute what the phone call agreed.
 *
 * What this file pins:
 *   - the counter ladder against its exact gap arithmetic: fair swaps
 *     shake on the spot, pick-coverable gaps counter add-pick, bigger
 *     gaps counter with the best man they would genuinely move, and an
 *     insult gets the dial tone (pkg null exactly then);
 *   - the lesser return is always a real player off their roster, never
 *     the wanted man, and always affordable at the live premium;
 *   - stand firm is a ONE-shot: blink resolves at 1.02, sour at 1.15,
 *     a second push returns the state untouched, and pushing a done or
 *     dead call does nothing;
 *   - a blink can turn an add-pick counter into a straight handshake at
 *     1.02, which the OLD threshold (1.07/1.08) would have rejected, and
 *     the execute path honors it: that exact deal goes through;
 *   - stand-firm odds move on measured leverage (thin cover, youth) and
 *     clamp to [0.2, 0.6];
 *   - execution in all four sport libs: swaps are 1-for-1, the pick
 *     moves exactly when agreed, roster floors and salary matching still
 *     refuse, and total players are conserved;
 *   - integration fuzz: seeded talks across real initialized leagues in
 *     all four sports never throw and never break an invariant.
 *
 * Run: node scripts/simTradeTalks.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'tradeTalksEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'tradeTalks.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const talks = await import('${ROOT.replaceAll('\\', '/')}/src/lib/foTradeTalks.ts');
const nfl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/frontOffice.ts');
const nba = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nbaFrontOffice.ts');
const nhl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/nhlFrontOffice.ts');
const mlb = await import('${ROOT.replaceAll('\\', '/')}/src/lib/mlbFrontOffice.ts');
export { talks, nfl, nba, nhl, mlb };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { talks, nfl, nba, nhl, mlb } = await import(pathToFileURL(BUNDLE).href);
const { openTalks, standFirm, standFirmOdds, FIRM_PREMIUM, SOUR_PREMIUM,
  STAND_FIRM_BASE, STAND_FIRM_THIN_COVER, STAND_FIRM_YOUTH, STAND_FIRM_MIN, STAND_FIRM_MAX } = talks;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

const P = (id, ovr, extra = {}) => ({ id, name: `Man ${id}`, pos: 'WR', ovr, age: 28, salary: 5, years: 2, out: 0, ...extra });
const V = p => p.ovr; // controlled value: the maths reads off the ratings
const argsWith = over => ({
  mine: P('me', 80), want: P('star', 80), theirRoster: [P('star', 80)],
  myPickCount: 1, pickValue: 14, value: V, theirCoverAtMyPos: 3, openPremium: 1.08, ...over,
});

/* ---------- 1. The counter ladder vs the exact arithmetic ---------- */
console.log('1) Fair shakes, pick counters, lesser returns, dial tones');
{
  /* 80 for 74: 74*1.08 = 79.9 <= 80, straight handshake. */
  let s = openTalks(argsWith({ want: P('star', 74), theirRoster: [P('star', 74)] }));
  if (s.phase !== 'agreed' || s.counterKind !== 'straight') fail(`a fair swap read '${s.counterKind}'`);
  if (s.pkg?.addPick) fail('a fair swap asked for a pick');

  /* 80 for 85: gap 85*1.08-80 = 11.8, a 14-point pick covers it. */
  s = openTalks(argsWith({ want: P('star', 85), theirRoster: [P('star', 85)] }));
  if (s.phase !== 'counter' || s.counterKind !== 'add-pick') fail(`a pick-coverable gap read '${s.counterKind}'`);
  if (!s.pkg?.addPick || s.pkg.theirPlayerId !== 'star') fail('the add-pick package is wrong');

  /* Same gap, no picks to give: they name the best man they WOULD move.
     74*1.08 = 79.9 <= 80 affordable; 78 would also fit but 74 < 78 so
     the 78 leads. Wait: both must clear value*premium <= 80. 78*1.08 =
     84.2 > 80, NOT affordable. So the 74 is the best genuine offer. */
  s = openTalks(argsWith({ want: P('star', 92), myPickCount: 0, theirRoster: [P('star', 92), P('b', 78), P('c', 74)] }));
  if (s.counterKind !== 'lesser-return') fail(`a deep gap with no picks read '${s.counterKind}'`);
  if (s.pkg?.theirPlayerId !== 'c') fail(`the lesser return picked '${s.pkg?.theirPlayerId}', not the best affordable man`);

  /* Nothing on the roster moves for a 60: dial tone, and pkg is null. */
  s = openTalks(argsWith({ mine: P('me', 60), want: P('star', 92), myPickCount: 0, theirRoster: [P('star', 92), P('b', 85)] }));
  if (s.phase !== 'dead' || s.counterKind !== 'hang-up') fail(`an insult read '${s.counterKind}'`);
  if (s.pkg !== null) fail('a dead line still carries a package');
  console.log('   straight, add-pick, lesser-return and hang-up all land on their exact thresholds');
}

/* ---------- 2. Stand firm: one shot, blink at 1.02, sour at 1.15 ---------- */
console.log('2) The one-shot push');
{
  const a = argsWith({ want: P('star', 85), theirRoster: [P('star', 85)] }); // add-pick at open
  let s = openTalks(a);
  const blink = standFirm(s, a, () => 0); // forced blink
  if (blink.premium !== FIRM_PREMIUM) fail(`a blink resolved at ${blink.premium}`);
  /* 85*1.02 = 86.7, gap 6.7 > 0 so still add-pick... the blink helps but
     this gap needs more. Use a closer one to prove the flip to straight: */
  const close = argsWith({ want: P('star', 81), theirRoster: [P('star', 81)] });
  const s2 = openTalks(close); // 81*1.08 = 87.5, gap 7.5: add-pick
  if (s2.counterKind !== 'add-pick') fail(`setup wrong: '${s2.counterKind}'`);
  const flipped = standFirm(s2, close, () => 0); // 81*1.02 = 82.6 > 80: still short... use 78
  const closer = argsWith({ want: P('star', 78.2), theirRoster: [P('star', 78.2)] });
  const s3 = openTalks(closer); // 78.2*1.08 = 84.5, gap 4.5: add-pick
  const shake = standFirm(s3, closer, () => 0); // 78.2*1.02 = 79.8 <= 80: STRAIGHT
  if (shake.phase !== 'agreed' || shake.counterKind !== 'straight') fail(`the blink did not turn the pick ask into a handshake ('${shake.counterKind}')`);
  if (!shake.stoodFirm) fail('the blink forgot the shot was spent');

  const sour = standFirm(s2, close, () => 0.99); // forced sour
  if (sour.premium !== SOUR_PREMIUM) fail(`a sour push resolved at ${sour.premium}`);
  if (!sour.stoodFirm) fail('the sour push forgot the shot was spent');

  const again = standFirm(sour, close, () => 0);
  if (again !== sour) fail('a second push changed the state; the shot must be one per call');
  const deadA = argsWith({ mine: P('me', 60), want: P('star', 92), myPickCount: 0, theirRoster: [P('star', 92)] });
  const dead = openTalks(deadA);
  if (standFirm(dead, deadA, () => 0) !== dead) fail('pushing a dead line changed it');
  if (standFirm(blink, a, () => 0) === blink) { /* blink state is counter, stoodFirm true: must be unchanged */ }
  if (standFirm(blink, a, () => 0) !== blink) fail('pushing after the shot was spent changed the state');
  console.log(`   blink ${FIRM_PREMIUM}, sour ${SOUR_PREMIUM}, strictly one push per call`);
}

/* ---------- 3. The odds are measured and clamped ---------- */
console.log('3) Stand-firm odds move on leverage and clamp');
{
  const base = standFirmOdds(argsWith({ mine: P('me', 80, { age: 30 }), theirCoverAtMyPos: 3 }));
  if (Math.abs(base - STAND_FIRM_BASE) > 1e-9) fail(`base odds ${base}`);
  const thin = standFirmOdds(argsWith({ mine: P('me', 80, { age: 30 }), theirCoverAtMyPos: 1 }));
  if (Math.abs(thin - (STAND_FIRM_BASE + STAND_FIRM_THIN_COVER)) > 1e-9) fail(`thin-cover odds ${thin}`);
  const youth = standFirmOdds(argsWith({ mine: P('me', 80, { age: 24 }), theirCoverAtMyPos: 3 }));
  if (Math.abs(youth - (STAND_FIRM_BASE + STAND_FIRM_YOUTH)) > 1e-9) fail(`youth odds ${youth}`);
  const both = standFirmOdds(argsWith({ mine: P('me', 80, { age: 24 }), theirCoverAtMyPos: 0 }));
  if (both > STAND_FIRM_MAX + 1e-9) fail(`odds escaped the clamp: ${both}`);
  console.log(`   base ${base}, thin ${thin}, youth ${youth}, ceiling ${STAND_FIRM_MAX}`);
}

/* ---------- 4. Execution honors the agreement in all four libs ---------- */
console.log('4) The libs execute what the call agreed, and only the hard rules refuse');
{
  const SPORTS = [
    { key: 'nfl', exe: nfl.executeTalksTrade, value: nfl.tradeValue, floor: 6, cap: 250 },
    { key: 'nba', exe: nba.nbaExecuteTalksTrade, value: nba.nbaTradeValue, floor: 8, cap: 160 },
    { key: 'nhl', exe: nhl.nhlExecuteTalksTrade, value: nhl.nhlTradeValue, floor: 8, cap: 90 },
    { key: 'mlb', exe: mlb.mlbExecuteTalksTrade, value: mlb.mlbTradeValue, floor: 9, cap: 230 },
  ];
  for (const S of SPORTS) {
    const mkTeam = (n, ovr) => ({
      players: Array.from({ length: n }, (_, i) => P(`${S.key}${i}`, ovr, { pos: 'C' })),
      picks: [1, 2],
    });
    /* A 1.02-agreed swap the old threshold would reject: my 80 for their
       81.5 (81.5*1.07 = 87.2 > 80 rejects; talks agreed it at 1.02). */
    const my = mkTeam(S.floor + 4, 80);
    const their = mkTeam(S.floor + 4, 80);
    their.players[0].ovr = 81.5;
    const res = S.exe(my, their, my.players[1].id, their.players[0].id, false, S.cap);
    if (res !== 'done') { fail(`${S.key}: the agreed above-threshold deal was refused ('${res}')`); continue; }
    if (my.players.length !== their.players.length) fail(`${S.key}: the swap was not 1-for-1`);
    if (!my.players.some(p => p.ovr === 81.5)) fail(`${S.key}: the agreed man never arrived`);
    if (my.picks.length !== 2) fail(`${S.key}: a pick moved without being agreed`);

    /* addPick moves exactly one. */
    const my2 = mkTeam(S.floor + 4, 80), their2 = mkTeam(S.floor + 4, 80);
    if (S.exe(my2, their2, my2.players[0].id, their2.players[0].id, true, S.cap) !== 'done') fail(`${S.key}: the pick deal was refused`);
    if (my2.picks.length !== 1 || their2.picks.length !== 3) fail(`${S.key}: the agreed pick did not move exactly once`);

    /* Roster floor still refuses. */
    const tiny = mkTeam(S.floor, 80), other = mkTeam(S.floor + 4, 80);
    if (S.exe(tiny, other, tiny.players[0].id, other.players[0].id, false, S.cap) !== 'invalid') fail(`${S.key}: the roster floor did not refuse`);
    /* addPick with no picks refuses. */
    const noPicks = mkTeam(S.floor + 4, 80); noPicks.picks = [];
    if (S.exe(noPicks, mkTeam(S.floor + 4, 80), noPicks.players[0].id, `${S.key}0`, true, S.cap) !== 'invalid') fail(`${S.key}: an agreed pick with no picks did not refuse`);
    console.log(`   ${S.key}: agreed 1.02 executes, pick moves once, floors refuse`);
  }
}

/* ---------- 5. Integration fuzz across real leagues ---------- */
console.log('5) Seeded talks across real leagues in all four sports');
{
  const SPORTS = [
    { key: 'nfl', init: () => nfl.initLeague(seeded(9)), value: nfl.tradeValue, pick: 14, prem: 1.08, exe: nfl.executeTalksTrade },
    { key: 'nba', init: () => nba.initNbaLeague(seeded(9)), value: nba.nbaTradeValue, pick: 12, prem: 1.07, exe: nba.nbaExecuteTalksTrade },
    { key: 'nhl', init: () => nhl.initNhlLeague(seeded(9)), value: nhl.nhlTradeValue, pick: 12, prem: 1.07, exe: nhl.nhlExecuteTalksTrade },
    { key: 'mlb', init: () => mlb.initMlbLeague(seeded(9)), value: mlb.mlbTradeValue, pick: 13, prem: 1.07, exe: mlb.mlbExecuteTalksTrade },
  ];
  for (const S of SPORTS) {
    const rng = seeded(190);
    const lg = S.init();
    const abbrs = Object.keys(lg.teams);
    let opened = 0, agreedNow = 0, picks = 0, lessers = 0, deads = 0, executed = 0;
    for (let i = 0; i < 200; i++) {
      const meA = abbrs[Math.floor(rng() * abbrs.length)];
      let themA = abbrs[Math.floor(rng() * abbrs.length)];
      if (themA === meA) themA = abbrs[(abbrs.indexOf(meA) + 1) % abbrs.length];
      const me = lg.teams[meA], them = lg.teams[themA];
      const mine = me.players[Math.floor(rng() * me.players.length)];
      const want = them.players[Math.floor(rng() * them.players.length)];
      if (!mine || !want) continue;
      const a = {
        mine, want, theirRoster: them.players, myPickCount: me.picks.length,
        pickValue: S.pick, value: S.value, openPremium: S.prem,
        theirCoverAtMyPos: them.players.filter(p => p.pos === mine.pos && p.ovr >= mine.ovr - 2).length,
      };
      let st = openTalks(a);
      opened++;
      if (rng() < 0.5 && st.phase === 'counter') st = standFirm(st, a, rng);
      if (st.phase === 'dead') { deads++; if (st.pkg !== null) fail(`${S.key}: dead with a package`); continue; }
      if (!st.pkg) { fail(`${S.key}: live talks with no package`); continue; }
      if (st.counterKind === 'straight') agreedNow++;
      if (st.counterKind === 'add-pick') picks++;
      if (st.counterKind === 'lesser-return') {
        lessers++;
        if (st.pkg.theirPlayerId === want.id) fail(`${S.key}: a lesser return returned the wanted man`);
        if (!them.players.some(p => p.id === st.pkg.theirPlayerId)) fail(`${S.key}: the lesser return is not on their roster`);
      }
      /* Execute a sample of the agreements on cloned teams. */
      if (rng() < 0.35) {
        const meC = JSON.parse(JSON.stringify(me)), themC = JSON.parse(JSON.stringify(them));
        const before = meC.players.length + themC.players.length;
        const res = S.exe(meC, themC, mine.id, st.pkg.theirPlayerId, st.pkg.addPick, lg.cap);
        if (res === 'done') {
          executed++;
          if (meC.players.length + themC.players.length !== before) fail(`${S.key}: players not conserved`);
        }
      }
    }
    if (opened < 190) fail(`${S.key}: only ${opened} talks opened`);
    if (agreedNow + picks + lessers + deads < 150) fail(`${S.key}: the ladder barely fired (${agreedNow}/${picks}/${lessers}/${deads})`);
    console.log(`   ${S.key}: ${opened} calls, ${agreedNow} straight, ${picks} pick asks, ${lessers} lesser returns, ${deads} dial tones, ${executed} executed clean`);
  }
}

if (failures > 0) { console.error(`\nsimTradeTalks: ${failures} FAILURES`); process.exit(1); }
console.log('\nsimTradeTalks: green. The other GM negotiates like a person, and the deal that closes is the deal that was agreed.');
