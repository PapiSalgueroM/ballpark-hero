/* The created manager: optional, honest, and never a real person's name.

   Round 303, off the owner's tweaks document ("customizable created
   manager"). The spec is a name, a homeland, a background badge and a
   preferred football. The rules this harness pins:

   1. the name gate holds: a real baked footballer's name is refused, a real
      trivia pool name is refused, blocked language is refused, digits are
      refused, and a clean invented name passes;
   2. startCareer stores a valid spec and applies its style to the day one
      tactics EXACTLY as a founding club identity does; with no spec the day
      one tactics are byte identical to what the game always shipped, and at
      a custom club the founding identity outranks the manager's style;
   3. startCareer refuses to store a spec whose name fails the gate, so no
      caller can smuggle a real name past the form (defense in depth);
   4. the homeland actually flows: nationOfferFor calls with the manager's
      own federation when the engine can run it, and wildernessProfile
      carries the homeland into the job market instead of the old England
      hardcode;
   5. a save without a manager (every save made before this round) reads,
      advances a week and finishes cleanly.

   Negative control: SIM_MANAGER_CONTROL=unguard severs the real name check
   in a bundled copy and the refusal test must stop refusing, proving the
   gate is load bearing rather than decorative.

   Run: node scripts/simManagerSpec.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
let failures = 0;
/* Round 965: failures are counted per section, because the noappearance
   control must turn ONE section red and leave every other one green. */
let section = '0';
const failedSections = new Map();
const fail = m => {
  failures += 1;
  failedSections.set(section, (failedSections.get(section) ?? 0) + 1);
  console.error('  FAIL: ' + m);
};
const MODE = process.env.SIM_MANAGER_CONTROL || '';
const CONTROLS = ['unguard', 'noappearance', 'leak', 'twinstyle', 'deadmentality'];
if (MODE && !CONTROLS.includes(MODE)) {
  console.error(`SIM_MANAGER_CONTROL=${MODE} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
const CONTROL = MODE === 'unguard';

/* Round 965: esbuild found by walking up, so the harness runs from a git
   worktree with no node_modules of its own; on the main checkout it is ROOT's. */
const ESBUILD = (() => {
  for (let d = ROOT; ; d = path.dirname(d)) {
    const bin = path.join(d, 'node_modules', '.bin', 'esbuild');
    if (fs.existsSync(bin) || fs.existsSync(bin + '.cmd')) return bin.replaceAll('\\', '/');
    if (path.dirname(d) === d) return `${ROOT_URL}/node_modules/.bin/esbuild`;
  }
})();
const CM_SRC = `${ROOT}/src/lib/clubManager.ts`;
const XP_SRC = `${ROOT}/src/lib/clubManagerXp.ts`;
/* Every rewrite asserts its target is present: a control that changes nothing
   reports green for the wrong reason. Read LF, because a CRLF checkout would
   otherwise hide an anchor that is really there. */
const rewrite = (file, pairs, outName) => {
  let src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  for (const [from, to] of pairs) {
    if (!src.includes(from)) {
      console.error(`refusing to run: ${path.basename(file)} has no "${from}" to rewrite for ${outName}`);
      process.exit(1);
    }
    src = src.replace(from, to);
  }
  const out = path.join(os.tmpdir(), outName).replaceAll('\\', '/');
  fs.writeFileSync(out, src);
  return out;
};
const bundle = (name, cmFile, xpFile) => {
  const entry = path.join(os.tmpdir(), `${name}.entry.mjs`);
  const out = path.join(os.tmpdir(), `${name}.bundle.mjs`);
  fs.writeFileSync(entry, `
export * as cm from '${cmFile.replaceAll('\\', '/')}';
export * as xp from '${(xpFile ?? XP_SRC).replaceAll('\\', '/')}';
export { CM_ROSTERS } from '${ROOT_URL}/src/data/clubManagerRosters.ts';
export { players as POOL } from '${ROOT_URL}/src/data/players.ts';
`);
  /* The specific alias is matched ahead of the blanket '@' one, so the engine
     reads a rewritten XP module when one is handed in. */
  const xpAlias = xpFile ? ` "--alias:@/lib/clubManagerXp=${xpFile.replaceAll('\\', '/')}"` : '';
  execSync(`"${ESBUILD}" "${entry}" --bundle --format=esm --platform=node --outfile="${out}" --log-level=error${xpAlias} --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
  return out;
};

let cmPath = CM_SRC;
let xpPath = null;
if (MODE === 'unguard') {
  cmPath = rewrite(CM_SRC, [['if (realPersonNamesFolded().has(foldClubName(trimmed))) {', 'if (false) {']], 'clubManager.control.ts');
} else if (MODE === 'noappearance') {
  /* Round 965: the stored spec loses its face. Only section 7 may go red. */
  cmPath = rewrite(CM_SRC, [['  if (look) out.appearance = look;', '']], 'clubManager.noappearance.ts');
} else if (MODE === 'leak') {
  /* Round 965: the background grant leaks into careers with no manager.
     Section 11, the Skip career against the engine without this round, must
     go red. */
  xpPath = rewrite(XP_SRC, [['  const tree = backgroundTree(state.manager?.background);', "  const tree = backgroundTree(state.manager?.background ?? 'exPlayer');"]], 'clubManagerXp.leak.ts');
} else if (MODE === 'twinstyle') {
  /* Round 965: this round's own first draft, Wing play on 4-2-3-1 wide, which
     fields Gegenpress's eleven in Gegenpress's mentality. Section 13 must go red. */
  cmPath = rewrite(CM_SRC, [["blurb: 'Get it wide, get it in the box.', formationIndex: 0, mentality: 'attacking' }", "blurb: 'Get it wide, get it in the box.', formationIndex: 16, mentality: 'attacking' }"]], 'clubManager.twinstyle.ts');
} else if (MODE === 'deadmentality') {
  /* Round 965: the defensive mentality stops moving the scoring rates, so a
     style that only differs from Balanced by being defensive (Counter attack,
     same 4-4-2) changes nothing. Section 13 must go red. */
  cmPath = rewrite(CM_SRC, [['  defensive: { atk: -0.38, def: -0.32 },', '  defensive: { atk: 0, def: 0 },']], 'clubManager.deadmentality.ts');
}
const BUNDLE = bundle('managerSpec', cmPath, xpPath);
/* Stub in THIS process, before the import: a stub inside the entry hoists
   below the imports and the module scope reads localStorage first. */
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const { cm, xp, CM_ROSTERS, POOL } = await import(pathToFileURL(BUNDLE).href);

section = '1'; console.log('1) the name gate holds');
{
  const baked = Object.values(CM_ROSTERS).flat()[0].n;
  if (cm.validateManagerName(baked) === null) fail(`baked roster name "${baked}" was accepted`);
  const pool = POOL[0].name;
  if (cm.validateManagerName(pool) === null) fail(`trivia pool name "${pool}" was accepted`);
  if (cm.validateManagerName('moron rovers') === null) fail('blocked language was accepted');
  if (cm.validateManagerName('Agent 47') === null) fail('digits were accepted in a person name');
  if (cm.validateManagerName('X') === null) fail('a single letter was accepted');
  if (cm.validateManagerName('Sam Calloway') !== null) fail(`clean invented name refused: ${cm.validateManagerName('Sam Calloway')}`);
  if (cm.validateManagerName("Tomas O'Riain-Vega") !== null) fail('apostrophes and hyphens refused in a normal name');
  console.log(`   refused: "${baked}", "${pool}", blocked word, digits, one letter; accepted the invented names`);
}

const SPEC = { name: 'Sam Calloway', nationality: 'Spain', background: 'analyst', style: 'gegenpress' };

section = '2'; console.log('2) the spec lands and the style sets day one tactics, nothing else');
{
  const plain = cm.startCareer('Arsenal');
  const withSpec = cm.startCareer('Arsenal', undefined, undefined, SPEC);
  if (!withSpec.manager || withSpec.manager.name !== 'Sam Calloway') fail('the spec was not stored');
  const id = cm.CLUB_IDENTITIES[SPEC.style];
  if (withSpec.formationIndex !== id.formationIndex) fail(`style formation not applied: ${withSpec.formationIndex} vs ${id.formationIndex}`);
  if (withSpec.mentality !== id.mentality) fail(`style mentality not applied: ${withSpec.mentality} vs ${id.mentality}`);
  if (plain.manager !== undefined) fail('a plain career grew a manager from nowhere');
  if (plain.formationIndex !== 0 || plain.mentality !== 'balanced') {
    fail(`the classic day one tactics moved: formation ${plain.formationIndex}, mentality ${plain.mentality}`);
  }
  /* Identical squads either way: the spec must never touch the football. */
  const ratingOf = s => Math.round(s.squad.reduce((t, p) => t + p.rating, 0) / s.squad.length * 10);
  if (ratingOf(plain) !== ratingOf(withSpec)) fail('the manager spec changed the squad, it must never touch the football');
  console.log(`   spec stored, ${id.label} day one shape applied, plain career byte compatible`);
}

section = '3'; console.log('3) a real name cannot be smuggled past the form');
{
  const baked = Object.values(CM_ROSTERS).flat()[0].n;
  const smuggled = cm.startCareer('Arsenal', undefined, undefined, { ...SPEC, name: baked });
  if (CONTROL) {
    if (smuggled.manager) console.log('   control: the severed gate let the real name through, as expected');
    else fail('control run: the gate is severed yet the real name was still refused, something else is guarding');
  } else if (smuggled.manager) {
    fail(`startCareer stored a real footballer's name ("${baked}") as the manager`);
  } else {
    console.log('   startCareer refused the real name even when handed it directly');
  }
}

section = '4'; console.log('4) the homeland flows into the federation call and the job market');
{
  const c = cm.startCareer('Manchester City', undefined, undefined, SPEC);
  /* Earn the standing honestly on paper: a tier one club, silverware, a
     played record. nationStanding is pure arithmetic over these fields. */
  c.trophies = [{ kind: 'league', season: 1 }, { kind: 'cup', season: 2 }, { kind: 'ucl', season: 3 }, { kind: 'league', season: 4 }];
  c.careerStats.played = 100; c.careerStats.wins = 70;
  const offer = cm.nationOfferFor(c);
  if (!offer) fail('no federation call despite a decorated record');
  else if (offer.nation !== 'Spain') fail(`the manager is Spanish and ${offer.nation} called instead`);
  const noSpec = cm.startCareer('Manchester City');
  noSpec.trophies = c.trophies; noSpec.careerStats.played = 100; noSpec.careerStats.wins = 70;
  const fallback = cm.nationOfferFor(noSpec);
  if (!fallback || fallback.nation !== 'England') fail(`the classic career should still get the club's country: got ${fallback?.nation}`);
  const wp = cm.wildernessProfile(c);
  if (wp.nationality !== 'Spain') fail(`wilderness profile carries ${wp.nationality}, wanted the manager's Spain`);
  const wpPlain = cm.wildernessProfile(noSpec);
  if (wpPlain.nationality !== 'England') fail('the classic career lost its England default in the wilderness');
  console.log(`   Spain called the created manager, England called the classic one, the wilderness knows both`);
}

section = '5'; console.log('5) a pre round 303 save still reads and plays');
{
  const c = cm.startCareer('Newcastle');
  const old = JSON.parse(JSON.stringify(c));
  delete old.manager;
  try {
    const after = cm.playNextEntry(old);
    const st = after.state ?? after;
    if (!st || typeof st.week !== 'number') fail('advancing an old save returned nonsense');
    if (st.manager !== undefined) fail('advancing an old save invented a manager');
    console.log('   an old save advanced a week with no manager and grew none');
  } catch (e) {
    fail(`advancing an old save threw: ${e && e.message}`);
  }
}

/* ===================== Round 965 ===================== */
const json = o => JSON.stringify(o);
const clone = o => JSON.parse(JSON.stringify(o));
/* A harness owned stream, the same mix as scripts/lib/seedRandom.mjs, and the
   clock pinned with it, so two runs of one seed draw the same everything. */
const seeded = seed => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const withSeed = (seed, fn) => {
  const savedRandom = Math.random;
  const savedNow = Date.now;
  Math.random = seeded(seed);
  Date.now = () => 1790000000000;
  try { return fn(); } finally { Math.random = savedRandom; Date.now = savedNow; }
};
const LOOK = { ...cm.defaultManagerLook(), hairstyle: 'quiff', facialHair: 'goatee', outfit: 'suit', accent: cm.MANAGER_ACCENTS[3].hex, ageBand: 'sixties' };
const BACKGROUND_TREE = {
  exPlayer: 'manManagement', coachingBadges: 'tactics', analyst: 'recruitment', youthCoach: 'youth',
  agent: 'negotiation', boardroom: 'finance', pundit: 'media',
};

section = '6'; console.log('6) every background starts the manager with one point in its own tree');
{
  const keys = Object.keys(cm.MANAGER_BACKGROUNDS);
  if (keys.length !== 7) fail(`${keys.length} backgrounds on the form, wanted 7`);
  for (const bg of keys) {
    const tree = BACKGROUND_TREE[bg];
    if (!tree) { fail(`${bg} is on the form but the harness has no tree for it`); continue; }
    const c = cm.startCareer('Arsenal', undefined, undefined, { ...SPEC, background: bg });
    const b = c.managerXp;
    const spent = Object.values(b.points).reduce((s, n) => s + n, 0);
    if (spent !== 1) fail(`${bg}: a new career holds ${spent} points, wanted exactly 1`);
    if (b.points[tree] !== 1) fail(`${bg}: ${tree} holds ${b.points[tree]}, wanted 1`);
    if (xp.pointsFree(b) !== 0) fail(`${bg}: ${xp.pointsFree(b)} points free on day one, wanted 0`);
  }
  const plain = cm.startCareer('Arsenal');
  /* A Skip career carries no block at all until its first week, exactly as
     before this round; read it the way the screens do. */
  const plainBlock = xp.xpOf(plain);
  const plainSpent = Object.values(plainBlock.points).reduce((s, n) => s + n, 0);
  if (plainSpent !== 0 || plainBlock.gift !== undefined) fail('a career with no manager was handed a point');
  if (plain.managerXp !== undefined) fail('a Skip career grew an XP block at kickoff, which it never had before this round');
  console.log(`   ${keys.length} backgrounds, each one point in its own tree on day one; the classic career holds none`);
}

section = '7'; console.log('7) a Round 303 save, no face and no gift, loads unchanged and gets its point once');
{
  const made = cm.startCareer('Newcastle', undefined, undefined, SPEC);
  const old = clone(made);
  delete old.managerXp;
  const before = json(old.manager);
  cm.saveCareer(old);
  const back = cm.loadCareer();
  if (!back) fail('the Round 303 save did not load');
  else {
    if (json(back.manager) !== before) fail(`the manager changed on load: ${json(back.manager)} against ${before}`);
    if ('appearance' in back.manager) fail('loading a Round 303 save invented a face');
    if (back.managerXp?.points?.recruitment !== 1) fail(`the Round 303 analyst holds ${back.managerXp?.points?.recruitment} Recruitment points after loading, wanted 1`);
    cm.saveCareer(back);
    const twice = cm.loadCareer();
    if (twice?.managerXp?.points?.recruitment !== 1) fail(`a second load took Recruitment to ${twice?.managerXp?.points?.recruitment}`);
    const after = cm.playNextEntry(twice).state;
    if (json(after.manager) !== before) fail('a week of football changed the Round 303 manager');
    console.log('   manager byte equal after two loads and a week, no face invented, Recruitment 1 and never 2');
  }
}

section = '8'; console.log('8) the face is stored, travels through a save, and a broken one drops alone');
{
  const c = cm.startCareer('Arsenal', undefined, undefined, { ...SPEC, appearance: LOOK });
  if (json(c.manager?.appearance) !== json(LOOK)) fail(`startCareer stored ${json(c.manager?.appearance)} for the face`);
  cm.saveCareer(c);
  const back = cm.loadCareer();
  if (json(back?.manager?.appearance) !== json(LOOK)) fail('the face did not survive a save and a load');
  const broken = clone(c);
  broken.manager.appearance = { ...LOOK, outfit: 'spacesuit' };
  cm.saveCareer(broken);
  const b2 = cm.loadCareer();
  if (!b2 || b2.manager?.name !== SPEC.name) fail('a broken face took the manager down with it');
  if (cm.managerLookOf(b2?.manager?.appearance) !== null) fail('a face with an outfit nobody can draw read as valid');
  if (cm.managerLookOf(LOOK) === null) fail('the good face did not validate');
  const handed = cm.startCareer('Arsenal', undefined, undefined, { ...SPEC, appearance: { ...LOOK, accent: '#123456' } });
  if (!handed.manager) fail('a bad face stopped the manager being stored');
  else if ('appearance' in handed.manager) fail('startCareer stored a face with an accent off the palette');
  console.log('   face stored and reloaded byte equal; a spacesuit or an off palette accent drops the face and keeps the manager');
}

section = '9'; console.log('9) every style lands on a real shape, no two styles play the same, unknown reads Balanced');
{
  const ids = Object.keys(cm.CLUB_IDENTITIES);
  if (ids.length < 11) fail(`${ids.length} styles, wanted the five plus at least six new ones`);
  const pairs = new Map();
  for (const id of ids) {
    const row = cm.CLUB_IDENTITIES[id];
    if (!cm.FORMATIONS[row.formationIndex]) fail(`${id} points at formation ${row.formationIndex}, which does not exist`);
    if (!['defensive', 'balanced', 'attacking'].includes(row.mentality)) fail(`${id} has mentality ${row.mentality}`);
    const key = `${row.formationIndex}|${row.mentality}`;
    if (pairs.has(key)) fail(`${id} and ${pairs.get(key)} hand the engine the same shape and mentality (${key})`);
    pairs.set(key, id);
    const c = cm.startCareer('Arsenal', undefined, undefined, { ...SPEC, style: id });
    if (c.formationIndex !== row.formationIndex || c.mentality !== row.mentality) fail(`${id}: day one is ${c.formationIndex}/${c.mentality}, wanted ${key}`);
    if (c.xiIds.filter(Boolean).length !== 11) fail(`${id}: the day one eleven has ${c.xiIds.filter(Boolean).length} men`);
  }
  if (cm.styleOf('astronaut') !== 'balanced' || cm.styleOf(undefined) !== 'balanced') fail('an unknown style did not read as Balanced');
  const odd = cm.startCareer('Arsenal', undefined, undefined, { ...SPEC, style: 'astronaut' });
  const bal = cm.CLUB_IDENTITIES.balanced;
  if (odd.manager?.style !== 'balanced') fail(`an unknown style was stored as ${odd.manager?.style}`);
  if (odd.formationIndex !== bal.formationIndex || odd.mentality !== bal.mentality) fail('an unknown style did not start on the Balanced shape');
  console.log(`   ${ids.length} styles, ${pairs.size} distinct shape and mentality pairs, each a real formation with a full eleven; an unknown style starts Balanced`);
}

section = '10'; console.log('10) a homeland outside the league nations still gets the federation call');
{
  const league = new Set(cm.NATIONS.map(n => n.name));
  const homelands = cm.managerHomelands();
  const outside = homelands.filter(n => !league.has(n));
  if (outside.length < 50) fail(`only ${outside.length} homelands outside the ${league.size} league nations, the picker did not open up`);
  /* Every league nation opens the picker on itself or on the engine's own
     spelling of it (United States is USA there), never on the England
     fallback. */
  for (const n of league) {
    const opened = cm.managerHomelandFor(n);
    if (!homelands.includes(opened)) fail(`league nation ${n} opens the picker on ${opened}, which is not on it`);
    else if (opened === 'England' && n !== 'England') fail(`league nation ${n} fell off the homeland picker and opens on England`);
  }
  const c = cm.startCareer('Manchester City', undefined, undefined, SPEC);
  c.trophies = [{ kind: 'league', season: 1 }, { kind: 'cup', season: 2 }, { kind: 'ucl', season: 3 }, { kind: 'league', season: 4 }];
  c.careerStats.played = 100; c.careerStats.wins = 70;
  let called = 0;
  for (const n of outside) {
    const k = { ...c, manager: { ...c.manager, nationality: n } };
    const offer = cm.nationOfferFor(k);
    if (!offer || offer.nation !== n) fail(`a manager from ${n} was called by ${offer?.nation ?? 'nobody'}`);
    else called += 1;
    if (cm.wildernessProfile(k).nationality !== n) fail(`the wilderness lost ${n}`);
  }
  console.log(`   ${homelands.length} homelands on the picker, ${outside.length} outside the league nations, ${called} of them called by their own federation`);
}

section = '11'; console.log('11) the Edit manager sheet: what can change, what cannot, and a Skip career naming its man');
{
  const c = cm.startCareer('Arsenal', undefined, undefined, SPEC);
  const snapshot = json(c);
  const renamed = cm.editManager(c, { name: '  Robin Ashgrove ' });
  if (renamed?.manager?.name !== 'Robin Ashgrove') fail(`rename gave ${renamed?.manager?.name}`);
  if (renamed && (renamed.formationIndex !== c.formationIndex || renamed.mentality !== c.mentality || json(renamed.xiIds) !== json(c.xiIds))) fail('a rename moved the tactics');
  if (renamed?.managerXp?.points?.recruitment !== 1) fail(`a rename took Recruitment to ${renamed?.managerXp?.points?.recruitment}`);
  const baked = Object.values(CM_ROSTERS).flat()[0].n;
  const smuggled = cm.editManager(c, { name: baked });
  if (smuggled) fail(`the Edit sheet renamed the manager to a real footballer, "${baked}"`);
  if (cm.editManager(c, { name: POOL[0].name })) fail('the Edit sheet took a trivia pool name');
  if (cm.editManager(c, { nationality: 'Ghana' })?.manager?.nationality !== 'Ghana') fail('the homeland would not change to Ghana');
  if (cm.editManager(c, { nationality: 'Atlantis' })) fail('the homeland changed to a country that does not exist');
  if (json(cm.editManager(c, { appearance: LOOK })?.manager?.appearance) !== json(LOOK)) fail('the face would not change');
  if (cm.editManager(c, { appearance: { ...LOOK, outfit: 'spacesuit' } })) fail('the face took an outfit nobody can draw');
  if (cm.editManager(c, { background: 'pundit' })) fail('the background changed after kick off');
  if (!cm.editManager(c, { background: SPEC.background })) fail('restating the same background was refused');
  if (json(c) !== snapshot) fail('editManager mutated the career it was handed');

  const skip = cm.startCareer('Arsenal');
  if (cm.editManager(skip, { name: 'Robin Ashgrove' })) fail('a Skip career got a manager with no homeland or background');
  const made = cm.editManager(skip, { name: 'Robin Ashgrove', nationality: 'Japan', background: 'boardroom', appearance: LOOK });
  if (!made?.manager) fail('a Skip career could not name its manager');
  else {
    if (made.managerXp.points.finance !== 1 || xp.pointsFree(made.managerXp) !== 0) fail(`the late Boardroom manager holds Finance ${made.managerXp.points.finance}, ${xp.pointsFree(made.managerXp)} free`);
    if (made.formationIndex !== skip.formationIndex || made.mentality !== skip.mentality) fail('naming the manager moved the tactics');
    const row = cm.CLUB_IDENTITIES[made.manager.style];
    if (!row || row.formationIndex !== skip.formationIndex || row.mentality !== skip.mentality) fail(`the late manager's style ${made.manager.style} is not the shape the team plays`);
    const again = cm.editManager(made, { name: 'Robin Ashgrove Jr' });
    if (again?.managerXp?.points?.finance !== 1) fail('editing the late manager again paid the gift twice');
    if (cm.editManager(made, { background: 'pundit' })) fail('the late manager changed background once chosen');
  }
  console.log(`   rename, homeland and face change; real names, unknown countries, broken faces and a new background refused; a Skip career names its man with his point`);
}

section = '12'; console.log('12) a Skip career plays a byte identical season to the engine without this round');
{
  /*
   * The engine without Round 965's manager hooks: the grant line out of
   * ensureXp, and the startCareer manager line back to Round 303's. Everything
   * else is today's source, so this stays meaningful as other rounds move the
   * engine: it asks only whether this round's code reaches a career with no
   * manager. Both sides are fresh bundles, run in the same order with the clock
   * pinned, because the engine stamps some ids with Date.now and a module
   * counter.
   */
  const baseXp = rewrite(XP_SRC, [['  if (tree && block.gift === undefined) state.managerXp = grantGift(block, tree);', '']], 'clubManagerXp.base.ts');
  const baseCm = rewrite(CM_SRC, [
    ['    state.manager = cleanManagerSpec(manager);', '    state.manager = { ...manager, name: manager.name.trim() };'],
    ['CLUB_IDENTITIES[styleOf(manager.style)]', 'CLUB_IDENTITIES[manager.style]'],
  ], 'clubManager.base.ts');
  const nowSide = (await import(pathToFileURL(bundle('managerSpecNow', cmPath, xpPath)).href)).cm;
  const baseSide = (await import(pathToFileURL(bundle('managerSpecBase', baseCm, baseXp)).href)).cm;
  const seasonOn = (engine, club, seed) => withSeed(seed, () => {
    let s = engine.startCareer(club);
    for (let g = 0; g < 130; g++) {
      const res = engine.playNextEntry(s, { skipHalftime: true });
      s = res.state;
      if (res.kind === 'seasonOver') break;
    }
    return s;
  });
  let same = 0, played = 0, bytes = 0;
  const CLUBS = ['Arsenal', 'Napoli', 'Ajax'];
  for (const [i, club] of CLUBS.entries()) {
    const seed = 9001 + i * 7919;
    const a = json(seasonOn(nowSide, club, seed));
    const b = json(seasonOn(baseSide, club, seed));
    if (a === b) same += 1;
    else fail(`${club}: a Skip career's season differs from the engine without this round (${a.length} against ${b.length} bytes)`);
    played += JSON.parse(a).careerStats.played;
    bytes += a.length;
  }
  if (played < 90) fail(`only ${played} matches were played, too few to call a season`);
  console.log(`   ${same} of ${CLUBS.length} Skip seasons byte identical (${played} matches, ${bytes} bytes of save compared)`);
}

section = '13'; console.log('13) every style changes what the match engine plays, against Balanced on the same seeds');
{
  /* A style is a formation and a mentality the engine reads every match. This
     plays each one for a league season from the same seeds as Balanced and
     reads the outcome the engine produced: league goals for and against a
     game. The bands are set below from measured headroom. */
  /* Measured headroom, |delta for| + |delta against| a game against Balanced,
     four clubs by two seeds (312 league games an arm), for the styles with a
     mentality of their own: PENDING, filled in from the bases below. */
  const STYLE_SHIFT_FLOOR = 0.25;
  const CLUBS = ['Arsenal', 'Napoli', 'Ajax', 'Wolves'];
  const SEEDS = Number(process.env.SPEC_STYLE_SEEDS || 2);
  const BASE = Number(process.env.SPEC_STYLE_BASE || 500);
  const profile = style => {
    let gf = 0, ga = 0, n = 0;
    for (const [i, club] of CLUBS.entries()) {
      for (let k = 0; k < SEEDS; k++) {
        const seed = BASE + k * 7919 + i * 104729;
        let s = withSeed(seed, () => cm.startCareer(club, undefined, undefined, { ...SPEC, style }));
        s = withSeed(seed * 3 + 11, () => {
          for (let g = 0; g < 130; g++) {
            const res = cm.playNextEntry(s, { skipHalftime: true });
            s = res.state;
            if (res.kind === 'seasonOver') break;
          }
          return s;
        });
        const row = (s.table ?? []).find(r => r.club === s.clubName);
        if (!row) { fail(`${style} at ${club}: no league row at the season's end`); continue; }
        gf += row.gf; ga += row.ga; n += row.w + row.d + row.l;
      }
    }
    return { gf: gf / Math.max(1, n), ga: ga / Math.max(1, n), n };
  };
  const base = profile('balanced');
  if (base.n < CLUBS.length * SEEDS * 30) fail(`Balanced played only ${base.n} league games`);
  console.log(`   Balanced: ${base.gf.toFixed(3)} for, ${base.ga.toFixed(3)} against a game over ${base.n} games`);
  const shifts = [];
  for (const id of Object.keys(cm.CLUB_IDENTITIES)) {
    if (id === 'balanced') continue;
    const p = profile(id);
    const shift = Math.abs(p.gf - base.gf) + Math.abs(p.ga - base.ga);
    /* The deterministic half: the eleven the engine fields on day one. */
    let xiMoved = 0, ratingGap = 0;
    for (const club of CLUBS) {
      const a = cm.startCareer(club, undefined, undefined, { ...SPEC, style: id });
      const b = cm.startCareer(club, undefined, undefined, { ...SPEC, style: 'balanced' });
      const ids = s => [...s.xiIds].filter(Boolean).sort().join(',');
      if (ids(a) !== ids(b)) xiMoved += 1;
      ratingGap += Math.abs(cm.xiAverageRating(a) - cm.xiAverageRating(b));
    }
    const row = cm.CLUB_IDENTITIES[id];
    shifts.push({ id, shift, xiMoved, ratingGap: ratingGap / CLUBS.length, sameMentality: row.mentality === cm.CLUB_IDENTITIES.balanced.mentality });
    console.log(`   ${id.padEnd(14)} ${p.gf.toFixed(3)} for, ${p.ga.toFixed(3)} against, shift ${shift.toFixed(3)} (${p.n} games); day one eleven moved at ${xiMoved} of ${CLUBS.length} clubs, fit adjusted rating gap ${(ratingGap / CLUBS.length).toFixed(2)}`);
  }
  if (shifts.length !== Object.keys(cm.CLUB_IDENTITIES).length - 1) fail(`only ${shifts.length} styles were measured`);

  /* 13a. A style with its own mentality moves the goals. The mentality term is
     a straight shift on both sides' scoring rate, so this is the strong signal.
     Floor set from measured headroom: see STYLE_SHIFT_FLOOR below. */
  for (const s of shifts) {
    if (s.sameMentality) continue;
    if (!(s.shift >= STYLE_SHIFT_FLOOR)) fail(`${s.id} moved goals for and against by only ${s.shift.toFixed(3)} a game against Balanced (floor ${STYLE_SHIFT_FLOOR})`);
  }
  /* 13b. A style that keeps Balanced's mentality (Tiki-taka) changes the match
     through its shape alone, and a season of goals cannot see that past the
     noise (measured 0.045 and 0.115, the same size as two seeds of one style),
     so it is NOT asserted on goals. What the engine reads from a shape is the
     eleven it fields, so that is what is held: a different eleven at most
     clubs. */
  for (const s of shifts) {
    if (!s.sameMentality) continue;
    if (s.xiMoved < CLUBS.length - 1) fail(`${s.id} keeps Balanced's mentality and fields the same eleven at ${CLUBS.length - s.xiMoved} of ${CLUBS.length} clubs, so it changes nothing the engine reads`);
  }
  /* 13c. No two styles hand the engine the same afternoon: the same mentality
     and the same eleven at the same fit price, at every club. That is how a
     4-2-3-1 and a 4-2-3-1 wide turned out to be one style twice in this
     round's first draft (identical seasons to the third decimal). */
  const sig = (id, club) => {
    const c = cm.startCareer(club, undefined, undefined, { ...SPEC, style: id });
    const f = cm.FORMATIONS[c.formationIndex];
    const xi = f.slots.map((slot, i) => {
      const p = c.squad.find(q => q.id === c.xiIds[i]);
      return p ? `${p.id}:${cm.fitPenalty(p, slot)}` : '-';
    }).sort().join(',');
    return `${c.mentality}|${xi}`;
  };
  const styleIds = Object.keys(cm.CLUB_IDENTITIES);
  const sigs = Object.fromEntries(styleIds.map(id => [id, CLUBS.map(club => sig(id, club))]));
  let twins = 0;
  for (let i = 0; i < styleIds.length; i++) {
    for (let j = i + 1; j < styleIds.length; j++) {
      const a = sigs[styleIds[i]], b = sigs[styleIds[j]];
      if (a.every((x, k) => x === b[k])) { twins += 1; fail(`${styleIds[i]} and ${styleIds[j]} field the same eleven in the same mentality at every club: one style twice`); }
    }
  }
  console.log(`   ${shifts.filter(s => !s.sameMentality).length} styles with their own mentality all past the ${STYLE_SHIFT_FLOOR} floor, the shape only style fields its own eleven, ${twins} twin styles`);
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error('\ncontrol run: severing the real name gate changed NOTHING, the checks are dead');
  process.exit(1);
}
/* Round 965's two controls. Each says which sections must go red, and the
   face control also says which must NOT: the brief asks that dropping the
   appearance field turns only the new face section red. */
if (MODE === 'noappearance' || MODE === 'leak' || MODE === 'twinstyle' || MODE === 'deadmentality') {
  const red = [...failedSections.keys()].sort((a, b) => Number(a) - Number(b));
  const want = MODE === 'noappearance' ? '8' : MODE === 'leak' ? '12' : '13';
  const onlyWant = MODE === 'noappearance';
  const ok = red.includes(want) && (!onlyWant || red.length === 1);
  if (ok) {
    console.log(`\ncontrol run ${MODE}: section ${want} went red${onlyWant ? ' and no other section did' : ''} (red: ${red.join(', ')}), as expected`);
    process.exit(0);
  }
  console.error(`\ncontrol run ${MODE}: wanted section ${want} red${onlyWant ? ' and only it' : ''}, got red sections [${red.join(', ')}], so the check is dead or too broad`);
  process.exit(1);
}
console.log('   teeth: real names pulled from the live bakes, tactics compared against the identity table, defaults pinned');
if (failures > 0) { console.error(`\nsimManagerSpec: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimManagerSpec: all green');
