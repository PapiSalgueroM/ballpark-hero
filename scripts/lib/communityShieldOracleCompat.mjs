import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Exact prospective Shield additions, shared by the six immutable original oracles.
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const EXTRA = 'src/lib/soccerCareerExtraCups.ts';
const sha = value => createHash('sha256').update(value).digest('hex');
const pin = value => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  return { bytes: bytes.length, sha256: sha(bytes), gitBlob: createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex') };
};
const OLD_ENGINES = [{"id":"agent-review","base":"d69a448ce830f8312af1eea252a3ae84b13bde9c","original":{"bytes":522603,"sha256":"0c631e6e3f38c40374eff9d885db7583913bb2cfaa5752d2a71713bca818d089","gitBlob":"6e0986aa54a2775752b4737078ffbaaf2ae3dc45"},"composed":{"bytes":526250,"sha256":"067b155df8d9d0f9c01464696d423ee2de768a8640be265813e3adcf33e58bee","gitBlob":"59ad8fb8002d73249cde4416a8a59380765b5d2d"},"withoutClubKey":true},{"id":"farewell","base":"552ee88761731b9a341ae644f69ac3386e53c149","original":{"bytes":522829,"sha256":"020eefeb6dfdd8afc34820c1a2f652f1ffefc570e2417d523c3341fb08f1c237","gitBlob":"fbba61d39c707db8972f552a5f79a9761eb2c383"},"composed":{"bytes":526476,"sha256":"b6b1d380e473fecf0a17f973660667307f6c87c3bc02a88d6a4da6c7f3ab66db","gitBlob":"db2c51a7c59dd0beca058ef570d5c9587637eb13"},"withoutClubKey":true},{"id":"press-market","base":"934c29d9","original":{"bytes":527642,"sha256":"8ca918ca04d7a5f2c4cadb845434c11fd7d485ee7c2e7d51c1713cc3079f561e","gitBlob":"185e25df98b8299ebc1132facf1998908e9198bd"},"composed":{"bytes":531278,"sha256":"60eeedd29e811392abf68f4de8e0b616370517ff18885b8e2560c29ede2168d3","gitBlob":"284d8e517105cd6676ef1f58e0c17832832a664d"},"withoutClubKey":false},{"id":"programme","base":"2f1919478db9e3a0f13b8f8b34373756944459c1","original":{"bytes":519647,"sha256":"2db99df804dfdaad27b0a33ecf34324ba2fd78e4420d171a4c5dfa91a3246221","gitBlob":"8af178a395674ba50d5ce918d4c6a34572dec8d6"},"composed":{"bytes":523294,"sha256":"7c2459aeb626464c61e86ab109f14a66ad053b21ea8c6daffe7339b17cea756a","gitBlob":"544aef02373111bcc09737a4a93a5aad05399b5e"},"withoutClubKey":true},{"id":"international-return","base":"9d73ce5f261d93b73bf0993469c4fb330afa202b","original":{"bytes":522700,"sha256":"169551429a6d47bee0b0ec673c613115fb434bdb648afc6c7d8c95f2219cccb9","gitBlob":"ab26506c16e3f803700aff10eff40ee3084e3d66"},"composed":{"bytes":526347,"sha256":"c480a424dd11d5abe04707ea1cb021bcbfa780b8fe6d3f8656ef88d720edbe6a","gitBlob":"ec115f5413f89d434d46eb9f48a1e61a904c57d0"},"withoutClubKey":true},{"id":"transfer-brief","base":"4778507d5612c3c871bc9ac99347fa8029375def","original":{"bytes":524681,"sha256":"5d699660113e2e213e36c899b0f012564dcc5fee5f0e4e340f226bc9b60f423f","gitBlob":"3d23435a883e02e2d6e250e47600ce0330d65440"},"composed":{"bytes":528328,"sha256":"66f332deee8a3df48f62e2d933c1bf36b53656d49ebff83bc6e78c047d2a59f0","gitBlob":"44e0099b5acdff2e2166c8d378a2b8fdcc6132f4"},"withoutClubKey":true}];
const SPANS = [{"label":"bind pure helper and actual closing-order readers","before":"import { prepareLeagueWorld, projectLeagueWorldClubs, recordLeagueWorldSeason, settleLeagueWorld, leagueWorldChampions, clubKeyOf, type CareerLeagueWorld, type LeagueWorldSeason } from './soccerCareerLeagueWorld';","after":"import { prepareLeagueWorld, projectLeagueWorldClubs, recordLeagueWorldSeason, settleLeagueWorld, leagueWorldChampions, leagueWorldOrder, settledLeagueOrder, readLeagueWorldSeason, clubKeyOf, type CareerLeagueWorld, type LeagueWorldSeason } from './soccerCareerLeagueWorld';\nimport { captureCommunityShield, playCommunityShield, communityShieldSeasonStats, countCommunityShields, type ExtraCupQualification, type CommunityShieldResult } from './soccerCareerExtraCups';"},{"label":"one optional saved result per season","before":"export interface SeasonRecord {\n","after":"export interface SeasonRecord {\n  extraCups?: CommunityShieldResult[];\n"},{"label":"one optional prospective root receipt","before":"export interface CareerState {\n","after":"export interface CareerState {\n  extraCupQualification?: ExtraCupQualification;\n"},{"label":"freeze opening match before the annual injury draw","before":"  const worldClubs = prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);\n  const season = generateSeasonStats(s, worldClubs);","after":"  const worldClubs = prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);\n  const shieldYear = (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1;\n  const shieldEntry = s.extraCupQualification;\n  const shieldEntrants = shieldEntry?.status === 'ready' && Array.isArray(shieldEntry.entrants) ? shieldEntry.entrants : [];\n  const shieldClubs = adjustClubsForYear(worldClubs, shieldYear);\n  const shieldValues = shieldEntrants.length === 2 && shieldEntrants.every(e => e && typeof e.club === 'string')\n    ? shieldEntrants.map(e => {\n      const c = shieldClubs.find(club => clubKeyOf(club.name) === clubKeyOf(e.club))\n        ?? (clubKeyOf(e.club) === clubKeyOf(s.currentClub) ? { name: s.currentClub, tier: s.currentClubTier } : undefined);\n      return c && Number.isFinite(c.tier) && c.tier > 0\n        ? 5 - c.tier + (eliteInYear(ELITE_CLUBS, c.name, shieldYear) ? 0.5 : 0) : null;\n    }) : [];\n  const shieldStrengths: [number, number] | null = shieldValues.length === 2 && typeof shieldValues[0] === 'number' && typeof shieldValues[1] === 'number'\n    ? [shieldValues[0], shieldValues[1]] : null;\n  const shieldBand = projectLeagueApps(s.overall, s.currentClubTier, s.currentClub, s.seasons.filter(row => row.club === s.currentClub && row.type === 'playing').length);\n  const shieldMatch = playCommunityShield({\n    qualification: shieldEntry, eventYear: shieldYear, playerName: s.playerName, club: s.currentClub,\n    position: s.position, overall: s.overall, selectionChance: Math.max(0, Math.min(1, (shieldBand.min + shieldBand.max) / 2 / 38)),\n    unavailableReason: s.pendingRehab ? 'unresolved-rehab' : (s.pendingSuspensionMatches ?? 0) > 0 ? 'pending-generic-suspension' : null,\n    teamStrengths: shieldStrengths,\n  });\n  const season = generateSeasonStats(s, worldClubs);\n  if (shieldMatch) season.extraCups = [shieldMatch];"},{"label":"merge opening contribution at severe-injury final return only","before":"      prepareLeagueWorld(s, clubs, injuryRow.year + 1);\n      return s;","after":"      prepareLeagueWorld(s, clubs, injuryRow.year + 1);\n      Object.assign(injuryRow, communityShieldSeasonStats(injuryRow, shieldMatch));\n      return s;"},{"label":"capture actual qualifying sources before old-world settle","before":"    if (run) season.cupRun = run;\n  }\n\n  // Ballon d'Or calculation. Round 834:","after":"    if (run) season.cupRun = run;\n  }\n  {\n    const closingWorld = s.leagueWorld;\n    const ownLeague = readLeagueWorldSeason(season);\n    let englishOrder: string[] | null = null;\n    if (closingWorld && closingWorld.year === thisYear) {\n      englishOrder = ownLeague?.league === 'Premier League'\n        ? settledLeagueOrder(closingWorld, 'Premier League', s.playerName, clubs, season)\n        : leagueWorldOrder(closingWorld, 'Premier League', s.playerName, clubs);\n    }\n    const ownFA = cupAssoc === 'England' && season.domesticCup && readCupRun(season)?.cup === 'FA Cup';\n    const recordedCupWinner = world.cups?.['Premier League'];\n    const cupWinner = ownFA && (!recordedCupWinner || clubKeyOf(recordedCupWinner) !== clubKeyOf(season.club)) ? undefined : recordedCupWinner;\n    const nextShield = captureCommunityShield({\n      qualifyingYear: thisYear, worldYear: world.year, seed: s.phone?.seed, englishOrder,\n      leagueWinner: world.leagues['Premier League'], cupWinner,\n      cupSource: ownFA ? 'validated-player-fa-cup' : 'phone-world',\n    });\n    if (nextShield) s.extraCupQualification = nextShield;\n    else delete s.extraCupQualification;\n  }\n\n  // Ballon d'Or calculation. Round 834:"},{"label":"merge opening contribution after all normal annual consumers","before":"  prepareLeagueWorld(s, clubs, season.year + 1);\n  return s;\n}\n\n/* ─── Round 131: breaking your own ceiling","after":"  prepareLeagueWorld(s, clubs, season.year + 1);\n  Object.assign(season, communityShieldSeasonStats(season, shieldMatch));\n  return s;\n}\n\n/* ─── Round 131: breaking your own ceiling"},{"label":"hold old totals reduce arithmetic in a local value","before":"export function getCareerTotals(seasons: SeasonRecord[]) {\n  return seasons.reduce","after":"export function getCareerTotals(seasons: SeasonRecord[]) {\n  const totals = seasons.reduce"},{"label":"append new counter without changing any old statistic or legacy weight","before":"  }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, leagueTitles: 0, domesticCups: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0, continentalCups: 0, clubCups: 0 });\n}\n\n/* ─── Legacy Calculation ─── */","after":"  }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, leagueTitles: 0, domesticCups: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0, continentalCups: 0, clubCups: 0 });\n  return { ...totals, communityShields: countCommunityShields(seasons) };\n}\n\n/* ─── Legacy Calculation ─── */"},{"label":"capture injuryRow annual grade at existing late boundary","before":"      Object.assign(injuryRow, communityShieldSeasonStats(injuryRow, shieldMatch));","after":"      if (shieldMatch?.player.apps === 1) shieldMatch.annualRating = injuryRow.apps > 0 ? injuryRow.rating : 0;\n      Object.assign(injuryRow, communityShieldSeasonStats(injuryRow, shieldMatch));"},{"label":"capture season annual grade at existing late boundary","before":"  Object.assign(season, communityShieldSeasonStats(season, shieldMatch));","after":"  if (shieldMatch?.player.apps === 1) shieldMatch.annualRating = season.apps > 0 ? season.rating : 0;\n  Object.assign(season, communityShieldSeasonStats(season, shieldMatch));"}];
const IMPORT_WITHOUT_KEY = "import { prepareLeagueWorld, projectLeagueWorldClubs, recordLeagueWorldSeason, settleLeagueWorld, leagueWorldChampions, type CareerLeagueWorld, type LeagueWorldSeason } from './soccerCareerLeagueWorld';";
const GRAPH = {"src/lib/soccerCareerLeagueWorld.ts":{"bytes":15636,"sha256":"360c629f5d6ecc9cd959f5aae9a3791eb99b4f5cecdca2236da563168c2bb8c6","gitBlob":"72fcabdd0c557a743aa849b01208140c3030048f"},"src/lib/keyedRng.ts":{"bytes":1289,"sha256":"dc78803cd8f86fd73c70e26b36faf40915b4e6bbca7f6b0c4efffab28e9032ef","gitBlob":"acfd3a0a410e03ac0950953aa05b82e4c46e004f"},"src/lib/soccerCareerContinental.ts":{"bytes":49545,"sha256":"1e9e462a16c68dd58c2849613c5e2e3de4e8a98e757ef006039189878bfb6e47","gitBlob":"44d4acee04504ac92382a986b3e2cfd5301d4ac1"}};
const EXTRA_PIN = { bytes: 16110, sha256: 'bc3c8b79f2e910a2ff730f216e1aaa7fb532139d663b45e956d43c9a92539934', gitBlob: 'f96d2442942db57eb89d3d73d7dc18bba02ec165' };
const CURRENT_ENGINE = { bytes: 556448, sha256: 'f009782c9f7a384881692239c47af266a834eaa1104ce86662ab53ec67756788', gitBlob: 'a65c8353d6e4660c1d6cec6471e17095eed35805' };
const MAIN_ENGINE = { bytes: 552812, sha256: 'a62262813f12c1c2a002e1abf0cd825ac2395a2ef16b74869040f2cde83d2211', gitBlob: '722b2285628775dff77f8de0138cf44d7b104b49' };

function sourceText(raw) {
  assert(Buffer.isBuffer(raw), 'Shield source custody requires actual bytes');
  const text = raw.toString('utf8');
  assert.deepEqual(Buffer.from(text, 'utf8'), raw, 'Shield source is complete UTF-8');
  const contents = text.replaceAll('\r\n', '\n');
  assert(!contents.includes('\r'), 'Shield source has no unsupported bare CR');
  const ending = text.includes('\r\n') ? '\r\n' : '\n';
  assert.equal(contents.replaceAll('\n', ending), text, 'Shield source has one truthful line ending');
  return { contents, ending };
}

function engineSpans(withoutKey = false) {
  return SPANS.map((span, index) => index === 0 && withoutKey ? { ...span, before: IMPORT_WITHOUT_KEY } : span);
}

function transform(contents, spans, inverse = false) {
  const steps = [];
  for (const [index, span] of (inverse ? [...spans].reverse() : spans).entries()) {
    const from = inverse ? span.after : span.before, to = inverse ? span.before : span.after;
    assert.equal(contents.split(from).length, 2, 'Unique actual Shield ' + (inverse ? 'inverse: ' : 'forward: ') + span.label);
    const offset = contents.indexOf(from), before = pin(contents);
    contents = contents.slice(0, offset) + to + contents.slice(offset + from.length);
    const after = pin(contents);
    assert.notEqual(after.sha256, before.sha256, 'Shield span must change actual source: ' + span.label);
    steps.push({ index: inverse ? spans.length - 1 - index : index, label: span.label, offset, before, after });
  }
  return { contents, steps };
}

export function loadCommunityShieldOracleSource({ original, base, relative, readOriginal, readCurrent }) {
  // Only this new file is read from the current tree in an original oracle.
  const exception = original && relative === EXTRA;
  const raw = exception || !original ? readCurrent() : readOriginal();
  assert(Buffer.isBuffer(raw), 'Actual oracle source reader returns raw bytes');
  if (exception) {
    const { contents } = sourceText(raw);
    assert.deepEqual(pin(contents), EXTRA_PIN, 'Only the pinned new Shield module enters the old graph');
    return { raw, contents, receipt: { origin: 'current-new-extra-cups', base, raw: pin(raw), canonical: EXTRA_PIN } };
  }
  if (!original || relative !== ENGINE) {
    if (original && GRAPH[relative]) assert.deepEqual(pin(raw), GRAPH[relative], 'Existing Shield dependency remains the exact original BASE module: ' + relative);
    return { raw, contents: raw.toString('utf8'), receipt: null };
  }
  const expected = OLD_ENGINES.find(row => row.base === base);
  assert(expected, 'Explicit admitted original engine BASE');
  assert.deepEqual(pin(raw), expected.original, 'Exact immutable original engine bytes');
  const { contents } = sourceText(raw), spans = engineSpans(expected.withoutClubKey);
  const composed = transform(contents, spans);
  assert.deepEqual(pin(composed.contents), expected.composed, 'Exact eleven-span composed original engine');
  const restored = transform(composed.contents, spans, true);
  assert.equal(restored.contents, contents, 'All eleven Shield spans invert to the complete original engine');
  assert.deepEqual(Buffer.from(restored.contents, 'utf8'), raw, 'Original raw engine bytes survive the full inverse');
  return { raw, contents: composed.contents, receipt: { origin: 'original-base-plus-exact-shield', base, id: expected.id, importVariant: expected.withoutClubKey ? 'without-clubKeyOf' : 'with-clubKeyOf', raw: pin(raw), composed: pin(composed.contents), forward: composed.steps, inverse: restored.steps, wholeRawInverse: true } };
}

export function verifyCommunityShieldEngineSource(raw, extraRaw) {
  const current = sourceText(raw), extra = sourceText(extraRaw);
  assert.deepEqual(pin(current.contents), CURRENT_ENGINE, 'Results layout holds the admitted current engine');
  assert.deepEqual(pin(extra.contents), EXTRA_PIN, 'Results layout holds the admitted Shield helper');
  const spans = engineSpans(), inverse = transform(current.contents, spans, true);
  assert.deepEqual(pin(inverse.contents), MAIN_ENGINE, 'Only eleven approved Shield spans separate the current engine from main');
  const forward = transform(inverse.contents, spans);
  assert.equal(forward.contents, current.contents, 'Current engine full Shield inverse and forward hold');
  assert.deepEqual(Buffer.from(forward.contents.replaceAll('\n', current.ending), 'utf8'), raw, 'Current raw engine bytes hold across the full inverse');
  return { raw: pin(raw), canonical: CURRENT_ENGINE, original: MAIN_ENGINE, extraRaw: pin(extraRaw), extraCanonical: EXTRA_PIN, inverse: inverse.steps, forward: forward.steps, wholeRawInverse: true };
}
