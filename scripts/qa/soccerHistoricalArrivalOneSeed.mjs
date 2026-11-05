import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const args = process.argv.slice(2);
const arg = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const blob = b => crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const plain = v => JSON.parse(JSON.stringify(v));
const write = async (file, value) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); };
const self = fileURLToPath(import.meta.url);

async function worker() {
  const seed = Number(arg('--seed')), mode = arg('--mode'), file = arg('--casefile');
  assert.equal(seed, 1, 'This packet measures exactly global seed1');
  assert(['normal', 'observer'].includes(mode) && file);
  const originalRandom = Math.random, previousObserver = globalThis.__SC_HISTORICAL_PROBE__;
  const importDraws = [], draws = [], frames = [], events = [];
  let action = 'module-import', counter = 0, current = null, E, S, R, P, T;
  const install = (initial, tape) => {
    let state = initial;
    Math.random = () => { state = state * 16807 % 2147483647; const value = (state - 1) / 2147483646; tape.push({ index: tape.length, action, value }); return value; };
  };
  const result = { kind: 'one-seed-original-public-phase-diagnostic', seed, mode, importDraws, draws, frames, transferDrawObservations: events };
  try {
    install(7301, importDraws);
    const module = await import(pathToFileURL(path.resolve(arg('--bundle'))).href);
    ({ engine: E, codec: S, reveal: R, phone: P, eras: T } = module);
    result.eraPool2010 = plain(T.getEraStars(2010));
    install(seed, draws);
    if (mode === 'observer') globalThis.__SC_HISTORICAL_PROBE__ = events;
    function snapshot(label) {
      const saved = S.serializeSoccerCareerSave(current), value = plain(current);
      assert.deepEqual(plain(S.parseSoccerCareerSave(saved)), value, 'Whole actual save roundtrip, including unknown optional data');
      const frame = { n: frames.length, action: label, drawsThrough: draws.length, year: value.seasons.at(-1).year,
        phase: value.phase, value, saved, savedSHA256: sha(saved), lastBallonDorJudged: plain(E.lastBallonDorJudged()) };
      frames.push(frame);
      assert(S.isSoccerCareerSave(S.parseSoccerCareerSave(saved)), 'Actual complete career remains readable');
      assert(!Object.hasOwn(value, 'historicalArrivals'), 'Original product has not gained future arrival state');
    }
    function step(label, fn) {
      if (++counter > 300) throw new Error('Public phase journey exceeded300 actions');
      action = label;
      const before = current ? { year: current.seasons.at(-1).year, phase: current.phase } : null;
      current = fn();
      assert(current && Array.isArray(current.seasons) && current.seasons.length);
      snapshot(label);
      return before;
    }
    const stats = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 };
    step('initCareer2005', () => E.initCareer('Historical Arrival Probe', 'Spain', 'CM', '2005-09', stats, 60, 2005, E.FALLBACK_CLUBS, null, 85));
    assert.equal(current.phase, 'youth'); assert.equal(current.seasons.at(-1).year, 2005);
    while (current.phase === 'youth') step('advanceYouthYear', () => E.advanceYouthYear(current, E.FALLBACK_CLUBS));
    assert.equal(current.phase, 'contract_offer');
    const offer = current.pendingOffers.find(o => o.isHomegrown) ?? current.pendingOffers[0];
    assert(offer, 'Actual generated first-team offer exists');
    result.firstOffer = plain(offer);
    step('acceptActualGeneratedOffer', () => E.acceptOffer(current, offer));
    for (;;) {
      const last = current.seasons.at(-1), night = current.pendingBallonDor;
      assert(last.year <= 2010, 'Do not advance a2011 season in the diagnostic');
      if (last.year === 2010 && current.phase === 'ballon_dor' && night?.year === 2010 && night.revealed === true) {
        result.stop = { reason: 'actual2010ceremony-revealed', year: last.year, phase: current.phase, nextSeasonAdvanceExecuted: false }; break;
      }
      if (last.year === 2010 && current.phase === 'playing') {
        result.stop = { reason: 'back-at-playing-before2011-without-a-current2010ceremony', year: last.year, phase: current.phase, nextSeasonAdvanceExecuted: false }; break;
      }
      if (current.retired || ['retired', 'retirement_ceremony', 'post_retirement'].includes(current.phase)) {
        result.status = 'completed-not-qualified'; result.reason = 'actual retirement before target2010'; break;
      }
      switch (current.phase) {
        case 'playing': step('advanceProSeason', () => E.advanceProSeason(current, E.FALLBACK_CLUBS)); break;
        case 'newspaper': step('dismissNewspaper', () => E.dismissNewspaper(current)); break;
        case 'season_summary': step('dismissSummary', () => E.dismissSummary(current, E.FALLBACK_CLUBS)); break;
        case 'international_debut': step('dismissDebut', () => E.dismissDebut(current, E.FALLBACK_CLUBS)); break;
        case 'world_cup': step('dismissWorldCup', () => E.dismissWorldCup(current, E.FALLBACK_CLUBS)); break;
        case 'ballon_dor':
          assert(current.pendingBallonDor, 'Actual displayed ceremony has a ballot');
          if (!current.pendingBallonDor.revealed && !current.pendingBallonDor.speech) step('revealActualBallonDorResult', () => R.revealBallonDorResult(current));
          else step('dismissBallonDor', () => E.dismissBallonDor(current, E.FALLBACK_CLUBS));
          break;
        case 'rivalry_event': step('dismissRivalryEvent', () => E.dismissRivalryEvent(current, E.FALLBACK_CLUBS)); break;
        case 'social_media_action': step('dismissSocialMediaPhase', () => E.dismissSocialMediaPhase(current, E.FALLBACK_CLUBS)); break;
        case 'random_events':
          assert(current.pendingEvents.length && current.pendingEvents[0].choices.length);
          step('applyActualEventChoice0:' + current.pendingEvents[0].id, () => E.applyEventChoice(current, 0, E.FALLBACK_CLUBS)); break;
        case 'moral_dilemma':
          if (current.pendingMoralDilemma) {
            const index = current.pendingMoralDilemma.choices.length - 1;
            assert(index >= 0); result.moralChoices ??= [];
            result.moralChoices.push({ id: current.pendingMoralDilemma.id, index, label: current.pendingMoralDilemma.choices[index].label });
            step('applyActualLastMoralChoice', () => E.applyMoralDilemmaChoice(current, index));
          } else step('dismissMoralDilemma', () => E.dismissMoralDilemma(current, E.FALLBACK_CLUBS));
          break;
        case 'rehab_choice': assert(current.pendingRehab); step('actualFullRehabChoice1', () => E.applyRehabChoice(current, 1)); break;
        case 'red_card_appeal_result': step('dismissAppealResult', () => E.dismissAppealResult(current, E.FALLBACK_CLUBS)); break;
        case 'retirement_suggestion': step('declineRetirementSuggestion', () => E.declineRetirementSuggestion(current, E.FALLBACK_CLUBS)); break;
        case 'transfer_window': step('stayAtClub', () => E.stayAtClub(current)); break;
        case 'contract_offer': {
          const next = current.pendingOffers.find(o => o.isHomegrown) ?? current.pendingOffers[0];
          assert(next, 'Actual subsequent offer exists');
          step('acceptActualSubsequentOffer', () => E.acceptOffer(current, next)); break;
        }
        default: throw new Error('Unsupported actual public phase: ' + current.phase);
      }
    }
    result.status ??= 'diagnostic-completed';
    result.finalYear = current.seasons.at(-1).year;
    result.targetFrame = frames.find(f => f.year === 2010 && f.phase === 'ballon_dor'
      && f.value.pendingBallonDor?.year === 2010 && f.value.pendingBallonDor.revealed === true)?.n ?? null;
    result.diagnostic2010 = frames.filter(f => f.year === 2010).map(f => {
      const night = f.value.pendingBallonDor, world = P.phoneWorld(f.value);
      return { n: f.n, action: f.action, recordYear: f.year, phase: f.phase,
        recordType: f.value.seasons.at(-1).type, apps: f.value.seasons.at(-1).apps,
        pendingBallonDor: night ? { year: night.year, revealed: night.revealed ?? false, nomineeNames: night.nominees.map(n => n.name) } : null,
        lastBallonDorJudged: f.lastBallonDorJudged, awaitingRevealYear: R.ballonDorAwaitingReveal(f.value),
        phone: { privateSeed: f.value.phone?.seed ?? null, worldYear: world?.year ?? null,
          clubs: f.value.phone?.clubs ?? null, moves: world?.moves ?? null, feed: P.phoneFeed(f.value) } };
    });
    result.featureCredit = 'None. One seed, actual public APIs and saved evidence only. No joint seed qualification, arrival implementation, nominee injection, outcome selection or browser claim.';
  } catch (error) {
    result.status = 'probe-error'; result.error = { name: error.name, message: error.message, stack: error.stack };
    process.exitCode = 1;
  } finally {
    Math.random = originalRandom;
    if (previousObserver === undefined) delete globalThis.__SC_HISTORICAL_PROBE__;
    else globalThis.__SC_HISTORICAL_PROBE__ = previousObserver;
    await write(file, result);
  }
}

function assertPair(normal, observed) {
  assert.equal(normal.seed, 1); assert.equal(observed.seed, 1);
  assert.deepEqual(observed.importDraws, normal.importDraws, 'HISTORICAL_ONE_SEED_IMPORT_PARITY');
  assert.deepEqual(observed.draws, normal.draws, 'HISTORICAL_ONE_SEED_MAIN_PARITY');
  assert.deepEqual(observed.frames, normal.frames, 'HISTORICAL_ONE_SEED_FRAME_PARITY');
  assert.deepEqual(observed.diagnostic2010, normal.diagnostic2010, 'HISTORICAL_ONE_SEED_PUBLIC_VIEW_PARITY');
}
async function main() {
  assert(process.env.CI, 'Remote isolated CI diagnostic only');
  const root = process.cwd(), out = path.resolve(arg('--out') ?? ''), specPath = path.resolve(arg('--spec') ?? '');
  assert(arg('--out') && arg('--spec') && out !== root && !out.startsWith(root + path.sep), 'Evidence outside the checkout');
  await fs.mkdir(out, { recursive: true });
  const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
  assert.equal(spec.status, 'BOUND_MEASURED_MAIN_SOURCE');
  assert.equal(spec.bindings.measuredParent, '536705b4e4be7df8a80c02ff818b04a4fe23cf3a');
  assert.equal(spec.bindings.measuredTree, '8106a333f4e95ecb7f9197c98e4708ec232080b6');
  assert.equal(spec.globalSeed, 1); assert.equal(spec.actionLimit, 300); assert.equal(spec.workerTimeoutMilliseconds, 120000);
  const git = (...a) => {
    const result = spawnSync('git', a, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_NO_LAZY_FETCH: '1' } });
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  assert.equal(process.env.GIT_NO_LAZY_FETCH, '1');
  assert.equal(process.env.NODE_OPTIONS, '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'));
  assert.equal(process.env.SIM_NETWORK, 'offline');
  assert.equal(git('rev-parse', 'HEAD^').trim(), spec.bindings.measuredParent);
  assert.equal(git('rev-parse', spec.bindings.measuredParent + '^{tree}').trim(), spec.bindings.measuredTree);
  assert.equal(blob(await fs.readFile(self)), spec.bindings.runnerBlob);
  const changed = git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changed, spec.qaPaths.slice().sort(), 'Exactly three isolated QA paths');
  const status = () => git('status', '--porcelain=v1', '--untracked-files=all');
  assert.equal(status(), '');
  const inventory = async () => {
    const files = git('ls-files', '-z').split('\0').filter(Boolean).sort(), rows = [];
    for (const file of files) { const bytes = await fs.readFile(path.join(root, file)); rows.push({ file, bytes: bytes.length, sha256: sha(bytes), gitBlob: blob(bytes) }); }
    return rows;
  };
  const before = await inventory(); await write(path.join(out, 'source-before.json'), before);
  for (const [file, pin] of Object.entries(spec.sourcePins)) assert.equal(before.find(r => r.file === file)?.gitBlob, pin, file);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(out, 'types-passed.json'))), { command: 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json', exit: 0 });
  assert.equal((await fs.readFile(path.join(out, 'transport/types.log'))).length, 0);
  const page = (await fs.readFile(path.join(root, 'src/pages/SoccerCareer.tsx'), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal((page.match(/\{\s*value:\s*"2005-09",\s*label:\s*"Late 2000s \(2005 start\)",\s*startYear:\s*2005\s*\}/g) ?? []).length, 1, 'Actual2005 creation option');
  for (const fragment of ['setCareer(dismissNewspaper(career))', 'stepWithMomentsBanked(c => dismissSummary(c, clubs))',
    'setCareer(dismissBallonDor(career, clubs))', 'onReveal={() => onCareerPatch?.(revealBallonDorResult)}']) assert(page.includes(fragment), 'Actual public handler ' + fragment);
  const phonePath = path.join(root, 'src/lib/soccerPhone.ts'), phone = await fs.readFile(phonePath, 'utf8');
  const oldSpan = '    if (realNames) continue;\n    p.clubs[st.name] = to;';
  const newSpan = '    const receipt = (globalThis as unknown as { __SC_HISTORICAL_PROBE__?: unknown[] }).__SC_HISTORICAL_PROBE__;\n' +
    '    if (receipt) receipt.push({ year, who: st.name, from, to, fee, suppressedByOriginal: realNames, actualPrivatePhoneSeedInput: p.seed, actualPrivatePhoneSeedAfterDraw: rng.state, wanted, drawnMoveIndex: drawnMoves, sourceStarNames: stars.map(s => s.name), shuffledNames: movers.map(s => s.name), playerClub: s.currentClub });\n' + oldSpan;
  assert.equal(phone.split(oldSpan).length - 1, 1);
  const observerSource = phone.replace(oldSpan, () => newSpan);
  assert.notEqual(observerSource, phone); assert.equal(observerSource.replace(newSpan, () => oldSpan), phone);
  const entry = path.join(out, 'entry.mjs');
  await fs.writeFile(entry, 'export * as engine from ' + JSON.stringify(path.join(root, 'src/lib/soccerCareerEngine.ts')) + ';\n' +
    'export * as codec from ' + JSON.stringify(path.join(root, 'src/lib/soccerCareerSave.ts')) + ';\n' +
    'export * as reveal from ' + JSON.stringify(path.join(root, 'src/lib/soccerAwardReveal.ts')) + ';\n' +
    'export * as phone from ' + JSON.stringify(phonePath) + ';\n' +
    'export * as eras from ' + JSON.stringify(path.join(root, 'src/lib/careerEras.ts')) + ';\n', { flag: 'wx' });
  const normalBundle = path.join(out, 'original.mjs'), observerBundle = path.join(out, 'observer.mjs');
  const result = { status: 'running', role: 'one-seed-diagnostic-only', measuredMain: spec.bindings.measuredParent,
    measuredTree: spec.bindings.measuredTree, publishedRoleNotInferred: true, globalSeed: 1, trialsExecuted: 0,
    actionLimit: 300, workerTimeoutMilliseconds: 120000, sourceBeforeCount: before.length,
    observer: { oldSpan, newSpan, changed: true, wholeInverseExact: true, originalSourceSHA256: sha(phone), observedSourceSHA256: sha(observerSource) } };
  let observerApplied = 0;
  try {
    for (const [file, observed] of [[normalBundle, false], [observerBundle, true]]) {
      const built = await build({ entryPoints: [entry], outfile: file, bundle: true, format: 'esm', platform: 'node',
        alias: { '@': path.join(root, 'src') }, logLevel: 'error', metafile: true, plugins: observed ? [{
          name: 'observe-every-actual-selected-phone-draw',
          setup(b) { b.onLoad({ filter: /soccerPhone\.ts$/ }, args => {
            if (args.path !== phonePath) return undefined;
            observerApplied += 1; return { contents: observerSource, loader: 'ts', resolveDir: path.dirname(phonePath) };
          }); },
        }] : [] });
      await write(file + '.meta.json', built.metafile);
    }
    assert.equal(observerApplied, 1, 'One actual transformed phone module');
    result.bundleBefore = { original: sha(await fs.readFile(normalBundle)), observer: sha(await fs.readFile(observerBundle)) };
    assert.notEqual(result.bundleBefore.original, result.bundleBefore.observer, 'Actual compiled observer differs');
    const cases = {};
    for (const [mode, bundle] of [['normal', normalBundle], ['observer', observerBundle]]) {
      const folder = path.join(out, 'seed1'), casefile = path.join(folder, mode + '.json'); await fs.mkdir(folder, { recursive: true });
      const receipt = path.join(folder, mode + '-transport.log'); await fs.writeFile(receipt, '', { flag: 'wx' });
      const command = [process.execPath, '--unhandled-rejections=strict', self, '--worker', '--seed', '1', '--mode', mode, '--bundle', bundle, '--casefile', casefile];
      const child = spawnSync(command[0], command.slice(1), { cwd: root, encoding: 'utf8', timeout: 120000, env: { ...process.env, SIM_OFFLINE_RECEIPT: receipt } });
      await fs.writeFile(path.join(folder, mode + '.stdout.log'), child.stdout ?? '', { flag: 'wx' });
      await fs.writeFile(path.join(folder, mode + '.stderr.log'), child.stderr ?? '', { flag: 'wx' });
      await write(path.join(folder, mode + '.native.json'), { command, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null });
      assert.equal(child.error, undefined); assert.equal(child.signal, null); assert.equal(child.status, 0);
      assert.equal(child.stderr, ''); assert.equal((await fs.readFile(receipt)).length, 0);
      const bytes = await fs.readFile(casefile); cases[mode] = JSON.parse(bytes); assert.notEqual(cases[mode].status, 'probe-error');
      await write(path.join(folder, mode + '.raw-manifest.json'), { file: mode + '.json', bytes: bytes.length, sha256: sha(bytes), frames: cases[mode].frames.length, importDraws: cases[mode].importDraws.length, mainDraws: cases[mode].draws.length });
    }
    assertPair(cases.normal, cases.observer);
    const originalBytes = { normal: await fs.readFile(path.join(out, 'seed1/normal.json')), observer: await fs.readFile(path.join(out, 'seed1/observer.json')) };
    const fault = plain(cases.observer), saved = fault.frames[0].saved; fault.frames[0].saved += ' ';
    assert.notDeepEqual(fault, cases.observer);
    assert.throws(() => assertPair(cases.normal, fault), error => error instanceof assert.AssertionError && error.message.includes('HISTORICAL_ONE_SEED_FRAME_PARITY'));
    fault.frames[0].saved = saved; assert.deepEqual(fault, cases.observer); assertPair(cases.normal, fault);
    for (const mode of ['normal', 'observer']) assert.deepEqual(await fs.readFile(path.join(out, 'seed1', mode + '.json')), originalBytes[mode]);
    await write(path.join(out, 'copied-actual-parity-control.json'), { changed: true, marker: 'HISTORICAL_ONE_SEED_FRAME_PARITY', ownedAssertion: true, wholeInverseExact: true, originalRawBytesHeld: true, scope: 'Copied actual data only, no engine or candidate outcome is injected' });
    result.trialsExecuted = 1; result.normalAndObserverFramesSaveImportMainExact = true;
    result.compactActual2010 = cases.normal.diagnostic2010;
    result.actualEraPool2010 = cases.normal.eraPool2010;
    result.selectedPhoneDrawsAllYears = cases.observer.transferDrawObservations;
    result.selectedPhoneDraws2010 = cases.observer.transferDrawObservations.filter(row => row.year === 2010);
    result.actualNeymarSelected2010 = result.selectedPhoneDraws2010.filter(row => row.who === 'Neymar');
    result.actualCeremonyFrame = cases.normal.targetFrame; result.actualStop = cases.normal.stop ?? null;
    result.normalFinalYear = cases.normal.finalYear;
    result.status = 'one-seed-diagnostic-completed';
    result.scope = 'No joint-seed qualifier runs here. The existing strict future qualifier and old128-seed probe are unchanged. Actual nominee/phone evidence can be absent and is recorded as such. No historical arrival, transfer application, test-first feature admission, native browser or public credit.';
  } catch (error) {
    result.status = 'failed'; result.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1;
  } finally {
    const after = await inventory(); await write(path.join(out, 'source-after.json'), after);
    result.sourceAfterCount = after.length; result.sourceHeld = JSON.stringify(before) === JSON.stringify(after); result.statusClean = status() === '';
    result.phoneSourceHeld = (await fs.readFile(phonePath, 'utf8')) === phone; result.observerApplied = observerApplied;
    result.bundleHeld = !!result.bundleBefore && result.bundleBefore.original === sha(await fs.readFile(normalBundle)) && result.bundleBefore.observer === sha(await fs.readFile(observerBundle));
    await write(path.join(out, 'one-seed-diagnostic.json'), result);
    assert(result.sourceHeld && result.statusClean && result.phoneSourceHeld && result.bundleHeld, 'Complete source/status/primary bundle holds');
  }
}
if (args.includes('--worker')) await worker(); else await main();
