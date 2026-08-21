/**
 * Round 193 harness: release clauses on my own renewals, and the contracts
 * desk that was never on the wall.
 *
 * What Round 193 shipped, both halves of CM-7's open line "release clauses
 * on MY OWN contract renewals":
 *  - renewalTermsWithClause: 88 percent of the wage in exchange for an exit
 *    door at 1.5x sell value TODAY, the bottom of the buy-side clause range
 *    releaseClauseOf has used since Round 71.
 *  - The clause LIVES: generateIncomingBids hunts clauses first, the trigger
 *    chance follows the bargain ratio, a met clause cannot be rejected,
 *    blocking cannot kill it, and an unanswered one executes itself on
 *    deadline day through the real acceptBid path.
 *  - A plain renewal deletes the clause, which is the counter-move.
 *  - AND the mount fix this round surfaced: ContractsCard was built in
 *    Round 105 and never rendered anywhere, so renewals were unreachable
 *    for 88 rounds. The mount itself is proven by the playReleaseClause
 *    browser walk; this file pins the engine.
 *
 * Statistical sections use n=400 draws per ratio. Binomial sd at the three
 * expected rates: p=0.06 sd 0.0119, p=0.36 sd 0.024, p=0.75 sd 0.0217, so
 * the +-0.10 acceptance bands sit at 4.2 to 8.4 sigma. A red here means
 * the trigger formula changed, not noise.
 *
 * Run: node scripts/simReleaseClause.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/rcEntry.mjs';
const BUNDLE = '/tmp/rc.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(BUNDLE);
const {
  startCareer, playNextEntry, renewalTerms, renewalTermsWithClause,
  renewContract, renewContractWithClause, expiringPlayers, sellValue,
  generateIncomingBids, rejectBid, acceptBid, setTransferStatus,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const round1 = n => Math.round(n * 10) / 10;

/* ---------- 1. The clause deal's arithmetic, exactly ---------- */
console.log('1) The clause renewal: 88 percent of the wage, exit at 1.5x value');
{
  const s = startCareer('Newcastle United');
  let checked = 0;
  for (const p of s.squad) {
    const plain = renewalTerms(p);
    const wc = renewalTermsWithClause(p);
    if (wc.years !== plain.years) fail(`${p.name}: clause deal changed the years (${wc.years} vs ${plain.years})`);
    if (wc.wage !== Math.max(1, Math.round(plain.wage * 0.88))) fail(`${p.name}: clause wage ${wc.wage} is not 88 percent of ${plain.wage}`);
    if (wc.wage >= plain.wage && plain.wage > 8) fail(`${p.name}: the clause deal is not actually cheaper (${wc.wage} vs ${plain.wage})`);
    if (wc.fee !== Math.max(0.1, round1(wc.wage * wc.years * 0.045))) fail(`${p.name}: clause fee ${wc.fee} not derived from the discounted wage`);
    if (wc.clause !== Math.max(0.5, round1(sellValue(p) * 1.5))) fail(`${p.name}: clause ${wc.clause} is not 1.5x his sell value ${sellValue(p)}`);
    checked += 1;
  }
  if (checked < 14) fail(`only ${checked} players checked, the squad looks wrong`);
}

/* ---------- 2. Signing it, deleting it ---------- */
console.log('2) The clause renewal writes the door; a plain renewal deletes it');
{
  let s = startCareer('Newcastle United');
  s.budget = 500;
  const target = expiringPlayers(s)[0] ?? s.squad[0];
  const wc = renewalTermsWithClause(target);
  const before = target.morale;
  const signed = renewContractWithClause(s, target.id);
  if (!signed) { fail('the clause renewal refused a 500m budget'); }
  else {
    const p2 = signed.squad.find(x => x.id === target.id);
    if (p2.releaseClause !== wc.clause) fail(`clause on the player is ${p2.releaseClause}, terms said ${wc.clause}`);
    if (p2.wage !== wc.wage || p2.contractYears !== wc.years) fail('the clause renewal did not apply its own terms');
    if (p2.morale !== Math.min(99, before + 9)) fail(`morale moved ${before} to ${p2.morale}, expected +9 capped`);
    if (round1(s.budget - signed.budget) !== wc.fee) fail(`fee charged ${round1(s.budget - signed.budget)}, terms said ${wc.fee}`);
    /* The counter-move: a plain renewal deletes the door at full price. */
    const cleaned = renewContract(signed, target.id);
    if (!cleaned) fail('the plain renewal refused');
    else {
      const p3 = cleaned.squad.find(x => x.id === target.id);
      if (p3.releaseClause !== undefined) fail(`the plain renewal left the clause standing at ${p3.releaseClause}`);
      if (JSON.stringify(p3).includes('releaseClause')) fail('the deleted clause still serializes into the save');
    }
  }
}

/* ---------- 3. The trigger rate follows the bargain ---------- */
console.log('3) Fresh clause rare, caught clause a third of windows, bargain hunted (n=400 each)');
{
  const base = startCareer('Newcastle United');
  const target = [...base.squad].sort((a, b) => b.rating - a.rating)[0];
  const value = sellValue(target);
  for (const [ratio, lo, hi] of [[0.67, 0.012, 0.16], [1.0, 0.26, 0.46], [1.5, 0.65, 0.85]]) {
    let hits = 0;
    for (let i = 0; i < 400; i++) {
      const s = structuredClone(base);
      const p = s.squad.find(x => x.id === target.id);
      p.releaseClause = round1(value / ratio);
      generateIncomingBids(s, false);
      const bid = (s.incomingBids ?? []).find(b => b.playerId === target.id && b.clauseMet);
      if (bid) {
        hits += 1;
        if (bid.offer !== p.releaseClause) fail(`clause bid offers ${bid.offer}, the clause is ${p.releaseClause}`);
        if (bid.rival) fail('a clause bid invented a bidding rival; the clause IS the price');
        if (bid.status !== 'open') fail(`a fresh clause bid arrived ${bid.status}`);
      }
    }
    const rate = hits / 400;
    if (rate < lo || rate > hi) fail(`ratio ${ratio}: trigger rate ${rate.toFixed(3)} outside [${lo}, ${hi}]`);
    console.log(`   ratio ${ratio}: ${(rate * 100).toFixed(1)} percent of window opens`);
  }
}

/* ---------- 4. No clause, no clause bids, ever ---------- */
console.log('4) A squad with no clauses never sees a clauseMet bid (60 windows)');
{
  const base = startCareer('Newcastle United');
  for (let i = 0; i < 60; i++) {
    const s = structuredClone(base);
    generateIncomingBids(s, false);
    if ((s.incomingBids ?? []).some(b => b.clauseMet)) fail('a clauseMet bid appeared with no clause in the squad');
  }
}

/* ---------- 5. Reject impossible, block useless, accept exact ---------- */
console.log('5) A met clause cannot be rejected or blocked, and pays to the decimal');
{
  const s = startCareer('Newcastle United');
  s.transferWindow = 'summer';
  const p = [...s.squad].sort((a, b) => b.rating - a.rating)[0];
  p.releaseClause = round1(sellValue(p) * 0.8);
  s.incomingBids = [{ playerId: p.id, playerName: p.name, club: 'Real Madrid', offer: p.releaseClause, status: 'open', clauseMet: true }];
  const rejected = rejectBid(s, p.id);
  if (rejected !== s) fail('rejectBid did something to a met clause');
  if (!(rejected.incomingBids ?? []).some(b => b.playerId === p.id && b.clauseMet)) fail('the met clause left the table on a reject attempt');
  /* Blocking kills a plain bid but never a clause bid. */
  s.incomingBids.push({ playerId: s.squad.find(x => x.id !== p.id).id, playerName: 'Other', club: 'Arsenal', offer: 10, status: 'open' });
  const otherId = s.incomingBids[1].playerId;
  let blocked = setTransferStatus(s, p.id, 'blocked');
  if (!(blocked.incomingBids ?? []).some(b => b.playerId === p.id && b.clauseMet)) fail('blocking the player killed the met clause');
  blocked = setTransferStatus(blocked, otherId, 'blocked');
  if ((blocked.incomingBids ?? []).some(b => b.playerId === otherId)) fail('blocking failed to kill a PLAIN bid, the old rule broke');
  /* Accept pays exactly the clause. */
  const before = blocked.budget;
  const sold = acceptBid(blocked, p.id);
  if (!sold) fail('accepting the met clause refused');
  else {
    if (round1(sold.budget - before) !== p.releaseClause) fail(`the sale banked ${round1(sold.budget - before)}, the clause is ${p.releaseClause}`);
    if (sold.squad.some(x => x.id === p.id)) fail('the sold player is still in the squad');
  }
  /* And a blocked player still ATTRACTS clause bids: the door ignores the wall. */
  const base2 = startCareer('Newcastle United');
  const star = [...base2.squad].sort((a, b) => b.rating - a.rating)[0];
  let attracted = 0;
  for (let i = 0; i < 40; i++) {
    const s2 = structuredClone(base2);
    const st = s2.squad.find(x => x.id === star.id);
    st.releaseClause = round1(sellValue(st) / 1.5);
    st.transferStatus = 'blocked';
    generateIncomingBids(s2, false);
    if ((s2.incomingBids ?? []).some(b => b.playerId === star.id && b.clauseMet)) attracted += 1;
  }
  if (attracted === 0) fail('40 windows and a blocked bargain clause was never hunted; blocking is beating the clause');
}

/* ---------- 6. Deadline day executes the unanswered clause ---------- */
console.log('6) Ignore the phone and the door opens itself on deadline day');
{
  let s = startCareer('Newcastle United');
  s.budget = 100;
  /* Walk to the first window so the deadline machinery is real. */
  let guard = 0;
  while (s.transferWindow === null && guard < 60) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  if (s.transferWindow === null) fail('never reached a transfer window in 60 entries');
  else {
    const p = [...s.squad].sort((a, b) => b.rating - a.rating)[0];
    p.releaseClause = round1(sellValue(p) * 0.8);
    s.windowWeeksLeft = 1;
    s.incomingBids = [{ playerId: p.id, playerName: p.name, club: 'Real Madrid', offer: p.releaseClause, status: 'open', clauseMet: true }];
    let hops = 0;
    while (s.transferWindow !== null && hops < 8) {
      hops++;
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
    }
    if (s.transferWindow !== null) fail('the window never closed');
    if (s.squad.some(x => x.id === p.id)) fail('deadline day passed and the met clause did not execute');
    /* Budget delta is contaminated by Round 171 gate receipts from the match
       weeks played on the way to the deadline, so the exact-fee assertion
       reads the transfer ledger instead: the out entry is the net fee. */
    const ledger = (s.seasonSignings ?? []).find(e => e.dir === 'out' && e.name === p.name);
    if (!ledger) fail('the deadline sale never reached the transfer ledger');
    else if (ledger.fee !== p.releaseClause) fail(`the ledger says ${ledger.fee}, the clause was ${p.releaseClause}`);
    if (!(s.aiHeadlines ?? []).some(h => h.includes('trigger the') && h.includes(p.name))) fail('no deadline-day clause headline in the news');
  }
}

/* ---------- 7. The squad floor still holds, honestly ---------- */
console.log('7) The one thing that stops a clause is the squad floor, and it makes the news');
{
  let s = startCareer('Newcastle United');
  let guard = 0;
  while (s.transferWindow === null && guard < 60) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  if (s.transferWindow === null) fail('never reached a window for the floor test');
  else {
    /* The last goalkeeper cannot leave (canLeaveSquad), whatever was signed. */
    const gks = s.squad.filter(x => x.position === 'GK');
    const keeper = gks[0];
    for (const extra of gks.slice(1)) extra.position = 'CB';
    keeper.releaseClause = round1(sellValue(keeper) * 0.8);
    s.windowWeeksLeft = 1;
    s.incomingBids = [{ playerId: keeper.id, playerName: keeper.name, club: 'Real Madrid', offer: keeper.releaseClause, status: 'open', clauseMet: true }];
    let hops = 0;
    while (s.transferWindow !== null && hops < 8) {
      hops++;
      const r = playNextEntry(s, { skipHalftime: true });
      s = r.state;
    }
    if (!s.squad.some(x => x.id === keeper.id)) fail('the last goalkeeper was sold through the floor');
    if (!(s.aiHeadlines ?? []).some(h => h.includes('collapsed on deadline day'))) fail('the collapsed clause move never made the news');
  }
}

/* ---------- 8. Copy discipline ---------- */
console.log('8) No em or en dash in any clause string');
{
  const DASHES = /[\u2013\u2014]/; /* by codepoint, the simEras convention */
  const s = startCareer('Newcastle United');
  const p = s.squad[0];
  p.releaseClause = 10;
  s.transferWindow = 'summer';
  s.windowWeeksLeft = 1;
  s.incomingBids = [{ playerId: p.id, playerName: p.name, club: 'Real Madrid', offer: 10, status: 'open', clauseMet: true }];
  let st = s;
  let hops = 0;
  while (st.transferWindow !== null && hops < 8) {
    hops++;
    const r = playNextEntry(st, { skipHalftime: true });
    st = r.state;
  }
  for (const h of st.aiHeadlines ?? []) {
    if (DASHES.test(h)) fail(`a dash reached the news: "${h}"`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simReleaseClause: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simReleaseClause: green. The exit door is real, priced, hunted, and honestly escapable only at full wage.');
