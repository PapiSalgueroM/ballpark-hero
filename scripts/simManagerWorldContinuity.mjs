/* Manager persistence and private trajectories: complete retained outcomes against actual09df.
   Run remotely with MANAGER_WORLD_CONTINUITY_CONTROL=all for eleven effective copied faults.
   This does not change historical fixtures or certify unrelated historical source fences. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE, BASE_TREE, HEAD, TREE, ROOT, clone, sha, sourceHashes, writeEvidence, uniquePatch, tape, loadEngine } from './qa/managerWorldContinuityKit.mjs';

const OUT = path.resolve(process.env.MANAGER_WORLD_CONTINUITY_ARTIFACTS || '.tmp-fx/manager-world-continuity');
const CONTROL = process.env.MANAGER_WORLD_CONTINUITY_CONTROL || '';
const CORE = 'src/lib/clubManager.ts';
const LEDGER = 'src/lib/clubManagerWorldRoster.ts';
const ERAS = 'src/lib/clubManagerEras.ts';
const CONTROLS = {
  purchase: { file: CORE, from: "return loan ? state : recordActualRosterTransfer(state, player, mp.club, state.clubName, 'permanent');", to: 'return state;', fails: ['buy-job', 'year-away', 'sale', 'release'] },
  ownership: { file: LEDGER, from: "if (record && (record.owner !== club || record.status !== 'owned')) { changed = true; return false; }", to: 'if (false && record) { changed = true; return false; }', fails: ['identity', 'buy-job', 'year-away', 'sale', 'option', 'release'] },
  snapshot: { file: LEDGER, from: 'if (![...updates].some(([key, player]) => {', to: 'if (true || ![...updates].some(([key, player]) => {', fails: ['buy-job', 'year-away'] },
  stale: { file: CORE, from: "if (!held.records.some(record => record.year < year && record.status !== 'retired')) return career;", to: 'if (true) return career;', fails: ['year-away', 'sale', 'option', 'refresh'] },
  sale: { file: CORE, from: "return recordActualRosterTransfer(state, p, career.clubName, bid.club, 'permanent');", to: 'return state;', fails: ['sale'] },
  option: { file: CORE, from: "return from === 'his club' ? state : recordActualRosterTransfer(state, bought, from, state.clubName, 'permanent');", to: 'return state;', fails: ['option'] },
  release: { file: CORE, from: "return recordActualRosterTransfer(next, p, career.clubName, null, 'release');", to: 'return next;', fails: ['release'] },
  identity: { file: LEDGER, from: 'return player.name === origin.name && year - player.age === origin.birthYear;', to: 'return player.name === origin.name && player.position === origin.position && year - player.age === origin.birthYear;', fails: ['identity'] },
  seed: { file: ERAS, from: "const key = `${trajectoryEra}|${y}${seed === undefined ? '' : `|seed:${seed}`}`;", to: 'const key = `${trajectoryEra}|${y}`;', fails: ['seeded-world'] },
  draw: { file: CORE, from: "const random = keyedRng(`world-roster|${worldSeedOf(career) ?? 'legacy'}|${record.key}|${next}`);", to: 'const random = Math.random;', fails: ['refresh'] },
  entropy: { file: CORE, from: String.raw`const entropy = JSON.stringify([state.eraId, state.startYear, state.clubName,
      state.manager ? [state.manager.name, state.manager.nationality, state.manager.background, state.manager.style] : null,
      state.squad.map(p => [p.name, p.position, p.age, p.rating, p.potential]),
      [state.academy?.recruitment, state.academy?.coaching, state.academy?.facilities,
        state.academy?.prospects.map(p => [p.name, p.position, p.age, p.rating, p.potential])]]);`,
    to: 'const entropy = JSON.stringify([state.eraId, state.startYear, state.clubName, state.manager, state.squad, state.academy]);', fails: ['constructors'] },
};
if (CONTROL && CONTROL !== 'all' && !CONTROLS[CONTROL]) throw new Error(`Unknown manager control ${CONTROL}`);
const GROUPS = ['inactive', 'constructors', 'identity', 'buy-job', 'year-away', 'sale', 'option', 'release', 'refresh', 'seeded-world'];
const before = sourceHashes();
const equal = (actual, expected, message) => assert.deepEqual(clone(actual), clone(expected), message);
const fictionalPlayer = (patch = {}) => ({ id: 'recorded-forward', name: 'Recorded Forward', position: 'ST', rating: 78,
  age: 24, fitness: 90, morale: 78, injuryWeeks: 0, suspendedMatches: 0, isYouth: false,
  seasonGoals: 0, seasonAssists: 0, potential: 85, contractYears: 4, wage: 80, generated: true, ...patch });
function synthetic(player = fictionalPlayer()) {
  return { saveVersion: 3, clubName: 'Buyer Club', startYear: 2026, eraId: 'now', season: 1, squad: [player],
    budget: 100, goneNames: [], transferLog: [], history: [], pendingSummary: null };
}
function actualStart(B, club = 'Everton', era = 'now', seed = 7301) {
  const started = tape(seed, () => B.cm.startCareer(club, era));
  return { ...started.value, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
}
function offerFor(B, c, source = 'Arsenal') {
  const offer = B.cm.buildMarket(c).find(p => p.club === source && p.age < 27 && p.position !== 'GK');
  assert.ok(offer, `Actual market has a ${source} nonkeeper under27`); return offer;
}
function signedPlayer(c, name) { const p = c.squad.find(p => p.name === name); assert.ok(p, `Actual squad contains ${name}`); return p; }
function tracked(B, c, key) {
  const ledger = B.ledger.readWorldRoster(c); assert.ok(ledger, 'Actual complete ownership ledger is active');
  const record = ledger.records.find(r => r.key === key); assert.ok(record, 'Actual player has one certified ownership record'); return record;
}
function frame(frames, label, input, action, seed = 8127, forced) {
  const held = clone(input);
  const result = tape(seed, action, forced);
  frames.push({ label, input: held, inputAfter: clone(input), output: clone(result.value), draws: result.draws });
  return result.value;
}
function join(B, c, destination, frames) {
  let s = frame(frames, 'apply', c, () => B.cm.applyForJob(c, destination), 3001, 0);
  assert.ok(s, 'Actual application opens');
  for (let n = 0; n < 20 && s.jobHunt?.open?.status === 'pending'; n++) {
    const old = s;
    s = frame(frames, 'application-match', old, () => B.cm.playNextEntry(old, { skipHalftime: true, noCoach: true }), 3100 + n, 0.6).state;
  }
  assert.equal(s.jobHunt?.open?.status, 'accepted', 'Actual stored roll receives an acceptance');
  const departed = clone(s);
  const next = frame(frames, 'join-now', s, () => B.calendar.joinClubNow(s), 3201, 0.6);
  assert.ok(next, 'Accepted actual job joins now'); assert.equal(next.clubName, destination);
  return { next, departed };
}
function fullSeason(B, c, frames, seed) {
  let s = c; let complete = false;
  for (let n = 0; n < 160; n++) {
    const old = s;
    const played = frame(frames, 'actual-calendar-match', old, () => B.cm.playNextEntry(old, { skipHalftime: true, noCoach: true }), seed + n);
    s = played.state;
    if (played.kind === 'seasonOver') { complete = true; break; }
  }
  assert.ok(complete, 'Actual complete calendar reaches seasonOver');
  return frame(frames, 'finish-season', s, () => B.cm.finishSeason(s), seed + 200).state;
}
function reload(B, c, frames) {
  B.store.clear(); const input = clone(c);
  const first = frame(frames, 'save-and-first-load', input, () => {
    assert.equal(B.cm.saveCareer(input), true);
    const beforeBytes = [...B.store.entries()]; const loaded = B.cm.loadCareer(); assert.ok(loaded);
    return { input, beforeBytes, loaded, afterBytes: [...B.store.entries()] };
  });
  equal(first.loaded.worldRoster, c.worldRoster, 'First genuine loader retains complete ledger');
  assert.equal(first.loaded.worldSeed, c.worldSeed, 'First genuine loader retains seed');
  assert.equal(B.cm.saveCareer(first.loaded), true);
  const bytes = [...B.store.entries()]; const second = B.cm.loadCareer();
  assert.equal(B.cm.saveCareer(second), true); equal([...B.store.entries()], bytes, 'Second load/save is byte-exact');
  frames.push({ label: 'stable-second-reload', input: clone(first.loaded), output: clone(second), bytes }); return second;
}
function neutral(B, input) {
  const c = clone(input); B.store.clear();
  const reads = { market: B.cm.buildMarket(c), opponent: B.cm.oppRosterFor(c, 'Arsenal'), year: B.cm.worldYear(c) };
  const match = B.cm.playNextEntry(clone(c), { skipHalftime: true, noCoach: true });
  const summer = B.cm.startNextSeason(clone(c));
  assert.equal(B.cm.saveCareer(c), true); const loaded = B.cm.loadCareer();
  return { reads, match, summer, loaded, storage: [...B.store.entries()] };
}
async function arm(control) {
  const directory = path.join(OUT, control || 'healthy'); fs.mkdirSync(directory, { recursive: true });
  const A = await loadEngine({ original: true, label: `${control || 'healthy'}-original` });
  const defect = CONTROLS[control];
  const B = await loadEngine({ label: control || 'healthy', patch: defect
    ? (file, source, receipts) => file === defect.file ? uniquePatch(source, defect.from, defect.to, file, receipts) : source : undefined });
  const originalEngine = A; const currentEngine = B;
  const report = { head: HEAD, tree: TREE, base: BASE, baseTree: BASE_TREE, control, groups: [], failures: [],
    originalLoaded: A.loaded, currentLoaded: B.loaded, originalBundle: A.bundleSha256, currentBundle: B.bundleSha256,
    originalScopes: A.scopes, currentScopes: B.scopes,
    patches: B.receipts, sourceBefore: before, evidence: {}, counts: {}, measurement: null };
  async function group(id, action) {
    const observations = []; let error = null;
    try { await action(observations); } catch (caught) { error = caught; }
    report.evidence[id] = writeEvidence(directory, id, observations);
    report.groups.push({ id, passed: error === null });
    if (error) report.failures.push({ id, name: error.name, message: error.message, stack: error.stack });
    console.log(`${error ? 'FAIL' : 'PASS'} [${control || 'healthy'}] ${id}${error ? `: ${error.message}` : ''}`);
  }
  await group('inactive', async observations => {
    let pairs = 0;
    for (const [club, era] of [['Everton', 'now'], ['Barcelona', 'now'], ['Everton', 'era2010'], ['PSG', 'era2015']]) {
      for (const seed of [17, 311, 1237]) for (const malformed of [false, true]) {
        const label = `${control || 'healthy'}-inactive-${pairs}`;
        const prep = await A.fresh(label + '-prep');
        const original = await A.fresh(label + '-original'); const candidate = await B.fresh(label + '-current');
        const preparation = tape(seed, () => prep.cm.startCareer(club, era));
        const base = preparation.value;
        const input = malformed ? { ...base, worldRoster: { version: 9, records: ['held invalid data'] }, worldSeed: -1 } : base;
        const old = tape(seed + 1, () => neutral(original, input));
        const current = tape(seed + 1, () => neutral(candidate, input));
        observations.push({ club, era, seed, malformed, scopes: { preparation: label + '-prep', original: label + '-original', current: label + '-current' },
          preparation: clone(preparation), input: clone(input), original: clone(old), current: clone(current) });
        equal(current.value, old.value, 'Entire inactive AR result and saved bytes match');
        equal(current.draws, old.draws, 'Entire inactive AR action draw vector matches'); pairs++;
      }
    }
    report.counts.inactivePairs = pairs; assert.equal(pairs, 24);
  });
  await group('constructors', async observations => {
    let pairs = 0;
    for (const club of ['Everton', 'Barcelona']) for (const seed of [17, 311, 1237]) {
      const label = `${control || 'healthy'}-constructor-${pairs}`;
      const originalScope = await A.fresh(label + '-original'), currentScope = await B.fresh(label + '-current'), replayScope = await B.fresh(label + '-replay');
      const original = tape(seed, () => originalScope.cm.startCareer(club)); const current = tape(seed, () => currentScope.cm.startCareer(club));
      const again = tape(seed, () => replayScope.cm.startCareer(club));
      const clockBefore = currentScope.clock.now();
      const noise = tape(seed + 7301, () => currentScope.cm.startCareer('Real Madrid'));
      let interleaved;
      try {
        currentScope.clock.setNow(clockBefore + 86400000);
        interleaved = tape(seed, () => currentScope.cm.startCareer(club));
      } finally { currentScope.clock.setNow(clockBefore); }
      observations.push({ club, seed, scopes: { original: label + '-original', current: label + '-current', replay: label + '-replay' },
        clock: { before: clockBefore, interleaved: clockBefore + 86400000, restored: currentScope.clock.now() },
        original: clone(original), current: clone(current), again: clone(again), noise: clone(noise), interleaved: clone(interleaved) });
      pairs++;
    }
    report.counts.constructorPairs = pairs; report.counts.constructorInterleaves = pairs; assert.equal(pairs, 6);
    for (const row of observations) {
      const { original, current, again, interleaved } = row;
      assert.ok(Number.isSafeInteger(current.value.worldSeed) && current.value.worldSeed >= 0 && current.value.worldSeed <= 0xffffffff);
      equal(current.value, { ...original.value, worldSeed: current.value.worldSeed }, 'Fresh constructor changes only the declared held seed');
      equal(current.draws, original.draws, 'Fresh seed uses no extra global draw'); equal(again, current, 'Fresh seed and whole constructor replay exactly');
      assert.equal(row.clock.restored, row.clock.before, 'Each VM clock is restored after the interleaved witness');
      assert.notDeepEqual(interleaved.value.academy.candidates.map(p => p.id), current.value.academy.candidates.map(p => p.id), 'Actual constructor candidate IDs changed across the held clock and other career');
      equal(interleaved.draws, current.draws, 'Same-module interleaving retains the entire constructor draw vector');
      assert.equal(interleaved.value.worldSeed, current.value.worldSeed, 'Same-module careers and clocks do not change the saved world seed');
    }
  });
  await group('identity', observations => {
    const c = synthetic(); const input = clone(c);
    const owned = B.ledger.recordWorldRosterTransfer(c, { player: c.squad[0], from: 'Source Club', to: c.clubName, kind: 'permanent', since: 0 });
    const key = JSON.stringify(['now', 'Source Club', 'Recorded Forward', 'ST', 2002, 0]);
    const retrained = { ...owned, season: 2, squad: [{ ...owned.squad[0], age: 25, position: 'CAM', rating: 83 }] };
    const snapshot = B.ledger.snapshotWorldRosterClub(retrained, c.clubName);
    const sold = B.ledger.recordWorldRosterTransfer(snapshot, { player: snapshot.squad[0], from: c.clubName, to: 'Second Buyer', kind: 'permanent' });
    const unknown = { ...c, squad: [{ ...c.squad[0], worldRosterKey: 'unknown' }] };
    const heldUnknown = B.ledger.recordWorldRosterTransfer(unknown, { player: unknown.squad[0], from: 'Source Club', to: c.clubName, kind: 'permanent' });
    const absent = B.ledger.worldRosterClub(c, 'Source Club', c.squad);
    const source = B.ledger.worldRosterClub(sold, 'Source Club', [{ ...c.squad[0], age: 25 }]);
    observations.push({ input, owned, retrained, snapshot, sold, unknown, heldUnknown, absent, source });
    assert.equal(tracked(B, sold, key).owner, 'Second Buyer'); assert.equal(tracked(B, sold, key).origin.position, 'ST');
    assert.equal(tracked(B, sold, key).player.position, 'CAM'); assert.equal(source.length, 0, 'Original club excludes retrained identity');
    equal(c, input, 'Whole identity input is unchanged'); equal(heldUnknown, unknown); equal(absent, c.squad);
    const released = B.ledger.recordWorldRosterTransfer(sold, { player: tracked(B, sold, key).player, from: 'Second Buyer', to: null, kind: 'release' });
    const signed = B.ledger.recordWorldRosterTransfer({ ...released, clubName: 'Third Buyer' }, { player: tracked(B, released, key).player, from: null, to: 'Third Buyer', kind: 'permanent' });
    observations.push({ released, signed }); assert.equal(tracked(B, signed, key).owner, 'Third Buyer');
  });
  await group('buy-job', async frames => {
    const A = await originalEngine.fresh(`${control || 'healthy'}-buy-original`), B = await currentEngine.fresh(`${control || 'healthy'}-buy-current`);
    const originalPrelude = tape(7301, () => A.cm.startCareer('Everton', 'now'));
    const c = actualStart(B); const offer = offerFor(B, c);
    frames.push({ label: 'symmetric-original-constructor-prelude', output: clone(originalPrelude) });
    const original = tape(4021, () => A.cm.buyPlayer(clone(c), clone(offer)));
    const signed = frame(frames, 'actual-buy', c, () => B.cm.buyPlayer(c, offer), 4021); assert.ok(signed);
    const p = signedPlayer(signed, offer.name); assert.ok(p.worldRosterKey, 'Actual buy assigns permanent identity');
    const key = JSON.stringify(['now', offer.club, p.name, p.position, 2026 - p.age, 0]);
    const oldPlayer = signedPlayer(original.value, p.name); const expectedPlayer = { ...oldPlayer, worldRosterKey: key };
    const expected = { ...original.value, squad: original.value.squad.map(player => player.id === oldPlayer.id ? expectedPlayer : player),
      worldRoster: { version: 1, eraId: 'now', records: [{ key, origin: { club: offer.club, name: p.name, position: p.position, birthYear: 2026 - p.age, since: 0 }, owner: c.clubName, status: 'owned', year: 2026, player: expectedPlayer }] } };
    frames.push({ label: 'independent-original-buy', output: clone(original), expected: clone(expected) });
    equal(signed, expected, 'Actual buy preserves every original field except the declared ownership metadata');
    const destination = B.cm.applyTargets(signed).find(t => t.club !== offer.club && t.club !== c.clubName).club;
    const away = join(B, signed, destination, frames); const departing = signedPlayer(away.departed, p.name);
    equal(tracked(B, away.next, key).player, departing, 'Actual departure stores the complete played player');
    assert.equal(B.cm.worldRosterFor(away.next, offer.club).some(x => x.n === p.name), false, 'Seller never regains the player');
    assert.equal(B.cm.buildMarket(away.next).find(x => x.name === p.name)?.club, c.clubName);
    const loaded = reload(B, away.next, frames); const returned = join(B, loaded, c.clubName, frames).next;
    assert.equal(returned.squad.filter(x => x.worldRosterKey === key).length, 1, 'Actual rejoin retains one permanent player');
    assert.equal(B.cm.oppRosterFor(returned, offer.club).some(x => x.n === p.name), false);
  });
  await group('year-away', frames => {
    const c = actualStart(B); const offer = offerFor(B, c); const signed = frame(frames, 'buy-before-complete-year', c, () => B.cm.buyPlayer(c, offer));
    assert.ok(signed); const p = signedPlayer(signed, offer.name); assert.ok(p.worldRosterKey);
    const complete = fullSeason(B, signed, frames, 5001);
    const snapshot = B.ledger.snapshotWorldRosterClub(complete, complete.clubName);
    equal(tracked(B, snapshot, p.worldRosterKey).player, signedPlayer(complete, p.name), 'Complete recorded player is snapshotted before departure');
    const away = frame(frames, 'actual-next-year-job', complete, () => B.cm.startNextSeason(complete, 'Liverpool'), 5201);
    const record = tracked(B, away, p.worldRosterKey); assert.equal(record.year, 2027); assert.equal(record.owner, c.clubName);
    assert.equal(record.player.age, p.age + 1); assert.equal(B.cm.worldRosterFor(away, offer.club).some(x => x.n === p.name), false);
    assert.equal(B.cm.worldRosterFor(away, c.clubName).find(x => x.worldRosterKey === p.worldRosterKey)?.a, p.age + 1);
    const futureOffer = B.cm.buildMarket({ ...away, budget: 9999, wageCap: 9999 }).find(x => x.club === 'Arsenal' && x.worldRosterKey && x.age < 27 && x.position !== 'GK');
    assert.ok(futureOffer, 'Actual seeded future source offers a carried identity');
    const futureBuy = frame(frames, 'actual-first-seeded-source-buy', away, () => B.cm.buyPlayer({ ...away, budget: 9999, wageCap: 9999 }, futureOffer), 5301);
    assert.ok(futureBuy); assert.equal(tracked(B, futureBuy, futureOffer.worldRosterKey).owner, away.clubName);
    const second = fullSeason(B, away, frames, 5401);
    const returned = frame(frames, 'actual-second-year-rejoin', second, () => B.cm.startNextSeason(second, c.clubName), 5601);
    assert.equal(returned.season, 3); assert.equal(signedPlayer(returned, p.name).age, p.age + 2);
    assert.equal(B.cm.worldRosterFor(returned, offer.club).some(x => x.n === p.name), false);
    report.counts.completeSeasons = 2;
  });
  await group('sale', frames => {
    const c = actualStart(B); const offer = offerFor(B, c); const signed = frame(frames, 'buy-before-sale', c, () => B.cm.buyPlayer(c, offer));
    assert.ok(signed); const p = signedPlayer(signed, offer.name); assert.ok(p.worldRosterKey);
    const bid = { ...signed, incomingBids: [{ playerId: p.id, playerName: p.name, club: 'Chelsea', offer: 25, status: 'open', clauseMet: true }] };
    const sold = frame(frames, 'actual-accepted-clause-bid', bid, () => B.cm.acceptBid(bid, p.id)); assert.ok(sold);
    assert.equal(sold.budget, Math.round((bid.budget + 25) * 10) / 10);
    assert.equal(tracked(B, sold, p.worldRosterKey).owner, 'Chelsea'); equal(tracked(B, sold, p.worldRosterKey).player, p);
    assert.equal(B.cm.worldRosterFor(sold, offer.club).some(x => x.n === p.name), false);
    const next = frame(frames, 'sale-actual-next-year-job', sold, () => B.cm.startNextSeason(sold, 'Liverpool'), 6101);
    const resale = B.cm.buildMarket({ ...next, budget: 9999, wageCap: 9999 }).find(x => x.worldRosterKey === p.worldRosterKey);
    assert.ok(resale, 'Actual buyer exposes the same permanent player next year'); assert.equal(resale.club, 'Chelsea');
    const returned = frame(frames, 'actual-new-terms-purchase', next, () => B.cm.buyPlayer({ ...next, budget: 9999, wageCap: 9999 }, resale));
    assert.ok(returned); assert.equal(tracked(B, returned, p.worldRosterKey).owner, next.clubName);
    assert.equal(B.cm.worldRosterFor(returned, 'Chelsea').some(x => x.worldRosterKey === p.worldRosterKey), false);
  });
  await group('option', frames => {
    const c = actualStart(B);
    const offer = B.cm.buildMarket(c).find(p => p.age <= 23 && p.rating <= 84 && (p.value ?? p.price) <= 25 && p.position !== 'GK');
    assert.ok(offer, 'Actual market supplies a loan-eligible prospect');
    const loaned = frame(frames, 'actual-loan-in', c, () => B.cm.loanIn(c, offer)); assert.ok(loaned);
    assert.equal(loaned.worldRoster, undefined, 'Temporary loan does not claim permanent ownership');
    const p = signedPlayer(loaned, offer.name); assert.equal(p.onLoan, true);
    const destination = offer.club === 'Liverpool' ? 'Manchester City' : 'Liverpool';
    const temporaryReturn = frame(frames, 'actual-temporary-loan-return', loaned, () => B.cm.startNextSeason(loaned, destination), 7101);
    assert.equal(temporaryReturn.squad.some(x => x.name === p.name), false); assert.ok(B.cm.worldRosterFor(temporaryReturn, offer.club).some(x => x.n === p.name));
    const bought = frame(frames, 'actual-exercised-loan-option', loaned, () => B.cm.exerciseLoanOption(loaned, p.id)); assert.ok(bought);
    const held = signedPlayer(bought, p.name); assert.ok(held.worldRosterKey); assert.equal(held.onLoan, undefined);
    assert.equal(bought.budget, Math.round((loaned.budget - p.loanOptionFee) * 10) / 10);
    const away = frame(frames, 'permanent-option-next-job', bought, () => B.cm.startNextSeason(bought, destination), 7201);
    assert.equal(B.cm.worldRosterFor(away, bought.clubName).find(x => x.worldRosterKey === held.worldRosterKey)?.a, held.age + 1);
    assert.equal(B.cm.worldRosterFor(away, offer.club).some(x => x.n === held.name), false);
    const parent = actualStart(B, 'Arsenal');
    const prospect = parent.squad.find(x => x.rating >= 80 && x.age < 27 && x.position !== 'GK' && x.contractYears >= 2);
    assert.ok(prospect, 'Actual parent squad supplies an option-eligible outgoing loan');
    const outgoing = frame(frames, 'actual-outgoing-loan', parent, () => B.cm.loanOutPlayer(parent, prospect.id, 'Chelsea', 1), 7301);
    assert.ok(outgoing); assert.equal(outgoing.worldRoster, undefined, 'Outgoing temporary loan creates no permanent ownership');
    const terms = outgoing.loanedOut.find(x => x.player.id === prospect.id); assert.ok(terms?.optionFee);
    const exercised = frame(frames, 'actual-borrower-exercises-option', outgoing, () => B.cm.startNextSeason(outgoing, 'Liverpool'), 7401, 0.1);
    const permanent = B.ledger.readWorldRoster(exercised)?.records.find(x => x.player.name === prospect.name);
    assert.ok(permanent, 'Actual exercised outbound option records the complete permanent player');
    assert.equal(permanent.owner, 'Chelsea'); assert.equal(permanent.player.age, prospect.age + 1);
    assert.equal(B.cm.worldRosterFor(exercised, parent.clubName).some(x => x.n === prospect.name), false);
    assert.equal(B.cm.buildMarket(exercised).find(x => x.worldRosterKey === permanent.key)?.club, 'Chelsea');
    report.counts.exercisedOptions = 2;
  });
  await group('release', frames => {
    const c = actualStart(B); const offer = B.cm.buildMarket(c).find(p => p.rating < 76 && p.position !== 'GK' && p.age < 30);
    assert.ok(offer); const signed = frame(frames, 'buy-before-release', c, () => B.cm.buyPlayer(c, offer)); assert.ok(signed);
    const p = signedPlayer(signed, offer.name); assert.ok(p.worldRosterKey);
    const released = frame(frames, 'actual-release', signed, () => B.cm.releasePlayer(signed, p.id)); assert.ok(released);
    assert.equal(tracked(B, released, p.worldRosterKey).status, 'released'); assert.equal(tracked(B, released, p.worldRosterKey).owner, null);
    assert.equal(B.cm.worldRosterFor(released, offer.club).some(x => x.n === p.name), false);
    const next = frame(frames, 'released-player-next-job', released, () => B.cm.startNextSeason(released, 'Arsenal'), 8101);
    const free = next.freeAgents.find(x => x.name === p.name); assert.ok(free);
    assert.equal(B.cm.signFreeAgent({ ...next, budget: 9999, wageCap: 9999 }, p.name), null, 'Existing releasing-manager re-signing restriction remains');
    assert.equal(tracked(B, next, p.worldRosterKey).owner, null);
  });
  await group('refresh', observations => {
    const c = synthetic(); const owned = B.ledger.recordWorldRosterTransfer(c, { player: c.squad[0], from: 'Source Club', to: c.clubName, kind: 'permanent', since: 0 });
    const input = { ...owned, clubName: 'Liverpool', season: 2, squad: [] }; const held = clone(input);
    const first = tape(9011, () => ({ refreshed: B.cm.refreshWorldRoster(input), roster: B.cm.worldRosterFor(input, c.clubName),
      average: B.cm.worldRosterXIAvg(input, c.clubName), market: B.cm.buildMarket(input) }));
    const second = tape(9021, () => ({ refreshed: B.cm.refreshWorldRoster(input), roster: B.cm.worldRosterFor(input, c.clubName),
      average: B.cm.worldRosterXIAvg(input, c.clubName), market: B.cm.buildMarket(input) }));
    observations.push({ input: held, inputAfter: clone(input), first: clone(first), second: clone(second) });
    assert.equal(first.draws.length, 0, 'All active world reads use no global draw'); assert.equal(second.draws.length, 0);
    equal(first.value, second.value, 'Private refreshed worlds are independent of global read order'); equal(input, held, 'Complete stale input remains held');
    assert.equal(tracked(B, first.value.refreshed, owned.worldRoster.records[0].key).player.age, 25);
    const high = synthetic(fictionalPlayer({ rating: 99, potential: 99 }));
    const tagged = B.ledger.recordWorldRosterTransfer(high, { player: high.squad[0], from: 'Source Club', to: high.clubName, kind: 'permanent', since: 0 });
    const future = B.cm.refreshWorldRoster({ ...tagged, worldSeed: 7, season: 2, clubName: 'Liverpool', squad: [] });
    observations.push({ high, tagged, future }); assert.equal(tracked(B, future, tagged.worldRoster.records[0].key).player.rating, 99);
  });
  await group('seeded-world', async observations => {
    let baselinePairs = 0;
    for (const era of ['now', 'era2005', 'era2010', 'era2015', 'era2020']) for (const year of [0, 1, 5]) {
      const label = `${control || 'healthy'}-legacy-world-${era}-${year}`;
      const originalScope = await A.fresh(label + '-original'), currentScope = await B.fresh(label + '-current');
      const original = tape(9201, () => originalScope.eras.projectedWorldFor(era, year)); const current = tape(9301, () => currentScope.eras.projectedWorldFor(era, year));
      observations.push({ kind: 'whole-legacy-world', era, year, scopes: { original: label + '-original', current: label + '-current' },
        original: clone(original), current: clone(current) });
      equal(current.value, original.value, 'Entire absent-seed projected world remains original'); assert.equal(current.draws.length, 0); baselinePairs++;
    }
    report.counts.legacyWorldPairs = baselinePairs; assert.equal(baselinePairs, 15);
    const measurements = []; let rows = 0; let changed = 0;
    for (const era of ['now', 'era2010']) for (const year of [1, 5, 12]) {
      const source = B.eras.projectedWorldFor(era, 0);
      const first = tape(1, () => B.eras.projectedWorldFor(era, year, 31));
      const different = tape(2, () => B.eras.projectedWorldFor(era, year, 307));
      const again = tape(3, () => B.eras.projectedWorldFor(era, year, 31));
      observations.push({ kind: 'whole-seeded-world-A-B-A', era, year, source: clone(source), first: clone(first), different: clone(different), again: clone(again) });
      equal(first.value, again.value, 'Seed A remains byte-exact after seed B'); assert.equal(first.draws.length + different.draws.length + again.draws.length, 0);
      equal(Object.keys(first.value), Object.keys(source), 'Seeded worlds retain original club order');
      let variedClubs = 0; let changedLeaders = 0; let generated = 0; const drift = {};
      for (const [club, players] of Object.entries(first.value)) {
        assert.equal(players.length, source[club].length, 'Actual source squad size stays held');
        if (JSON.stringify(players) !== JSON.stringify(different.value[club])) variedClubs++;
        const leader = values => [...values].sort((a, b) => b.r - a.r || a.n.localeCompare(b.n))[0]?.worldRosterKey;
        if (leader(players) !== leader(different.value[club])) changedLeaders++;
        for (const p of players) {
          assert.ok(p.a >= 16 && p.a < 42 && p.r >= 40 && p.r <= 99, 'Actual seeded age/rating bounds');
          assert.ok(Number.isSafeInteger(p.potential) && p.potential >= p.r && p.potential <= 99);
          assert.ok(p.worldRosterKey, 'Actual seeded player carries stable source identity'); rows++;
          if (p.g) { generated++; continue; }
          const original = source[club].find(s => s.n === p.n && s.p === p.p); assert.ok(original);
          const delta = String(p.r - original.r); drift[delta] = (drift[delta] ?? 0) + 1;
        }
      }
      assert.ok(variedClubs > 0, 'Different valid seeds produce substantive actual world variation'); changed += variedClubs;
      measurements.push({ era, year, clubs: Object.keys(source).length, variedClubs, changedLeaders, generated, drift });
    }
    report.counts.seededRows = rows; report.measurement = measurements; assert.ok(rows > 4000 && changed > 0);
  });
  report.sourceAfter = sourceHashes(); report.sourceHeld = JSON.stringify(report.sourceAfter) === JSON.stringify(before);
  report.status = 'pending-acceptance';
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
  assert.equal(report.sourceHeld, true, 'Tracked sources remain byte-held');
  assert.deepEqual(report.groups.map(g => g.id), GROUPS, 'Every declared group executed');
  if (defect) {
    assert.equal(B.receipts.length, 1, 'Exactly one loaded compiled fault'); assert.ok(B.receipts[0].effective);
    assert.ok(report.failures.every(f => f.name === 'AssertionError'), 'Controls must fail actual assertions, never setup/import/runtime errors');
    assert.deepEqual(report.failures.map(f => f.id), defect.fails, 'Exact intended group failure identities');
    assert.equal(report.counts.inactivePairs, 24, 'Every control retains entire original inactive fleet');
    assert.equal(report.counts.constructorPairs, 6); assert.equal(report.counts.legacyWorldPairs, 15);
    report.status = 'expected-fault';
  } else { assert.equal(report.failures.length, 0, 'Healthy complete outcome groups all pass'); report.status = 'passed'; }
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
  return report;
}
const results = [];
try {
  const arms = CONTROL === 'all' ? ['', ...Object.keys(CONTROLS)] : [CONTROL];
  for (const control of arms) {
    try { results.push(await arm(control)); }
    catch (error) {
      const directory = path.join(OUT, control || 'healthy'); fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, 'acceptance-error.json'), JSON.stringify({ control, name: error.name, message: error.message, stack: error.stack }, null, 2)); throw error;
    }
  }
  const after = sourceHashes(); assert.deepEqual(after, before);
  fs.writeFileSync(path.join(OUT, 'controls.json'), JSON.stringify({ head: HEAD, tree: TREE, base: BASE, baseTree: BASE_TREE,
    controls: results.map(r => ({ control: r.control, status: r.status, failedGroups: r.failures.map(f => f.id), counts: r.counts, sourceHeld: r.sourceHeld })), sourceBefore: before, sourceAfter: after }, null, 2));
  console.log(`Manager world continuity: ${results.length} arms, ten complete groups per arm`);
  console.log('Independent actual09df inactive saves and full draw vectors held in every arm');
  console.log('Completed transactions, original source identity and actual callback receipts retained');
  console.log('Private world variation is measured, no historical fixture was re-recorded');
} catch (error) { console.error(error.stack); process.exitCode = 1; }
