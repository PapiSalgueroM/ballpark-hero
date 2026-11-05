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
  assert(Number.isSafeInteger(seed) && seed > 0 && ['normal', 'observer'].includes(mode) && file);
  const originalRandom = Math.random, previousObserver = globalThis.__SC_HISTORICAL_PROBE__;
  const importDraws = [], draws = [], frames = [], events = [];
  let action = 'module-import', counter = 0, current = null, E, S;
  const install = (initial, tape) => {
    let state = initial;
    Math.random = () => { state = state * 16807 % 2147483647; const value = (state - 1) / 2147483646; tape.push({ index: tape.length, action, value }); return value; };
  };
  const result = { kind: 'original-input-measurement', seed, mode, importDraws, draws, frames, transferDrawObservations: events };
  try {
    install(7301, importDraws);
    const module = await import(pathToFileURL(path.resolve(arg('--bundle'))).href);
    ({ engine: E, codec: S } = module);
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
      if (current.seasons.at(-1).year >= 2010) break;
      if (current.retired || ['retired', 'retirement_ceremony', 'post_retirement'].includes(current.phase)) {
        result.status = 'completed-not-qualified'; result.reason = 'actual retirement before target2010'; break;
      }
      switch (current.phase) {
        case 'playing': step('advanceProSeason', () => E.advanceProSeason(current, E.FALLBACK_CLUBS)); break;
        case 'newspaper': step('dismissNewspaper', () => E.dismissNewspaper(current)); break;
        case 'season_summary': step('dismissSummary', () => E.dismissSummary(current, E.FALLBACK_CLUBS)); break;
        case 'international_debut': step('dismissDebut', () => E.dismissDebut(current, E.FALLBACK_CLUBS)); break;
        case 'world_cup': step('dismissWorldCup', () => E.dismissWorldCup(current, E.FALLBACK_CLUBS)); break;
        case 'ballon_dor': step('dismissBallonDor', () => E.dismissBallonDor(current, E.FALLBACK_CLUBS)); break;
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
    result.status ??= 'completed';
    result.finalYear = current.seasons.at(-1).year;
    result.featureCredit = 'None. Original current behavior and real generated offer/public actions only.';
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

function targetFrame(normal) {
  return normal.frames.find(f => f.action === 'advanceProSeason' && f.year === 2010 && f.value.seasons.at(-1).type === 'playing' && f.value.seasons.at(-1).apps > 0);
}
function qualify(normal, observed) {
  const f = targetFrame(normal); assert(f, 'HISTORICAL_PROBE_2010_FRAME_REQUIRED');
  const nominee = f.value.pendingBallonDor?.nominees?.find(n => n.name === 'Neymar');
  assert(nominee, 'HISTORICAL_PROBE_NEYMAR_NOMINEE_REQUIRED');
  const chosen = observed.transferDrawObservations.find(e => e.year === 2010 && e.who === 'Neymar' && e.suppressedByOriginal === true);
  assert(chosen, 'HISTORICAL_PROBE_SELECTED_TRANSFER_REQUIRED');
  assert.equal(chosen.from, 'Santos', 'Original era source club at the actual selected draw');
  assert.equal(f.value.phone.world.year, 2010);
  assert(!f.value.phone.world.moves.some(m => m.who === 'Neymar'), 'Original actual transfer remains suppressed');
  assert.equal(f.value.phone.clubs.Neymar, 'Santos');
  assert(f.lastBallonDorJudged?.names.includes('Neymar'), 'Nominee belongs to actual visible judged field');
  return { seed: normal.seed, frame: f.n, nominee: plain(nominee), actualSelectedButSuppressedDraw: plain(chosen),
    scope: 'Measured original input. No applied real-player transfer, stable arrival ID or future feature is claimed.' };
}

async function main() {
  const root = process.cwd(), out = path.resolve(arg('--out') ?? ''), specPath = path.resolve(arg('--spec') ?? '');
  assert(arg('--out') && arg('--spec') && out !== root && !out.startsWith(root + path.sep), 'Evidence output must be outside product checkout');
  await fs.mkdir(out, { recursive: true });
  const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
  assert.equal(spec.status, 'BOUND_MEASURED_PRODUCT_SOURCE', 'Original input qualifier must bind the exact measured product, without a published-source claim');
  assert(/^[a-f0-9]{40}$/.test(spec.bindings.measuredParent));
  assert(/^[a-f0-9]{40}$/.test(spec.bindings.measuredTree));
  assert(/^[a-f0-9]{40}$/.test(spec.bindings.runnerBlob));
  assert(Number.isSafeInteger(spec.maxSeeds) && spec.maxSeeds >= 1 && spec.maxSeeds <= 128, 'Bounded actual search, never guessed fixtures');
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
  assert.deepEqual(changed, spec.qaPaths.slice().sort(), 'Exact three QA-only paths');
  const status = () => git('status', '--porcelain=v1', '--untracked-files=all');
  assert.equal(status(), '', 'Clean actual QA source before probe');
  const inventory = async () => {
    const files = git('ls-files', '-z').split('\0').filter(Boolean).sort(), rows = [];
    for (const file of files) { const bytes = await fs.readFile(path.join(root, file)); rows.push({ file, bytes: bytes.length, sha256: sha(bytes), gitBlob: blob(bytes) }); }
    return rows;
  };
  const before = await inventory(); await write(path.join(out, 'source-before.json'), before);
  for (const [file, expected] of Object.entries(spec.sourcePins)) assert.equal(before.find(r => r.file === file)?.gitBlob, expected, 'Actual pinned source ' + file);
  const types = JSON.parse(await fs.readFile(path.join(out, 'types-passed.json')));
  assert.deepEqual(types, { command: 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json', exit: 0 });
  assert.equal((await fs.readFile(path.join(out, 'transport/types.log'))).length, 0, 'Silent offline types receipt');
  const page = (await fs.readFile(path.join(root, 'src/pages/SoccerCareer.tsx'), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.equal((page.match(/\{\s*value:\s*"2005-09",\s*label:\s*"Late 2000s \(2005 start\)",\s*startYear:\s*2005\s*\}/g) ?? []).length, 1, 'Actual reachable2005 creation option, no invented2009 selector');
  const phonePath = path.join(root, 'src/lib/soccerPhone.ts'), phone = await fs.readFile(phonePath, 'utf8');
  const oldSpan = '    if (realNames) continue;\n    p.clubs[st.name] = to;';
  const newSpan = '    const receipt = (globalThis as unknown as { __SC_HISTORICAL_PROBE__?: unknown[] }).__SC_HISTORICAL_PROBE__;\n' +
    '    if (receipt && st.name === "Neymar") receipt.push({ year, who: st.name, from, to, fee, suppressedByOriginal: realNames, actualPhoneSeedAfterDraw: rng.state });\n' + oldSpan;
  assert.equal(phone.split(oldSpan).length - 1, 1, 'Source-unique executable original transfer guard');
  const observerSource = phone.replace(oldSpan, newSpan);
  assert.notEqual(observerSource, phone); assert.equal(observerSource.replace(newSpan, oldSpan), phone);
  const entry = path.join(out, 'entry.mjs');
  await fs.writeFile(entry, 'export * as engine from ' + JSON.stringify(path.join(root, 'src/lib/soccerCareerEngine.ts')) + ';\n' +
    'export * as codec from ' + JSON.stringify(path.join(root, 'src/lib/soccerCareerSave.ts')) + ';\n', { flag: 'wx' });
  const normalBundle = path.join(out, 'original.mjs'), observerBundle = path.join(out, 'observer.mjs');
  const result = { status: 'running', originalSource: spec.bindings.measuredParent, measuredParent: spec.bindings.measuredParent,
    measuredTree: spec.bindings.measuredTree, preparationSource: spec.preparationProduct, published: false, inputQualificationOnly: true,
    sourceBeforeCount: before.length, trials: [], observer: { oldSpan, newSpan, changed: true, wholeInverseExact: true,
      originalSourceSHA256: sha(phone), observedSourceSHA256: sha(observerSource) } };
  try {
    for (const [file, observed] of [[normalBundle, false], [observerBundle, true]]) {
      const built = await build({ entryPoints: [entry], outfile: file, bundle: true, format: 'esm', platform: 'node',
        alias: { '@': path.join(root, 'src') }, logLevel: 'error', metafile: true, plugins: observed ? [{
          name: 'observe-original-suppressed-neymar-draw',
          setup(b) { b.onLoad({ filter: /soccerPhone\.ts$/ }, args => args.path === phonePath
            ? { contents: observerSource, loader: 'ts', resolveDir: path.dirname(phonePath) } : undefined); },
        }] : [] });
      await write(file + '.meta.json', built.metafile);
    }
    result.bundleBefore = { original: sha(await fs.readFile(normalBundle)), observer: sha(await fs.readFile(observerBundle)) };
    let selected = null;
    for (let seed = 1; seed <= spec.maxSeeds; seed += 1) {
      const cases = {};
      for (const [mode, bundle] of [['normal', normalBundle], ['observer', observerBundle]]) {
        const folder = path.join(out, 'seeds', String(seed)), casefile = path.join(folder, mode + '.json');
        await fs.mkdir(folder, { recursive: true });
        const receipt = path.join(folder, mode + '-transport.log'); await fs.writeFile(receipt, '', { flag: 'wx' });
        const command = [process.execPath, '--unhandled-rejections=strict', self, '--worker', '--seed', String(seed),
          '--mode', mode, '--bundle', bundle, '--casefile', casefile];
        const child = spawnSync(command[0], command.slice(1), { cwd: root, encoding: 'utf8', timeout: 120000,
          env: { ...process.env, SIM_OFFLINE_RECEIPT: receipt } });
        await fs.writeFile(path.join(folder, mode + '.stdout.log'), child.stdout ?? '', { flag: 'wx' });
        await fs.writeFile(path.join(folder, mode + '.stderr.log'), child.stderr ?? '', { flag: 'wx' });
        await write(path.join(folder, mode + '.native.json'), { command, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null });
        assert.equal(child.status, 0, 'Actual worker native exit0: ' + mode + ' seed ' + seed);
        assert.equal(child.stderr, '', 'No hidden module/setup/runtime errors');
        assert.equal((await fs.readFile(receipt)).length, 0, 'Silent offline actual worker');
        cases[mode] = JSON.parse(await fs.readFile(casefile));
        assert.notEqual(cases[mode].status, 'probe-error');
      }
      assert.deepEqual(cases.observer.importDraws, cases.normal.importDraws, 'Observer import tape held');
      assert.deepEqual(cases.observer.draws, cases.normal.draws, 'Observer complete actual main tape held');
      assert.deepEqual(cases.observer.frames, cases.normal.frames, 'Observer every complete saved frame held');
      let finding = null, reason = null;
      try { finding = qualify(cases.normal, cases.observer); } catch (error) {
        if (!(error instanceof assert.AssertionError)) throw error;
        if (!/^HISTORICAL_PROBE_(2010_FRAME|NEYMAR_NOMINEE|SELECTED_TRANSFER)_REQUIRED/.test(error.message)) throw error;
        reason = { name: error.name, message: error.message };
      }
      result.trials.push({ seed, originalStatus: cases.normal.status, finalYear: cases.normal.finalYear, frames: cases.normal.frames.length,
        originalFullFrameFile: 'seeds/' + seed + '/normal.json', observedFullFrameFile: 'seeds/' + seed + '/observer.json',
        observerFramesAndMainTapeExact: true, qualified: !!finding, reason });
      console.log('historical arrival original seed ' + seed + ': ' + (finding ? 'measured joint honors/draw input' : 'not qualified'));
      if (finding) { selected = { finding, normal: cases.normal, observer: cases.observer }; break; }
    }
    assert(selected, 'Bounded original probe found no joint seed; retain all real attempts and leave fixtures held');
    result.selected = selected.finding;
    const original = JSON.stringify({ normal: selected.normal, observer: selected.observer });
    const controls = [
      ['HISTORICAL_PROBE_2010_FRAME_REQUIRED', pair => {
        const list = pair.normal.frames, at = list.findIndex(f => f.n === selected.finding.frame);
        assert(at >= 0); const removed = list.splice(at, 1); return () => list.splice(at, 0, ...removed);
      }],
      ['HISTORICAL_PROBE_NEYMAR_NOMINEE_REQUIRED', pair => {
        const frame = targetFrame(pair.normal), list = frame.value.pendingBallonDor.nominees;
        const at = list.findIndex(n => n.name === 'Neymar'); assert(at >= 0);
        const removed = list.splice(at, 1); return () => list.splice(at, 0, ...removed);
      }],
      ['HISTORICAL_PROBE_SELECTED_TRANSFER_REQUIRED', pair => {
        const list = pair.observer.transferDrawObservations, at = list.findIndex(e => e.year === 2010 && e.who === 'Neymar');
        assert(at >= 0); const removed = list.splice(at, 1); return () => list.splice(at, 0, ...removed);
      }],
    ];
    result.controls = [];
    for (const [marker, mutate] of controls) {
      const pair = JSON.parse(original), restore = mutate(pair), fault = JSON.stringify(pair); assert.notEqual(fault, original);
      let owned = null; try { qualify(pair.normal, pair.observer); } catch (error) { owned = error; }
      assert(owned instanceof assert.AssertionError); assert(owned.message.startsWith(marker));
      restore(); assert.equal(JSON.stringify(pair), original, 'Whole actual copied report inverse exact');
      assert.equal(JSON.stringify({ normal: selected.normal, observer: selected.observer }), original, 'Actual reports never mutated');
      await write(path.join(out, 'controls', marker + '.json'), { marker, changed: true, originalSHA256: sha(original),
        faultSHA256: sha(fault), wholeInverseExact: true, owned: { name: owned.name, message: owned.message }, scope: 'Copied actual report only. No App outcome/HTTP/body is replaced.' });
      result.controls.push({ marker, changed: true, wholeInverseExact: true, originalReportsHeld: true, owned: owned.message });
    }
    result.status = 'measured-original-seed-available';
    result.scope = 'Input qualification only. Original lacks arrival feature and suppresses real transfers. No original-test admission, applied candidate move, 2015 reset fixture, build, native or public credit.';
  } catch (error) {
    result.status = 'failed'; result.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1;
  } finally {
    const after = await inventory(); await write(path.join(out, 'source-after.json'), after);
    const held = JSON.stringify(before) === JSON.stringify(after), clean = status() === '';
    result.sourceAfterCount = after.length; result.sourceHeld = held; result.statusClean = clean;
    result.phoneSourceHeld = (await fs.readFile(phonePath, 'utf8')) === phone;
    result.bundleHeld = false;
    if (result.bundleBefore) result.bundleHeld = result.bundleBefore.original === sha(await fs.readFile(normalBundle))
      && result.bundleBefore.observer === sha(await fs.readFile(observerBundle));
    await write(path.join(out, 'original-seed-probe.json'), result);
    assert(held && clean && result.phoneSourceHeld && result.bundleHeld, 'Full source/status/primary bundle holds');
  }
}

if (args.includes('--worker')) await worker(); else await main();
