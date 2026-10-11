/* Reviewer sc-engine, Release AW part one. Never committed. SC_MODE = fleet | handoff | damage | once.
 * HEAD is the checkout (cwd), BASE is origin/release-av-int unpacked at SC_BASE. Nothing reads the network. */
import { bundle, HEAD_ROOT, BASE_ROOT, HEAD_LIBS, requestBase, requestHead, seeded, withRng, step, leafDiff, shape } from './scLib.mjs';
import { lockstep, snapshots, tally, top } from './scLock.mjs';
import { veteranPayPatches } from '../../scripts/lib/careerVeteranPay1262.mjs';

const MODE = process.env.SC_MODE || 'fleet';
const N = Number(process.env.SC_N || 300);
let bad = 0;
const fail = line => { bad++; console.log(`FAIL ${line}`); };
const ok = line => console.log(`ok   ${line}`);
const hold = (cond, line) => (cond ? ok(line) : fail(line));

const baseB = await bundle(BASE_ROOT);
const headB = await bundle(HEAD_ROOT, { extra: HEAD_LIBS });
const invB = await bundle(HEAD_ROOT, { patches: veteranPayPatches(), extra: HEAD_LIBS });
const invOffersB = await bundle(HEAD_ROOT, { patches: veteranPayPatches(['offers']), extra: HEAD_LIBS });
const invTalksB = await bundle(HEAD_ROOT, { patches: veteranPayPatches(['talks']), extra: HEAD_LIBS });
const BASE = { name: 'base', E: baseB.soccer, request: requestBase };
const HEAD = { name: 'head', E: headB.soccer, request: requestHead };
const INV = { name: 'head, both conditions out', E: invB.soccer, request: requestHead };
const INVO = { name: 'head, offers condition out', E: invOffersB.soccer, request: requestHead };
const INVT = { name: 'head, talks condition out', E: invTalksB.soccer, request: requestHead };
console.log(`mode ${MODE}, N ${N}, base ${BASE_ROOT}, head ${HEAD_ROOT}`);
hold(typeof baseB.soccer.requestTransferDecision === 'undefined' && typeof headB.soccer.requestTransferDecision === 'function',
  'the two bundles are really two trees (only the head has requestTransferDecision)');

if (MODE === 'fleet') {
  const first = { head: new Map(), invo: new Map(), invt: new Map() };
  const byAge = new Map(), alive = new Map();
  let complete = 0, refErrors = 0, invEqual = 0, minAge = 99, headDiverged = 0, requests = 0, seasons = 0, rowBreaks = 0;
  const invMiss = [], young = [];
  const FROM = Number(process.env.SC_FROM || 1);
  console.log(`seeds ${FROM} to ${FROM + N - 1}`);
  for (let seed = FROM; seed < FROM + N; seed++) {
    const ages = new Set();
    const rows = lockstep(seed, [BASE, INV, HEAD, INVO, INVT], { reload: seed % 2 === 1, onFrame: (s, k, d, phase) => {
      ages.add(s.age);
      if (phase === 'transfer_window' && s.transferSituation?.type === 'request_result') requests++;
      if (phase === 'transfer_window' && s.phase === 'playing' && s.transferSituation === null) requests += 0;
    } });
    const [b, inv, head, invo, invt] = rows;
    if (b.error) { refErrors++; if (refErrors <= 3) console.log(`  reference error seed ${seed}: ${b.error}`); }
    if (b.state?.retired) complete++;
    for (const a of ages) tally(alive, a);
    seasons += b.state?.seasons?.length ?? 0;
    const senior = (b.state?.seasons ?? []).filter(r => r.type === 'playing');
    for (let i = 1; i < senior.length; i++) if (senior[i].year !== senior[i - 1].year + 1 || senior[i].age !== senior[i - 1].age + 1) rowBreaks++;
    if (!inv.diverged && !inv.error) invEqual++; else if (invMiss.length < 5) invMiss.push(`seed ${seed}: ${inv.error ?? JSON.stringify(inv.diverged)}`);
    if (head.error && !head.diverged) fail(`head threw where the base did not, seed ${seed}: ${head.error}`);
    if (head.diverged) {
      headDiverged++; minAge = Math.min(minAge, head.diverged.age); tally(byAge, head.diverged.age);
      tally(first.head, `${head.diverged.phase}: ${shape(head.diverged.paths)}`);
      if (head.diverged.age < 30 && young.length < 5) young.push(`seed ${seed} ${JSON.stringify(head.diverged)}`);
    }
    if (invo.diverged) tally(first.invo, `${invo.diverged.phase}: ${shape(invo.diverged.paths)}`);
    if (invt.diverged) tally(first.invt, `${invt.diverged.phase}: ${shape(invt.diverged.paths)}`);
  }
  console.log(`fleet: ${N} careers (odd seeds reload the save after every press), ${complete} played to retirement, ${seasons} season rows, ${refErrors} reference errors`);
  hold(complete >= N * 0.95, `at least 95 percent of the base careers play to retirement (${complete} of ${N})`);
  hold(invEqual === N, `head with the two conditions out is byte equal to the base at every press, save and draw count: ${invEqual} of ${N}`);
  for (const line of invMiss) console.log(`  ${line}`);
  hold(headDiverged > N * 0.3, `the head really moves careers: ${headDiverged} of ${N} leave the base somewhere`);
  hold(minAge >= 30, `no career leaves the base before age 30 (youngest first move at ${minAge})`);
  for (const line of young) console.log(`  ${line}`);
  console.log('first move of the head, by age (age | careers that reached it | first moved here):');
  let cum = 0;
  for (const age of [...alive.keys()].sort((a, b) => a - b)) { cum += byAge.get(age) ?? 0; console.log(`    ${age} | ${alive.get(age)} | ${byAge.get(age) ?? 0} | cumulative ${cum}`); }
  console.log(`where the head first moves (phase the press left: leaves that differ):\n${top(first.head, 25)}`);
  console.log(`with only the offers condition out, what still moves first:\n${top(first.invo, 12)}`);
  console.log(`with only the talks condition out, what still moves first:\n${top(first.invt, 12)}`);
  hold(first.invo.size > 0 && first.invt.size > 0, 'each half of the inverse is needed on its own (both half inverses still leave the base)');
  hold(rowBreaks === 0, `senior rows of every base career run year by year and age by age (${rowBreaks} breaks): the receipts of the new cards rely on it`);
  console.log(`request results seen on the reference: ${requests}`);
}

if (MODE === 'handoff') {
  /* Saves the base wrote, loaded by the head: each plays on for 60 presses beside the base. */
  const cats = new Map();
  const row = cat => { if (!cats.has(cat)) cats.set(cat, { n: 0, invEqual: 0, headErr: 0, headYoungMove: 0, headMoved: 0, baseErr: 0 }); return cats.get(cat); };
  const samples = [];
  for (let seed = 1; seed <= N; seed++) {
    const snap = snapshots(seed, BASE);
    for (const sn of snap.list) {
      const r = row(sn.cat); r.n++;
      if (sn.cat === 'retired') {
        const out = [BASE, HEAD].map(a => { try {
          const s = a.E.repairCareer(JSON.parse(sn.serial)); const clubs = a.E.FALLBACK_CLUBS;
          return JSON.stringify([s, a.E.dismissSummary(s, clubs), a.E.dismissNewspaper(s), a.E.choosePostRetirement(s, 'retire', clubs), a.E.choosePostRetirement(s, 'pundit', clubs)]);
        } catch (e) { return `THREW ${e.message}`; } });
        if (out[0] === out[1] && !out[0].startsWith('THREW')) r.invEqual++; else { r.headErr++; if (samples.length < 6) samples.push(`retired seed ${seed}: ${out[1].slice(0, 160)}`); }
        continue;
      }
      const [b, inv, head] = lockstep(seed, [BASE, INV, HEAD], { from: sn.serial, k0: sn.k, skip: sn.draws, steps: 60, reload: seed % 3 === 0 });
      if (b.error) r.baseErr++;
      if (!inv.diverged && !inv.error) r.invEqual++; else if (samples.length < 6) samples.push(`${sn.cat} seed ${seed} age ${sn.age}: ${inv.error ?? JSON.stringify(inv.diverged)}`);
      if (head.error && !head.diverged) { r.headErr++; if (samples.length < 6) samples.push(`${sn.cat} seed ${seed} head threw: ${head.error}`); }
      if (head.diverged) { r.headMoved++; if (head.diverged.age < 30) { r.headYoungMove++; if (samples.length < 6) samples.push(`${sn.cat} seed ${seed} head moved young: ${JSON.stringify(head.diverged)}`); } }
    }
  }
  console.log('category | saves | head with both conditions out equal to base | base errors | head threw | head moved | head moved under 30');
  let n = 0, eq = 0, err = 0, young = 0;
  for (const [cat, r] of [...cats.entries()].sort()) {
    console.log(`    ${cat} | ${r.n} | ${r.invEqual} | ${r.baseErr} | ${r.headErr} | ${r.headMoved} | ${r.headYoungMove}`);
    n += r.n; eq += r.invEqual; err += r.headErr; young += r.headYoungMove;
  }
  for (const line of samples) console.log(`  ${line}`);
  hold(n > N * 5, `enough old saves were made (${n})`);
  hold(eq === n, `every old save of the base plays 60 presses on the head (both conditions out) byte equal to the base: ${eq} of ${n}`);
  hold(err === 0, `the plain head never throws on an old save of the base (${err})`);
  hold(young === 0, `the plain head never leaves the base on an old save before age 30 (${young})`);
  for (const need of ['between', 'vet31', 'loan', 'retired', 'mid:newspaper', 'mid:transfer_window', 'mid:random_events']) hold((cats.get(need)?.n ?? 0) > 0, `category ${need} was covered (${cats.get(need)?.n ?? 0})`);
}

if (MODE === 'damage') {
  /* Each new save field damaged on an old save: no throw, and no effect on anything but the field itself. */
  const VALUES = { nul: null, zero: 0, text: 'x', yes: true, list: [], empty: {}, v2: { version: 2 }, v1bare: { version: 1 },
    proto: { version: 1, priority: 'minutes', context: null, result: 7 }, deep: { version: 1, year: 'a', sourceCount: -1, sourceYear: {}, sourceAge: [], announcedAge: 1e400, club: '', sourcePhase: 'playing' } };
  const FIELDS = (process.env.SC_FIELDS || 'transferBrief,farewellSeason,internationalReturn,agentReview').split(',');
  const L = headB;
  const readers = s => [() => L.farewell.readSoccerFarewell(s), () => L.farewell.farewellEligibility(s), () => L.farewell.farewellSeasonComplete(s),
    () => L.soccer.announceFarewellSeason(s, L.soccer.FALLBACK_CLUBS), () => L.agent.readAgentReview(s), () => L.agent.agentReviewEligibility(s),
    () => L.agent.changeCareerAgent(s, 'shark'), () => L.intl.readInternationalReturn(s), () => L.intl.internationalReturnEligibility(s),
    () => L.intl.makeInternationallyAvailable(s), () => L.brief.readTransferBrief(s, L.soccer.projectLeagueApps), () => L.brief.setTransferBrief(s, 'minutes'),
    () => L.brief.setTransferBrief(s, null), () => L.soccer.transferBriefPreview(s, L.soccer.FALLBACK_CLUBS), () => L.brief.transferBriefResult(s, L.soccer.projectLeagueApps),
    () => L.soccer.requestTransferDecision(s, L.soccer.FALLBACK_CLUBS), () => L.soccer.manualRetire(s)];
  let runs = 0, threw = 0, moved = 0, readerThrows = 0; const reasons = new Map(), samples = [];
  for (let seed = 1; seed <= N; seed++) {
    for (const sn of snapshots(seed, BASE).list) {
      if (sn.cat === 'retired' || sn.cat.startsWith('mid30') || sn.cat === 'tw34') continue;
      for (const field of FIELDS) for (const [vn, value] of Object.entries(VALUES)) {
        const damaged = JSON.stringify({ ...JSON.parse(sn.serial), [field]: value });
        runs++;
        const [clean, dmg] = lockstep(seed, [{ ...HEAD, name: 'clean' }, { ...HEAD, name: 'damaged', from: damaged, strip: field }], { from: sn.serial, k0: sn.k, skip: sn.draws, steps: 30 });
        if (dmg.error && !clean.error) { threw++; if (samples.length < 8) samples.push(`${sn.cat} ${field}=${vn} seed ${seed}: threw ${dmg.error}`); }
        if (dmg.diverged) { moved++; if (samples.length < 8) samples.push(`${sn.cat} ${field}=${vn} seed ${seed}: moved ${JSON.stringify(dmg.diverged)}`); }
        const s = L.soccer.repairCareer(JSON.parse(damaged));
        for (const [i, fn] of readers(s).entries()) { try { withRng(seeded(seed), fn); } catch (e) { readerThrows++; if (samples.length < 8) samples.push(`reader ${i} on ${sn.cat} ${field}=${vn}: ${e.message}`); } }
        if (sn.cat === 'play30' || sn.cat === 'between') {
          const note = field === 'farewellSeason' ? L.farewell.farewellEligibility(s).reason : field === 'agentReview' ? L.agent.agentReviewEligibility({ ...s, agentId: 'cousin' }).reason
            : field === 'internationalReturn' ? L.intl.internationalReturnEligibility(s).reason : 'brief: ' + String(L.soccer.transferBriefPreview(s, L.soccer.FALLBACK_CLUBS).eligible);
          tally(reasons, `${field}=${vn} at ${sn.cat}: ${note}`);
        }
      }
    }
  }
  for (const line of samples) console.log(`  ${line}`);
  hold(runs > 500, `enough damaged saves were played (${runs}, 30 presses each)`);
  hold(threw === 0, `a damaged new field never makes the engine throw (${threw})`);
  hold(moved === 0, `a damaged new field never changes anything else in the save (${moved})`);
  hold(readerThrows === 0, `no reader, eligibility or action of the four new parts throws on a damaged field (${readerThrows})`);
  console.log(`what the cards say on a damaged field (count, case):\n${top(reasons, 60)}`);
}

if (MODE === "once") { const { runOnce } = await import("./scOnce.mjs"); runOnce({ N, headB, invOffersB, HEAD, hold }); }
console.log(bad ? `sc-engine probe ${MODE}: RED, ${bad} failed` : `sc-engine probe ${MODE}: green`);
process.exit(bad ? 1 : 0);
