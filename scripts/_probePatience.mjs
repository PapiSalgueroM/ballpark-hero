import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/probePat.entry.mjs`;
const BUNDLE = `${TMP}/probePat.bundle.mjs`;

fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
};
const mod = await import('${ROOT_URL}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { cm } = await import(pathToFileURL(BUNDLE).href);
const { startCareer, playNextEntry, startNegotiation, makeOffer, buildMarket, saveCareer, loadCareer } = cm;

let s = startCareer('Everton');
let guard = 0;
while (guard < 60 && s.transferWindow === null) {
  guard += 1;
  const r = playNextEntry(s, { skipHalftime: true });
  if (!r || !r.state) break;
  s = r.state;
}
const market = buildMarket(s);
const target = market.find(m => m.price < s.budget * 0.6) ?? market[0];
s = startNegotiation(s, target) ?? s;
// Force the opener to the NEW minimum so nothing about this is a legacy save.
s.negotiation.patience = 4;
console.log('opener patience 4 (a save the CURRENT build writes), ask', s.negotiation.theirAsk);

// An insulting lowball: costs 2.
let t = makeOffer(s, Math.round(s.negotiation.theirAsk * 0.6 * 10) / 10);
console.log('after one insulting offer -> status', t.negotiation.status, 'stage', t.negotiation.stage, 'patience', t.negotiation.patience);
saveCareer(t);
const back = loadCareer();
console.log('after save + reload        -> status', back.negotiation.status, 'stage', back.negotiation.stage, 'patience', back.negotiation.patience);
console.log(back.negotiation.patience > t.negotiation.patience
  ? `RELOAD REFUNDED ${back.negotiation.patience - t.negotiation.patience} PATIENCE`
  : 'no refund');
