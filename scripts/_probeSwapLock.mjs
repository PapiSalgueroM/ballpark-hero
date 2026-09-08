import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/probeSwap.entry.mjs`;
const BUNDLE = `${TMP}/probeSwap.bundle.mjs`;

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT_URL}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, startNegotiation, makeOffer, buildMarket,
  canLeaveSquad, dealPackageValue, sellValue, loanOutPlayer, offerTerms,
} = cm;

let s = startCareer('Everton');
// Get into an open transfer window.
let guard = 0;
while (guard < 60 && s.transferWindow === null) {
  guard += 1;
  const r = playNextEntry(s, { skipHalftime: true });
  if (!r || !r.state) break;
  s = r.state;
}
console.log('window:', s.transferWindow, 'squad', s.squad.length, 'budget', s.budget);

const market = buildMarket(s);
const target = market.find(m => m.price < s.budget * 0.8) ?? market[0];
console.log('target:', target.name, target.club, 'price', target.price);

s = startNegotiation(s, target) ?? s;
console.log('neg open:', s.negotiation?.status, 'ask', s.negotiation?.theirAsk);

const swap = [...s.squad].filter(p => canLeaveSquad(s, p)).sort((a, b) => sellValue(b) - sellValue(a))[3];
console.log('swap man:', swap.name, 'sellValue', sellValue(swap), 'canLeave BEFORE any offer:', canLeaveSquad(s, swap));

const extras = { swapId: swap.id };
console.log('package with swap BEFORE offer:', dealPackageValue(s, s.negotiation.theirAsk, 10, extras));

// A deliberately low first offer so the talks stay open.
const first = makeOffer(s, 5, extras);
console.log('after offer 1 -> status', first.negotiation?.status, '| note:', first.negotiation?.note);
console.log('lastExtras:', JSON.stringify(first.negotiation?.lastExtras));
console.log('canLeave AFTER offer 1:', canLeaveSquad(first, swap));
console.log('package with swap AFTER offer 1:', dealPackageValue(first, first.negotiation.theirAsk, 10, extras));
console.log('swapPool still contains him?', [...first.squad].filter(p => canLeaveSquad(first, p)).some(p => p.id === swap.id));

if (first.negotiation?.status === 'open' && first.negotiation.phase !== 'terms') {
  const second = makeOffer(first, 8, extras);
  console.log('after offer 2 -> status', second.negotiation?.status, '| stage', second.negotiation?.stage, '| note:', second.negotiation?.note);
  console.log('stage moved?', second.negotiation?.stage !== first.negotiation?.stage);
}
