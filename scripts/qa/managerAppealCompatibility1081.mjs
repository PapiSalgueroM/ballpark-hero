/* Verification only. The worker executes this against actual remote bundles. */
import assert from 'node:assert/strict';

export const COMPATIBILITY_CONTROLS = [
  { name: 'legacy', assertion: 'Legacy open appeal outcomes', from: 'item.verdictKey ?? item.id', to: 'item.verdictKey ?? `${item.id}|changed`' },
  { name: 'unicode', assertion: 'Unicode legacy save identity', from: 'h ^= key.charCodeAt(i);', to: 'h ^= key.codePointAt(i)!;' },
  { name: 'provenance', assertion: 'Only generated youth receive new keys', from: "p.isYouth === true && p.id.startsWith('youth-')", to: "p.isYouth === true || p.id.startsWith('youth-')" },
  { name: 'twins', assertion: 'Duplicate tuples keep distinct keys and player links',
    from: 'state.squad.slice(0, state.squad.indexOf(p)).filter(other => other.name === p.name && other.position === p.position && other.age === p.age).length', to: '0' },
  { name: 'tuple', assertion: 'Duplicate tuples keep distinct keys and player links',
    from: 'other.name === p.name && other.position === p.position && other.age === p.age', to: 'other.name === p.name' },
  { name: 'reissue', assertion: 'Issued key survives roster changes', from: 'const won = appealWins(item, career);',
    to: "const won = appealWins({ ...item, verdictKey: appealCard(career, p.id, 'Probe Town')?.verdictKey }, career);" },
  { name: 'key', assertion: 'Issued key survives roster changes', from: 'item.verdictKey ?? item.id', to: 'item.id' },
  { name: 'rng', assertion: 'Issued key survives roster changes', from: 'const won = appealWins(item, career);', to: 'const won = (Math.random(), appealWins(item, career));' },
  { name: 'invalid', assertion: 'Damaged verdict metadata refuses the complete desk',
    from: "(o.verdictKey === undefined || (o.kind === 'appeal' && isValidVerdictKey(o.verdictKey, o)))", to: '(true)' },
  { name: 'saved', assertion: 'New verdict metadata survives actual storage', from: 'JSON.stringify(key) === value', to: 'JSON.stringify(key) !== value' },
  { name: 'legacySaved', assertion: 'Legacy open cards survive current storage',
    from: '(o.verdictKey === undefined ||', to: "((o.verdictKey === undefined && o.kind !== 'appeal') ||" },
  { name: 'accept', assertion: 'Accept keeps the existing ban',
    from: "return close(`Accepted. ${item.playerName ?? 'He'} serves the ${plural(item.ban ?? 0, 'match')} ban.`, 'accepted');",
    to: "return close(`Accepted. ${item.playerName ?? 'He'} serves the ${plural(item.ban ?? 0, 'match')} ban.`, 'expired');" },
  { name: 'expiry', assertion: 'Next match expires the issued appeal', from: "outcome: 'expired' as const", to: "outcome: 'accepted' as const" },
  { name: 'repeat', assertion: 'Resolved appeal cannot apply twice', from: 'if (!item || item.resolved) return career;',
    to: 'if (!item) return career; if (item.resolved) return { ...career, boardConfidence: career.boardConfidence - 1 };' },
  { name: 'removed', assertion: 'Removed player closes without changing the squad',
    from: "return close('Too late to appeal. The ban stands as it was.', 'expired');",
    to: "return close('Too late to appeal. The ban stands as it was.', 'accepted');" },
  { name: 'changedBan', assertion: 'Changed ban cannot be appealed again',
    from: 'if (!p || p.suspendedMatches !== item.ban) {', to: 'if (!p) {' },
];

export function runCompatibility({ E, D, S, historicalD, baselineRows, snapshot, clone, only }) {
  assert.equal(baselineRows.length, 48, 'Compatibility uses both complete frozen first-youth arms');
  for (const arm of ['alone', 'interleaved']) assert.equal(baselineRows.filter(row => row.historicalArm === arm).length, 24, 'Each historical arm retains 24 rows');
  const rowId = row => `${row.historicalArm}/${row.id}`;
  const checks = [], records = [];
  const check = (name, body) => {
    if (only && only !== name) return;
    const first = records.length, rngBefore = clone(snapshot());
    try {
      body(name);
      assert.deepEqual(snapshot(), rngBefore, `${name}: complete case RNG holds`);
      checks.push({ name, status: 'passed', records: records.length - first, rngBefore, rngAfter: clone(snapshot()) });
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
      checks.push({ name, status: 'assertion-failed', records: records.length - first, rngBefore, rngAfter: clone(snapshot()),
        errorName: error.name, error: error.message, stack: error.stack });
    }
  };
  const compare = (name, id, before, expected, action, fixture) => {
    const input = clone(before), immutable = clone(input), rngBefore = clone(snapshot());
    const actual = action(input);
    const record = { name, id, fixture, before: immutable, inputAfter: clone(input), actual: clone(actual), expected: clone(expected),
      rngBefore, rngAfter: clone(snapshot()) };
    records.push(record);
    assert.deepEqual(input, immutable, `${name}: input remains unchanged`);
    assert.deepEqual(record.rngAfter, rngBefore, `${name}: actual call consumes no RNG`);
    assert.deepEqual(actual, expected, name);
    return actual;
  };
  const keyFor = (state, playerId) => {
    const player = state.squad.find(p => p.id === playerId);
    const earlier = state.squad.slice(0, state.squad.indexOf(player));
    const occurrence = earlier.filter(p => p.name === player.name && p.position === player.position && p.age === player.age).length;
    return JSON.stringify([1, state.season, state.week, player.name, player.position, player.age, occurrence]);
  };
  const openNew = row => {
    const before = clone(row.planted), card = D.appealCard(before, row.playerId, 'Probe Town');
    assert(card, 'Actual new appeal exists');
    before.decisions = [card, ...clone(row.open.decisions.slice(1))];
    return before;
  };
  const expectedAnswer = (before, option) => {
    const expected = clone(before), card = expected.decisions[0];
    if (option === 1) {
      expected.decisions[0] = { ...card, options: [], outcome: 'accepted',
        resolved: `Accepted. ${card.playerName} serves the ${card.ban} match${card.ban === 1 ? '' : 'es'} ban.` };
    } else {
      // The frozen old module evaluates the issued identity using the original hash.
      const won = historicalD.appealWins({ ...card, id: card.verdictKey ?? card.id }, before);
      const player = expected.squad.find(p => p.id === card.playerId);
      player.suspendedMatches = won ? 0 : card.ban + 1;
      expected.decisions[0] = { ...card, options: [], outcome: won ? 'won' : 'lost',
        resolved: won ? `Appeal won. The ban is wiped and ${player.name} is available for the next match.`
          : `Appeal lost. The panel made it ${player.suspendedMatches} matches.` };
    }
    return expected;
  };
  const answer = (name, id, before, option, expected, fixture) => compare(name, id, before, expected,
    state => D.answerDecision(state, state.decisions[0].id, option), fixture);
  const storageRoundTrip = (name, row, before, expectedFor, fixture) => {
    localStorage.clear(); E.clearCareer();
    const input = clone(before), rngBefore = clone(snapshot());
    assert.equal(E.saveCareer(before), true, name);
    const savedBytes = localStorage.getItem(E.SAVE_KEY), loaded = E.loadCareer();
    assert(loaded, name);
    assert.equal(S.activeSlot(), 1, name); assert.equal(S.switchSlot(2, loaded), true, name); assert.equal(S.activeSlot(), 2, name);
    const parkedBytes = localStorage.getItem(S.parkedKey(1));
    assert.equal(S.switchSlot(1), true, name); assert.equal(S.activeSlot(), 1, name);
    const restoredBytes = localStorage.getItem(E.SAVE_KEY), restored = E.loadCareer();
    records.push({ name, id: rowId(row), fixture, before: input,
      savedBytes, loaded: clone(loaded), parkedBytes, restoredBytes, restored: clone(restored),
      expectedSaved: clone(E.leanCareer(input)), rngBefore, rngAfter: clone(snapshot()) });
    assert.deepEqual(before, input, name); assert.deepEqual(snapshot(), rngBefore, name);
    assert.deepEqual(JSON.parse(savedBytes), E.leanCareer(input), name);
    assert.equal(parkedBytes, JSON.stringify(E.leanCareer(loaded)), name); assert.equal(restoredBytes, parkedBytes, name);
    assert.deepEqual(loaded, input, name); assert.deepEqual(restored, input, name);
    for (const [id, state] of [['loaded', loaded], ['restored', restored]]) {
      compare(name, `${rowId(row)}/${id}/read`, state, input.decisions, value => D.deskOf(value), fixture);
      for (const option of [0, 1]) answer(name, `${rowId(row)}/${id}/${option}`, state, option, expectedFor(option), fixture);
    }
  };

  check('Legacy open appeal outcomes', name => {
    assert(baselineRows.some(row => row.answers[0].after.decisions[0].outcome === 'won'), 'Frozen rows include an actual legacy win');
    assert(baselineRows.some(row => row.answers[0].after.decisions[0].outcome === 'lost'), 'Frozen rows include an actual legacy loss');
    for (const row of baselineRows) {
      assert(!Object.hasOwn(row.open.decisions[0], 'verdictKey'), 'Frozen old cards have no new key');
      for (const option of [0, 1]) {
        const expected = historicalD.answerDecision(clone(row.open), row.card.id, option);
        assert.deepEqual(expected, row.answers[option].after, 'Frozen runtime agrees with immutable historical outputs');
        answer(name, `${rowId(row)}/${option}`, row.open, option, expected, 'Unchanged actual historical open card');
      }
    }
  });
  check('Unicode legacy save identity', name => {
    for (const row of baselineRows) {
      const before = clone(row.open); before.manager.name = 'Jos\u00e9 \ud83c\udfc0 \u674e';
      for (const option of [0, 1]) answer(name, `${rowId(row)}/${option}`, before, option,
        historicalD.answerDecision(clone(before), before.decisions[0].id, option), 'Explicit Unicode manager-name variant of a legacy card');
    }
  });
  check('Only generated youth receive new keys', name => {
    for (const variant of ['actual-real', 'youth-prefix-only', 'youth-flag-only', 'signed-id', 'free-agent-id', 'academy-id', 'opaque-youth-flag']) {
      const before = clone(baselineRows[0].source);
      const player = before.squad.find(p => variant === 'youth-prefix-only' ? p.isYouth === true : p.isYouth === false);
      assert(player, 'Actual source has the requested provenance');
      if (variant === 'youth-prefix-only') player.isYouth = false;
      if (variant === 'youth-flag-only') player.isYouth = true;
      const syntheticId = { 'signed-id': 'sign-compat', 'free-agent-id': 'fa-compat', 'academy-id': 'ac-pr-compat', 'opaque-youth-flag': 'opaque-compat' }[variant];
      if (syntheticId) player.id = syntheticId;
      if (variant === 'opaque-youth-flag') player.isYouth = true;
      player.suspendedMatches = 2; player.seasonReds = 1;
      const oldCard = historicalD.appealCard(clone(before), player.id, 'Probe Town');
      const card = compare(name, variant, before, oldCard, state => D.appealCard(state, player.id, 'Probe Town'),
        syntheticId ? 'Explicit ID-prefix fixture on a cloned actual senior; not a signing or recruitment journey'
          : 'Actual roster IDs retained; explicitly planted ban and, for two variants, provenance flag');
      assert(!Object.hasOwn(card, 'verdictKey'), name);
      before.decisions = [card];
      for (const option of [0, 1]) answer(name, `${variant}/${option}`, before, option,
        historicalD.answerDecision(clone(before), card.id, option), variant);
    }
  });
  check('Duplicate tuples keep distinct keys and player links', name => {
    const before = clone(baselineRows[0].source), players = before.squad.filter(p => p.isYouth === true).slice(0, 4);
    assert.equal(players.length, 4);
    const first = players[0];
    for (const [i, player] of players.entries()) {
      player.name = first.name; player.position = i === 2 ? 'ST' : first.position;
      player.age = first.age + (i === 3 ? 1 : 0); player.suspendedMatches = 2; player.seasonReds = 1;
    }
    const keys = [], ids = [];
    for (const [i, player] of players.entries()) {
      const key = JSON.stringify([1, before.season, before.week, player.name, player.position, player.age, i === 1 ? 1 : 0]);
      const expectedCard = { ...historicalD.appealCard(clone(before), player.id, 'Probe Town'), verdictKey: key };
      const card = compare(name, `card-${i}`, before, expectedCard, state => D.appealCard(state, player.id, 'Probe Town'),
        'Four actual youth IDs; explicit same-name twins, position variant and age variant');
      keys.push(card.verdictKey); ids.push(card.playerId);
      const open = { ...clone(before), decisions: [card] };
      for (const option of [0, 1]) answer(name, `player-${i}/${option}`, open, option, expectedAnswer(open, option), 'Only this raw player ID may receive the consequence');
    }
    assert.equal(new Set(ids).size, 4, name); assert.equal(new Set(keys).size, 4, name);
  });
  check('Issued key survives roster changes', name => {
    for (const row of baselineRows) {
      const issued = openNew(row), before = clone(issued), card = before.decisions[0];
      assert.equal(card.verdictKey, keyFor(row.planted, row.playerId), name);
      const player = before.squad.find(p => p.id === row.playerId);
      player.age += 1; player.position = player.position === 'ST' ? 'CM' : 'ST'; before.squad.reverse();
      compare(name, `${rowId(row)}/read`, before, before.decisions, state => D.deskOf(state), 'Later age, position and squad-order changes; issued card is untouched');
      for (const option of [0, 1]) {
        const expected = expectedAnswer(before, option);
        assert.equal(expected.decisions[0].outcome, expectedAnswer(issued, option).decisions[0].outcome, name);
        answer(name, `${rowId(row)}/${option}`, before, option, expected, 'Answer retains the issuance key, not a recomputed current-roster key');
      }
    }
  });
  check('Damaged verdict metadata refuses the complete desk', name => {
    const original = openNew(baselineRows[0]), valid = JSON.parse(original.decisions[0].verdictKey);
    const variants = [
      ['null', null], ['number', 1], ['empty', ''], ['syntax', '{'], ['object', '{}'], ['short', JSON.stringify(valid.slice(0, 6))],
      ['long', JSON.stringify([...valid, 0])], ['version', JSON.stringify([2, ...valid.slice(1)])],
      ['noncanonical', ` ${JSON.stringify(valid)}`],
    ];
    for (const [id, at, value] of [
      ['season-zero', 1, 0], ['season-fraction', 1, 1.5], ['season-type', 1, '1'], ['week-negative', 2, -1], ['week-fraction', 2, 0.5],
      ['name-empty', 3, ''], ['name-type', 3, 3], ['position-empty', 4, ''], ['position-type', 4, 3],
      ['age-negative', 5, -1], ['age-fraction', 5, 18.5], ['occurrence-negative', 6, -1], ['occurrence-fraction', 6, 0.5],
      ['position-unknown', 4, 'UNKNOWN'], ['season-unsafe', 1, 9007199254740992], ['week-unsafe', 2, 9007199254740992],
      ['age-unsafe', 5, 9007199254740992], ['occurrence-unsafe', 6, 9007199254740992],
      ['card-season-mismatch', 1, valid[1] + 1], ['card-week-mismatch', 2, valid[2] + 1], ['card-name-mismatch', 3, `${valid[3]} changed`],
    ]) { const tuple = [...valid]; tuple[at] = value; variants.push([id, JSON.stringify(tuple)]); }
    for (const [id, value] of variants) {
      const before = clone(original); before.decisions[0].verdictKey = value;
      compare(name, `${id}/read`, before, [], state => D.deskOf(state), 'Damaged optional desk metadata; full career remains intact');
      compare(name, `${id}/pending`, before, [], state => D.pendingDecisions(state), id);
      answer(name, `${id}/answer`, before, 0, before, id);
    }
    for (const variant of ['non-youth-link', 'situation']) {
      const before = clone(original);
      if (variant === 'non-youth-link') before.decisions[0].playerId = before.squad.find(p => !p.isYouth).id;
      else before.decisions[0].kind = 'situation';
      compare(name, `${variant}/read`, before, [], state => D.deskOf(state), variant);
      answer(name, `${variant}/answer`, before, 0, before, variant);
    }
  });
  check('New verdict metadata survives actual storage', name => {
    for (const row of baselineRows.slice(0, 3)) {
      const before = openNew(row);
      assert.equal(before.decisions[0].verdictKey, keyFor(row.planted, row.playerId), name);
      storageRoundTrip(name, row, before, option => expectedAnswer(before, option),
        'Current engine save/load and empty second-slot round trip with new metadata');
    }
  });
  check('Legacy open cards survive current storage', name => {
    for (const outcome of ['won', 'lost']) {
      const row = baselineRows.find(value => value.answers[0].after.decisions[0].outcome === outcome);
      assert(row, `Retained historical ${outcome} exists`);
      assert(!Object.hasOwn(row.open.decisions[0], 'verdictKey'), name);
      storageRoundTrip(name, row, clone(row.open), option => row.answers[option].after,
        `Current engine save/load and empty second-slot round trip for retained legacy ${outcome}; both outcomes remain frozen`);
    }
  });
  check('Accept keeps the existing ban', name => {
    const before = openNew(baselineRows[0]); answer(name, 'accept', before, 1, expectedAnswer(before, 1), 'Accept an issued keyed appeal');
  });
  check('Next match expires the issued appeal', name => {
    const before = openNew(baselineRows[0]); before.week += 1;
    const expected = clone(before); historicalD.settleDecisionDesk(expected, [], 'Next Opponent');
    const input = clone(before), rngBefore = clone(snapshot()); D.settleDecisionDesk(input, [], 'Next Opponent');
    records.push({ name, id: 'settle', before, actual: clone(input), expected, rngBefore, rngAfter: clone(snapshot()) });
    assert.deepEqual(input, expected, name); assert.deepEqual(snapshot(), rngBefore, name);
    assert.equal(input.decisions.find(card => card.id === before.decisions[0].id).outcome, 'expired', name);
    compare(name, 'expired-answer', input, input,
      state => D.answerDecision(state, before.decisions[0].id, 0), 'A closed card cannot acquire a fresh consequence');
  });
  check('Resolved appeal cannot apply twice', name => {
    for (const option of [0, 1]) {
      const before = openNew(baselineRows[0]);
      const resolved = answer(name, `first/${option}`, before, option, expectedAnswer(before, option), 'First legitimate response');
      answer(name, `repeat/${option}`, resolved, option, resolved, 'Repeated response must preserve every field');
    }
  });
  check('Removed player closes without changing the squad', name => {
    const before = openNew(baselineRows[0]); before.squad = before.squad.filter(p => p.id !== before.decisions[0].playerId);
    answer(name, 'removed', before, 0, historicalD.answerDecision(clone(before), before.decisions[0].id, 0), 'Player no longer belongs to the current squad');
  });
  check('Changed ban cannot be appealed again', name => {
    for (const remaining of [0, 1, 3]) {
      const before = openNew(baselineRows[0]); before.squad.find(p => p.id === before.decisions[0].playerId).suspendedMatches = remaining;
      answer(name, `ban-${remaining}`, before, 0, historicalD.answerDecision(clone(before), before.decisions[0].id, 0), 'Ban served partly, fully or changed since issuance');
    }
  });
  assert(checks.length > 0, 'Requested compatibility check exists');
  return { checks, records };
}
