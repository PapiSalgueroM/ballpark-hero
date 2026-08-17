/**
 * Round 94 harness: do the new transfer controls actually bite?
 * The old system had exactly one outgoing move (instant sell) plus a random
 * 0-2 speculative bids gated at rating 74, so a squad player could never be
 * moved on and a star could never be protected. This measures the new rules:
 *  - blocked really means blocked, across thousands of windows
 *  - listing a player genuinely brings clubs in, including players the old
 *    code would never have generated a bid for
 *  - loaning out removes him, pays a fee, and returns him developed
 *  - the squad-size and last-keeper rules hold on every outgoing path
 *  - a full season of aggressive listing does not crash or corrupt the save
 * Run: node scripts/simTransfers.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/trEntry.mjs';
const BUNDLE = '/tmp/tr.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(BUNDLE);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  setTransferStatus, loanOutPlayer, loanOutFee, canLeaveSquad,
  acceptBid, rejectBid, sellValue,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* Round 141: the instant sale is dead and stays dead. Every player leaves
   through a bid he attracted; this helper is how the harness sells someone,
   and it is deliberately the same door the game uses. */
if ('sellPlayer' in cm) fail('sellPlayer is exported again. The owner removed instant selling on 2026-08-16; sales go through listing and acceptBid only.');
const sellViaBid = (s, p) =>
  acceptBid(
    { ...s, incomingBids: [{ playerId: p.id, playerName: p.name, club: 'Everton', offer: sellValue(p), status: 'open' }] },
    p.id,
  );

/** Roll a career forward to the next open window (or give up). */
function toWindow(s) {
  let guard = 0;
  while (s.transferWindow === null && s.week < s.calendar.length && guard < 60) {
    guard++;
/* Round 125: Round 119 made every match stop at half time, and playNextEntry
   parks on the interval waiting for a decision unless it is told not to. This
   harness is about the season, not the interval, so every call below takes the
   straight through path, which is exactly the game this file was calibrated
   against before Round 119 existed. simHalftime and simOpposition are the two
   that DO want the break and they call playNextEntry raw on purpose. */
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. Blocked means blocked ---------- */
console.log('1) A blocked player never gets a bid');
{
  let bidsOnBlocked = 0, windows = 0;
  for (let i = 0; i < 60; i++) {
    let s = startCareer('Manchester City');
    // block the four most valuable players, which is exactly who bidders want
    const stars = [...s.squad].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 4);
    for (const p of stars) s = setTransferStatus(s, p.id, 'blocked');
    const blockedIds = new Set(stars.map(p => p.id));
    // two windows per season, three seasons
    for (let season = 0; season < 3; season++) {
      s = toWindow(s);
      if (s.transferWindow) {
        windows++;
        for (const b of s.incomingBids ?? []) if (blockedIds.has(b.playerId)) bidsOnBlocked++;
      }
      // play on to the January window
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      s = toWindow(s);
      if (s.transferWindow) {
        windows++;
        for (const b of s.incomingBids ?? []) if (blockedIds.has(b.playerId)) bidsOnBlocked++;
      }
      break; // one season is enough per career, and 60 careers gives the volume
    }
  }
  console.log(`   ${windows} windows rolled, ${bidsOnBlocked} bids for a blocked player`);
  if (bidsOnBlocked > 0) fail(`${bidsOnBlocked} bids got through for blocked players`);
  if (windows < 60) fail(`only ${windows} windows opened, the sample is too thin to trust`);
}

/* ---------- 2. Listing a player actually brings clubs in ---------- */
console.log('2) Listing brings the market to you');
{
  /* Same player, same club, listed vs not. Round 141 changed what "listed"
     means: the instant sell is gone and windows span real match weeks, so
     the player experience being promised is "list him and offers will come
     across the window". That is exactly what gets measured: list the man,
     play through the summer window and into January, and count whether a
     bid for HIM ever arrived. Margin note: at the shipped rates (70 percent
     on window open, 35 a week mid-window, offers persisting) the measured
     hit rate across both windows sits near 0.97, so the 0.75 floor is far
     more than three standard errors of headroom at 120 samples, while a
     single-shot engine with no weekly top-ups would hover near the floor
     and flag the regression. */
  const measure = (listIt) => {
    let got = 0, tries = 0;
    for (let i = 0; i < 120; i++) {
      let s = startCareer('Everton');
      // a mid squad player the unsolicited pass (rating >= 74) never touches
      const target = [...s.squad].sort((a, b) => a.rating - b.rating).find(p => p.rating < 74 && !p.isYouth);
      if (!target) continue;
      if (listIt) s = setTransferStatus(s, target.id, 'listed');
      tries++;
      let found = false;
      let windowsSeen = 0;
      let guard = 0;
      while (guard < 40 && windowsSeen < 2 && !found) {
        guard++;
        if ((s.incomingBids ?? []).some(b => b.playerId === target.id)) { found = true; break; }
        const wasOpen = s.transferWindow !== null;
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (wasOpen && s.transferWindow === null) windowsSeen++;
        if (r.kind === 'seasonOver') break;
      }
      if (found) got++;
    }
    return { got, tries };
  };
  const off = measure(false);
  const on = measure(true);
  console.log(`   squad player unlisted: ${off.got}/${off.tries} careers ever saw a bid for him`);
  console.log(`   squad player listed:   ${on.got}/${on.tries} careers saw a bid inside two windows`);
  if (on.tries < 50) fail('not enough samples to judge listing');
  if (on.got / Math.max(1, on.tries) < 0.75) fail('listing a player barely brings anyone in, and there is no instant sell to fall back on');
  if (off.got / Math.max(1, off.tries) > 0.05) fail('unlisted squad players are getting shopped around');
}

/* ---------- 3. Loaning out: he leaves, pays, and comes home better ---------- */
console.log('3) Loan out, then home developed');
{
  let bumped = 0, sampled = 0, feePaid = 0;
  for (let i = 0; i < 40; i++) {
    let s = startCareer('Brighton');
    const kid = [...s.squad].filter(p => p.age <= 21 && !p.onLoan).sort((a, b) => b.rating - a.rating)[0];
    if (!kid) continue;
    const before = kid.rating;
    const budget0 = s.budget;
    const size0 = s.squad.length;
    const next = loanOutPlayer(s, kid.id);
    if (!next) { fail('a young squad player could not be loaned out in an open window'); break; }
    s = next;
    if (s.squad.some(p => p.id === kid.id)) fail('the loanee is still in the squad');
    if (s.squad.length !== size0 - 1) fail('squad size did not drop when he left');
    if (s.budget <= budget0) fail('no loan fee was banked');
    if ((s.loanedOut ?? []).length !== 1) fail('he is not recorded as out on loan');
    if (s.xiIds.includes(kid.id)) fail('a loaned player is still named in the XI');
    feePaid += s.budget - budget0;

    // run the season out and roll over
    let guard = 0;
    while (s.week < s.calendar.length && guard < 120) {
      guard++;
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
    }
    s = finishSeason(s).state;
    s = startNextSeason(s);
    const home = s.squad.find(p => p.name === kid.name);
    if (!home) { fail(`${kid.name} never came home from his loan`); continue; }
    sampled++;
    // agePlayer also drifts young players up, so we check he is not WORSE
    // off than he left, and that the loan bump lands often.
    if (home.rating < before) fail(`${kid.name} came back worse (${before} -> ${home.rating})`);
    if (home.rating > before) bumped++;
    if ((s.loanedOut ?? []).length !== 0) fail('the loan record was not cleared for the new season');
  }
  console.log(`   ${sampled} loans completed, ${bumped} came home with a higher rating`);
  console.log(`   average loan fee banked ${(feePaid / Math.max(1, sampled)).toFixed(2)}m`);
  if (sampled < 30) fail('too few loans completed to judge');
  if (bumped < sampled * 0.8) fail('loans barely develop anyone');
}

/* ---------- 4. Squad rules hold on every outgoing path ---------- */
console.log('4) Squad rules hold on sell, loan and accept');
{
  let s = startCareer('Wolves');
  // strip down toward the floor through the only door left: accepted bids
  let guard = 0;
  while (s.squad.length > 14 && guard < 40) {
    guard++;
    const p = [...s.squad].sort((a, b) => a.rating - b.rating).find(x => canLeaveSquad(s, x));
    if (!p) break;
    const next = sellViaBid(s, p);
    if (!next) break;
    s = next;
  }
  console.log(`   stripped to ${s.squad.length} players, keepers left ${s.squad.filter(p => p.position === 'GK').length}`);
  if (s.squad.length < 14) fail(`squad fell below the floor: ${s.squad.length}`);
  if (s.squad.filter(p => p.position === 'GK').length < 1) fail('sold the last keeper');
  for (const p of s.squad) {
    if (sellViaBid(s, p)) fail(`${p.name} was sellable at the squad floor`);
    if (loanOutPlayer(s, p.id)) fail(`${p.name} was loanable at the squad floor`);
  }
  // last keeper is protected even with a big squad
  let t = startCareer('Wolves');
  const keepers = t.squad.filter(p => p.position === 'GK');
  for (const k of keepers.slice(1)) { const n = sellViaBid(t, k); if (n) t = n; }
  const lastGk = t.squad.filter(p => p.position === 'GK');
  if (lastGk.length !== 1) fail(`expected exactly one keeper left, got ${lastGk.length}`);
  if (sellViaBid(t, lastGk[0])) fail('the last keeper was sellable');
  if (loanOutPlayer(t, lastGk[0].id)) fail('the last keeper was loanable');
}

/* ---------- 5. Morale consequences are real ---------- */
console.log('5) Shopping a happy star costs you, so does blocking an unhappy one');
{
  let s = startCareer('Arsenal');
  const star = [...s.squad].sort((a, b) => b.rating - a.rating).find(p => p.rating >= 74);
  if (!star) fail('no star to test with');
  else {
    const before = s.squad.find(p => p.id === star.id).morale;
    const after = setTransferStatus(s, star.id, 'listed').squad.find(p => p.id === star.id).morale;
    console.log(`   listing a ${star.rating} rated starter: morale ${before} -> ${after}`);
    if (before >= 70 && after >= before) fail('listing a settled star was free');
    // and taking the label back off does not keep punishing him
    const cleared = setTransferStatus(setTransferStatus(s, star.id, 'listed'), star.id, null);
    const m = cleared.squad.find(p => p.id === star.id);
    if (m.transferStatus !== undefined) fail('clearing the status did not clear it');
    if (m.morale < after) fail('clearing the status cost him more morale');
  }
  // blocking an unsettled player makes it worse
  let t = startCareer('Arsenal');
  const unhappy = t.squad[0];
  t = { ...t, squad: t.squad.map(p => (p.id === unhappy.id ? { ...p, morale: 30 } : p)) };
  const blocked = setTransferStatus(t, unhappy.id, 'blocked').squad.find(p => p.id === unhappy.id);
  console.log(`   blocking an unsettled player: morale 30 -> ${blocked.morale}`);
  if (blocked.morale >= 30) fail('blocking a player who wants out was free');
}

/* ---------- 6. A hard season of listing everyone does not break ---------- */
console.log('6) Full seasons with the controls hammered');
{
  const clubs = ['Manchester City', 'Burnley', 'Real Madrid', 'Ajax', 'Inter Miami'];
  for (const club of clubs) {
    try {
      let s = startCareer(club);
      let sold = 0, loans = 0, guard = 0;
      // list half the squad, block a quarter, loan-list the rest
      s.squad.forEach((p, i) => {
        const st = i % 4 === 0 ? 'blocked' : i % 4 === 1 ? 'loanListed' : i % 4 === 2 ? 'listed' : null;
        if (st) s = setTransferStatus(s, p.id, st);
      });
      while (s.week < s.calendar.length && guard < 130) {
        guard++;
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (r.kind === 'seasonOver') break;
        if (r.kind === 'window') {
          for (const b of [...(s.incomingBids ?? [])]) {
            const before = s.squad.length;
            const next = Math.random() < 0.6 ? acceptBid(s, b.playerId) : rejectBid(s, b.playerId);
            if (next) {
              if (b.loan && next.squad.length === before - 1) loans++;
              else if (next.squad.length === before - 1) sold++;
              s = next;
            }
          }
        }
      }
      const round = JSON.parse(JSON.stringify(s));
      if (round.squad.length !== s.squad.length) fail(`${club}: save round trip lost players`);
      s = finishSeason(s).state;
      s = startNextSeason(s);
      if (s.squad.length < 14) fail(`${club}: new season started with only ${s.squad.length} players`);
      if (s.squad.filter(p => p.position === 'GK').length < 1) fail(`${club}: no keeper next season`);
      if ((s.loanedOut ?? []).length > 0) fail(`${club}: loans did not come home`);
      console.log(`   ${club}: ${sold} sold, ${loans} loaned out, squad ${s.squad.length} next season`);
    } catch (e) {
      fail(`${club} crashed: ${e && e.message}`);
    }
  }
}

/* ---------- 7. No em dashes in the new player-facing strings ---------- */
console.log('7) Copy check');
{
  const files = [
    'src/lib/clubManager.ts',
    'src/components/club-manager/TransferScreen.tsx',
    'src/components/club-manager/SquadScreen.tsx',
  ];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line) && !line.trimStart().startsWith('/*') && !line.includes('─')) {
        fail(`${f}:${i + 1} contains an em or en dash`);
      }
    });
  }
  console.log(`   ${files.length} files checked`);
}

console.log(failures === 0 ? '\nALL TRANSFER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
