import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';

export function createDeckCapture(root, output) {
  assert(output && path.isAbsolute(output), 'DECK_CAPTURE_ABSOLUTE_OUTPUT');
  const out = path.resolve(output);
  assert(out !== root && !out.startsWith(root + path.sep), 'DECK_CAPTURE_OUTSIDE_SOURCE');
  fs.mkdirSync(out, { recursive: false });
  const errors = [], loaded = new Map(), pairs2 = [], pairs4 = [], pairs9 = [], careers2 = [];
  let arm = null, savedArms = {}, context9 = null, complete = false, sealed = false;
  const digest = (body, kind = 'sha256') => createHash(kind).update(body).digest('hex');
  const write = (rel, body) => {
    const file = path.join(out, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body, { flag: 'wx' });
    return { file: rel, bytes: Buffer.byteLength(body), sha256: digest(body) };
  };
  const json = (rel, value) => write(rel, JSON.stringify(value) + '\n');
  const safe = (name, fn) => {
    try { return fn(); } catch (e) { errors.push({ operation: name, message: e.message }); }
  };
  const describe = text => {
    if (text === undefined) return { missing: true };
    const s = JSON.parse(text), row = s.seasons?.at(-1);
    return { phase: s.phase, age: s.age, era: s.era, club: s.currentClub, league: s.currentLeague,
      seasonCount: s.seasons?.length, year: row?.year, seasonClub: row?.club,
      leagueFinish: row?.leagueFinish, leagueSize: row?.leagueSize };
  };
  const textRecord = (rel, text) => text === undefined ? { missing: true }
    : { ...write(rel, text), sha1: digest(text, 'sha1'), summary: describe(text) };
  const closeArm = () => {
    if (!arm) return;
    if (arm.tapeBuffer) fs.writeSync(arm.tapeFd, arm.tapeBuffer);
    fs.closeSync(arm.stateFd); fs.closeSync(arm.tapeFd);
    savedArms[arm.role] = arm;
    arm = null;
  };
  const api = {
    source: (tag, rel, stage, body) => safe('source', () => {
      assert(/^src\/[A-Za-z0-9_./-]+$/.test(rel) && !rel.split('/').includes('..'), 'LOADED_SOURCE_PATH');
      const key = `${tag}|${rel}|${stage}`, sha256 = digest(body), old = loaded.get(key);
      if (old) { assert.equal(old.sha256, sha256, 'DUPLICATE_LOADED_SOURCE_BODY'); return; }
      loaded.set(key, { tag, source: rel, stage, ...write(`loaded/${tag}/${stage}/${rel}`, body) });
    }),
    bundle: (tag, file) => safe('bundle', () => write(`compiled/${tag}.mjs`, fs.readFileSync(file))),
    begin2: (seed, role) => safe('begin2', () => {
      assert(!arm, 'PREVIOUS_ARM_OPEN');
      if (role === 'HL') savedArms = {};
      const prefix = `spool/seed-${seed}/${role}`;
      const stateFile = path.join(out, `${prefix}.states.jsonl`), tapeFile = path.join(out, `${prefix}.draws.jsonl`);
      fs.mkdirSync(path.dirname(stateFile), { recursive: true });
      arm = { seed, role, states: 0, draws: 0, stateFile, tapeFile, tapeBuffer: '',
        stateFd: fs.openSync(stateFile, 'wx'), tapeFd: fs.openSync(tapeFile, 'wx') };
    }),
    draw: value => safe('draw', () => {
      if (!arm) return;
      arm.draws += 1;
      arm.tapeBuffer += JSON.stringify({ draw: arm.draws, value }) + '\n';
      if (arm.tapeBuffer.length >= 65536) { fs.writeSync(arm.tapeFd, arm.tapeBuffer); arm.tapeBuffer = ''; }
    }),
    state: value => safe('state', () => {
      if (!arm) return;
      const text = JSON.stringify(value);
      fs.writeSync(arm.stateFd, JSON.stringify({ index: arm.states, phase: value.phase, draws: arm.draws, json: text }) + '\n');
      arm.states += 1;
    }),
    end2: () => safe('end2', closeArm),
    pair2: async (seed, index, hs, bs, h, b) => {
      try {
        const mismatch = index < Math.max(hs.length, bs.length), rngMismatch = h.calls !== b.calls;
        const result = { seed, firstIndex: mismatch ? index : null, rngMismatch, headCalls: h.calls, baseCalls: b.calls,
          headStates: hs.length, baseStates: bs.length, arms: [] };
        for (const [role, hashes, actual] of [['HL', hs, h], ['B', bs, b]]) {
          const a = savedArms[role];
          assert(a && a.seed === seed && a.states === hashes.length && a.draws === actual.calls, 'ARM_COUNTS');
          const selected = [], boundaries = [];
          const lines = createInterface({ input: fs.createReadStream(a.stateFile), crlfDelay: Infinity });
          for await (const line of lines) {
            const row = JSON.parse(line);
            assert.equal(digest(row.json, 'sha1'), hashes[row.index], 'ORIGINAL_STATE_HASH');
            if (rngMismatch) boundaries.push({ index: row.index, phase: row.phase, draws: row.draws, stateSHA1: hashes[row.index] });
            if (mismatch && (row.index === index - 1 || row.index === index)) selected.push(row);
          }
          const kept = selected.map(row => ({ index: row.index, phase: row.phase, draws: row.draws,
            ...textRecord(`section2/seed-${seed}/${role}-step-${row.index}.json`, row.json) }));
          if (mismatch && hashes[index] === undefined) kept.push({ index, missing: true });
          const record = { role, selected: kept, draws: a.draws, states: a.states };
          if (rngMismatch) {
            const rel = `section2/seed-${seed}/${role}.draws.jsonl`;
            fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
            fs.renameSync(a.tapeFile, path.join(out, rel));
            const body = fs.readFileSync(path.join(out, rel));
            record.tape = { file: rel, bytes: body.length, sha256: digest(body) };
            record.boundaries = json(`section2/seed-${seed}/${role}.boundaries.json`, boundaries);
          } else fs.unlinkSync(a.tapeFile);
          fs.unlinkSync(a.stateFile);
          result.arms.push(record);
        }
        careers2.push({ seed, firstIndex: result.firstIndex, rngMismatch, headCalls: h.calls, baseCalls: b.calls,
          headStates: hs.length, baseStates: bs.length });
        if (mismatch || rngMismatch) { json(`section2/seed-${seed}/PAIR.json`, result); pairs2.push(result); }
        savedArms = {};
      } catch (e) { errors.push({ operation: 'pair2', seed, message: e.message }); }
    },
    pair4: (seed, seasonEnd, h, b, normalizedHead, finalHead, finalBase) => safe('pair4', () => {
      const prefix = `section4/seed-${seed}`;
      pairs4.push({ seed, seasonEnd, earliestStep: 'UNCAPTURED',
        head: textRecord(`${prefix}/HL-season-end.json`, h), base: textRecord(`${prefix}/B-season-end.json`, b),
        normalizedHead: textRecord(`${prefix}/HL-without-deck-stamps.json`, normalizedHead),
        finalHead: textRecord(`${prefix}/HL-final.json`, JSON.stringify(finalHead)),
        finalBase: textRecord(`${prefix}/B-final.json`, JSON.stringify(finalBase)) });
    }),
    begin9: (seed, ordinal, input) => safe('begin9', () => {
      if (context9) {
        json(`section9/incomplete-save-${context9.ordinal}.json`, context9);
        errors.push({ operation: 'begin9', message: 'PREVIOUS_OLD_SAVE_DID_NOT_COMPLETE' });
      }
      context9 = { seed, ordinal, input, plays: [] };
    }),
    loaded9: (head, base) => safe('loaded9', () => { assert(context9, 'OLD_SAVE_CONTEXT'); context9.loaded = { head, base }; }),
    played9: (role, text) => safe('played9', () => { assert(context9, 'OLD_SAVE_CONTEXT'); context9.plays.push({ role, text }); }),
    end9: () => safe('end9', () => {
      const c = context9;
      assert(c && c.plays.length === 2 && c.plays[0].role === 'HL' && c.plays[1].role === 'B', 'OLD_SAVE_CALL_PAIR');
      if (c.plays[0].text !== c.plays[1].text) {
        const prefix = `section9/save-${c.ordinal}`;
        pairs9.push({ seed: c.seed, ordinal: c.ordinal, earliestStep: 'UNCAPTURED',
          input: textRecord(`${prefix}/input.json`, c.input),
          repairedHead: textRecord(`${prefix}/HL-repaired.json`, c.loaded?.head),
          repairedBase: textRecord(`${prefix}/B-repaired.json`, c.loaded?.base),
          head: textRecord(`${prefix}/HL-played.json`, c.plays[0].text),
          base: textRecord(`${prefix}/B-played.json`, c.plays[1].text) });
      }
      context9 = null;
    }),
    counts: (section, value) => safe('counts', () => json(`section${section}/COUNTS.json`, value)),
    finish: original => safe('finish', () => { complete = true; api.seal(original); }),
    seal: original => {
      if (sealed) return;
      safe('close-active', closeArm);
      safe('seal', () => {
        const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
          ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
        const files = walk(out).sort().map(file => { const b = fs.readFileSync(file); return {
          file: path.relative(out, file).split(path.sep).join('/'), bytes: b.length, sha256: digest(b) }; });
        json('CAPTURE.json', { schema: 1, scope: 'PASSIVE_ORIGINAL_EXECUTION_DIAGNOSTIC_NO_REPLAY', complete,
          original, loaded: [...loaded.values()].sort((a, b) => `${a.tag}|${a.source}|${a.stage}`.localeCompare(`${b.tag}|${b.source}|${b.stage}`)),
          careers2, pairs2, pairs4, pairs9, pendingOldSave: context9, errors, files,
          sourceCoverage: 'Actual esbuild TS/TSX onLoad bodies. Other loader bodies are not intercepted. Full source archive remains required.',
          earliestSection4And9Step: 'UNCAPTURED', noSupplementalReplay: true });
        sealed = true;
      });
    },
  };
  process.on('exit', () => api.seal(null));
  return api;
}
