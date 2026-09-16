# Round 620 design contract: Fight Career, on a shared career engine

**Status: CONTRACT DRAFTED, NO CODE WRITTEN.**

Asked for by the owner on 2026-09-16: build games in the style of a well known independent
studio's sports simulations, take what is good about their features and presentation, and then
go further. This contract covers the first and largest gap that request exposes.

The studio and its titles are named nowhere in this design and must appear nowhere in shipped
files. `scripts/simNoRivalNames.mjs` is the permanent guard for that, and this round adds the
studio name and its title to `RIVAL_NAMES` so the question can never be decided by memory
later. Genres are not owned by anyone. Names and branding are, and the repo is public.

---

## 1. Why this game, and why it is not a duplicate

The site carries 136 games. Twenty of them are deep simulations: career paths, my career modes,
front offices, dynasties, Club Manager and Stadium Tycoon, across soccer, the NFL, the NBA, MLB,
the NHL and college football and basketball.

Combat sports have two games, `/ufc` and `/ufc-chain`, and both are guessing games. **There is no
fight career or fight management simulation on the site at all.** That is the largest genre hole
in the catalogue, and it is the one the owner's request points straight at.

## 2. The engine question, answered with a measurement rather than a hope

The owner's standing instruction is that a new sport is data plus that sport's events, not a new
engine. So before designing, the four existing my career engines were measured.

| Engine | Lines | Exports |
|---|---|---|
| `src/lib/nflMyCareer.ts` | 1042 | 38 |
| `src/lib/mlbMyCareer.ts` | 995 | 36 |
| `src/lib/nhlMyCareer.ts` | 937 | 36 |
| `src/lib/nbaMyCareer.ts` | 899 | 36 |

**24 exported symbols are common to all four**, name for name once the sport prefix is stripped:
the career state, the season line, the event shape, archetypes, eras and era lookup, career start,
season simulation, progression, the free agency and extension talks, the spending items and net
worth, retirement, and the legacy verdict. That is roughly two thirds of about 3,900 lines being
the same idea written four times. It is the exact pattern the project brief calls out, where one
roster bug had to be fixed twice because two games were two copies of one idea.

Some sharing has already started and proves the direction: `repairNetWorth` is already generic,
and `careerInbox.ts` and `careerRivalryEvents.ts` are already shared engines bound per sport.

**Decision.** This round creates `src/lib/careerEngine.ts`, a sport injected career engine, and
Fight Career is its first consumer. **The four existing games are not migrated in this round.**
Migrating four live games to a new engine for no immediate player benefit risks four working
things at once, and the gates cannot tell a silent behaviour change from a correct one. Migration
is Rounds 621 to 624, one sport per round, each proving byte identical career outcomes on a fixed
seed before and after.

What the engine injects per sport: the position or division set, the archetypes, the opponent or
team model, the season or bout resolution, the money scale, the awards and records, and the
language. What it holds fixed: the loop, the save shape, progression and decline, the contract
talks, the spending layer, retirement and legacy.

## 3. The game

**Objective, in one sentence.** Start as an unknown amateur, fight up the rankings, win a world
title, and hold on to it for as long as your body lets you.

**The core loop**, one fight cycle rather than one season:

1. **Pick the fight.** Two or three offers, each with a purse, an opponent, and a ranking swing.
   A tune up pays little and moves you little. A step up pays and ranks, and can end you.
2. **Run the camp.** Allocate camp weeks across conditioning, power, defence and speed. Camp
   improves the attribute and costs freshness, and an over-trained fighter walks in flat.
3. **Fight night.** The bout resolves round by round. Each round you choose a tactic, pressure,
   box, counter or brawl, against an opponent whose style answers some tactics better than others.
   Judges score it, or somebody does not get up.
4. **The morning after.** Purse, ranking movement, damage taken, age, and whatever the career
   throws at you next.

**What makes decision N different from decision N minus 1, which is the question that decides
whether this has replay value.** Damage is permanent, cumulative, and mostly invisible until it
is not. Every hard fight buys ranking and money now and takes rounds off the end of your career
later. A fighter who took the safe road arrives at a title shot older and less damaged; one who
took every war arrives sooner and with a chin that is already gone. That is the real tension of
the actual sport, it is legible to a player within three fights, and no single policy wins it.

**The three roles, staged.** The request admired a game where you can fight a career, run a gym,
or promote. Career is this round. **Gym** (sign and develop fighters) is a later round on the
Club Manager shape, since that is the same problem as a squad. **Promoter** (build cards, sell
the building) is a later round on the Stadium Tycoon shape. All three read the same fighter and
bout model, which is the whole reason for building the engine first.

## 4. Presentation, and the rules it must not break

The request specifically admired the feel and the animation. That is allowed to be the best part
of this game, within three fixed constraints.

- **The FIFA tile rule.** Small tiles and a back button. Never a long stacked page.
- **The no-scroll rule.** The result of a round appears in view without the page jumping.
  Enforced through `src/hooks/useRevealScroll.ts`.
- **Mobile first.** Tap targets 30px and up, and no mechanic that needs hover, because the
  largest part of the audience is on a phone.

Within that, the bout is presented beat by beat: a ring header with both fighters, a round
counter, punches landing as short readable beats rather than a wall of text, a knockdown that
stops everything, and a scorecard reveal at the end. **Every animation is skippable and the
game is fully playable with animation off**, because a player who has fought two hundred rounds
wants the result, and because a snapshot of this page must not depend on a running animation.

**A hard constraint that has cost this repo real work before.** Nothing computed from a clock
goes into a saved page, and nothing may draw from `Math.random` inside a `useState` initialiser.
Use `src/lib/firstDraw.ts` for any pick made during render. `simPrerender` section 16 enforces
this at source level, and the ratchet only allows files to leave the baseline, never join it.

## 5. Daily and unlimited

**Unlimited** is the career described above, saved and resumed.

**Daily is Fight Night:** one seeded bout per Eastern day, the same fighter and the same opponent
for everybody, three rounds, no career attached. It is a tactics puzzle rather than a career: you
are handed a fighter with known attributes against an opponent with a readable style, and you
choose three tactics.

The daily must never leak into unlimited and unlimited must never reveal the daily's answer.
That is the lesson a previous game already paid for here.

**Scoring, written before any code, on the sitewide 100 scale.**

| Component | Points |
|---|---|
| Win the bout | 50 |
| Each round won on the cards | 8, to a maximum of 24 |
| Finish inside the distance | 12 |
| Damage taken, scaled, subtracted | 0 to minus 14 |
| Every tactic answered correctly against the opponent's style | 14 |

A perfect day is 100: win by finish, sweep the rounds, take almost nothing back, read the style
right every round. Comparability across days is not a hope: the seeded generator draws both
fighters against **a fixed difficulty target**, and the harness proves that target holds, so a
Tuesday is not easier than a Monday.

## 6. Data, and the legal lines that kill designs late

**Every fighter in this game is generated.** No real boxer is simulated, ranked, aged, damaged or
defeated anywhere in it. That is a design decision taken now rather than discovered later, and it
resolves the whole category of risk at once: no likenesses, no invented deeds attributed to a
real person, no invented words in a real person's mouth, and no real career rewritten by a
simulation. It also happens to be what makes the customisation the request admired possible at
all, since a generated roster is one you can edit.

The rest of the legal line, restated because it is the exposure rather than a preference:

- No club, promotion, sanctioning body or league logos, crests or belts as real marks. Titles in
  this game are invented and generic.
- No player photos. Fighters are drawn from the existing generated appearance system.
- Fictional sponsors only.
- **No gambling mechanics of any kind.** A boxing game drifts toward a betting screen without
  anyone deciding to add one. The decision is taken here and written down: there is no wagering,
  no odds to bet against, and no purchasable chance. Purses and offers are contracts, not bets.
- `flagcdn.com` remains the only permitted external image host, for a fighter's nationality flag.

Data needed: none from Postgres for the career, which is fully generated and saved locally on the
same save layer the other career games use. The daily needs the shared seeded generator only.

## 7. The harness, and what would make it worth having

`scripts/simFightCareer.mjs`, discovered by `runAllSims.mjs` because of the `sim` prefix.

The strongest measurable signal is not "a career completes without crashing", which is close to
worthless. It is **whether the central tradeoff actually exists**. So:

1. **No dominant policy.** Simulate many careers under three fixed policies: take every hard
   fight, take every tune up, and alternate. Measure titles won and final legacy. No policy may
   dominate the others across the run. If one does, the damage model is decoration and the game
   has no decision in it.
2. **Damage actually bites.** Careers that took more punishment must end earlier and rate lower,
   as a direction with a margin taken from measured headroom, never as a claim that two
   distributions are indistinguishable, and never asserted on a maximum.
3. **The title is winnable, and not trivially.** A proof that a reasonable player wins a title in
   a bounded number of careers, and a proof that a careless one usually does not.
4. **The daily is winnable at all, every day.** Walk a year of seeds and prove each day's bout can
   be won, and that the difficulty target holds across them, so no day is a wall or a gift.
5. **Style beats are readable.** A player who reads the opponent's style correctly must beat one
   who picks at random, by a measured margin.

**Negative controls, one per section, each asserting its anchor exists before it rewrites it**,
because a control that edits a string the file does not contain changes nothing and leaves the
harness green for the wrong reason: `nodecay` removes damage accumulation, `nostyle` makes the
tactic matchup irrelevant, `flatpurse` makes every offer pay the same, `fixedseed` breaks the
daily's difficulty targeting, and `norandom` makes the opponent ignore the player's tactic.

## 8. Registration checklist, so the round is not half shipped

1. `src/pages/FightCareer.tsx`, thin, with the engine in `src/lib/`.
2. `src/lib/careerEngine.ts` (shared) and `src/lib/fightCareer.ts` (the sport binding).
3. Lazy route in `src/App.tsx`.
4. A `GameDef` in `src/data/gameRegistry.ts` under the right category.
5. Per game SEO copy in `src/data/gameContent/`.
6. `scripts/simFightCareer.mjs`.
7. **Run `node scripts/genSearchKeywords.mjs` and commit `src/data/searchKeywords.json`.**
   Nothing runs this for you, it is in no npm script and no CI step, and a game added without it
   is invisible to anyone searching for what it actually is. `simSiteSearch` section 7 is the net.
8. Add the studio name and its title to `RIVAL_NAMES` in `scripts/simNoRivalNames.mjs`.
9. Help content: rules, a worked example of one round of a bout, reopenable from the question
   mark, fed through `GameShell` and `GameHelp` like every other game.
10. A What's New entry, and `docs/PROJECT-STATE.md` updated in the same round.

## 9. Sequencing

Independent of Rounds 617, 618 and 619, which are all in `src/lib/clubManager.ts` and its finance
module. This round touches neither. It can be built in parallel with them and merged in any order.
