import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

export async function qualifySoccerSegundaCup({ root, out, entry, bundle, module, prepare, preparation }) {
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const json = value => JSON.parse(JSON.stringify(value));
  const { engine: E, codec: S, cup: C } = module;
  function boundary(cup) {
    const values = [];
    for (const league of ['Segunda Division', 'La Liga']) for (const year of [2025, 2026, 2027]) {
      const actual = cup.cupAssociation('Andorra', league, year), expected = year === 2025 ? 'Andorra' : 'Spain';
      assert.equal(actual, expected, 'SC_SEGUNDA_CUP_2026_BOUNDARY ' + league + ' ' + year);
      values.push({ country: 'Andorra', league, year, association: actual });
    }
    assert.equal(cup.cupAssociation('Andorra', 'Segunda Division'), 'Andorra');
    return values;
  }
  const direct = boundary(C), observerBundle = path.join(out, 'cup-observer.mjs');
  const cupFile = path.join(root, 'src/lib/soccerCareerCup.ts'), actualSource = await fs.readFile(cupFile, 'utf8');
  const before = '  return x && x.leagues.includes(league) && (x.from === undefined || (Number.isSafeInteger(year) && year! >= x.from)) ? x.association : country;';
  const after = [
    '  const association = x && x.leagues.includes(league) && (x.from === undefined || (Number.isSafeInteger(year) && year! >= x.from)) ? x.association : country;',
    '  const receipt = (globalThis as unknown as { __SC_SEGUNDA_CUP_OBSERVER__?: unknown[] }).__SC_SEGUNDA_CUP_OBSERVER__;',
    '  if (receipt) receipt.push({ country, league, year, association, stack: new Error().stack });',
    '  return association;',
  ].join('\n');
  assert.equal(actualSource.split(before).length - 1, 1);
  const observedSource = actualSource.replace(before, after);
  assert.equal(observedSource.replace(after, before), actualSource);
  await build({ entryPoints: [entry], outfile: observerBundle, bundle: true, format: 'esm', platform: 'node',
    alias: { '@': path.join(root, 'src') }, logLevel: 'error', plugins: [{
      name: 'read-only-cup-call-observer',
      setup(builder) { builder.onLoad({ filter: /soccerCareerCup\.ts$/ }, args =>
        args.path === cupFile ? { contents: observedSource, loader: 'ts', resolveDir: path.dirname(cupFile) } : undefined); },
    }] });
  const observed = await prepare('import separate cup observer bundle', 7301, () => import(pathToFileURL(observerBundle).href), false);
  const advanced = [];
  for (const year of [2026, 2027]) {
    const setup = await prepare('declared ' + year + ' first-team setup', 7600 + year, () => {
      const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
      const start = E.initCareer('Cup Boundary ' + year, 'Spain', 'CM', '2020s', stats, 70, year - 2, E.FALLBACK_CLUBS, null, 90);
      const youth = E.advanceYouthYear(json(start), E.FALLBACK_CLUBS);
      assert.equal(youth.seasons.at(-1).year, year - 1);
      assert(youth.seasons.every(row => row.clubCountry === 'Spain'));
      const club = E.FALLBACK_CLUBS.find(row => row.id === 'cm-fc-andorra'); assert(club);
      const offer = { club: json(club), contractYears: 3, wage: 7000, transferFee: 0 };
      const signed = E.repairCareer(E.acceptOffer(json(youth), offer));
      assert.equal(signed.currentClub, 'FC Andorra'); assert.equal(signed.currentClubCountry, 'Andorra');
      assert.equal(signed.phase, 'playing'); assert.equal(signed.matchFixBanned, 0); assert.equal(signed.prisonSeasons, 0);
      return { start, youth, declaredOffer: offer, signed };
    });
    const preparedRaw = S.serializeSoccerCareerSave(setup.signed);
    const input = S.parseSoccerCareerSave(preparedRaw); assert(S.isSoccerCareerSave(input));
    const attempts = []; let normal = null, selectedSeed = null, normalStage = null;
    for (let seed = 1; seed <= 128; seed += 1) {
      const label = 'actual unobserved ' + year + ' advanced season seed ' + seed;
      const played = await prepare(label, seed, () => E.advanceProSeason(json(input), E.FALLBACK_CLUBS));
      const candidate = played.seasons.at(-1);
      assert.equal(candidate.year, year); assert.equal(candidate.club, 'FC Andorra'); assert.equal(candidate.type, 'playing');
      attempts.push({ seed, label, apps: candidate.apps, wonCup: candidate.domesticCup, namedCup: candidate.cupRun?.cup ?? null });
      if (candidate.apps > 0 && candidate.domesticCup && candidate.cupRun?.cup === 'Copa del Rey') { normal = played; selectedSeed = seed; normalStage = label; break; }
    }
    assert(normal, 'Bounded declared reachability search must produce a real cup-winning season, not a rate or sample-quality claim');
    const calls = [], previousReceipt = globalThis.__SC_SEGUNDA_CUP_OBSERVER__;
    globalThis.__SC_SEGUNDA_CUP_OBSERVER__ = calls;
    let observedResult;
    try {
      observedResult = await prepare('actual observed ' + year + ' advanced season', selectedSeed,
        () => observed.engine.advanceProSeason(json(input), observed.engine.FALLBACK_CLUBS));
    } finally {
      if (previousReceipt === undefined) delete globalThis.__SC_SEGUNDA_CUP_OBSERVER__;
      else globalThis.__SC_SEGUNDA_CUP_OBSERVER__ = previousReceipt;
    }
    assert.equal(S.serializeSoccerCareerSave(observedResult), S.serializeSoccerCareerSave(normal), 'Observer cannot change any saved outcome');
    const row = normal.seasons.at(-1);
    assert.equal(row.year, year); assert.equal(row.type, 'playing'); assert.equal(row.club, 'FC Andorra');
    assert.equal(row.clubCountry, 'Andorra'); assert(row.apps > 0, 'Actual full season path, not a skipped year');
    assert.equal(row.cupRun?.cup, 'Copa del Rey'); assert.deepEqual(C.readCupRun(row), row.cupRun);
    assert.equal(normal.phone.world.cups['La Liga'], 'FC Andorra', 'The actual Spanish cup winner includes the lower-division player club');
    const decodedResult = S.parseSoccerCareerSave(S.serializeSoccerCareerSave(normal));
    assert(S.isSoccerCareerSave(decodedResult)); assert.deepEqual(decodedResult, json(normal), 'Complete actual advanced result survives the real codec');
    for (const caller of ['seasonCupAssociation', 'generateSeasonStats', 'cupAssociationOf']) {
      const matched = calls.filter(call => new RegExp('\\b' + caller + '\\d*\\b').test(call.stack ?? ''));
      assert(matched.length > 0, 'Actual caller must execute: ' + caller);
      assert(matched.every(call => call.year === year), 'Every actual ' + caller + ' call forwards the played year');
      if (caller !== 'cupAssociationOf') assert(matched.some(call => call.country === 'Andorra' && call.association === 'Spain'));
    }
    const observedStage = 'actual observed ' + year + ' advanced season';
    const normalTape = preparation.stages.find(stage => stage.label === normalStage).draws;
    const observerTape = preparation.stages.find(stage => stage.label === observedStage).draws;
    assert.deepEqual(observerTape.map(draw => draw.value), normalTape.map(draw => draw.value), 'Observer preserves the whole actual main random tape');
    advanced.push({ year, setup, input: json(input), preparedRaw, attempts, selectedSeed,
      mainTapes: { normal: normalTape, observer: observerTape }, result: json(normal), resultBytes: S.serializeSoccerCareerSave(normal), row,
      observerResult: json(observedResult), callerReceipts: calls, stageLabels: { normal: normalStage, observed: observedStage },
      scope: 'Declared first-team signing after a Spain academy prefix, then real advanceProSeason. The phone callback receipt proves its year forwarding for actual era entrants; no FC Andorra background-entrant claim is inferred.' });
  }
  const actualBundle = await fs.readFile(bundle, 'utf8');
  const objects = actualBundle.match(/Andorra:\s*\{\s*leagues:\s*\["Segunda Division",\s*"La Liga"\],\s*association:\s*"Spain",\s*from:\s*2026\s*\}/g) ?? [];
  assert.equal(objects.length, 1, 'Unique actual compiled Andorra temporal row');
  const oldRow = objects[0], newRow = oldRow.replace(/from:\s*2026/, 'from: 2027');
  const control = actualBundle.replace(oldRow, newRow); assert.notEqual(control, actualBundle);
  const restored = control.replace(newRow, oldRow); assert.equal(restored, actualBundle, 'Whole compiled-bundle inverse exact');
  const controlFile = path.join(out, 'cup-boundary-control.mjs'), restoredFile = path.join(out, 'cup-boundary-restored.mjs');
  await fs.writeFile(controlFile, control, { flag: 'wx' }); await fs.writeFile(restoredFile, restored, { flag: 'wx' });
  const negative = await prepare('import copied actual boundary control', 7301, () => import(pathToFileURL(controlFile).href), false);
  let owned = null;
  try { boundary(negative.cup); } catch (error) { owned = error; }
  assert(owned instanceof assert.AssertionError); assert(owned.message.includes('SC_SEGUNDA_CUP_2026_BOUNDARY'));
  assert.equal(owned.actual, 'Andorra'); assert.equal(owned.expected, 'Spain');
  const restoredModule = await prepare('import byte-restored boundary bundle', 7301, () => import(pathToFileURL(restoredFile).href), false);
  assert.deepEqual(boundary(restoredModule.cup), direct);
  const result = { status: 'admitted', direct, advanced, observation: { sourceBefore: before, sourceAfter: after,
    sourceWholeInverseExact: true, observerSavedFramesExact: true, mainTapesComparedByStage: true },
    control: { before: oldRow, after: newRow, changed: true, wholeInverseExact: true, error: String(owned),
      actual: owned.actual, expected: owned.expected }, scope: 'QA-only boundary and real engine-season proof. Primary reference bundle and production source stay unchanged.' };
  const file = 'cup-runtime.json'; await fs.writeFile(path.join(out, file), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  return { file, sha256: sha(await fs.readFile(path.join(out, file))), bundles: Object.fromEntries(await Promise.all(
    [observerBundle, controlFile, restoredFile].map(async file => [path.basename(file), sha(await fs.readFile(file))]))) };
}
