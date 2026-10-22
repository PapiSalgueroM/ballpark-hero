// Reviewer probe: how often the NEW rules still ask about a namesake the generator's rules miss
// (two rows in one season on different lines of the pitch: Pablo, Alisson, Vitinha, Jesus Angulo,
// Jose Luis Rodriguez), over the same fixture and the same 5,000 daily dates simTriviaBank uses.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const J = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const alpha = J('scripts/data/alphabetSprintPool.json').rows;
const auction = new Map(J('scripts/data/auctionMarketRows.json').map(r => [r.player_name, r.position]));
const stock = J('scripts/data/stockMarketPools.json');
const stockPos = new Map();
for (const s of Object.keys(stock.pools).sort()) for (const r of stock.pools[s]) if (r[1]) stockPos.set(r[0], r[1]);
const realPositions = [...auction.values(), ...stockPos.values()].filter(Boolean);
const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const market = alpha.filter(r => r.player_name && r.market_value_usd).map(r => {
  const known = auction.get(r.player_name) ?? stockPos.get(r.player_name) ?? null;
  return { player_name: r.player_name, position: known ?? realPositions[hash(r.player_name) % realPositions.length], nationality: r.nationality, club: r.club, market_value_usd: Number(r.market_value_usd) };
}).sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0));
const ballonDor = J('scripts/data/ballonDorVerified2026-09.json').rows
  .map(r => ({ year: r.year, rank: r.rank, player_name: r.player_name, nationality: r.nationality, club: r.club, award_type: r.award_type }))
  .sort((a, b) => b.year - a.year || a.rank - b.rank || (a.player_name < b.player_name ? -1 : 1));
const POOL = { market, ballonDor, shirtNumbers: [] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gap1552-'));
const STUB = path.join(tmp, 'client.ts');
fs.writeFileSync(STUB, "export const SUPABASE_URL = 'x'; export const SUPABASE_PUBLISHABLE_KEY = 'x';\nexport const supabase: any = { from() { throw new Error('no database'); } };\n");
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, `export * from '${path.join(ROOT, 'src/lib/triviaQuestionBank.ts').split(path.sep).join('/')}';\n`);
const out = path.join(tmp, 'bank.mjs');
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', absWorkingDir: ROOT,
  alias: { '@/integrations/supabase/client': STUB, '@': path.join(ROOT, 'src') } });
const T = await import(pathToFileURL(out).href);
const GAP = ['Pablo', 'Alisson', 'Vitinha', 'Jesús Angulo', 'José Luis Rodríguez'];
const addDays = (d, k) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86400000).toISOString().slice(0, 10);
let ladders = 0, laddersHit = 0, questions = 0;
const byName = Object.fromEntries(GAP.map(n => [n, 0]));
const examples = [];
for (let k = 0; k < Number(process.env.GAP_LADDERS || 5000); k++) {
  const d = addDays(T.ONE_ANSWER_FROM, k);
  const ladder = T.generateDailyLadder(POOL, d, 15);
  ladders += 1;
  let hit = false;
  for (const q of ladder) {
    const names = GAP.filter(n => q.options.includes(n) || q.question === `Which club was ${n} at in the 2026 market values?` || q.question === `What nationality is ${n}?`);
    if (!names.length) continue;
    hit = true; questions += 1;
    for (const n of names) byName[n] += 1;
    if (examples.length < 10) examples.push(`${d} Q${q.difficulty}: ${q.question} [${q.options.join(' / ')}] right: ${q.options[q.correctIndex]}`);
  }
  if (hit) laddersHit += 1;
}
console.log(`new rules, ${ladders} daily ladders: ${laddersHit} ladders (${(100 * laddersHit / ladders).toFixed(1)}%) carry ${questions} questions naming an unlisted namesake`);
console.log(`by name: ${Object.entries(byName).map(([n, c]) => `${n} ${c}`).join(', ')}`);
console.log(examples.join('\n'));
console.log('gapcount1552: done');
