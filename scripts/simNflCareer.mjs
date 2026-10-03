/* Round 56 playtest harness for NFL My Career.
   Bundles the engine with esbuild and runs full careers headlessly to prove:
   no crashes, all 8 positions produce sane stat lines, progression is slow,
   every event id is reachable, the shop works, and the corruption meter
   actually convicts people. Run: node scripts/simNflCareer.mjs [careers]

   Round 917: deck C (36 cards) and what changed here with it.
   - The fleet now plays the depth chart the way the board does
     (nflAssignRole on draft day, nflCampBattle before every season) and every
     fifth career is a 2005 throwback. Before this no career in the fleet was
     ever a backup or ever met a pre 2012 league, so those cards could not fire.
   - The default fleet is 400 careers, not 80. Measured 2026-10-02 without the
     depth chart: 80 careers drew 28 of 36 deck C cards and 400 drew 31, the
     five missing all being backup cards. With the depth chart, 400 careers
     drew 36 of 36 on the filename seed and on SIM_SEED 1 to 8, nine runs out
     of nine. The floor is 34, two cards under what every run measured.
   - Deck C's share of offseason draws measured 9 or 10 percent on all nine
     runs. The band is 4 to 16: under it the deck is not really in the draw,
     over it the deck is crowding out the other 115 cards.
   - Backup seasons measured 28 to 31 percent, average peak rating 81.6 to
     82.2 (81.7 on the old fleet before deck C). Printed, not banded: they are
     simDepthChart's and simCareerRealism's to judge.
   - Words against effects, 2,000 draws a card: see the section below.
   - Controls, each of which must turn the run red:
       NFL_CAREER_CONTROL=brokencard   (605 disagreements, one card, measured)
       NFL_CAREER_CONTROL=paycut       (768 disagreements, the restructure card)
       NFL_CAREER_CONTROL=nodeck       (deck C fired 0 of 36)

   Round 917 review, three checks the first version did not have:
   - WHO GETS DEALT WHAT. Removing the 2020 gate from the practice squad card,
     or the backup gate from a backup card, stayed green before: the words
     check only proves what a card does once dealt. Now every rule line is
     checked on both sides (2019 and 2020, 2011 and 2012, the three injured
     reserve eras, starter against backup, kicker, quarterback, and the
     early years windows). 1,628 checks, deterministic.
   - COIN FLIP ODDS. Seven "Coin flip:" buttons used to win 35 to 60 percent
     of the time and seeing both ends could not tell. Every flip is now
     played at a roll of 0.4999 and 0.5001: 32 rolls, 16 buttons.
   - ERA MONEY. A deck C card that paid 2026 money to a 2005 career stayed
     green. 768 bank moves are compared today against 2005 at the era's
     scale (0.32). The floor is 700; the count is deterministic.
   Measured after the review's fixes, 400 careers: deck C fired 36 of 36 on
   the filename seed and on SIM_SEED 1 to 8, share 9 to 11 percent, backup
   seasons 28 to 31 percent, average peak 81.4 to 82.0.
   Controls for those checks, each measured red on a 40 career fleet:
       NFL_CAREER_CONTROL=nogate       (the 2020 rule reaches 2019: 32 failures)
       NFL_CAREER_CONTROL=nobackup     (a backup card reaches starters: 160)
       NFL_CAREER_CONTROL=earlywindow  (the second year card at yrs 2: 8)
       NFL_CAREER_CONTROL=loadedflip   (every flip at 0.6: 16 failures)
       NFL_CAREER_CONTROL=flatcash     (deck C pays 2026 money in 2005: 640)
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { unlinkSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/* Round 917: NEGATIVE CONTROLS. NFL_CAREER_CONTROL=<name> rewrites one string
   of the source as it is bundled (nothing on disk changes) and the run must
   then FAIL. Each control refuses to run when the string it replaces is not
   in the file, so a green run can never mean "the control did not fire".
     brokencard  one deck C card applies fanbase -4 under a button that says
                 fanbase -3: the words against effects check must go red.
     paycut      the restructure card takes a million off the salary: the
                 "a restructure is not a pay cut" check must go red.
     nodeck      drawEvent stops adding deck C: the coverage check must go red. */
const CONTROL = process.env.NFL_CAREER_CONTROL || '';
const CONTROLS = {
  brokencard: {
    file: 'nflCareerLifeC.ts',
    old: "{ health: 8, fanbase: -3 }, 'You shared the load",
    neu: "{ health: 8, fanbase: -4 }, 'You shared the load",
  },
  paycut: {
    file: 'nflCareerLifeC.ts',
    old: "const s = L(c);\n  const b = {",
    neu: "const s = L(c);\n  if (story.startsWith('The check cleared and the team used the room')) c.salary = c.salary - 1;\n  const b = {",
    needs: "'The check cleared and the team used the room",
  },
  nodeck: {
    file: 'nflMyCareer.ts',
    old: 'deck.push(...getNflLifeEventsC(c, rng));',
    neu: '',
  },
  /* Round 917 review: one per new check below. */
  nogate: { /* the 2020 practice squad rule reaches a 2019 season */
    file: 'nflCareerLifeC.ts',
    old: 'if (c.year >= 2020 && yrs >= 2) {',
    neu: 'if (yrs >= 2) {',
  },
  nobackup: { /* the agent's door opens for starters too */
    file: 'nflCareerLifeC.ts',
    old: 'if (backup && yrs >= 2) {',
    neu: 'if (yrs >= 2) {',
  },
  earlywindow: { /* the second year jump is dealt again before the third year */
    file: 'nflCareerLifeC.ts',
    old: "if (yrs === 1) {\n    deck.push({\n      id: 'lifeC_second_year_jump',",
    neu: "if (yrs >= 1 && yrs <= 2) {\n    deck.push({\n      id: 'lifeC_second_year_jump',",
  },
  loadedflip: { /* every "Coin flip:" button wins 60 percent of the time */
    file: 'nflCareerLifeC.ts',
    old: '(rng() < 0.5 ? land(cc, win, winStory)',
    neu: '(rng() < 0.6 ? land(cc, win, winStory)',
  },
  flatcash: { /* deck C pays 2026 money in every era */
    file: 'nflCareerLifeC.ts',
    old: 'Math.max(0.1, r1(nflEraById(c.eraId).moneyScale * m))',
    neu: 'Math.max(0.1, r1(m))',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown NFL_CAREER_CONTROL ${CONTROL}`); process.exit(2); }
const controlPlugin = {
  name: 'nfl-career-control',
  setup(b) {
    if (!CONTROL) return;
    const ctl = CONTROLS[CONTROL];
    b.onLoad({ filter: new RegExp(ctl.file.replace('.', '\\.') + '$') }, args => {
      const src = readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
      if (!src.includes(ctl.old)) throw new Error(`control ${CONTROL}: the string it replaces is not in ${ctl.file}, refusing to run`);
      if (ctl.needs && !src.includes(ctl.needs)) throw new Error(`control ${CONTROL}: the text it keys on is not in ${ctl.file}, refusing to run`);
      return { contents: src.replace(ctl.old, ctl.neu), loader: 'ts' };
    });
  },
};

const OUT = path.join(os.tmpdir(), `nfl-engine-${process.pid}.mjs`);
await build({
  /* One bundle, two doors: the engine, and deck C's own builder for the
     words against effects check (one module instance, so they agree). */
  stdin: {
    contents: "export * from './src/lib/nflMyCareer.ts';\nexport { getNflLifeEventsC } from './src/lib/nflCareerLifeC.ts';\n",
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' }, plugins: [controlPlugin],
});
const eng = await import(pathToFileURL(OUT).href);
const {
  ARCHETYPES, startCareer, simSeason, progress, drawEvent, shouldRetire,
  legacyOf, careerTotals, rollTeamQuality, marketSalary,
  NFL_SPEND_ITEMS, buyNflItem, nflAssignRole, nflCampBattle, getNflLifeEventsC, nflEraById,
} = eng;

const CAREERS = Number(process.argv[2] || 400);
/* Round 917: deck C's numbers. See the header for how each was measured. */
const LIFE_C_CARDS = 36;
const LIFE_C_MIN_FIRED = 34;
const LIFE_C_FLEET_FLOOR = 400;
const LIFE_C_SHARE = [0.04, 0.16];
const FLIP_CHECKS_MIN = 32; /* 16 coin flip buttons, two rolls each */
const CASH_CHECKS_MIN = 700; /* measured 768 (deterministic: the grid draws no rng), see the header */
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];

const seenEventIds = new Set();
const buyable = new Set();
const byPos = {};
let crashes = 0, suspensions = 0, nanHits = 0, emptyStatLines = 0, backupSeasons = 0, seasonsPlayed = 0, eventDraws = 0;
const lifeCDraws = new Map();
const peaks = [];

for (let i = 0; i < CAREERS; i++) {
  try {
    const pos = POSITIONS[i % POSITIONS.length];
    const arch = ARCHETYPES[pos][i % ARCHETYPES[pos].length];
    /* Round 917: every fifth career is a 2005 throwback, so the cards gated on
       the year a league rule arrived are drawn on both sides of it. */
    let c = startCareer(`Sim ${i}`, pos, arch, Math.random, null, i % 5 === 4 ? 'y2005' : undefined);
    /* Round 917: the depth chart, played the way the board plays it (set on
       draft day, fought for in every camp). Without it no career in this
       fleet was ever a backup and the backup's cards could not be drawn. */
    let tq = rollTeamQuality(null, Math.random);
    nflAssignRole(c, tq, Math.random);
    let peak = c.ovr;
    let guard = 0;

    while (!c.retired && guard++ < 30) {
      // A suspension costs the season.
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({
          year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0,
          awards: [], teamResult: 'SUSPENDED', salary: 0,
        });
        suspensions++;
      } else {
        tq = rollTeamQuality(tq, Math.random);
        nflCampBattle(c, tq, Math.random); /* every season starts with a camp */
        if (c.role === 'backup') backupSeasons++;
        const { line } = simSeason(c, tq, Math.random);
        // every position must produce at least one real stat
        const hasStat = [line.passYds, line.rushYds, line.rec, line.tackles, line.sacks, line.picks, line.fgMade]
          .some(v => typeof v === 'number' && v > 0);
        if (!hasStat) emptyStatLines++;
        for (const v of Object.values(line)) {
          if (typeof v === 'number' && Number.isNaN(v)) nanHits++;
        }
        (byPos[pos] ||= []).push(line);
        seasonsPlayed++;
      }

      progress(c, Math.random);
      if (c.ovr > peak) peak = c.ovr;

      // draw and resolve an offseason event
      const ev = drawEvent(c, Math.random);
      if (ev) {
        seenEventIds.add(ev.id);
        eventDraws++;
        if (ev.id.startsWith('lifeC_')) lifeCDraws.set(ev.id, (lifeCDraws.get(ev.id) ?? 0) + 1);
        const pick = ev.options[Math.floor(Math.random() * ev.options.length)];
        const log = pick.apply(c, Math.random);
        if (typeof log !== 'string') throw new Error(`event ${ev.id} option returned ${typeof log}, expected string`);
      }

      // exercise the shop on a rich clone every few years
      if (guard % 3 === 0) {
        let shopState = { ...c, netWorth: 300, fanbase: 95, dirtyMoney: 8, purchased: [...(c.purchased ?? [])] };
        for (const item of NFL_SPEND_ITEMS) {
          const res = buyNflItem(shopState, item.id);
          if (res) { buyable.add(item.id); shopState = res.state; }
        }
      }

      if (shouldRetire(c)) c.retired = true;
    }

    peaks.push(peak);
    const totals = careerTotals(c);
    const legacy = legacyOf(c);
    if (Number.isNaN(legacy.score) || Number.isNaN(marketSalary(c))) nanHits++;
    if (totals == null) throw new Error('careerTotals returned null');
  } catch (err) {
    crashes++;
    if (crashes <= 3) console.error(`CAREER ${i} CRASHED:`, err && err.message);
  }
}

/* ── Round 917: WORDS AGAINST EFFECTS, deck C ────────────────────────────────
   Every deck C card is found on a fixture it is eligible for and played
   DRAWS_PER_CARD times, options in turn. Three things are checked on every
   single draw, and one per option:
     - the log line's words (parsed, not trusted) equal what moved on the save;
     - nothing the words cannot name moved: salary, contract years, team,
       position, ceiling, earnings (a restructure is not a pay cut);
     - a plain option's button says exactly what was applied; a "Coin flip:"
       button names every outcome that was seen, and every outcome it names
       was seen.
   The fixture sits mid range (morale 50, health 60, rating 15 under its
   ceiling) so no clamp hides a wrong number; a second pass at the ceilings
   then proves the log still tells the truth when a clamp does bite. */
const DRAWS_PER_CARD = 2000;
const mulberry = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const FIELDS = ['morale', 'fanbase', 'health', 'rating', 'cash'];
/** "Morale +5, health -2, net worth -0.3M" into { morale: 5, health: -2, cash: -0.3 }. */
function parseWords(text) {
  const out = { morale: 0, fanbase: 0, health: 0, rating: 0, cash: 0 };
  for (const m of text.matchAll(/\b(morale|fanbase|health|rating) ([+-]\d+)\b/gi)) out[m[1].toLowerCase()] += Number(m[2]);
  for (const m of text.matchAll(/\bnet worth ([+-]\d+(?:\.\d+)?)M/gi)) out.cash += Number(m[1]);
  return out;
}
const vecKey = v => FIELDS.map(f => `${f}:${Math.round(v[f] * 10) / 10}`).join('|');
const snapshot = s => ({ morale: s.morale, fanbase: s.fanbase, health: s.health, rating: s.ovr, cash: s.netWorth ?? 0 });
const HELD = ['salary', 'contractYears', 'team', 'pos', 'pot', 'earnings', 'age', 'year'];

function fixtureFor(pos, o) {
  const s = startCareer('Words Check', pos, ARCHETYPES[pos][0], mulberry(7), null, o.eraId);
  const line = { year: o.year - 1, team: s.team, age: o.age - 1, ovr: 75, games: 16, awards: [], teamResult: 'Missed the playoffs', salary: 10 };
  return Object.assign(s, {
    seasons: Array.from({ length: o.yrs }, () => ({ ...line })), role: o.role, age: o.age, year: o.year,
    morale: o.hi ? 99 : 50, fanbase: o.hi ? 99 : 60, health: o.hi ? 79 : 60,
    ovr: o.hi ? 91 : 75, pot: 90, netWorth: 20, salary: 12, contractYears: 3, earnings: 30,
  });
}
const GRID = [];
for (const eraId of [undefined, 'y2005']) for (const year of [2008, 2026]) for (const role of ['starter', 'backup'])
  for (const yrs of [1, 2, 6]) for (const age of [23, 32]) GRID.push({ eraId, year, role, yrs, age });

/* The card list is read off the source with its comments stripped (a guard
   that reads source reads the code, not the prose), so a card added to the
   file and never drawn, or never checked, shows up by name. */
const LIFE_C_SRC = readFileSync('src/lib/nflCareerLifeC.ts', 'utf8').replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LIFE_C_IDS = [...LIFE_C_SRC.matchAll(/id: '(lifeC_[a-z0-9_]+)'/g)].map(m => m[1]);

const wordFails = [];
let wordDraws = 0, wordCards = 0, clampDraws = 0, flipChecks = 0, cashChecks = 0;
const ERA_SCALE = nflEraById('y2005').moneyScale;
for (const id of LIFE_C_IDS) {
  /* every fixture the card is eligible on: an era card is checked in both. */
  const homes = [];
  for (const pos of POSITIONS) for (const g of GRID) {
    if (getNflLifeEventsC(fixtureFor(pos, g), mulberry(1)).some(e => e.id === id)) homes.push({ pos, g });
  }
  if (!homes.length) { wordFails.push(`${id}: no fixture in the grid makes this card eligible, so it was not checked`); continue; }
  wordCards++;
  const card0 = getNflLifeEventsC(fixtureFor(homes[0].pos, homes[0].g), mulberry(1)).find(e => e.id === id);
  const seen = card0.options.map(() => new Set());
  const buttons = card0.options.map(() => new Set());
  const rng = mulberry(917 + wordCards);
  for (let d = 0; d < DRAWS_PER_CARD; d++) {
    const home = homes[d % homes.length];
    const hi = d % 10 === 9; /* one draw in ten at the ceilings */
    const s = fixtureFor(home.pos, { ...home.g, hi });
    const card = getNflLifeEventsC(s, rng).find(e => e.id === id);
    if (!card) { if (!hi) wordFails.push(`${id}: eligible on a fixture and then missing from the deck on the same fixture`); continue; }
    const k = Math.floor(d / homes.length) % card.options.length;
    const before = snapshot(s), held = HELD.map(f => s[f]);
    const log = card.options[k].apply(s, rng);
    const after = snapshot(s);
    const moved = Object.fromEntries(FIELDS.map(f => [f, Math.round((after[f] - before[f]) * 10) / 10]));
    const said = parseWords(log);
    if (vecKey(said) !== vecKey(moved)) wordFails.push(`${id} option ${k + 1}: the log says [${vecKey(said)}] and the save moved [${vecKey(moved)}]`);
    HELD.forEach((f, i) => { if (s[f] !== held[i]) wordFails.push(`${id} option ${k + 1}: ${f} changed from ${held[i]} to ${s[f]}, and no deck C card may touch it`); });
    if (hi) { clampDraws++; continue; }
    wordDraws++;
    seen[k].add(vecKey(moved));
    /* the button on THIS fixture (money is in the era's own scale) */
    const effect = card.options[k].effect;
    buttons[k].add(effect);
    const promised = /^Coin flip: /.test(effect)
      ? effect.replace(/^Coin flip: /, '').split(' or ').map(p => vecKey(parseWords(p)))
      : [vecKey(parseWords(effect))];
    if (!promised.includes(vecKey(moved))) wordFails.push(`${id} option ${k + 1}: the button says "${effect}" and the code applied [${vecKey(moved)}]`);
    if (/^Coin flip: /.test(effect) && promised.length !== 2) wordFails.push(`${id} option ${k + 1}: a coin flip button must name two outcomes, "${effect}"`);
  }
  card0.options.forEach((o, k) => {
    /* A button's words change with the era's money and the year's rule, so
       the count is per distinct button: one outcome each when plain, two
       when it is a coin flip. */
    const flips = [...buttons[k]].filter(b => /^Coin flip: /.test(b)).length;
    const want = (buttons[k].size - flips) + flips * 2;
    if (seen[k].size > want) wordFails.push(`${id} option ${k + 1}: ${buttons[k].size} button wording(s) and ${seen[k].size} different outcomes`);
    if (flips && seen[k].size < 2) wordFails.push(`${id} option ${k + 1}: a coin flip button and only one outcome ever seen`);
  });
  /* Round 917 review: "Coin flip:" promises even odds, and seeing both ends
     says nothing about the odds. Each flip is played at a roll of 0.4999 and
     of 0.5001 on a fresh mid range fixture: the first must land the outcome
     the button names first, the second the other, so a chance of 0.45 or
     0.55 cannot pass. (Control: loadedflip.) */
  card0.options.forEach((o, k) => {
    if (!/^Coin flip: /.test(o.effect)) return;
    const promised = o.effect.replace(/^Coin flip: /, '').split(' or ').map(p => vecKey(parseWords(p)));
    [0.4999, 0.5001].forEach((roll, side) => {
      const s = fixtureFor(homes[0].pos, homes[0].g);
      const card = getNflLifeEventsC(s, mulberry(1)).find(e => e.id === id);
      const before = snapshot(s);
      card.options[k].apply(s, () => roll);
      const after = snapshot(s);
      const moved = vecKey(Object.fromEntries(FIELDS.map(f => [f, Math.round((after[f] - before[f]) * 10) / 10])));
      flipChecks++;
      if (moved !== promised[side]) wordFails.push(`${id} option ${k + 1}: "${o.effect}" is sold as a coin flip, and a roll of ${roll} landed [${moved}], not its ${side ? 'second' : 'first'} outcome`);
    });
  });
  /* Round 917 review: deck C's money is the era's money. Every home in
     today's game is paired with the same fixture in the 2005 era, and the
     bank must move by the 2026 amount at the era's scale: to the tenth, and
     at most 0.1 over it where the floor of 0.1 bites. (Control: flatcash.) */
  for (const h of homes) {
    if (h.g.eraId) continue;
    const twin = homes.find(t => t.g.eraId === 'y2005' && t.pos === h.pos && t.g.year === h.g.year
      && t.g.role === h.g.role && t.g.yrs === h.g.yrs && t.g.age === h.g.age);
    if (!twin) continue;
    card0.options.forEach((_, k) => {
      for (const roll of [0.25, 0.75]) {
        const a = fixtureFor(h.pos, h.g), b = fixtureFor(twin.pos, twin.g);
        const na = a.netWorth, nb = b.netWorth;
        getNflLifeEventsC(a, mulberry(1)).find(e => e.id === id).options[k].apply(a, () => roll);
        getNflLifeEventsC(b, mulberry(1)).find(e => e.id === id).options[k].apply(b, () => roll);
        const dNow = Math.round((a.netWorth - na) * 10) / 10, dEra = Math.round((b.netWorth - nb) * 10) / 10;
        if (!dNow) continue;
        cashChecks++;
        const want = Math.abs(dNow) * ERA_SCALE;
        if (Math.sign(dEra) !== Math.sign(dNow) || Math.abs(dEra) < want - 0.051 || Math.abs(dEra) > want + 0.1) {
          wordFails.push(`${id} option ${k + 1}: the bank moves ${dNow}M today and ${dEra}M in 2005, where the era's scale says about ${(Math.sign(dNow) * want).toFixed(2)}M`);
        }
      }
    });
  }
}
const wordFailCount = wordFails.length;

/* ── Round 917 review: WHERE A CARD MAY AND MAY NOT BE DEALT ─────────────────
   The words check above proves what a card does once it is dealt; nothing
   proved it is dealt only to the careers its words are true for. Removing
   the 2020 gate from the practice squad card, or the backup gate from a
   backup card, stayed green. Each rule below is checked on both sides of its
   line, so a gate that is dropped or moved goes red. (Control: nogate.)
     - practice squad elevation: never in 2019, always in 2020 (from yrs 2);
     - the voluntary spring: never in 2011, always in 2012 (from yrs 2);
     - injured reserve: three eras (to 2011, 2012 to 2019, from 2020), one
       title each, and only the first says the list ends a season;
     - backup cards: never a starter's, never a kicker's, and each one dealt
       to some backup; the kick coverage card never a quarterback's;
     - the early years cards: dealt in exactly the window each one names. */
const gateFails = [];
let gateChecks = 0;
const dealt = (pos, o) => getNflLifeEventsC(fixtureFor(pos, o), mulberry(1));
const has = (pos, o, id) => dealt(pos, o).some(e => e.id === id);
const gate = (ok, why) => { gateChecks++; if (!ok) gateFails.push(why); };
for (const eraId of [undefined, 'y2005']) for (const pos of POSITIONS) for (const role of ['starter', 'backup']) {
  const o = { eraId, role, yrs: 2, age: 27 };
  const tag = `${pos} ${role}${eraId ? ' (2005 era)' : ''}`;
  gate(!has(pos, { ...o, year: 2019 }, 'lifeC_ps_elevation'), `lifeC_ps_elevation dealt to a ${tag} in 2019, before the rule existed`);
  gate(has(pos, { ...o, year: 2020 }, 'lifeC_ps_elevation'), `lifeC_ps_elevation not dealt to a ${tag} in 2020`);
  gate(!has(pos, { ...o, year: 2011 }, 'lifeC_voluntary_spring'), `lifeC_voluntary_spring dealt to a ${tag} in 2011`);
  gate(has(pos, { ...o, year: 2012 }, 'lifeC_voluntary_spring'), `lifeC_voluntary_spring not dealt to a ${tag} in 2012`);
}
{
  const ir = year => dealt('RB', { eraId: 'y2005', year, role: 'starter', yrs: 3, age: 27 }).find(e => e.id === 'lifeC_injured_reserve');
  const [y05, y11, y12, y19, y20, y26] = [2005, 2011, 2012, 2019, 2020, 2026].map(ir);
  if (![y05, y11, y12, y19, y20, y26].every(Boolean)) gate(false, 'lifeC_injured_reserve not dealt to a hurt fixture in every year tested');
  else {
    gate(y05.title === y11.title && y12.title === y19.title && y20.title === y26.title, 'lifeC_injured_reserve: a title changes inside one of its eras');
    gate(new Set([y11.title, y12.title, y20.title]).size === 3, `lifeC_injured_reserve: the three eras do not have three titles (${y11.title} / ${y12.title} / ${y20.title})`);
    gate(/ends a season/.test(y11.body), 'lifeC_injured_reserve: the 2011 body does not say the list ends a season');
    gate(!/ends a season/.test(y12.body) && !/ends a season/.test(y20.body), 'lifeC_injured_reserve: a body from 2012 on still says the list ends a season');
    gate(/very few/.test(y19.body) && !/very few/.test(y20.body), 'lifeC_injured_reserve: the narrow way back is not told in 2019, or still told in 2020');
  }
}
{
  /* Every card's section, read off what the deck deals across the grid. */
  const categoryOf = new Map();
  for (const pos of POSITIONS) for (const g of GRID) for (const e of dealt(pos, g)) categoryOf.set(e.id, e.category);
  const BACKUP_ONLY = [...categoryOf].filter(([, cat]) => cat === 'backup').map(([id]) => id).concat('lifeC_inactive_list');
  gate(BACKUP_ONLY.length >= 5, `only ${BACKUP_ONLY.length} backup cards found, the deck shipped 6`);
  for (const pos of POSITIONS) for (const g of GRID) {
    const ids = dealt(pos, g).map(e => e.id);
    for (const id of BACKUP_ONLY) {
      if (g.role === 'starter') gate(!ids.includes(id), `${id} dealt to a starting ${pos} (${g.year}, yrs ${g.yrs})`);
      if (pos === 'K') gate(!ids.includes(id), `${id} dealt to a kicker, who has no backup role`);
    }
    if (pos === 'QB') gate(!ids.includes('lifeC_kick_coverage'), 'lifeC_kick_coverage dealt to a quarterback');
  }
  for (const id of BACKUP_ONLY) {
    gate(POSITIONS.some(pos => pos !== 'K' && GRID.some(g => g.role === 'backup' && dealt(pos, g).some(e => e.id === id))), `${id} is never dealt to any backup in the grid`);
  }
  /* The early years cards: drawn in the offseason after a season, so yrs 1
     is the offseason before the second year and yrs 2 before the third. */
  const EARLY_WINDOWS = {
    lifeC_playbook_test: [1], lifeC_first_check: [1], lifeC_rookie_wall: [1],
    lifeC_second_year_jump: [1], lifeC_captains_locker: [2],
  };
  const early = [...categoryOf].filter(([, cat]) => cat === 'earlyYears').map(([id]) => id).sort();
  gate(early.join(',') === Object.keys(EARLY_WINDOWS).sort().join(','), `the earlyYears cards [${early.join(', ')}] are not the ones this harness has windows for`);
  for (const [id, window] of Object.entries(EARLY_WINDOWS)) for (const pos of POSITIONS) for (let yrs = 1; yrs <= 6; yrs++) {
    const o = { role: 'starter', year: 2026, yrs, age: 23 };
    gate(has(pos, o, id) === window.includes(yrs), `${id} ${window.includes(yrs) ? 'not dealt' : 'dealt'} to a ${pos} at yrs ${yrs}; its window is yrs ${window.join(' or ')}`);
  }
}
const gateFailCount = gateFails.length;

unlinkSync(OUT);

peaks.sort((a, b) => a - b);
const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`);
const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

console.log('\n=== ROUND 56 NFL MY CAREER PLAYTEST ===');
console.log(`careers            : ${CAREERS}`);
console.log(`crashes            : ${crashes}`);
console.log(`NaN values         : ${nanHits}`);
console.log(`empty stat lines   : ${emptyStatLines}  (must be 0, every position needs real stats)`);
console.log(`avg peak OVR       : ${avg(peaks)}  (min ${peaks[0]}, median ${peaks[Math.floor(peaks.length / 2)]}, max ${peaks[peaks.length - 1]})`);
console.log(`peak 95+ rate      : ${pct(peaks.filter(p => p >= 95).length, peaks.length)}  (should be rare)`);
console.log(`suspensions served : ${suspensions}`);
console.log(`distinct events    : ${seenEventIds.size}`);
console.log(`  lifeA fired      : ${[...seenEventIds].filter(id => id.startsWith('lifeA_')).length}/45`);
console.log(`  lifeB fired      : ${[...seenEventIds].filter(id => id.startsWith('lifeB_')).length}/45`);
const lifeCFired = LIFE_C_IDS.filter(id => seenEventIds.has(id)).length;
const lifeCNever = LIFE_C_IDS.filter(id => !seenEventIds.has(id));
const lifeCTotalDraws = [...lifeCDraws.values()].reduce((a, b) => a + b, 0);
console.log(`  lifeC fired      : ${lifeCFired}/${LIFE_C_IDS.length}${lifeCNever.length ? `  (never drawn: ${lifeCNever.join(', ')})` : ''}`);
console.log(`  lifeC share      : ${pct(lifeCTotalDraws, eventDraws)} of offseason draws came from deck C`);
console.log(`  backup seasons   : ${pct(backupSeasons, seasonsPlayed)} of seasons were played as the backup`);
console.log(`  corruption fired : ${[...seenEventIds].filter(id => id.startsWith('corr_')).length}`);
console.log(`shop items usable  : ${buyable.size}/${NFL_SPEND_ITEMS.length}`);
console.log(`words vs effects   : ${wordCards}/${LIFE_C_IDS.length} deck C cards checked, ${wordDraws} draws mid range and ${clampDraws} at the ceilings, ${wordFailCount} disagreements`);
const wordKinds = [...new Set(wordFails)];
for (const f of wordKinds.slice(0, 8)) console.log(`  WORDS: ${f}`);
if (wordKinds.length > 8) console.log(`  WORDS: and ${wordKinds.length - 8} more kinds`);
console.log(`coin flip odds     : ${flipChecks} rolls at 0.4999 and 0.5001 across every "Coin flip:" button`);
console.log(`era money          : ${cashChecks} bank moves compared today against 2005 (scale ${ERA_SCALE})`);
console.log(`who gets dealt what: ${gateChecks} checks on both sides of every rule line, ${gateFailCount} failed`);
const gateKinds = [...new Set(gateFails)];
for (const f of gateKinds.slice(0, 8)) console.log(`  GATE: ${f}`);
if (gateKinds.length > 8) console.log(`  GATE: and ${gateKinds.length - 8} more kinds`);
console.log('\nsample stat lines by position:');
for (const p of POSITIONS) {
  const lines = byPos[p] || [];
  if (!lines.length) { console.log(`  ${p.padEnd(5)} NO SEASONS`); continue; }
  const best = lines.reduce((a, b) => (b.games > a.games ? b : a));
  const bits = [];
  if (best.passYds) bits.push(`${best.passYds} pass yds, ${best.passTd} TD, ${best.ints} INT`);
  if (best.rushYds) bits.push(`${best.rushYds} rush yds, ${best.rushTd} TD`);
  if (best.rec) bits.push(`${best.rec} rec, ${best.recYds} yds`);
  if (best.tackles) bits.push(`${best.tackles} tkl`);
  if (best.sacks) bits.push(`${best.sacks} sacks`);
  if (best.picks) bits.push(`${best.picks} INT`);
  if (best.passDef) bits.push(`${best.passDef} PD`);
  if (best.fgMade) bits.push(`${best.fgMade}/${best.fgAtt} FG, long ${best.longFg}`);
  console.log(`  ${p.padEnd(5)} ${bits.join(', ')}`);
}

const fails = [];
if (crashes) fails.push(`${crashes} crashes`);
if (nanHits) fails.push(`${nanHits} NaN values`);
if (emptyStatLines) fails.push(`${emptyStatLines} empty stat lines`);
if (buyable.size < NFL_SPEND_ITEMS.length) fails.push(`${NFL_SPEND_ITEMS.length - buyable.size} shop items unreachable`);
/* Round 917: deck C. */
if (LIFE_C_IDS.length !== LIFE_C_CARDS) fails.push(`deck C holds ${LIFE_C_IDS.length} cards, the round shipped ${LIFE_C_CARDS}`);
if (CAREERS >= LIFE_C_FLEET_FLOOR) {
  if (lifeCFired < LIFE_C_MIN_FIRED) fails.push(`deck C fired ${lifeCFired} of ${LIFE_C_IDS.length}, the floor is ${LIFE_C_MIN_FIRED} (never drawn: ${lifeCNever.join(', ') || 'none'})`);
  const share = lifeCTotalDraws / Math.max(1, eventDraws);
  if (share < LIFE_C_SHARE[0] || share > LIFE_C_SHARE[1]) fails.push(`deck C is ${(share * 100).toFixed(1)}% of offseason draws, outside ${LIFE_C_SHARE[0] * 100} to ${LIFE_C_SHARE[1] * 100}%`);
} else {
  console.log(`\nNOTE: deck C coverage and share are only judged on a fleet of ${LIFE_C_FLEET_FLOOR} careers or more; this run had ${CAREERS}.`);
}
if (wordFailCount) fails.push(`${wordFailCount} deck C words against effects disagreements`);
if (wordCards < LIFE_C_IDS.length) fails.push(`${LIFE_C_IDS.length - wordCards} deck C cards never reached the words check`);
/* Round 917 review: the floors below are the counts measured on the shipped
   deck (see the header), so a check that silently stops running goes red. */
if (flipChecks < FLIP_CHECKS_MIN) fails.push(`only ${flipChecks} coin flip rolls checked, the deck has ${FLIP_CHECKS_MIN / 2} coin flip buttons`);
if (cashChecks < CASH_CHECKS_MIN) fails.push(`only ${cashChecks} era money comparisons made, the floor is ${CASH_CHECKS_MIN}`);
if (!(ERA_SCALE < 0.9)) fails.push(`the 2005 money scale is ${ERA_SCALE}, too close to 1 for the era money check to mean anything`);
if (gateFailCount) fails.push(`${gateFailCount} cards dealt where their words are not true, or not dealt where they are`);
if (CONTROL) console.log(`\nCONTROL ${CONTROL} is on: this run is EXPECTED to fail.`);
console.log(fails.length ? `\nFAIL: ${fails.join('; ')}` : '\nPASS: no crashes, every position produces stats, shop fully reachable, deck C drawn and its words true, its coin flips even, its money in the era, and every card dealt only where its words hold');
process.exit(fails.length ? 1 : 0);
