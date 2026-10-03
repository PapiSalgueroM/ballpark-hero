/* Round 988: the US My Career life deck C, one harness for all four sports.

   Rounds 917 to 920 each built a deck C (36 cards a sport) with its own copy
   of the machinery: the effect words, the clamps, the gamble, the trade, the
   era money, the chip on the button. Round 988 lifted that machinery into one
   module, src/lib/usCareerDeckC.ts, and each sport's file kept only its cards.

   Section 1, THE REPLAY. Every card of every sport is dealt on a grid of
   saves (each position, both eras, five career lengths, four ages, starter
   and backup, three seasons into the era, mid range and at the ceilings) and
   every option is played at four rolls. The card's words, the log line and
   every field of the save that moved are hashed per card, and the sport's
   own draw (decks A, B, C and the rest together) is played on the same grid
   with a seeded stream. The hashes were recorded on the pack branches' code
   BEFORE the lift (DECKC_RECORD=1 writes scripts/data/usCareerDeckCDigest.json)
   and must match after it: the lift moves no card, no word and no number.

   Run: node scripts/simUsCareerDeckC.mjs        (DECKC_ONLY=nfl for one sport)
*/
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DIGEST_FILE = 'scripts/data/usCareerDeckCDigest.json';
const RECORD = process.env.DECKC_RECORD === '1';
const ONLY = process.env.DECKC_ONLY || '';

const SPORTS = {
  nfl: { lib: 'nflMyCareer', lifeC: 'nflCareerLifeC', getC: 'getNflLifeEventsC', start: 'startCareer', draw: 'drawEvent', arche: 'ARCHETYPES', eras: 'NFL_ERAS', playoff: 'Lost in the Wild Card round' },
  nba: { lib: 'nbaMyCareer', lifeC: 'nbaCareerLifeC', getC: 'getNbaLifeEventsC', start: 'startNbaCareer', draw: 'drawNbaEvent', arche: 'NBA_ARCHETYPES', eras: 'NBA_ERAS', playoff: 'Lost in the first round' },
  mlb: { lib: 'mlbMyCareer', lifeC: 'mlbCareerLifeC', getC: 'getMlbLifeEventsC', start: 'startMlbCareer', draw: 'drawMlbEvent', arche: 'MLB_ARCHETYPES', eras: 'MLB_ERAS', playoff: 'Lost in the Wild Card Series' },
  nhl: { lib: 'nhlMyCareer', lifeC: 'nhlCareerLifeC', getC: 'getNhlLifeEventsC', start: 'startNhlCareer', draw: 'drawNhlEvent', arche: 'NHL_ARCHETYPES', eras: 'NHL_ERAS', playoff: 'Lost in the first round' },
};

const mulberry = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** JSON with sorted keys, so a field written in a different order hashes the same. */
const canon = v => {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
};
const sha = s => createHash('sha1').update(s).digest('hex').slice(0, 16);
/** The fields of the save that an option moved, with their new values. */
const delta = (before, after) => {
  const out = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = canon(before[k]), b = canon(after[k]);
    if (a !== b) out[k] = after[k] === undefined ? null : after[k];
  }
  return out;
};
const ROLLS = [0.01, 0.4999, 0.5001, 0.99];

async function load(key) {
  const sp = SPORTS[key];
  const out = path.join(os.tmpdir(), `deckc-${key}-${process.pid}.mjs`);
  await build({
    stdin: {
      contents: `export * from './src/lib/${sp.lib}.ts';\nexport { ${sp.getC} } from './src/lib/${sp.lifeC}.ts';\n`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': './src' },
  });
  const eng = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* the temp file is the OS's to clear */ }
  return eng;
}

function grid(eng, sp) {
  const eras = [undefined, ...eng[sp.eras].map(e => e.id).filter(id => id !== 'now')].slice(0, 2);
  const out = [];
  let i = 0;
  for (const pos of Object.keys(eng[sp.arche])) for (const eraId of eras) for (const yrs of [0, 1, 2, 4, 9])
    for (const age of [21, 26, 31, 35]) for (const role of ['starter', 'backup']) for (const yearOff of [0, 6, 16]) {
      out.push({ pos, eraId, yrs, age, role, yearOff, hi: i % 5 === 4, playoff: i % 3 === 1, rich: i % 4 === 2, award: i % 7 === 3, mid: i % 3 === 0, early: i % 2 === 0, expiring: i % 4 === 1 });
      i++;
    }
  return out;
}

function fixture(eng, sp, g) {
  const s = eng[sp.start]('Deck Check', g.pos, eng[sp.arche][g.pos][0], mulberry(7), null, g.eraId);
  const year = s.year + g.yearOff;
  const line = i => ({
    year: year - g.yrs + i, team: s.team, age: g.age - g.yrs + i, ovr: 74, games: 60, awards: g.award ? ['All-NBA'] : [],
    teamResult: g.playoff ? sp.playoff : 'Missed the playoffs', salary: s.salary,
  });
  return Object.assign(s, {
    seasons: Array.from({ length: g.yrs }, (_, i) => line(i)), role: g.role, age: g.age, year,
    morale: g.hi ? 99 : 50, fanbase: g.hi ? 99 : 60, health: g.hi ? 79 : 60, ovr: g.hi ? 91 : g.mid ? 84 : 75, pot: 90,
    netWorth: 20, earnings: 30, contractYears: g.rich ? 3 : g.expiring ? 0 : 1, draftPick: g.early ? 12 : 140, salary: g.rich ? s.salary * 4 + 12 : s.salary,
  });
}

/** One sport's replay: per card, every word it shows and every option at
 *  every roll on every save it is dealt on; then the sport's own draw. */
function replay(eng, sp) {
  const perCard = new Map();
  const add = (id, s) => { if (!perCard.has(id)) perCard.set(id, []); perCard.get(id).push(s); };
  const draws = [];
  const g0 = grid(eng, sp);
  g0.forEach((g, gi) => {
    const base = fixture(eng, sp, g);
    const frozen = structuredClone(base);
    const cards = eng[sp.getC](base, mulberry(gi + 1));
    for (const card of cards) {
      const { options, ...face } = card;
      add(card.id, canon({ g: gi, face, options: options.map(o => ({ label: o.label, effect: o.effect })) }));
      options.forEach((o, k) => {
        for (const roll of ROLLS) {
          /* the card dealt on the save, played on a copy of it, the way the
             board plays a card it is holding on the career it renders */
          const s = structuredClone(frozen);
          const log = o.apply(s, () => roll);
          add(card.id, canon({ g: gi, k, roll, log, moved: delta(frozen, s) }));
        }
      });
    }
    /* the sport's own draw, all decks together, on a seeded stream */
    const s = structuredClone(frozen);
    const rng = mulberry(9000 + gi);
    const ev = eng[sp.draw](s, rng);
    const before = structuredClone(s);
    const log = ev.options.length ? ev.options[gi % ev.options.length].apply(s, rng) : '';
    draws.push(canon({ g: gi, id: ev.id, effects: ev.options.map(o => o.effect), log, moved: delta(before, s), next: rng() }));
  });
  const cards = {};
  for (const [id, lines] of [...perCard.entries()].sort()) cards[id] = { dealt: lines.filter(l => !l.includes('"roll"')).length, hash: sha(lines.join('\n')) };
  const deckC = draws.filter(d => /"id":"(lifeC_|nbaC_|mlbC_|nhlC_)/.test(d)).length;
  return { fixtures: g0.length, cards, draws: sha(draws.join('\n')), drawLines: draws.map(sha), deckCDraws: deckC };
}

const fails = [];
const results = {};
const recorded = existsSync(DIGEST_FILE) ? JSON.parse(readFileSync(DIGEST_FILE, 'utf8')) : {};
for (const key of Object.keys(SPORTS)) {
  if (ONLY && ONLY !== key) continue;
  const eng = await load(key);
  const r = replay(eng, SPORTS[key]);
  results[key] = r;
  const n = Object.keys(r.cards).length;
  console.log(`${key}: ${r.fixtures} saves, ${n} deck C cards dealt, ${r.deckCDraws} of ${r.fixtures} draws were deck C, draw hash ${r.draws}`);
  if (n !== 36) fails.push(`${key}: ${n} deck C cards were dealt on the grid, not 36`);
  const want = recorded[key];
  if (RECORD) continue;
  if (!want) { fails.push(`${key}: no recorded digest in ${DIGEST_FILE}`); continue; }
  if (want.draws !== r.draws) {
    const was = want.drawLines || [];
    const diff = r.drawLines.map((l, i) => (l === was[i] ? -1 : i)).filter(i => i >= 0);
    fails.push(`${key}: the seeded draw changed on ${diff.length} of ${r.fixtures} saves (first: save ${diff[0]})`);
  }
  for (const [id, c] of Object.entries(want.cards)) {
    const now = r.cards[id];
    if (!now) fails.push(`${key}: ${id} was dealt before the lift and is not now`);
    else if (now.hash !== c.hash || now.dealt !== c.dealt) fails.push(`${key}: ${id} plays differently after the lift (dealt ${c.dealt} then, ${now.dealt} now)`);
  }
  for (const id of Object.keys(r.cards)) if (!want.cards[id]) fails.push(`${key}: ${id} is dealt now and was not before the lift`);
}
if (RECORD) {
  const merged = { ...recorded };
  for (const [k, r] of Object.entries(results)) merged[k] = { fixtures: r.fixtures, cards: r.cards, draws: r.draws, drawLines: r.drawLines };
  writeFileSync(DIGEST_FILE, `${JSON.stringify(merged, null, 1)}\n`);
  console.log(`recorded ${Object.keys(results).join(', ')} into ${DIGEST_FILE}`);
}

if (!RECORD) {
  for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
  if (fails.length > 40) console.log(`... and ${fails.length - 40} more`);
}
console.log(fails.length ? `simUsCareerDeckC: ${fails.length} failure(s)` : 'simUsCareerDeckC: all checks passed');
process.exit(fails.length ? 1 : 0);
