/** Own-goal metadata outcomes and measured fictional exposure.
 * Run remotely: CAREERS=120 SEEDSET=0 node scripts/simSoccerOwnGoals.mjs.
 * OWN_GOAL_CONTROL selects an effective copied-source fault. Controls pass
 * only when the corresponding outcome assertion fails with AssertionError.
 * The existing agreement population and passive choices are held. Rates are
 * measured, not accepted against an invented frequency floor or ceiling.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { mulberry32 } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAREERS = Number(process.env.CAREERS ?? 120);
const SEEDSET = Number(process.env.SEEDSET ?? 0);
const CONTROL = process.env.OWN_GOAL_CONTROL ?? '';
assert(Number.isInteger(CAREERS) && CAREERS > 0 && CAREERS <= 500, 'positive bounded CAREERS');
assert(Number.isInteger(SEEDSET) && SEEDSET >= 0 && SEEDSET <= 100, 'bounded SEEDSET');
const evidence = process.env.OWN_GOAL_EVIDENCE_DIR ? path.resolve(process.env.OWN_GOAL_EVIDENCE_DIR) : fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
fs.mkdirSync(evidence, { recursive: true });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value);
const trip = value => JSON.parse(json(value));
const put = (name, value) => fs.writeFileSync(path.join(evidence, name), json(value) + '\n');
const EVENTS = 'src/lib/season/soccerEvents.ts';
const CORE = 'src/lib/season/core.ts';
/* Round 1146: the two keyed rolls were lifted into the rule both soccer games read (src/lib/ownGoalRule.ts),
   so the three controls that break them (role, gate, rng) patch the lifted lines. Same faults, same checks. */
const RULE = 'src/lib/ownGoalRule.ts';
const gate = 'if (keyedRng(`${key}|tag`)() >= 1 / oneIn) return false;';
const controls = {
  points: { from: 'e.pts !== 1 || e.mine', to: 'e.mine', check: 'eligibility', scenario: 'points' },
  mine: { from: 'e.pts !== 1 || e.mine || mirrors.has(g.md)', to: 'e.pts !== 1 || mirrors.has(g.md)', check: 'eligibility', scenario: 'mine' },
  assist: { from: " || (e.side === 'us' && assists.has(e.min))", to: '', check: 'eligibility', scenario: 'assist' },
  origin: { from: ' || minutes.has(`${g.md}|${e.min}`)', to: '', check: 'eligibility', scenario: 'origin' },
  mirror: { from: ' || mirrors.has(g.md)', to: '', check: 'eligibility', scenario: 'mirror' },
  kind: { from: "if (e.kind !== 'goal') return e;", to: '', check: 'eligibility', scenario: 'kind' },
  pitch: { from: 'win && e.min >= win[0] && e.min <= win[1] && role === 0', to: 'role === 0', check: 'self-pitch', scenario: 'missed' },
  beneficiary: { from: "e.side === 'us' ? 'opponent'", to: "e.side === 'us' ? 'teammate'", check: 'beneficiary', scenario: 'opponent' },
  role: { from: 'const role = ownGoalRole(key, 11);', to: 'const role = ownGoalRole(key, 1);', check: 'local-policy', scenario: 'teammate' },
  gate: { file: RULE, from: gate, to: gate.replace('1 / oneIn', '2 / oneIn'), check: 'local-policy', scenario: 'between' },
  score: { from: 'return { ...g, events: g.events.map((e): SeasonEvent => {', to: 'return { ...g, us: g.us + 1, events: g.events.map((e): SeasonEvent => {', check: 'metadata-inverse', scenario: 'self' },
  filteredordinal: { from: 'ordinals.set(group, ordinal + 1);', to: 'if (!e.mine) ordinals.set(group, ordinal + 1);', check: 'local-policy', scenario: 'preceding-mine' },
  input: { from: 'const assists = new Set(g.events.filter', to: 'g.line.goals = (g.line.goals ?? 0) + 1; const assists = new Set(g.events.filter', check: 'input-immutable', scenario: 'self' },
  ordinal: { from: 'const ordinal = ordinals.get(group) ?? 0;', to: 'const ordinal = g.events.indexOf(e);', check: 'insertion-stability', scenario: 'insertion' },
  rng: { file: RULE, from: gate, to: 'if (Math.random() >= 1 / oneIn) return false;', check: 'ambient-rng', scenario: 'self' },
  ledgerdata: { file: 'src/lib/season/momentsSave.ts', from: 'isInt(e[2], -1, 3)', to: 'isInt(e[2], -1, 4)', check: 'ledger-reader', scenario: 'ledger' },
  ledgerkey: { file: 'src/lib/season/momentsSave.ts', from: 's && s.key === key ? s.m : []', to: 's ? s.m : []', check: 'ledger-reader', scenario: 'ledger' },
  stream: { file: CORE, from: '`${key}|alloc`', to: '`${key}|alloc-broken`', check: 'parent-derived', scenario: 'cohort' },
};
assert(!CONTROL || Object.hasOwn(controls, CONTROL), 'known OWN_GOAL_CONTROL');
let checks = 0;
const counts = {};
function check(name, operation) {
  checks += 1;
  counts[name] = (counts[name] ?? 0) + 1;
  try { operation(); } catch (error) { error.ownGoalCheck = name; throw error; }
}

// Every actual bundle input and map is retained for the external byte auditor.
// Patches affect the bundle's source copy, never a product file on disk.
async function bundle(root, label, mutation) {
  const out = path.join(evidence, label);
  fs.mkdirSync(out);
  const entry = path.join(out, 'entry.ts');
  const modules = { soccer: 'soccerCareerEngine.ts', season: 'season/soccer.ts', core: 'season/core.ts', events: 'season/soccerEvents.ts', ledger: 'season/momentsSave.ts', keyed: 'keyedRng.ts', saves: 'soccerCareerSave.ts' };
  const entryText = Object.entries(modules).map(([name, relative]) => `import * as ${name} from ${json(path.join(root, 'src/lib', relative))};\nexport { ${name} };`).join('\n');
  fs.writeFileSync(entry, entryText + '\n');
  const require = createRequire(path.join(root, 'package.json'));
  const esbuild = require('esbuild');
  const loaded = [];
  const plugins = mutation ? [{ name: 'own-goal-source-control', setup(build) {
    build.onLoad({ filter: /\.ts$/ }, args => {
      if (path.resolve(args.path) !== path.resolve(root, mutation.file ?? EVENTS)) return;
      const before = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
      const occurrences = before.split(mutation.from).length - 1;
      assert.equal(occurrences, 1, 'control anchor occurs exactly once');
      const after = before.replace(mutation.from, mutation.to);
      assert.notEqual(after, before, 'source control changes executable bytes');
      fs.writeFileSync(path.join(out, 'control-before.ts'), before);
      fs.writeFileSync(path.join(out, 'control-after.ts'), after);
      loaded.push({ file: mutation.file ?? EVENTS, occurrences, beforeSha256: digest(before), afterSha256: digest(after), from: mutation.from, to: mutation.to });
      return { contents: after, loader: 'ts', resolveDir: path.dirname(args.path) };
    });
  } }] : [];
  const buildOptions = { entryPoints: [entry], outfile: path.join(out, 'bundle.cjs'), absWorkingDir: root, bundle: true, platform: 'node', format: 'cjs', sourcemap: 'external', sourcesContent: true, metafile: true, alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' }, plugins, logLevel: 'silent' };
  const built = await esbuild.build(buildOptions);
  if (mutation) assert.equal(loaded.length, 1, 'controlled actual module was loaded once');
  fs.writeFileSync(path.join(out, 'metafile.json'), json(built.metafile));
  const inputs = Object.entries(built.metafile.inputs).map(([name, meta]) => {
    const absolute = path.resolve(root, name);
    const bytes = fs.readFileSync(absolute);
    return { name, path: absolute, bytes: bytes.length, sha256: digest(bytes) };
  });
  fs.writeFileSync(path.join(out, 'inputs.json'), json(inputs));
  fs.writeFileSync(path.join(out, 'mutations.json'), json(loaded));
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  return require(path.join(out, 'bundle.cjs'));
}

const B = await bundle(ROOT, 'candidate', CONTROL ? controls[CONTROL] : null);
const { soccer, season: S, core: C, events: E, ledger: L, keyed: K, saves: V } = B;
const parent = process.env.OWN_GOAL_PARENT_ROOT ? await bundle(path.resolve(process.env.OWN_GOAL_PARENT_ROOT), 'parent', null) : null;
const strip = season => ({ ...season, games: season.games.map(g => ({ ...g, events: g.events.map(e => { const { ownGoalBy, ...rest } = e; return rest; }) })) });
const exclusions = moments => ({ minutes: new Set(moments.map(m => `${m.md}:${m.minute}`)), mirrors: new Set(moments.filter(m => m.mirrorMd !== null).map(m => m.mirrorMd)) });
const active = (g, e) => g.played && e.min >= (g.onAt ?? 1) && e.min < (g.offAt ?? 91);
function reasons(g, e, excluded) {
  const r = [];
  if (e.kind !== 'goal') r.push('nonGoal');
  if (e.pts !== 1) r.push('points');
  if (e.mine) r.push('mine');
  if (excluded.mirrors.has(g.md)) r.push('mirror');
  if (excluded.minutes.has(`${g.md}:${e.min}`)) r.push('origin');
  if (e.side === 'us' && g.events.some(a => a.kind === 'assist' && a.mine && a.min === e.min)) r.push('assist');
  return r;
}
function markerRows(season) {
  return season.games.flatMap(g => {
    const n = new Map();
    return g.events.flatMap((e, eventIndex) => {
      if (e.kind !== 'goal') return [];
      const group = `${e.side}:${e.min}`, ordinal = n.get(group) ?? 0;
      n.set(group, ordinal + 1);
      return [{ g, e, eventIndex, ordinal, id: `${g.md}:${e.side}:${e.min}:${ordinal}` }];
    });
  });
}
function verify(source, moments, recordName = null) {
  const original = trip(source), originalMoments = trip(moments);
  let marked;
  const random = Math.random;
  Math.random = () => { throw new Error('ambient random consumed by classifier'); };
  try { check('ambient-rng', () => assert.doesNotThrow(() => { marked = E.soccerOwnGoals(source, moments); })); }
  finally {
    Math.random = random;
    if (recordName) put(recordName, { source: original, sourceAfter: trip(source), moments: originalMoments, momentsAfter: trip(moments), marked: marked ? trip(marked) : null });
  }
  check('input-immutable', () => { assert.deepEqual(source, original); assert.deepEqual(moments, originalMoments); });
  check('metadata-inverse', () => assert.deepEqual(strip(marked), original));
  const excluded = exclusions(moments);
  for (const g of marked.games) for (const e of g.events) if (e.ownGoalBy !== undefined) {
    check('eligibility', () => assert.deepEqual(reasons(g, e, excluded), []));
    check('beneficiary', () => assert(e.side === 'us' ? e.ownGoalBy === 'opponent' : ['you', 'teammate'].includes(e.ownGoalBy)));
    check('self-pitch', () => assert(e.ownGoalBy !== 'you' || e.side === 'them' && active(g, e)));
  }
  const output = new Map(markerRows(marked).map(x => [x.id, x.e.ownGoalBy]));
  for (const { g, e, ordinal, id } of markerRows(original)) {
    const key = `${original.key}|og|${g.md}|${e.min}|${e.side}|${ordinal}`;
    let expected;
    if (reasons(g, e, excluded).length === 0 && K.keyedRng(`${key}|tag`)() < 1 / 64) {
      expected = e.side === 'us' ? 'opponent' : active(g, e) && Math.floor(K.keyedRng(`${key}|role`)() * 11) === 0 ? 'you' : 'teammate';
    }
    check('local-policy', () => assert.equal(output.get(id), expected));
  }
  check('repeat-json', () => {
    assert.deepEqual(E.soccerOwnGoals(source, moments), marked);
    assert.deepEqual(E.soccerOwnGoals(trip(source), trip(moments)), marked);
  });
  return marked;
}

// Structural fixtures choose natural keyed draws, never change production odds.
// They are not counted as career exposure or used for viewer screenshots.
function fixture(kind) {
  const side = ['opponent', 'mine', 'assist', 'origin', 'mirror', 'kind', 'preceding-mine'].includes(kind) ? 'us' : 'them';
  let key;
  for (let n = 0; n < 100000; n += 1) {
    const candidate = `functional-${kind}-${n}`;
    const k = `${candidate}|og|1|55|${side}|${kind === 'preceding-mine' ? 1 : 0}`;
    const tag = K.keyedRng(`${k}|tag`)(), role = Math.floor(K.keyedRng(`${k}|role`)() * 11);
    if ((kind === 'between' ? tag >= 1 / 64 && tag < 1 / 32 : tag < 1 / 64)
      && (kind === 'teammate' ? role !== 0 : ['self', 'missed', 'before', 'after', 'on', 'insertion'].includes(kind) ? role === 0 : true)
      && (kind !== 'insertion' || K.keyedRng(`${candidate}|og|1|55|${side}|2|tag`)() >= 1 / 64)
      && (kind !== 'preceding-mine' || K.keyedRng(`${candidate}|og|1|55|${side}|0|tag`)() >= 1 / 64)) { key = candidate; break; }
  }
  assert(key, 'bounded keyed fixture search found the required draw');
  const event = { min: 55, kind: kind === 'kind' ? 'assist' : 'goal', side, pts: kind === 'points' ? 2 : 1, ...(kind === 'mine' ? { mine: true } : {}) };
  const game = { md: 1, opp: 1, home: true, us: side === 'us' && kind !== 'kind' ? 1 : 0, them: side === 'them' ? 1 : 0, fixed: false, played: kind !== 'missed', started: false, onAt: kind === 'before' ? 56 : kind === 'on' ? 55 : 50, offAt: kind === 'after' ? 55 : 60, line: { goals: kind === 'mine' ? 1 : 0, assists: kind === 'assist' ? 1 : 0 }, events: [event] };
  if (kind === 'preceding-mine') { game.events.unshift({ ...event, mine: true }); game.us += 1; game.line.goals = 1; }
  if (kind === 'assist') game.events.push({ min: 55, kind: 'assist', side: 'us', mine: true });
  const season = { key, mode: 'results', rule: null, teams: 2, labels: [], games: [game], rounds: [], bucket: null, clinch: null, target: {}, attempt: 1, repairs: 0 };
  const moments = kind === 'origin' ? [{ md: 1, minute: 55, mirrorMd: null }] : kind === 'mirror' ? [{ md: 2, minute: 22, mirrorMd: 1 }] : [];
  return { season, moments };
}
function insertion() {
  const { season } = fixture('insertion');
  const plain = E.soccerOwnGoals(trip(season), []);
  const withEvents = trip(season);
  withEvents.games[0].events.unshift({ min: 1, kind: 'goal', side: 'us', pts: 1 }, { min: 55, kind: 'yellow', side: 'us' });
  withEvents.games[0].us += 1;
  const withGame = trip(season);
  withGame.games.unshift({ ...trip(season.games[0]), md: 2 });
  for (const changed of [withEvents, withGame]) {
    const classified = E.soccerOwnGoals(changed, []);
    put(changed === withEvents ? 'insertion-events.json' : 'insertion-game.json', { source: season, marked: plain, insertedSource: changed, insertedMarked: classified });
    const rows = new Map(markerRows(classified).map(x => [x.id, x.e.ownGoalBy]));
    check('insertion-stability', () => { for (const x of markerRows(plain)) assert.equal(rows.get(x.id), x.e.ownGoalBy); });
  }
}

function boundaries() {
  const source = fixture('self');
  const variants = [
    { name: 'played-false', played: false },
    { name: 'before-on', onAt: 56 },
    { name: 'at-on', onAt: 55 },
    { name: 'at-off', offAt: 55 },
    { name: 'before-off', offAt: 56 },
  ];
  for (const variant of variants) {
    const changed = trip(source.season), { name, ...fields } = variant;
    Object.assign(changed.games[0], fields);
    verify(changed, [], 'boundary-' + name + '.json');
  }
}
function ledgerCases(key = 'functional-ledger', md = 1, id = 0, year = 2025) {
  const entries = [[md, id, -1, .1, .2, .3]];
  const valid = { v: 1, key, m: entries };
  const cases = [
    { name: 'absent', carrier: {}, expected: null, entries: [] },
    { name: 'malformed', carrier: { seasonMoments: { ...valid, m: [[md, id, 4]] } }, expected: null, entries: [] },
    { name: 'stale', carrier: { seasonMoments: { ...valid, key: key + '-previous' } }, expected: { ...valid, key: key + '-previous' }, entries: [] },
    { name: 'used', carrier: { seasonMoments: valid }, expected: valid, entries },
    { name: 'banked', carrier: { seasonMoments: { ...valid, banked: 1, paid: [year, 1], tally: { seasons: 1, moments: 1, stars: 1 } } }, expected: { ...valid, banked: 1, paid: [year, 1], tally: { seasons: 1, moments: 1, stars: 1 } }, entries },
  ];
  for (const row of cases) {
    const before = trip(row.carrier), decoded = L.readSeasonMoments(row.carrier.seasonMoments), gotEntries = L.ledgerOf(decoded, key);
    put('ledger-' + row.name + '.json', { key, rawBefore: before, rawAfter: row.carrier, expectedRead: row.expected, actualRead: decoded, expectedEntries: row.entries, actualEntries: gotEntries });
    check('ledger-reader', () => { assert.deepEqual(decoded, row.expected); assert.deepEqual(gotEntries, row.entries); assert.deepEqual(row.carrier, before); });
  }
}
const metrics = { seedset: SEEDSET, careers: CAREERS, seasons: 0, playingRows: 0, refused: {}, modes: {}, games: 0, playedGames: 0, missedGames: 0, goals: 0, excluded: {}, excludedAny: 0, eligible: { us: 0, them: 0, onPitchThem: 0, offPitchThem: 0, missedThem: 0 }, tagged: { opponent: 0, teammate: 0, you: 0 }, roleOpportunities: 0, roleZeroDraws: 0, roleDraws: Array(11).fill(0), taggedMatches: 0, taggedSeasons: 0, selfMatches: 0, selfSeasons: 0, parentDerived: 0, momentMixtures: 0, distinctChangedMixtures: 0, seasonRows: [], careerRows: [] };
const observedFixtures = new Set();
const NATS = ['England', 'Brazil', 'France', 'Spain', 'Argentina', 'Nigeria', 'Japan', 'Norway'];
const POSITIONS = ['ST', 'LW', 'CAM', 'RW', 'CM', 'CB', 'GK', 'CDM', 'LB', 'RB'];
const ERAS = [{ value: '1990-94', y: 1990 }, { value: '2000-04', y: 2000 }, { value: '2010-14', y: 2010 }, { value: '2020-24', y: 2020 }, { value: '2025', y: 2025 }];
const POT = [95, 92, 89, 86, 83, 80, 77, 93];
const abilities = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const CLUBS = soccer.FALLBACK_CLUBS;
function step(s, phase) {
  switch (phase) {
    case 'youth': return soccer.advanceYouthYear(s, CLUBS);
    case 'contract_offer': return s.pendingOffers?.length ? soccer.acceptOffer(s, s.pendingOffers[0]) : { ...s, phase: 'playing' };
    case 'playing': return soccer.advanceProSeason(s, CLUBS);
    case 'newspaper': return soccer.dismissNewspaper(s);
    case 'season_summary': return soccer.dismissSummary(s, CLUBS);
    case 'ballon_dor': return soccer.dismissBallonDor(s, CLUBS);
    case 'international_debut': return soccer.dismissDebut(s, CLUBS);
    case 'world_cup': return soccer.dismissWorldCup(s, CLUBS);
    case 'rivalry_event': return soccer.dismissRivalryEvent(s, CLUBS);
    case 'social_media_action': return soccer.dismissSocialMediaPhase(s, CLUBS);
    case 'moral_dilemma': { const next = soccer.applyMoralDilemmaChoice(s, 0); return next.phase === 'moral_dilemma' ? soccer.dismissMoralDilemma(next, CLUBS) : next; }
    case 'random_events': return s.pendingEvents?.[0]?.choices?.length ? soccer.applyEventChoice(s, 0, CLUBS) : { ...s, phase: 'playing', pendingEvents: [] };
    case 'red_card_appeal_result': return soccer.dismissAppealResult(s, CLUBS);
    case 'rehab_choice': return soccer.applyRehabChoice(s, 0);
    case 'transfer_window': return soccer.stayAtClub(s);
    case 'retirement_suggestion': return s.age >= 34 ? soccer.acceptRetirementSuggestion(s) : soccer.declineRetirementSuggestion(s, CLUBS);
    default: throw new Error(`no passive driver for phase ${phase}`);
  }
}
const bump = (object, key) => { object[key] = (object[key] ?? 0) + 1; };
function measure(career, row, derived, planned, marked, careerRow) {
  const excluded = exclusions(planned), rows = markerRows(derived), out = new Map(markerRows(marked).map(x => [x.id, x]));
  const taggedGames = new Set(), selfGames = new Set();
  const seasonRow = { key: derived.key, year: row.year, mode: derived.mode, goals: rows.length, eligible: 0, tags: 0, self: 0, momentCount: planned.length };
  metrics.seasons += 1; bump(metrics.modes, derived.mode);
  for (const g of derived.games) { metrics.games += 1; metrics[g.played ? 'playedGames' : 'missedGames'] += 1; }
  for (const x of rows) {
    metrics.goals += 1;
    const why = reasons(x.g, x.e, excluded);
    for (const reason of why) bump(metrics.excluded, reason);
    if (why.length) metrics.excludedAny += 1;
    else {
      seasonRow.eligible += 1; metrics.eligible[x.e.side] += 1;
      if (x.e.side === 'them') metrics.eligible[x.g.played ? active(x.g, x.e) ? 'onPitchThem' : 'offPitchThem' : 'missedThem'] += 1;
      if (x.e.side === 'them' && active(x.g, x.e)) {
        const key = `${derived.key}|og|${x.g.md}|${x.e.min}|${x.e.side}|${x.ordinal}`;
        if (K.keyedRng(`${key}|tag`)() < 1 / 64) {
          metrics.roleOpportunities += 1;
          const role = Math.floor(K.keyedRng(`${key}|role`)() * 11);
          metrics.roleDraws[role] += 1; if (role === 0) metrics.roleZeroDraws += 1;
        }
      }
    }
    const tagged = out.get(x.id);
    if (!tagged.e.ownGoalBy) continue;
    const role = tagged.e.ownGoalBy;
    metrics.tagged[role] += 1; seasonRow.tags += 1; careerRow.tags += 1; taggedGames.add(x.g.md);
    if (role === 'you') { seasonRow.self += 1; careerRow.self += 1; selfGames.add(x.g.md); }
    if (process.env.OWN_GOAL_UI_FIXTURES && !observedFixtures.has(role)) {
      const folder = path.resolve(process.env.OWN_GOAL_UI_FIXTURES); fs.mkdirSync(folder, { recursive: true });
      const name = path.join(folder, `${role}.json`);
      const ordinaryEvent = marked.games.find(g => g.md === x.g.md).events.find(e => e.kind === 'goal' && !e.ownGoalBy) ?? null;
      fs.writeFileSync(name, json({ career: trip(career), clubs: trip(CLUBS), row: trip(row), derived: trip(derived), plannedMoments: trip(planned), marked: trip(marked), md: x.g.md, event: trip(tagged.e), eventIndex: tagged.eventIndex, ordinaryEvent: trip(ordinaryEvent), population: { seedset: SEEDSET, career: careerRow.career } }) + '\n', { flag: 'wx' });
      observedFixtures.add(role);
    }
  }
  metrics.taggedMatches += taggedGames.size; metrics.selfMatches += selfGames.size;
  if (seasonRow.tags) { metrics.taggedSeasons += 1; careerRow.taggedSeasons += 1; }
  if (seasonRow.self) { metrics.selfSeasons += 1; careerRow.selfSeasons += 1; }
  careerRow.seasons += 1;
  metrics.seasonRows.push(seasonRow);
}
function onSeason(career, row, careerRow) {
  const rawCareer = json(career), rawRow = json(row);
  metrics.playingRows += 1;
  const ctx = S.buildSoccerSeasonCtx(career, CLUBS, row);
  const derived = C.deriveSeasonOrWhy(S.SOCCER, row, ctx);
  if (typeof derived === 'string') { bump(metrics.refused, derived); return; }
  if (parent) {
    const before = parent.core.deriveSeasonOrWhy(parent.season.SOCCER, trip(row), parent.season.buildSoccerSeasonCtx(trip(career), CLUBS, trip(row)));
    check('parent-derived', () => assert.deepEqual(derived, before));
    metrics.parentDerived += 1;
  }
  const planned = C.planMoments(S.SOCCER, row, ctx, derived);
  if (parent) check('parent-moments', () => assert.deepEqual(parent.core.planMoments(parent.season.SOCCER, row, ctx, derived), planned));
  const marked = verify(derived, planned);
  const baselineMarkers = new Map(markerRows(marked).map(x => [x.id, x.e.ownGoalBy]));
  const excluded = exclusions(planned);
  for (let mask = 0; mask < 2 ** planned.length; mask += 1) {
    const entries = planned.map((m, i) => [m.md, m.id, mask & (1 << i) ? m.planSuccess ? 0 : 2 : m.planSuccess ? 3 : 0, .1, .2, .3]);
    const alternate = C.applyDecisions(S.SOCCER, row, ctx, derived, planned, entries);
    if (parent) check('parent-decisions', () => assert.deepEqual(parent.core.applyDecisions(parent.season.SOCCER, row, ctx, derived, planned, entries), alternate));
    const alternateMarkers = verify(alternate, planned);
    metrics.momentMixtures += 1;
    if (json(alternate) !== json(derived)) metrics.distinctChangedMixtures += 1;
    for (const x of markerRows(alternateMarkers)) if (!excluded.mirrors.has(x.g.md) && !excluded.minutes.has(`${x.g.md}:${x.e.min}`)) {
      check('moment-stability', () => assert.equal(x.e.ownGoalBy, baselineMarkers.get(x.id)));
    }
  }
  // Classification cannot write a career or settle a saved moment.
  const oldSave = trip(career); delete oldSave.seasonMoments;
  check('old-save', () => assert(V.isSoccerCareerSave(oldSave)));
  const restore = trip(oldSave);
  const restoredRow = restore.seasons[career.seasons.indexOf(row)];
  assert(restoredRow, 'actual row survives career JSON roundtrip');
  check('old-save', () => assert.deepEqual(C.deriveSeason(S.SOCCER, restoredRow, S.buildSoccerSeasonCtx(restore, CLUBS, restoredRow)), derived));
  for (const result of [-1, 0, 1, 2, 3]) {
    let saved = null;
    for (const m of planned) saved = L.ledgerPut(saved, derived.key, m.md, m.id, result, [.1, .2, .3]);
    const save = { ...oldSave, ...(saved ? { seasonMoments: saved } : {}) }, encoded = json(save);
    const roundtrip = trip(save), read = L.readSeasonMoments(roundtrip.seasonMoments);
    check('ledger-roundtrip', () => assert.deepEqual(read, saved));
    const decided = C.applyDecisions(S.SOCCER, row, ctx, derived, planned, L.ledgerOf(read, derived.key));
    verify(decided, planned);
    check('ledger-immutable', () => assert.equal(json(save), encoded));
  }
  check('career-immutable', () => { assert.equal(json(career), rawCareer); assert.equal(json(row), rawRow); });
  measure(career, row, derived, planned, marked, careerRow);
}
function cohort() {
  for (let c = 0; c < CAREERS; c += 1) {
    const real = Math.random;
    Math.random = mulberry32(c * 7919 + 11 + SEEDSET * 100003);
    const careerRow = { career: c, seasons: 0, tags: 0, self: 0, taggedSeasons: 0, selfSeasons: 0 };
    try {
      const era = ERAS[c % ERAS.length], o = 58 + ((c * 7) % 22);
      let s = soccer.initCareer(`Agree ${SEEDSET}.${c}`, NATS[c % NATS.length], POSITIONS[(c * 3) % POSITIONS.length], era.value, abilities(o), o, era.y, CLUBS, null, POT[c % POT.length]);
      let rows = s.seasons.length, stopped = false;
      for (let guard = 0; guard < 700; guard += 1) {
        if (s.retired || ['retirement_ceremony', 'retired', 'post_retirement', 'manager_season', 'pundit_season', 'owner_season'].includes(s.phase)) { stopped = true; break; }
        if (s.seasons.length > rows) {
          rows = s.seasons.length;
          const row = s.seasons[rows - 1];
          if (row.type === 'playing' && row.apps > 0) {
            const rng = Math.random; Math.random = () => { throw new Error('ambient random consumed while deriving'); };
            try { onSeason(s, row, careerRow); } finally { Math.random = rng; }
          }
        }
        s = step(s, s.phase);
      }
      check('population-complete', () => assert(stopped || s.retired, 'passive career reached retirement within the held bound'));
      metrics.careerRows.push(careerRow);
    } finally { Math.random = real; }
  }
}

try {
  if (CONTROL) {
    const selected = controls[CONTROL];
    let failure;
    try {
      if (selected.scenario === 'cohort') { assert(parent, 'stream control requires OWN_GOAL_PARENT_ROOT'); cohort(); }
      else if (selected.scenario === 'insertion') insertion();
      else if (selected.scenario === 'ledger') ledgerCases();
      else { const f = fixture(selected.scenario); verify(f.season, f.moments, 'functional-' + selected.scenario + '.json'); }
    } catch (error) { failure = error; }
    assert(failure instanceof assert.AssertionError, 'source mutation must trigger an actual outcome assertion');
    assert.equal(failure.ownGoalCheck, selected.check, 'control fails the intended check');
    put('control-result.json', { control: CONTROL, intendedCheck: selected.check, changedSource: true, failure: { name: failure.name, check: failure.ownGoalCheck, operator: failure.operator, message: failure.message, actual: failure.actual, expected: failure.expected }, checks, counts });
    console.log(`CONTROL ${CONTROL}: effective copied source, intended ${selected.check} AssertionError`);
  } else {
    for (const kind of ['self', 'teammate', 'opponent', 'points', 'mine', 'preceding-mine', 'assist', 'origin', 'mirror', 'kind', 'missed', 'before', 'after', 'on', 'between']) { const f = fixture(kind); verify(f.season, f.moments, 'functional-' + kind + '.json'); }
    boundaries();
    ledgerCases();
    insertion();
    verify({ ...fixture('self').season, games: [] }, [], 'functional-empty.json');
    const duplicate = fixture('self'); duplicate.season.games[0].events.push(trip(duplicate.season.games[0].events[0])); duplicate.season.games[0].them += 1; verify(duplicate.season, [], 'functional-duplicates.json');
    cohort();
    check('measured-denominators', () => {
      assert(metrics.seasons > 0 && metrics.goals > 0 && metrics.eligible.us > 0 && metrics.eligible.them > 0 && metrics.eligible.onPitchThem > 0);
      assert.equal(metrics.playingRows, metrics.seasons + Object.values(metrics.refused).reduce((n, count) => n + count, 0));
      assert.equal(metrics.goals, metrics.excludedAny + metrics.eligible.us + metrics.eligible.them);
      assert.equal(metrics.eligible.them, metrics.eligible.onPitchThem + metrics.eligible.offPitchThem + metrics.eligible.missedThem);
      assert.equal(metrics.tagged.you, metrics.roleZeroDraws);
      assert.equal(metrics.roleOpportunities, metrics.roleDraws.reduce((n, count) => n + count, 0));
      if (parent) assert.equal(metrics.parentDerived, metrics.seasons);
    });
    if (process.env.OWN_GOAL_UI_FIXTURES) check('natural-viewer-fixtures', () => assert.deepEqual([...observedFixtures].sort(), ['opponent', 'teammate', 'you']));
    put('measurement.json', { ...metrics, checks, counts, policy: { tag: '1/64', activePlayerRole: 'one of 11', acceptance: 'measurement only, fictional policy remains provisional' }, fixtureRoles: [...observedFixtures].sort() });
    console.log(`MEASURED seed ${SEEDSET}: ${metrics.seasons} seasons, ${metrics.goals} goals, ${metrics.excludedAny} excluded; eligible ${json(metrics.eligible)}; tags ${json(metrics.tagged)}; role draws ${json(metrics.roleDraws)}`);
    console.log(`MEASURED exposure: ${metrics.taggedMatches} tagged matches/${metrics.games}, ${metrics.taggedSeasons} tagged seasons/${metrics.seasons}, ${metrics.selfSeasons} self seasons/${metrics.seasons}; ${metrics.distinctChangedMixtures}/${metrics.momentMixtures} distinct changed mixtures`);
  }
  put('summary.json', { complete: true, control: CONTROL || null, careers: CONTROL ? null : CAREERS, seedset: SEEDSET, checks, counts, parentCompared: !!parent, acceptance: CONTROL ? 'intended source fault observed' : 'exact invariants passed; exposure policy pending measured review' });
  /* Release AP: which checks ran and how often. A green run used to print three
     lines, and runAllSims reads fewer than four as a harness that did not run (EMPTY, a failure). */
  console.log(`CHECKS by name: ${json(counts)}`);
  console.log(`simSoccerOwnGoals: ${checks} checks, 0 failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
} catch (error) {
  put('failure.json', { complete: false, control: CONTROL || null, check: error.ownGoalCheck ?? null, name: error.name, message: error.message, stack: error.stack, checks, counts, metrics });
  console.error(error.stack); process.exitCode = 1;
} finally {
  if (!process.env.OWN_GOAL_EVIDENCE_DIR) fs.rmSync(evidence, { recursive: true, force: true });
}
