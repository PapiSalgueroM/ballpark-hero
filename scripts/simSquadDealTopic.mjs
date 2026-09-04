/* Squad Deal: the league you pick is the league you get.

   Round 440, from the owner's own report: "i clicked la liga and the players
   that popped up were from the premier league". He was right, and there were
   THREE separate ways the game could hand him a pool he did not ask for, all
   of them silent:

     1. The joke players (MEMES) were every one of them labelled 'Premier
        League'. They are invented characters at invented clubs, and they are
        injected into a draft without passing the topic filter, so with the
        extras switch on 19.2 percent of the cards in a La Liga draft came
        from another league. Measured on the shipped code: 4,110 of 21,400
        cards over 200 drafts, every one a joke player carrying that label.
     2. The Legends era skipped the topic filter OUTRIGHT (the hook read
        `era === 'legends' ? raw : ...`), so picking a league there dealt all
        94 legends and said nothing.
     3. For the current era the hook fell back to the UNFILTERED pool whenever
        the filter returned fewer than 60 players, again silently. That floor
        fired on every league in the legends pool.

   What this holds, all against the REAL library and the REAL live pools:
     1) No joke player claims a real league.
     2) Every topic the game OFFERS deals only players of that topic, in both
        eras, with the extras switch on and off.
     3) A topic the game offers can actually fill every slot of every
        formation, so there is nothing left for a fallback to rescue.
     4) The offer is not empty: enough topics survive in each era for the
        picker to be worth showing, and All World always survives.

   Negative controls (house rule: prove the check can fail), and they
   reproduce the real defects rather than invented ones:
     SQUAD_TOPIC_CONTROL=memes    puts the joke players back on 'Premier
       League' in a bundled copy; sections 1 and 2 must go red.
     SQUAD_TOPIC_CONTROL=legacy   restores exactly what the hook did before
       this round: every topic offered, the legends era ignoring the choice
       outright, and the current era falling back to the unfiltered pool
       whenever the filter came back under 60. Section 2 must then go red,
       and that is the shape the owner actually hit.
   Either control refuses to run if its rewrite changed nothing.

   Run: node scripts/simSquadDealTopic.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SQUAD_TOPIC_CONTROL || '';
if (CONTROL && CONTROL !== 'memes' && CONTROL !== 'legacy') {
  console.error(`SQUAD_TOPIC_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const TMP = os.tmpdir().replace(/\\/g, '/');
let LIB = `${ROOT_URL}/src/lib/squadDeal.ts`;
if (CONTROL === 'memes') {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/squadDeal.ts'), 'utf8');
  const from = "nationality: 'Memeland', league: 'Other'";
  if (!src.includes(from)) { console.error('control cannot run: squadDeal.ts is not in the shape this control rewrites'); process.exit(1); }
  LIB = `${TMP}/squadDeal.control.ts`;
  fs.writeFileSync(LIB, src.replace(from, "nationality: 'Memeland', league: 'Premier League'"));
  console.log('NEGATIVE CONTROL ON: the joke players claim the Premier League again');
}
const ENTRY = `${TMP}/squadTopic.entry.mjs`;
const BUNDLE = `${TMP}/squadTopic.bundle.mjs`;
fs.writeFileSync(ENTRY, `export * as sd from '${LIB}';\n`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });

/* squadDeal imports the supabase client, which reads localStorage at module
   scope; the same stub simAuctionRoom uses. */
const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
};
const { sd } = await import(pathToFileURL(BUNDLE).href);
const { TOPICS, FORMATIONS, MEMES, filterByTopic, topicCanFill, buildCandidates, fetchSquadPool, MIN_PER_SLOT } = sd;

/* What each topic promises, as a predicate over a player, written here rather
   than imported so this harness cannot be satisfied by the same function it is
   checking. */
const CONMEBOL = new Set(['Argentina', 'Brazil', 'Uruguay', 'Colombia', 'Chile', 'Ecuador', 'Paraguay', 'Peru', 'Bolivia', 'Venezuela']);
const PROMISE = {
  all: () => true,
  wc2026: p => sd.WC2026_NATIONS.has(p.nationality),
  premier: p => p.league === 'Premier League',
  laliga: p => p.league === 'La Liga',
  seriea: p => p.league === 'Serie A',
  southamerica: p => CONMEBOL.has(p.nationality),
};

const pools = {};
for (const era of ['current', 'legends']) {
  try {
    pools[era] = await fetchSquadPool(era);
  } catch (e) {
    console.error(`could not read the ${era} pool: ${e && e.message}. NOTHING WAS CHECKED.`);
    process.exit(1);
  }
  if (!pools[era] || pools[era].length < 40) {
    console.error(`the ${era} pool came back with ${pools[era] ? pools[era].length : 0} players, too few to be the real set. NOTHING WAS CHECKED.`);
    process.exit(1);
  }
}
console.log(`pools: current ${pools.current.length}, legends ${pools.legends.length}`);

console.log('1) no joke player claims a real league');
{
  const REAL = new Set(['Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Bundesliga']);
  const liars = MEMES.filter(m => REAL.has(m.league));
  console.log(`   ${MEMES.length} joke players, ${liars.length} claiming a real league`);
  for (const m of liars.slice(0, 4)) fail(`${m.name} of ${m.club} is labelled ${m.league}, a real competition it has never played in`);
  if (liars.length > 4) fail(`and ${liars.length - 4} more joke players carrying a real league`);
}

console.log('2) every topic the game offers deals only that topic, both eras, extras on and off');
{
  for (const era of ['current', 'legends']) {
    const pool = pools[era];
    for (const t of TOPICS) {
      for (const form of FORMATIONS) {
        /* The game only OFFERS a topic that can fill the formation, so that is
           the set to check.
           The 'legacy' control restores what the hook did before this round,
           which is the shape the owner actually hit: EVERY topic was offered,
           the legends era ignored the choice outright, and the current era fell
           back to the unfiltered pool whenever the filter came back under 60. */
        const offered = CONTROL === 'legacy' ? true : topicCanFill(pool, t.id, form.slots);
        if (!offered) continue;
        let dealt;
        if (CONTROL === 'legacy') {
          const f = filterByTopic(pool, t.id);
          dealt = era === 'legends' ? pool : (f.length >= 60 ? f : pool);
        } else {
          dealt = filterByTopic(pool, t.id);
        }
        /* Two passes. Without the joke players, every card must keep the
           topic's promise: that is the game as a player can actually reach it
           today, because nothing in the UI turns the joke switch on. With them,
           a joke is allowed through (it is opt in silliness, and the player
           asked for it) but ONLY if it is recognisably fictional, so the
           exemption can never be used to smuggle a real off topic player in. */
        for (const extras of [[], MEMES]) {
          const jokeNames = new Set(extras.map(m => m.name));
          const used = new Set();
          let off = 0;
          let seen = 0;
          let smuggled = 0;
          const examples = [];
          for (const slot of form.slots) {
            for (const c of buildCandidates(dealt, slot, used, extras)) {
              seen += 1;
              if (PROMISE[t.id](c)) continue;
              if (jokeNames.has(c.name)) {
                /* A joke is only excused while it is obviously a joke. */
                if (c.league !== 'Other' || c.nationality !== 'Memeland') {
                  smuggled += 1;
                  if (examples.length < 3) examples.push(`${c.name} (${c.club}, ${c.league}, ${c.nationality})`);
                }
                continue;
              }
              off += 1;
              if (examples.length < 3) examples.push(`${c.name} (${c.club}, ${c.league})`);
            }
          }
          if (off > 0) {
            fail(`${era} ${form.name} ${t.label}${extras.length ? ' with extras on' : ''}: ${off} of ${seen} cards are real players from outside ${t.label}, for example ${examples.join('; ')}`);
          }
          if (smuggled > 0) {
            fail(`${era} ${form.name} ${t.label}: ${smuggled} joke card(s) are dressed as real football rather than as jokes, for example ${examples.join('; ')}`);
          }
        }
      }
    }
  }
  if (failures === 0) console.log('   every offered topic dealt only its own players in both eras, with and without the extras');
}

console.log('3) a topic the game offers can fill every slot of every formation');
{
  let offered = 0;
  let thin = 0;
  for (const era of ['current', 'legends']) {
    for (const t of TOPICS) {
      for (const form of FORMATIONS) {
        if (!topicCanFill(pools[era], t.id, form.slots)) continue;
        offered += 1;
        const f = filterByTopic(pools[era], t.id);
        for (const slot of form.slots) {
          const n = f.filter(p => slot.allowed.includes(p.position)).length;
          if (n < MIN_PER_SLOT) { thin += 1; fail(`${era} ${form.name} ${t.label} is offered but its ${slot.label} slot has only ${n} players (needs ${MIN_PER_SLOT})`); }
        }
      }
    }
  }
  console.log(`   ${offered} offered era and formation and topic combinations, ${thin} with a slot too thin to choose from`);
}

console.log('4) the picker is still worth showing');
{
  for (const era of ['current', 'legends']) {
    const slots = FORMATIONS[0].slots;
    const ok = TOPICS.filter(t => topicCanFill(pools[era], t.id, slots));
    console.log(`   ${era}: ${ok.length} of ${TOPICS.length} topics playable on ${FORMATIONS[0].name} (${ok.map(t => t.label).join(', ')})`);
    if (!ok.some(t => t.id === 'all')) fail(`${era}: All World is not playable, which means the pool itself is broken`);
    if (ok.length < 2) fail(`${era}: only ${ok.length} topic(s) playable, so the picker has nothing to pick between`);
  }
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimSquadDealTopic: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimSquadDealTopic: green. The league you pick is the league you get, in both eras, jokes included.');
