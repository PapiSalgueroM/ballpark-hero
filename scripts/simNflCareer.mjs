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
   - Words against effects: since Round 988 deck C runs on the shared engine
     (src/lib/usCareerDeckC.ts) and its words, coin flip odds, era money and
     "nothing else moves" checks moved with it to scripts/simUsCareerDeckC.mjs,
     one check for all four sports. The controls brokencard, paycut,
     loadedflip and flatcash went with them (there: tallylie, paycut, loaded,
     flatmoney). What stays here is who gets dealt what.
   - Controls, each of which must turn the run red:
       NFL_CAREER_CONTROL=nodeck       (deck C fired 0 of 36)

   Round 917 review, three checks the first version did not have:
   - WHO GETS DEALT WHAT. Removing the 2020 gate from the practice squad card,
     or the backup gate from a backup card, stayed green before: the words
     check only proves what a card does once dealt. Now every rule line is
     checked on both sides (2019 and 2020, 2011 and 2012, the three injured
     reserve eras, starter against backup, kicker, quarterback, and the
     early years windows). 1,628 checks, deterministic.
   - COIN FLIP ODDS and ERA MONEY: both moved in Round 988 to
     scripts/simUsCareerDeckC.mjs (its odds and era money checks), which
     plays every flip at 0.4999 and 0.5001 and pairs every money card today
     against the older era, for all four sports.
   Measured after the review's fixes, 400 careers: deck C fired 36 of 36 on
   the filename seed and on SIM_SEED 1 to 8, share 9 to 11 percent, backup
   seasons 28 to 31 percent, average peak 81.4 to 82.0.
   Controls for those checks, each measured red on a 40 career fleet:
       NFL_CAREER_CONTROL=nogate       (the 2020 rule reaches 2019: 32 failures)
       NFL_CAREER_CONTROL=nobackup     (a backup card reaches starters: 160)
       NFL_CAREER_CONTROL=earlywindow  (the second year card at yrs 2: 8)

   Round 917 second review, two gaps the first fix left:
   - POSITION AND AGE GATES. Pointing the tight end block at 'WR', or the
     past thirty line at 20, stayed green. Every position card is now dealt
     to every grid fixture of its own position (read off its id) and to no
     other, and every veteran card is checked at 23, 29, 30, 31 and 32 against
     its line (30, or 31 for body_bill, two_clips and booth_audition), for
     every position, role and era. Who gets dealt what: 8,582 checks.
   - RIVALRY BEAT WORDS. The six new beats (218 to 223) are applied 48 times
     and what the player reads is compared with what moved.
   Controls, each measured red on a 40 career fleet:
       NFL_CAREER_CONTROL=wrongpos     (tight end cards go to receivers: 192)
       NFL_CAREER_CONTROL=youngvet     (the 30 line at 20: 128)
       NFL_CAREER_CONTROL=vetline      (the 31 line at 30: 64)
       NFL_CAREER_CONTROL=rivalwords   (beat 223 morale -5 under "-2": 8)
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
     nodeck      drawEvent stops adding deck C: the coverage check must go red.
   Round 988: brokencard, paycut, loadedflip and flatcash moved with the
   words check to scripts/simUsCareerDeckC.mjs. */
const CONTROL = process.env.NFL_CAREER_CONTROL || '';
const CONTROLS = {
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
  /* Round 917 second review: the position and age gates. */
  wrongpos: { /* the tight end cards go to receivers, tight ends get none */
    file: 'nflCareerLifeC.ts',
    old: "if (c.pos === 'TE') {",
    neu: "if (c.pos === 'WR') {",
  },
  youngvet: { /* the past thirty cards reach a 23 year old */
    file: 'nflCareerLifeC.ts',
    old: 'if (c.age >= 30) {',
    neu: 'if (c.age >= 20) {',
  },
  vetline: { /* the 31 line slips to 30, one year early */
    file: 'nflCareerLifeC.ts',
    old: 'if (c.age >= 31) {',
    neu: 'if (c.age >= 30) {',
  },
  rivalwords: { /* beat 223 takes morale -5 under "Morale -2" */
    file: 'nflCareerRivalryEvents.ts',
    old: 's.morale = clamp(s.morale - 2, 0, 100);\n      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 6, 0, 100);',
    neu: 's.morale = clamp(s.morale - 5, 0, 100);\n      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 6, 0, 100);',
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
    contents: "export * from './src/lib/nflMyCareer.ts';\nexport { getNflLifeEventsC } from './src/lib/nflCareerLifeC.ts';\nexport { NFL_RIVALRY_EVENTS } from './src/lib/nflCareerRivalryEvents.ts';\n",
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
  NFL_RIVALRY_EVENTS,
} = eng;

const CAREERS = Number(process.argv[2] || 400);
/* Round 917: deck C's numbers. See the header for how each was measured. */
const LIFE_C_CARDS = 36;
const LIFE_C_MIN_FIRED = 34;
const LIFE_C_FLEET_FLOOR = 400;
const LIFE_C_SHARE = [0.04, 0.16];
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

/* ── Round 917: fixtures and parsers for the deck C checks below ─────────────
   Round 988: the words against effects check that used to sit here (the log
   against the save, nothing else moves, the button, coin flip odds, era
   money) moved with the machinery it checks to scripts/simUsCareerDeckC.mjs,
   one check for all four sports. These helpers serve who gets dealt what and
   the rivalry beat words. */
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


/* ── Round 917 review: WHERE A CARD MAY AND MAY NOT BE DEALT ─────────────────
   The words check (simUsCareerDeckC) proves what a card does once dealt; nothing
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
  /* Round 917 second review: the position and age gates. Pointing the tight
     end block at 'WR', or moving the past thirty line to 20, stayed green.
     A position card's home is read off its id (lifeC_te_ is a tight end's),
     never off where the deck deals it, so a gate aimed at the wrong position
     cannot teach the harness the wrong answer. Every position card is dealt
     to every grid fixture of its own position and to no other position.
     (Control: wrongpos.) */
  const POS_OF_PREFIX = { qb: 'QB', rb: 'RB', wr: 'WR', te: 'TE', lb: 'LB', cb: 'CB', edge: 'EDGE', k: 'K' };
  const homeOf = id => POS_OF_PREFIX[id.replace(/^lifeC_/, '').split('_')[0]];
  const POSITION_IDS = LIFE_C_IDS.filter(id => homeOf(id)).sort();
  const positionCat = [...categoryOf].filter(([, cat]) => cat === 'position').map(([id]) => id).sort();
  gate(positionCat.join(',') === POSITION_IDS.join(','), `the position cards by section [${positionCat.join(', ')}] are not the ones named by position [${POSITION_IDS.join(', ')}]`);
  for (const pos of POSITIONS) {
    gate(POSITION_IDS.filter(id => homeOf(id) === pos).length >= 2, `${pos} has fewer than two position cards`);
    for (const g of GRID) {
      const ids = dealt(pos, g).map(e => e.id);
      for (const id of POSITION_IDS) {
        if (homeOf(id) === pos) gate(ids.includes(id), `${id} not dealt to a ${pos} (${g.year}, ${g.role}, yrs ${g.yrs}, age ${g.age})`);
        else gate(!ids.includes(id), `${id}, a ${homeOf(id)} card, dealt to a ${pos}`);
      }
    }
  }
  /* The past thirty cards, on both sides of each line, for every position,
     role and era. (Controls: youngvet, vetline.) */
  const VET_LINE = { lifeC_vet_rest_day: 30, lifeC_your_replacement: 30, lifeC_body_bill: 31, lifeC_two_clips: 31, lifeC_booth_audition: 31 };
  const vets = [...categoryOf].filter(([, cat]) => cat === 'veteran').map(([id]) => id).sort();
  gate(vets.join(',') === Object.keys(VET_LINE).sort().join(','), `the veteran cards [${vets.join(', ')}] are not the ones this harness has age lines for`);
  for (const eraId of [undefined, 'y2005']) for (const pos of POSITIONS) for (const role of ['starter', 'backup']) for (const age of [23, 29, 30, 31, 32]) {
    const ids = dealt(pos, { eraId, role, year: 2026, yrs: 6, age }).map(e => e.id);
    for (const [id, line] of Object.entries(VET_LINE)) {
      gate(ids.includes(id) === (age >= line), `${id} ${age >= line ? 'not dealt' : 'dealt'} to a ${pos} ${role} aged ${age}; its line is ${line}`);
    }
  }
}
const gateFailCount = gateFails.length;

/* ── Round 917 second review: THE SIX RIVALRY BEATS, WORDS AGAINST EFFECTS ──
   simCareerRivalryEvents proves each beat is reachable and moves some state;
   it never compared the words with the move, so beat 223 taking morale -5
   under "Morale -2" stayed green. Each of this round's six beats is applied
   at rolls 0.25, 0.4999, 0.5001 and 0.75, once with you rated above the
   rival and once below, from a mid range save. What the player reads is the
   line the beat pushes when it pushes one, else the card's consequence; its
   numbers must equal the move to the point, "intensifies" must raise the
   rivalry, "softens" lower it, and neither word means no change. A "50/50"
   beat must land its two ends either side of 0.5. 48 applies; the six older
   NFL beats and the other three sports are not covered here (the shared
   harness is not this round's file). (Control: rivalwords.) */
const RIVAL_BEATS = [218, 219, 220, 221, 222, 223];
const rivalFails = [];
let rivalApplies = 0;
for (const id of RIVAL_BEATS) {
  const def = NFL_RIVALRY_EVENTS.find(d => d.id === id);
  if (!def) { rivalFails.push(`beat ${id} is missing`); continue; }
  for (const above of [true, false]) {
    const ends = [];
    for (const roll of [0.25, 0.4999, 0.5001, 0.75]) {
      const s = Object.assign(fixtureFor('QB', { year: 2026, role: 'starter', yrs: 6, age: 28 }), {
        morale: 50, fanbase: 60, health: 60, ovr: above ? 86 : 80, rivalryIntensity: 50,
      });
      const r = { name: 'Words Rival', team: s.team === 'KC' ? 'DAL' : 'KC', ovr: above ? 80 : 86, age: 28, retired: false };
      const before = { ...snapshot(s), heat: s.rivalryIntensity };
      const lines = [];
      /* Round 1149: a fact beat's promise is read off the save and the rival, like its words (219 is one now). */
      const promise = typeof def.consequence === 'function' ? def.consequence(s, r) : def.consequence;
      def.apply(s, r, () => roll, line => lines.push(line));
      rivalApplies++;
      const moved = Object.fromEntries(FIELDS.map(f => [f, Math.round((snapshot(s)[f] - before[f]) * 10) / 10]));
      const heat = s.rivalryIntensity - before.heat;
      const read = lines.length ? lines.join(' ') : promise;
      const said = parseWords(read);
      if (vecKey(said) !== vecKey(moved)) rivalFails.push(`beat ${id}: the player reads "${read}" and the save moved [${vecKey(moved)}]`);
      const heatWord = /intensif/i.test(promise) ? 1 : /soften/i.test(promise) ? -1 : 0;
      if (Math.sign(heat) !== heatWord) rivalFails.push(`beat ${id}: "${promise}" and the rivalry moved ${heat}`);
      ends.push(vecKey(moved));
    }
    if (typeof def.consequence === 'string' && /50\/50/.test(def.consequence) && ends[1] === ends[2]) rivalFails.push(`beat ${id}: sold as 50/50 and rolls of 0.4999 and 0.5001 land the same end`);
    /* Round 1149: none of the six flips a coin any more (219 was the last), so a roll can never choose the end. */
    if (new Set(ends).size !== 1) rivalFails.push(`beat ${id}: four different rolls landed ${new Set(ends).size} different ends, so something is still drawn`);
  }
}
const RIVAL_APPLIES_MIN = 48;
if (rivalApplies < RIVAL_APPLIES_MIN) rivalFails.push(`only ${rivalApplies} rivalry beat applies made, the floor is ${RIVAL_APPLIES_MIN}`);

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
console.log('words vs effects   : deck C is checked in scripts/simUsCareerDeckC.mjs since Round 988');
console.log(`who gets dealt what: ${gateChecks} checks on both sides of every rule line, ${gateFailCount} failed`);
const gateKinds = [...new Set(gateFails)];
for (const f of gateKinds.slice(0, 8)) console.log(`  GATE: ${f}`);
if (gateKinds.length > 8) console.log(`  GATE: and ${gateKinds.length - 8} more kinds`);
console.log(`rivalry beat words : ${rivalApplies} applies over beats ${RIVAL_BEATS.join(', ')}, ${rivalFails.length} disagreements`);
for (const f of [...new Set(rivalFails)].slice(0, 8)) console.log(`  RIVAL: ${f}`);
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
if (gateFailCount) fails.push(`${gateFailCount} cards dealt where their words are not true, or not dealt where they are`);
if (rivalFails.length) fails.push(`${rivalFails.length} rivalry beat words against effects disagreements`);
if (CONTROL) console.log(`\nCONTROL ${CONTROL} is on: this run is EXPECTED to fail.`);
console.log(fails.length ? `\nFAIL: ${fails.join('; ')}` : '\nPASS: no crashes, every position produces stats, shop fully reachable, deck C drawn, every card dealt only where its words hold (its words, odds and money: simUsCareerDeckC), and the six new rivalry beats doing what they say');
process.exit(fails.length ? 1 : 0);
