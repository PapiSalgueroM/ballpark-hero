import { CATEGORIES } from '../../src/data/gameRegistry';
import { SPORT_HUBS } from '../../src/lib/sportHub';
import { CONTINUE_SAVES } from '../../src/data/continueSaves';
import { newFactory, serialize } from '../../src/lib/wonderkidFactory';
import { initLeague } from '../../src/lib/frontOffice';
import { initNbaLeague } from '../../src/lib/nbaFrontOffice';
import { initNhlLeague } from '../../src/lib/nhlFrontOffice';
import { initMlbLeague } from '../../src/lib/mlbFrontOffice';
import { CFB_SCHOOLS, initCfb } from '../../src/lib/cfbDynasty';

export function hubFixtures() { return SPORT_HUBS.map(hub => ({ hub, games: CATEGORIES.filter(category => hub.titles.includes(category.title)).flatMap(category => category.games) })); }

// Actual engine constructors, wrapped in the same shallow shape each board saves.
// These fixtures test destination discovery, not full saved-career playback.
export function continuationFixtures() {
  let seed = 994;
  const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const frontOffice = (league: ReturnType<typeof initLeague> | ReturnType<typeof initNbaLeague> | ReturnType<typeof initNhlLeague> | ReturnType<typeof initMlbLeague>) => {
    const myTeam = Object.keys(league.teams)[0];
    return { raw: JSON.stringify({ league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, mandate: null, trust: 60, fired: false, pressTilt: 0, seasonTradeLine: null, postseason: null }), description: `${myTeam}, ${league.season} season` };
  };
  const factory = newFactory(0, 994);
  const school = CFB_SCHOOLS[0].id;
  const college = initCfb(school, rng);
  const values = {
    '/wonderkid-factory': { raw: serialize(factory), description: `${factory.prospects.length} kids in the academy` },
    '/front-office': frontOffice(initLeague(rng)),
    '/nba-front-office': frontOffice(initNbaLeague(rng)),
    '/nhl-front-office': frontOffice(initNhlLeague(rng)),
    '/mlb-front-office': frontOffice(initMlbLeague(rng)),
    '/cfb-dynasty': { raw: JSON.stringify({ st: college, phase: 'hub', recruits: null, portal: null }), description: `${school}, ${college.season} season` },
  };
  return Object.entries(values).map(([path, value]) => {
    const entry = CONTINUE_SAVES.find(item => item.path === path);
    if (!entry) throw new Error(`Engine fixture needs a registered continuation key: ${path}`);
    return { path, saveKey: entry.saveKey, ...value };
  });
}
