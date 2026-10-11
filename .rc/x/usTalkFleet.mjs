// Release AX review (engine-saves): the board now writes a talk to the save only if restoreMarketTalk reads it back
// (persist drops what it cannot read, and the card then leaves the screen). So a talk the game itself builds must
// ALWAYS pass its own reader, in every sport, era, age and contract state, before and after every push, or Play
// would open a talk that vanishes at once and the season could never be played. This fleet plays whole careers on
// the four sport descriptors and asks the reader at every talk. usage: node .rc/x/usTalkFleet.mjs [careers a sport and era] [seed]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HEAD = process.cwd();
const N = Number(process.argv[2] || 20), SEED = Number(process.argv[3] || 77000);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'us-talk-fleet-'));
const ENTRY = `
export { NFL_CAREER_SPORT as nfl } from './src/lib/nflCareerSport';
export { NBA_CAREER_SPORT as nba } from './src/lib/nbaCareerSport';
export { MLB_CAREER_SPORT as mlb } from './src/lib/mlbCareerSport';
export { NHL_CAREER_SPORT as nhl } from './src/lib/nhlCareerSport';
export * as MARKET from './src/lib/usCareerMarket';
export { oneYearWindow, applyFaSigning } from './src/lib/usCareerFreeAgency';
export { extensionDue } from './src/lib/usCareerExtension';
export { isFarewellSeason, announceFarewell } from './src/lib/careerRetirement';
export { defaultAppearance } from './src/lib/soccerCareerAppearance';
`;
const outfile = path.join(tmp, 'head.mjs');
await build({ stdin: { contents: ENTRY, resolveDir: HEAD, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error',
  alias: { '@': path.join(HEAD, 'src') }, nodePaths: [path.join(HEAD, 'node_modules')], define: { 'process.env.NODE_ENV': '"production"' }, jsx: 'automatic',
  banner: { js: 'globalThis.__store ??= new Map(); globalThis.localStorage ??= { getItem: k => (globalThis.__store.has(k) ? globalThis.__store.get(k) : null), setItem: (k, v) => { globalThis.__store.set(k, String(v)); }, removeItem: k => { globalThis.__store.delete(k); } };' } });
const M = await import(pathToFileURL(outfile).href);
const { MARKET } = M;
const mulberry = seed => { let a = seed | 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const clone = v => JSON.parse(JSON.stringify(v));
const tally = { careers: 0, seasons: 0, ext: 0, extNoOffer: 0, fa: 0, pushes: 0, results: {}, farewellTalks: 0, signed: 0, declined: 0, refused: 0, threw: 0, drawsOut: 0 };
const say = [];
let where = '';
function reads(talk, c, slug, what) {
  for (const [form, v] of [['in memory', talk], ['from storage', clone(talk)]]) {
    if (MARKET.restoreMarketTalk(v, form === 'from storage' ? clone(c) : c, slug) === null) {
      tally.refused += 1;
      if (say.length < 10) say.push(`REFUSED ${what} (${form}) ${where}: career year ${c.year} team ${c.team} salary ${c.salary} years ${c.contractYears} retired ${c.retired} farewell ${M.isFarewellSeason(c.retirement, c.year)}; talk ${JSON.stringify(talk).slice(0, 420)}`);
      return false;
    }
  }
  return true;
}
for (const slug of ['nfl', 'nba', 'mlb', 'nhl']) {
  const sport = M[slug];
  for (const era of sport.create.eras) {
    for (let k = 0; k < N; k += 1) {
      const rng = mulberry(SEED + k * 31 + era.id.length * 977 + slug.charCodeAt(1) * 13), real = Math.random;
      Math.random = rng;
      tally.careers += 1;
      try {
        const positions = Object.keys(sport.create.archetypes), pos = positions[Math.floor(rng() * positions.length)];
        const archs = sport.create.archetypes[pos], c0 = sport.startCareer('Probe', pos, archs[Math.floor(rng() * archs.length)], rng, M.defaultAppearance(), era.id);
        let c = c0, tq = sport.rollTeamQuality(null, rng);
        for (let y = 0; y < 28 && !c.retired; y += 1) {
          where = `${slug} era ${era.id} career ${k} season ${y} age ${c.age} ${c.pos} ovr ${c.ovr}`;
          const farewell = M.isFarewellSeason(c.retirement, c.year);
          if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(sport.suspendedLine(c)); sport.progress(c, rng); continue; }
          if (M.extensionDue(c) && !farewell) {
            let talk = MARKET.openMarketExtension(c, sport.slug, sport.buildExtension(c, rng));
            tally.ext += 1; if (!talk.talk.offer) tally.extNoOffer += 1;
            reads(talk, c, sport.slug, 'an opening extension talk');
            if (talk.talk.offer && rng() < 0.6) {
              const pushed = MARKET.pushMarketExtension(talk, sport.extPushArgs(c, rng));
              tally.pushes += 1; tally.results['ext ' + pushed.wheel.result] = (tally.results['ext ' + pushed.wheel.result] ?? 0) + 1;
              if (pushed.wheel.draws.length < 1 || pushed.wheel.draws.length > 3) tally.drawsOut += 1;
              reads(pushed, c, sport.slug, 'an extension talk after its push, wheel unseen');
              talk = MARKET.acknowledgeMarketWheel(pushed);
              reads(talk, c, sport.slug, 'an extension talk after its push, wheel seen');
            }
            if (talk.talk.offer && rng() < 0.5) { c.contractYears = 1 + talk.talk.offer.years; c.salary = talk.talk.offer.salary; tally.signed += 1; }
            else { reads(MARKET.declineMarketExtension(talk), c, sport.slug, 'a declined extension talk'); tally.declined += 1; }
          }
          if (c.contractYears <= 0) {
            const fa = sport.buildFaWindow(c, tq, rng);
            let talk = MARKET.openMarketFreeAgency(c, sport.slug, farewell ? M.oneYearWindow(fa) : fa);
            tally.fa += 1; if (farewell) tally.farewellTalks += 1;
            reads(talk, c, sport.slug, `an opening free agency window${farewell ? ' in a farewell season' : ''}`);
            for (let i = talk.window.offers.length - 1; i >= 0; i -= 1) {
              if (rng() < 0.7) {
                const args = sport.faPushArgs(c, rng);
                const pushed = MARKET.pushMarketFreeAgency(talk, i, farewell ? { ...args, maxYears: 1 } : args);
                if (pushed === talk) continue;
                tally.pushes += 1; tally.results['fa ' + pushed.wheel.result] = (tally.results['fa ' + pushed.wheel.result] ?? 0) + 1;
                if (pushed.wheel.draws.length < 1 || pushed.wheel.draws.length > 3) tally.drawsOut += 1;
                reads(pushed, c, sport.slug, `a window after a push on offer ${i}, wheel unseen`);
                talk = MARKET.acknowledgeMarketWheel(pushed);
                reads(talk, c, sport.slug, `a window after a push on offer ${i}, wheel seen`);
              }
            }
            const live = talk.window.offers.filter(o => !o.gone), offer = live[Math.floor(rng() * live.length)];
            M.applyFaSigning(c, offer); tq = offer.quality; tally.signed += 1;
          }
          sport.campBattle(c, tq, rng);
          sport.simSeason(c, tq, rng);
          sport.progress(c, rng);
          tally.seasons += 1;
          if (sport.shouldRetire(c) || farewell) { c.retired = true; break; }
          const ev = sport.drawEvent(c, rng);
          const choice = ev?.choices?.[Math.floor(rng() * (ev.choices.length || 1))];
          if (choice?.apply) choice.apply(c, rng);
          if (c.age >= 33 && !c.retirement?.farewellYear && rng() < 0.2) M.announceFarewell(c);
          tq = sport.rollTeamQuality(tq, rng);
        }
      } catch (e) { tally.threw += 1; if (say.length < 10) say.push(`THREW ${where}: ${String(e?.stack ?? e).slice(0, 300)}`); }
      finally { Math.random = real; }
    }
  }
}
for (const s of say) console.log(s);
console.log('TALLY ' + JSON.stringify(tally));
console.log(`usTalkFleet: ${tally.careers} careers, ${tally.seasons} seasons, ${tally.ext} extension talks (${tally.extNoOffer} with no offer), ${tally.fa} free agency windows (${tally.farewellTalks} in a farewell season), ${tally.pushes} pushes; ${tally.refused} talk(s) the reader refused, ${tally.drawsOut} wheel(s) outside one to three draws, ${tally.threw} career(s) threw. ${tally.refused || tally.drawsOut ? 'RED' : 'Every talk the game built passed its own reader.'}`);
process.exit(tally.refused || tally.drawsOut ? 1 : 0);
