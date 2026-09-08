import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/cmProbe.entry.mjs`;
const BUNDLE = `${TMP}/cmProbe.bundle.mjs`;

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
const { startCareer, buildMarket, startNegotiation, makeOffer } = cm;

function fresh(club = 'Aston Villa') { return startCareer(club); }
function openDeal(state, lo = 12, hi = 45) {
  const market = buildMarket(state);
  const target = market.find(m => m.price >= lo && m.price <= Math.min(hi, state.budget * 0.8) && !m.generated);
  if (!target) return null;
  const opened = startNegotiation(state, target);
  if (!opened || !opened.negotiation) return null;
  return { state: opened, target };
}

const clubs = ['Aston Villa', 'Napoli', 'Sevilla', 'Ajax'];
console.log('--- per club openDeal probe (12 iterations, section 4 pattern) ---');
for (const c of clubs) {
  let opened = 0, budgets = [], cap = [];
  for (let i = 0; i < 8; i++) {
    const s = fresh(c);
    budgets.push(s.budget);
    cap.push(Math.min(45, s.budget * 0.8));
    const o = openDeal(s);
    if (o) opened += 1;
  }
  console.log(`${c}: opened ${opened}/8, budgets ${budgets.map(b => Math.round(b * 10) / 10).join(',')}, cap ${cap.map(b => Math.round(b * 10) / 10).join(',')}`);
}

console.log('--- section 4 replay ---');
let checked = 0;
let openedCount = 0;
const perClub = {};
for (let i = 0; i < 12; i++) {
  const club = ['Aston Villa', 'Napoli', 'Sevilla'][i % 3];
  const opened = openDeal(fresh(club));
  if (!opened) { perClub[club] = (perClub[club] || 0); continue; }
  openedCount += 1;
  const st = opened.state;
  const ask = st.negotiation.theirAsk;
  const after = makeOffer(st, ask);
  if (!after) { console.log('makeOffer refused a full ask'); continue; }
  const neg = after.negotiation;
  if (neg.phase !== 'terms') { console.log(`phase ${neg.phase}`); continue; }
  checked += 1;
  perClub[club] = (perClub[club] || 0) + 1;
}
console.log(`opened ${openedCount}/12, checked ${checked}`, perClub);
