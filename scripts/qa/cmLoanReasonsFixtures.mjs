import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const root = process.cwd();
const out = path.resolve(option('--out', process.env.QA_OUT && path.join(process.env.QA_OUT, 'fixtures')) || '');
assert.ok(process.argv.includes('--out') || process.env.QA_OUT, '--out or QA_OUT is required');
await fs.mkdir(out, { recursive: true });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const entry = path.join(out, 'engine-entry.mjs'), bundle = path.join(out, 'engine-bundle.mjs');
await fs.writeFile(entry, `
const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key),
  clear: () => store.clear(),
};
export const cm = await import(${JSON.stringify(path.join(root, 'src/lib/clubManager.ts'))});
export const fence = (await import(${JSON.stringify(path.join(root, 'src/lib/saveFence.ts'))})).saveFence;
`, { flag: 'wx' });
await build({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'esm', platform: 'node', alias: { '@': path.join(root, 'src') }, logLevel: 'error' });
const { cm, fence } = await import(pathToFileURL(bundle).href);
assert.equal(cm.SAVE_KEY, 'dukb-club-manager-save');
const registrations = cm.engineRegistrations(), random = Math.random, now = Date.now;
const sourcePaths = ['src/lib/clubManager.ts', 'src/lib/saveFence.ts', 'src/components/club-manager/TransferScreen.tsx'];
const sourceBefore = Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, hash(await fs.readFile(path.join(root, file)))])));
const manifest = {
  scope: 'Two explicitly fictional saved careers built by the real engine and its save writer/reader. This is seeded-state App QA, not natural career progression.',
  fixtureOnlySeed: 513, fixtureOnlyDate: '2026-11-03T12:00:00.000Z',
  browserRngOrClockOverrides: false, saveKey: cm.SAVE_KEY, sourceBefore, cases: [],
};
try {
  for (const key of ['only_keeper', 'promised']) {
    let seed = 513;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
    Date.now = () => Date.UTC(2026, 10, 3, 12);
    let career = cm.startCareer('Loan Reason Lab', 'now', {
      name: 'Loan Reason Lab', leagueId: 'premier', stadium: 'Lab Ground', budgetTier: 'small', quality: 72, replacedClub: '',
      crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'LR' },
    });
    assert.equal(career.clubName, 'Loan Reason Lab');
    assert.ok(career.squad.length > 14 && career.transferWindow !== null);
    const keeper = career.squad.find(player => player.position === 'GK');
    const outfield = career.squad.find(player => player.position !== 'GK' && !player.onLoan);
    assert.ok(keeper && outfield);
    const blockedId = key === 'only_keeper' ? keeper.id : outfield.id;
    if (key === 'only_keeper') {
      career.squad = career.squad.filter(player => player.position !== 'GK' || player.id === keeper.id);
      career.xiIds = career.xiIds.map(id => career.squad.some(player => player.id === id) ? id : null);
      assert.equal(career.squad.filter(player => player.position === 'GK').length, 1);
    } else {
      const target = { name: 'Synthetic Loan Deal Target', club: 'Synthetic Selling Club', position: 'CM', age: 24, rating: 70, price: 0.2, generated: true, nation: 'England' };
      const opened = cm.startNegotiation(career, target);
      assert.ok(opened?.negotiation);
      career = cm.makeOffer(opened, opened.negotiation.theirAsk, { swapId: blockedId });
      assert.ok(career);
      assert.equal(career.negotiation?.status, 'open');
      assert.equal(career.negotiation?.phase, 'terms');
      assert.equal(career.negotiation?.agreedExtras?.swapId, blockedId);
    }
    assert.ok(career.squad.length > 14);
    // Exercise the normal fenced writer and reader, then write its normalized state for the actual App.
    localStorage.clear(); fence.adopt(cm.SAVE_KEY);
    assert.equal(cm.saveCareer(career), true);
    career = cm.loadCareer();
    assert.ok(career && career.clubName === 'Loan Reason Lab');
    assert.equal(cm.saveCareer(career), true);
    const bytes = localStorage.getItem(cm.SAVE_KEY);
    assert.ok(bytes);
    const loaded = cm.loadCareer();
    assert.deepEqual(loaded, career);
    const blocked = loaded.squad.find(player => player.id === blockedId);
    assert.ok(blocked);
    const reason = key === 'only_keeper' ? `${blocked.name} is your only keeper.`
      : `${blocked.name} is promised in the deal on the table, so he stays until it is settled.`;
    assert.equal(cm.loanOutRefusal(loaded, blockedId), reason);
    assert.equal(cm.loanOutPlayer(loaded, blockedId), null);
    const eligible = loaded.squad.find(player => player.id !== blockedId && player.position !== 'GK' && cm.loanOutRefusal(loaded, player.id) === null);
    assert.ok(eligible);
    const before = JSON.stringify(loaded), fee = cm.loanOutFee(eligible);
    const expected = cm.loanOutPlayer(loaded, eligible.id);
    assert.ok(expected);
    assert.equal(JSON.stringify(loaded), before);
    assert.equal(expected.squad.length, loaded.squad.length - 1);
    assert.equal(Math.round((expected.budget - loaded.budget) * 10) / 10, fee);
    const file = key + '.json';
    await fs.writeFile(path.join(out, file), bytes, { flag: 'wx' });
    manifest.cases.push({
      key, file, sha256: hash(bytes), clubName: loaded.clubName, season: loaded.season, week: loaded.week,
      squadSize: loaded.squad.length, budget: loaded.budget,
      blocked: { id: blocked.id, name: blocked.name, reason, label: 'Loan out now +' + cm.moneyIn(loaded)(cm.loanOutFee(blocked)) },
      eligible: { id: eligible.id, name: eligible.name, fee, label: 'Loan out now +' + cm.moneyIn(loaded)(fee) },
      expectedAfterEligible: { squadSize: expected.squad.length, budget: expected.budget, loanFee: fee },
    });
  }
} finally {
  Math.random = random; Date.now = now;
  cm.restoreEngineRegistrations(registrations);
}
manifest.sourceAfter = Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, hash(await fs.readFile(path.join(root, file)))])));
assert.deepEqual(manifest.sourceAfter, sourceBefore);
assert.equal(manifest.cases.length, 2);
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log('cmLoanReasonsFixtures: green. Two fictional saves passed the actual writer, reader, refusal and eligible-loan checks.');
