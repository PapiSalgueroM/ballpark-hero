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
   Re-recorded once since, on 2026-10-05, when the review fix made the NFL and
   NHL buttons read the save. That fix was proven to move buttons only: a copy
   of this harness that hashes everything except the button words recorded
   the same digest, all four sports, every card and every draw line, on the
   tree before the fix and the tree after it. The full digest then changed
   on 36 NFL cards (66 of 1,920 draws) and 19 NHL cards (13 of 1,200 draws),
   and not at all for the NBA and MLB.
   Re-recorded on purpose in Round 1039, which reconciles the life B decks' own
   retirement cards (their farewell answers write the farewell, the jersey
   answers record the club, the NHL walk away no longer caps the rating at
   63). Deck C's cards did not move. The seeded draw changed on four saves,
   each one a reconciled card: NFL saves 238 and 1198 (lifeB_retirementTour,
   whose first answer now reads "Next season is your last"), MLB save 829
   (mlbB_numberRetired, which now records the club) and NHL save 1074
   (nhlB_walkAwayHealthy, which now writes the farewell). The NBA did not move.
   Re-recorded on purpose in Round 1104 (NFL truth and the one bank). Deck C's
   own cards did not change. Measured by running this harness on each of the
   round's commits in turn: the shared bank moved nothing in any sport; the
   commit that made throwback seasons 16 games (it also reworded three NFL
   receipts) changed the NFL draw on 21 of 1,920 saves; paying a rookie his
   draft slot took that to 43 and changed what lifeC_restructure pays (dealt
   480 times before and after: the same deals, other money); the small items
   (no trade card for a man with no contract, the founder only when the bank
   covers him, the franchise record card's new words, Brand work reaching the
   bank) took the NFL to 274 and moved 5 of 1,200 NBA draws and 3 of 1,200 NHL
   draws. MLB did not move at all.
   Re-recorded once more in the same round on 2026-10-09, for the lead's ruling
   that a one sourced figure is never paid: seven later round ends of the 2026
   rookie table lost their one source figure and are paid on the line between
   two sourced picks, which moves rookie pay in rounds three to seven by 0.1M
   a year (0.2M on four slots). Against the recording before it the NFL draw
   changed on 13 of 1,920 saves and lifeC_restructure pays other money (dealt
   480 times before and after). NBA, MLB and NHL are byte equal.
   Re-recorded on purpose in Round 1103 (the NBA numbers), on 2026-10-09, on
   its branch merged with Release AP (head 5320efca), on a GitHub runner.
   Against Release AP's recording the NFL, the MLB and the NHL are byte equal
   and no NBA card changed. One NBA draw of 1,200 moved, save 748: the round's
   fix for a trade demand that could land a player on the club he was already
   on (the same fix Round 1104 made in the NHL) changes which club that save
   is dealt to.

   Section 2, WORDS AGAINST EFFECTS (see its own comment below): the log,
   the button, the gamble's odds, the era's money, the trade's league and
   "nothing else moves", for every card of all four sports. The NFL's grid
   version of this check lived in simNflCareer.mjs and moved here; the NBA,
   MLB and NHL harnesses keep their pass on the saves their fleets played
   (decks A and B's flags, real contracts), which a grid cannot build.

   Measured 2026-10-03 (deterministic: the grid and every roll are fixed,
   so these are exact run to run), plays / at a gamble's edge / era money
   pairs / trades or claims:
     nfl  8,460 / 1,294 / 3,840 / 0    nba 11,268 / 1,464 / 1,812 / 320
     mlb 11,892 / 2,394 / 4,128 / 80   nhl 11,882 / 2,222 / 1,572 / 556
   (era money remeasured 2026-10-05: it now pairs EVERY save of today's game
   with the older era instead of the forty save sample the other checks
   play, which had left the NFL at 182 pairs against the 768 its own check
   compared before it moved here; it was 182 / 370 / 384 / 252 then.)
   The floors in FLOORS sit about ten percent under. Since 2026-10-05 the
   buttons are checked on every save, the ceilings included (the counts did
   not move), and every non ceiling home is played a second time with its
   rating AT its potential, the one boundary the grid's 75, 84 and 91 never
   touch: nfl 6,738, nba 7,132, mlb 8,828, nhl 7,744 plays (POT_FLOORS). One
   run of all four sports takes about eight minutes on this machine under
   load.

   Controls, DECKC_CONTROL=<name>, each rewrites one string of the shared
   engine as it is bundled and must turn the named check red (measured on
   one sport each, DECKC_ONLY; remeasured 2026-10-05 with the second pass):
     lieword    the report says one more morale than moved 15,728 [words] (nhl)
     tallylie   the NFL tally says one less health           4,784 [words] (nfl)
     blindchip  the chip stops reading the save               919 [button] (nba)
                                                              962 [button] (nfl)
                                                              478 [button] (nhl)
     loaded     every gamble wins ten points more often     3,488 [odds] (nhl)
     flatmoney  deck C pays today's money in every era      3,456 [era money] (nfl)
                (remeasured 2026-10-05 on the every save      1,500 [era money] (nba)
                pass; it was 132 on mlb's sample)             1,056 [era money] (mlb)
                                                                180 [era money] (nhl)
     eraless    a trade forgets the career's era               16 [trade] (nba)
     paycut     a morale lift over 3 cuts the salary         3,780 [held] (nfl)
     potedge    a rating at its potential reads as stuck     2,450 [button] (nba)
                (pot + 1 becomes pot, the review's            2,366 [button] (mlb)
                mutation B, green here before the pass)       1,444 [button] (nhl)

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
  nfl: { lib: 'nflMyCareer', lifeC: 'nflCareerLifeC', getC: 'getNflLifeEventsC', start: 'startCareer', draw: 'drawEvent', arche: 'ARCHETYPES', eras: 'NFL_ERAS', playoff: 'Lost in the Wild Card round', era: 'nflEraById', teams: null, catalog: null },
  nba: { lib: 'nbaMyCareer', lifeC: 'nbaCareerLifeC', getC: 'getNbaLifeEventsC', start: 'startNbaCareer', draw: 'drawNbaEvent', arche: 'NBA_ARCHETYPES', eras: 'NBA_ERAS', playoff: 'Lost in the first round', era: 'nbaEraById', teams: 'nbaEraTeamIds', catalog: 'NBA_LIFE_C' },
  mlb: { lib: 'mlbMyCareer', lifeC: 'mlbCareerLifeC', getC: 'getMlbLifeEventsC', start: 'startMlbCareer', draw: 'drawMlbEvent', arche: 'MLB_ARCHETYPES', eras: 'MLB_ERAS', playoff: 'Lost in the Wild Card Series', era: 'mlbEraById', teams: 'mlbEraTeamIds', catalog: 'MLB_LIFE_C' },
  nhl: { lib: 'nhlMyCareer', lifeC: 'nhlCareerLifeC', getC: 'getNhlLifeEventsC', start: 'startNhlCareer', draw: 'drawNhlEvent', arche: 'NHL_ARCHETYPES', eras: 'NHL_ERAS', playoff: 'Lost in the first round', era: 'nhlEraById', teams: 'nhlEraTeamIds', catalog: 'NHL_LIFE_C' },
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

/* NEGATIVE CONTROLS. DECKC_CONTROL=<name> rewrites one string of the shared
   engine as it is bundled (nothing on disk changes). Each refuses to run when
   its string is not in the file exactly once, skips the replay (which any
   change turns red) and must turn section 2 red on the check it names. */
const ENGINE = 'usCareerDeckC.ts';
const CONTROLS = {
  lieword: { check: 'words', /* the report line says one more morale than moved */
    old: 'if (m.morale) parts.push(`morale ${signed(m.morale)}`);', neu: 'if (m.morale) parts.push(`morale ${signed(m.morale + 1)}`);' },
  tallylie: { check: 'words', /* the NFL tally misstates health */
    old: 'if (m.health) bits.push(`health ${signed(m.health)}`);', neu: 'if (m.health) bits.push(`health ${signed(m.health - 1)}`);' },
  blindchip: { check: 'button', /* the chip stops reading the save */
    old: '(sport.chipReadsSave ? c : undefined);', neu: '((sport.chipReadsSave && false) ? c : undefined);' },
  loaded: { check: 'odds', /* every gamble wins ten points more often than its data says */
    old: 'return settle(sport, cc, r, r() < o.p ? o.win : o.lose);', neu: 'return settle(sport, cc, r, r() < o.p + 0.1 ? o.win : o.lose);' },
  flatmoney: { check: 'era money', /* deck C pays today's money in every era */
    old: 'const scaled = sport.moneyScale(c) * m;', neu: 'const scaled = m;' },
  potedge: { check: 'button', /* the button thinks a rating at its potential cannot rise */
    old: 'return d > 0 ? c.ovr < Math.min(c.pot + 1, 99)', neu: 'return d > 0 ? c.ovr < Math.min(c.pot, 99)' },
  eraless: { check: 'trade', /* a trade forgets the career's era */
    old: 'const pool = (sport.teamIds ? sport.teamIds(cc) : [])', neu: 'const pool = (sport.teamIds ? sport.teamIds({ ...cc, eraId: undefined }) : [])' },
  paycut: { check: 'held', /* a big morale lift quietly cuts the salary */
    old: 'const nw0 = s.netWorth ?? 0;', neu: 'const nw0 = s.netWorth ?? 0; if ((fx.morale ?? 0) > 3) (s as unknown as { salary: number }).salary = 0.5;' },
};
const CONTROL = process.env.DECKC_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown DECKC_CONTROL ${CONTROL}`); process.exit(2); }
const controlPlugin = {
  name: 'deckc-control',
  setup(b) {
    if (!CONTROL) return;
    const ctl = CONTROLS[CONTROL];
    b.onLoad({ filter: /usCareerDeckC\.ts$/ }, args => {
      const src = readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
      if (src.split(ctl.old).length !== 2) throw new Error(`control ${CONTROL}: its string is not in ${ENGINE} exactly once, refusing to run`);
      return { contents: src.replace(ctl.old, ctl.neu), loader: 'ts' };
    });
  },
};

async function load(key) {
  const sp = SPORTS[key];
  const out = path.join(os.tmpdir(), `deckc-${key}-${process.pid}.mjs`);
  const extra = [sp.getC, sp.catalog].filter(Boolean).join(', ');
  await build({
    stdin: {
      contents: `export * from './src/lib/${sp.lib}.ts';\nexport { ${extra} } from './src/lib/${sp.lifeC}.ts';\n`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': './src' },
    plugins: [controlPlugin],
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
  const homes = new Map(); /* card id to the saves it is dealt on */
  const add = (id, s) => { if (!perCard.has(id)) perCard.set(id, []); perCard.get(id).push(s); };
  const draws = [];
  const g0 = grid(eng, sp);
  g0.forEach((g, gi) => {
    const base = fixture(eng, sp, g);
    const frozen = structuredClone(base);
    const cards = eng[sp.getC](base, mulberry(gi + 1));
    for (const card of cards) {
      const { options, ...face } = card;
      if (!homes.has(card.id)) homes.set(card.id, []);
      homes.get(card.id).push(gi);
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
  return { fixtures: g0.length, cards, draws: sha(draws.join('\n')), drawLines: draws.map(sha), deckCDraws: deckC, homes, grid: g0 };
}

/* Section 2, WORDS AGAINST EFFECTS, one check for all four sports. It moved
   here from the four sport harnesses with the machinery it checks. Every
   card is played on up to HOMES_PER_CARD of the saves it was dealt on (mid
   range and at the ceilings), every option at four rolls, and:
     words      the log line, parsed, equals what moved on the save;
     held       nothing else moved: no salary, contract, position, ceiling,
                age or season; earnings only with pay, the team only with a
                trade or a claim, and at most one flag, by one;
     button     the button names exactly what moved, on every save, at the
                ceilings too: the numbers (NFL) or the directions (NBA, MLB,
                NHL). Every sport's chip reads the save since the review of
                Round 988 found NFL numbers and NHL directions promising
                moves a save at its limit could not make;
     odds       a roll just under the gamble's chance lands its first outcome
                and just over lands its second ("Coin flip" is 0.5);
     era money  the same card on the same save in the older era moves the
                bank by today's amount at the era's scale (on every save of
                today's game, not the sample: see eraMoney);
     trade      a trade or a claim lands on another team of the career's era. */
const HOMES_PER_CARD = 40;
const r2 = x => Math.round(x * 100) / 100;
/** The gamble's roll first, then a seeded stream for what follows it (a
 *  trade's new team), so trades land all over the era's league and not on
 *  the one team a fixed roll picks. A plain option gets the stream alone. */
const rolled = (roll, seed, gamble) => {
  const m = mulberry(seed);
  let first = gamble;
  return () => (first ? ((first = false), roll) : m());
};
/** Floors under what section 2 measured on the shipped decks (the grid and
 *  every roll are fixed, so the counts are exact run to run): a check that
 *  silently stops running goes red. Plays, plays at a gamble's edge, era
 *  money pairs, trades or claims. */
const FLOORS = {
  nfl: [8000, 1200, 3450, 0],
  nba: [10500, 1350, 1630, 280],
  mlb: [11000, 2200, 3700, 60],
  nhl: [11000, 2000, 1400, 480],
};
/** The same for the second pass, every non ceiling home replayed with its
 *  rating at its potential. Measured 2026-10-05 (exact, as above): nfl 6,738,
 *  nba 7,132, mlb 8,828, nhl 7,744; the floors sit about ten percent under. */
const POT_FLOORS = { nfl: 6000, nba: 6400, mlb: 7900, nhl: 7000 };
/** "Rating +1 to 72, morale -3, net worth -0.3M, earned 1.2M" into numbers. */
function parseNumbers(text) {
  const out = { rating: 0, morale: 0, fanbase: 0, health: 0, netWorth: 0, earned: 0 };
  for (const m of text.matchAll(/\b(morale|fanbase|health|rating) ([+-]\d+)\b/gi)) out[m[1].toLowerCase()] += Number(m[2]);
  for (const m of text.matchAll(/\bnet worth ([+-]?\d+(?:\.\d+)?)M/gi)) out.netWorth += Number(m[1]);
  for (const m of text.matchAll(/\bearned ([+-]?\d+(?:\.\d+)?)M/gi)) out.earned += Number(m[1]);
  out.netWorth = r2(out.netWorth);
  out.earned = r2(out.earned);
  return out;
}
const VEC = ['rating', 'morale', 'fanbase', 'health', 'netWorth', 'earned'];
const vkey = v => VEC.map(f => `${f}:${v[f]}`).join('|');
/** "Rating up, fans down, money out, new team" into a sorted word set. */
const dirKey = text => text.toLowerCase().split(', ').map(s => s.trim()).filter(s => s && s !== 'no change').sort().join('|');
function movedOf(b, a) {
  const earned = r2((a.earnings ?? 0) - (b.earnings ?? 0));
  return {
    rating: a.ovr - b.ovr, morale: a.morale - b.morale, fanbase: a.fanbase - b.fanbase, health: a.health - b.health,
    earned, netWorth: r2((a.netWorth ?? 0) - (b.netWorth ?? 0) - earned),
  };
}
function dirsOf(m, traded) {
  const out = [];
  const d = (name, v) => { if (v) out.push(`${name} ${v > 0 ? 'up' : 'down'}`); };
  d('rating', m.rating); d('morale', m.morale); d('fans', m.fanbase); d('health', m.health);
  const cash = r2(m.netWorth + m.earned);
  if (cash) out.push(cash > 0 ? 'money in' : 'money out');
  if (traded) out.push('new team');
  return out.sort().join('|');
}

/** Section 2's era money, on EVERY save of today's game rather than the
 *  HOMES_PER_CARD sample the other checks play: each card dealt there, each
 *  option at a low and a high roll (both sides of a gamble), is played again
 *  on the same save in the older era, and the bank must move by today's
 *  amount at the era's scale. The NFL's own version of this check walked
 *  every home the same way before Round 988 moved it here (768 pairs, floor
 *  700); the sample alone left it 182. Returns the pairs it compared. */
function eraMoney(eng, sp, r, oldEra, scaleOld, fail) {
  if (!oldEra) return 0;
  const catalog = sp.catalog ? eng[sp.catalog] : null;
  let pairs = 0;
  r.grid.forEach((g, gi) => {
    if (g.eraId) return;
    const frozen = fixture(eng, sp, g);
    const twin = fixture(eng, sp, { ...g, eraId: oldEra });
    const theirs = new Map(eng[sp.getC](structuredClone(twin), mulberry(1)).map(e => [e.id, e]));
    for (const card of eng[sp.getC](structuredClone(frozen), mulberry(1))) {
      const tc = theirs.get(card.id);
      if (!tc) continue; /* an era gate can close the card in the older era */
      card.options.forEach((o, k) => {
        const def = catalog ? catalog.find(d => d.id === card.id)?.options[k] : null;
        const gamble = /^(Coin flip|Could go either way): /.test(o.effect) || Boolean(def && 'p' in def);
        [0.01, 0.99].forEach((roll, ri) => {
          const seed = 7000 + gi * 64 + k * 8 + ri;
          const s = structuredClone(frozen), t = structuredClone(twin);
          o.apply(s, rolled(roll, seed, gamble));
          tc.options[k].apply(t, rolled(roll, seed, gamble));
          const moved = movedOf(frozen, s), tm = movedOf(twin, t);
          for (const f of ['netWorth', 'earned']) {
            if (!moved[f]) continue;
            pairs++;
            const want = Math.abs(moved[f]) * scaleOld;
            if (Math.sign(tm[f]) !== Math.sign(moved[f]) || Math.abs(tm[f]) < want - 0.051 || Math.abs(tm[f]) > want + 0.1) {
              fail('era money', `${card.id} option ${k + 1} at ${roll} on save ${gi}: ${f} moves ${moved[f]}M today and ${tm[f]}M in ${oldEra}, where the era's scale says about ${(Math.sign(moved[f]) * want).toFixed(2)}M`);
            }
          }
        });
      });
    }
  });
  return pairs;
}

/** Section 2 for one sport. Returns how many plays it checked. */
function words(eng, sp, key, r, fails) {
  const oldEra = r.grid.find(g => g.eraId)?.eraId;
  const scaleOld = oldEra ? eng[sp.era](oldEra).moneyScale / eng[sp.era](undefined).moneyScale : 1;
  const catalog = sp.catalog ? eng[sp.catalog] : null;
  let plays = 0, eraPairs = 0, trades = 0, oddsPlays = 0, potPlays = 0;
  const fail = (tag, msg) => fails.push(`${key} [${tag}] ${msg}`);
  for (const [id, gis] of r.homes) {
    const step = Math.max(1, Math.floor(gis.length / HOMES_PER_CARD));
    for (let h = 0; h < gis.length; h += step) for (const atPot of [false, true]) {
      const g = r.grid[gis[h]];
      const frozen = fixture(eng, sp, g);
      /* the second pass: the same save with its rating AT its potential, the
         one place a raise of one is still allowed and a raise of more is cut
         (the grid's 75, 84 and 91 never sit there); counted apart, so the
         floors on the first pass keep their meaning */
      if (atPot) { if (g.hi) continue; frozen.ovr = frozen.pot; }
      const card = eng[sp.getC](structuredClone(frozen), mulberry(1)).find(e => e.id === id);
      if (!card && atPot) continue; /* a gate on the rating can close at the ceiling */
      if (!card) { fail('words', `${id} was dealt on save ${gis[h]} in the replay and not here`); continue; }
      card.options.forEach((o, k) => {
        const flip = /^Coin flip: /.test(o.effect);
        const either = /^Could go either way: /.test(o.effect);
        const def = catalog ? catalog.find(d => d.id === id)?.options[k] : null;
        const p = flip ? 0.5 : def && 'p' in def ? def.p : null;
        if ((flip || either) !== (p !== null)) fail('odds', `${id} option ${k + 1}: the button "${o.effect}" and the data disagree on whether it is a gamble`);
        const outcomes = flip ? o.effect.slice(11).split(' or ') : either ? o.effect.slice(21).split(', or ') : [o.effect];
        const rolls = p === null ? [0.01, 0.99] : [0.01, p - 0.0001, p + 0.0001, 0.99];
        for (const [ri, roll] of rolls.entries()) {
          const seed = 4000 + gis[h] * 64 + k * 8 + ri;
          const s = structuredClone(frozen);
          const log = o.apply(s, rolled(roll, seed, p !== null));
          if (atPot) potPlays++; else plays++;
          const moved = movedOf(frozen, s);
          const traded = s.team !== frozen.team;
          /* words */
          const said = parseNumbers(log);
          if (vkey(said) !== vkey(moved)) fail('words', `${id} option ${k + 1} at ${roll}: the log says [${vkey(said)}] and the save moved [${vkey(moved)}]`);
          /* held */
          for (const [f, v] of Object.entries(delta(frozen, s))) {
            if (['ovr', 'morale', 'fanbase', 'health', 'netWorth'].includes(f)) continue;
            if (f === 'earnings' && moved.earned) continue;
            if (f === 'team' && /\b(Traded to|Claimed by) /.test(log)) continue;
            if (f === 'lifeFlags') {
              const was = frozen.lifeFlags || {}, now = v || {};
              const bumped = Object.keys({ ...was, ...now }).filter(x => (now[x] || 0) !== (was[x] || 0));
              if (bumped.length <= 1 && bumped.every(x => (now[x] || 0) === (was[x] || 0) + 1)) continue;
            }
            fail('held', `${id} option ${k + 1} at ${roll}: ${f} changed, and no deck C card may touch it this way`);
          }
          /* odds and button */
          const side = p === null ? 0 : roll < p ? 0 : 1;
          const atEdge = p !== null && Math.abs(roll - p) < 0.001;
          if (def && 'p' in def) {
            const say = side ? def.lose.say : def.win.say;
            if (typeof say === 'string' && !log.startsWith(say)) fail('odds', `${id} option ${k + 1}: a roll of ${roll} against ${p} did not land its ${side ? 'second' : 'first'} outcome`);
          }
          if (atEdge && !atPot) oddsPlays++;
          const tag = atEdge ? 'odds' : 'button';
          const promise = outcomes[side] ?? '';
          if (sp.lib === 'nflMyCareer') {
            if (vkey(parseNumbers(promise)) !== vkey(moved)) fail(tag, `${id} option ${k + 1} at ${roll}: the button says "${promise}" and the code applied [${vkey(moved)}]`);
          } else if (dirKey(promise) !== dirsOf(moved, traded)) {
            fail(tag, `${id} option ${k + 1} at ${roll}: the button says "${promise}" and the save moved [${dirsOf(moved, traded)}]`);
          }
          /* trade */
          if (traded) {
            if (!atPot) trades++;
            if (!sp.teams || !eng[sp.teams](s.eraId).includes(s.team)) fail('trade', `${id} option ${k + 1}: traded to ${s.team}, which is not a team of the career's era (${s.eraId ?? 'today'})`);
          }
        }
      });
    }
  }
  eraPairs = eraMoney(eng, sp, r, oldEra, scaleOld, fail);
  console.log(`   words against effects: ${plays} plays, ${oddsPlays} at a gamble's edge, ${eraPairs} era money pairs, ${trades} trades or claims`);
  if (!plays) fail('words', 'no card was played');
  console.log(`   and ${potPlays} plays again with the rating at its potential`);
  const [fp, fe, fm, ft] = FLOORS[key];
  if (potPlays < POT_FLOORS[key]) fail('coverage', `the potential ceiling pass ran ${potPlays} plays, under its floor ${POT_FLOORS[key]}`);
  if (plays < fp || oddsPlays < fe || eraPairs < fm || trades < ft) {
    fail('coverage', `section 2 ran ${plays}/${oddsPlays}/${eraPairs}/${trades} plays, edges, era pairs and trades, under the floors ${fp}/${fe}/${fm}/${ft}`);
  }
  if (!(scaleOld < 0.9)) fail('era money', `the older era's money scale is ${scaleOld}, too close to today's for the era money check to mean anything`);
  return plays;
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
  if (!RECORD) words(eng, SPORTS[key], key, r, fails);
  const want = recorded[key];
  if (RECORD || CONTROL) continue;
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
if (CONTROL) {
  /* red is the right answer for a control, and only on the check it names */
  const tag = `[${CONTROLS[CONTROL].check}]`;
  const hit = fails.filter(f => f.includes(tag)).length;
  const sports = [...new Set(fails.filter(f => f.includes(tag)).map(f => f.split(' ')[0]))].join(', ');
  console.log(hit
    ? `simUsCareerDeckC control ${CONTROL}: ${hit} ${tag} failure(s) (${sports}), the run is red as it must be`
    : `simUsCareerDeckC control ${CONTROL}: NO ${tag} failure, so the control did not fire and proves nothing`);
  process.exit(hit ? 1 : 0);
}
console.log(fails.length ? `simUsCareerDeckC: ${fails.length} failure(s)` : 'simUsCareerDeckC: all checks passed');
process.exit(fails.length ? 1 : 0);
