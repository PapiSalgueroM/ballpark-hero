/**
 * Round 835: the brand and identity lift, held.
 *
 * Round 835 moved four Soccer Career systems into shared modules behind a
 * sport descriptor, so the four American careers can bind them next (the
 * owner: "my careers are nothing like the soccer ones"; the standing rule:
 * one engine, many sports):
 *
 *   src/lib/careerSocial.ts    what a post is and what it moves, the focus
 *                              boost, a season's own follower growth
 *   src/lib/careerBrand.ts     the brand ladder (five neutral rungs), what a
 *                              rung pays, a season's brand money, the cover
 *                              offer
 *   src/lib/careerIdentity.ts  personalities and their bounded multipliers,
 *                              agents and their cuts, the staggered beats
 *   src/lib/soccerCareerBrand.ts and soccerCareerLife.ts bind them for soccer.
 *
 * SECTIONS
 *   1. Soccer is unchanged, byte for byte (HARD). The probe in
 *      scripts/lib/soccerBrandProbe835.mjs drives 48 seeded careers through
 *      every screen with a spread of posts, cover answers, event choices and
 *      moves, plays 35 old saves on, and calls the lifted functions over a
 *      grid of synthetic saves, hashing the whole save after every step. Its
 *      output must equal scripts/data/soccerBrandFixture835.json, recorded on
 *      origin/main 3fb92eea before any code moved. Soccer calls Math.random
 *      in a fixed order, so a lift that moves one draw shows up here. The
 *      section also requires the fixture to have exercised what it claims
 *      (every post, every personality, every agent, the cover offer both
 *      ways, the stored tier ids), so a re-record with a broken probe cannot
 *      pass quietly. Measured in the fixture: posts 106 to 131 each,
 *      personalities 7 to 12 careers each, agents 8 to 18 each, cover taken
 *      6 and turned down 3. Floors sit at about half of each.
 *   2. The contracts, on a synthetic sport that shares nothing with soccer
 *      (other field names, another currency, thousands not millions):
 *      a. a post moves exactly the meters it names, by what it names, and
 *         touches nothing else; soccer's seven posts are held to the same
 *         rule on real saves, and the words on soccer's cards are read
 *         against what each post does (one known gap, see KNOWN_CARD_GAPS);
 *      b. a deal pays what its card prints, rung by rung, soccer's five
 *         included; the cover offer pays the cash and followers its terms
 *         and its log line print;
 *      c. a rung cannot be stepped over: every rung holds a follower range
 *         of its own, holding a rung means every line below it is met, the
 *         rung never falls as the following rises, and the ladder check
 *         names a ladder that breaks any of that;
 *      d. a personality never moves the odds past PERSONALITY_BOUND, even
 *         when its data asks for more, and the data check names it;
 *      e. the agent fallbacks and the staggered beats.
 *   3. Old saves. A save holding the stored tier id 'nike_adidas' loads,
 *      pays the boot deal, keeps that id through a post that does not move
 *      the rung, and the neutral rung id never lands on a soccer save; the
 *      'fifa_cover' value still maps on load. No real brand name appears in
 *      the shared modules or in any line the soccer binding prints.
 *
 * NEGATIVE CONTROLS, each asserted to change the source before it is
 * trusted, each run in the bundle only (the files on disk are untouched):
 *   SOCIAL_BRANDS_CONTROL=reorder  the viral roll draws its amount before
 *                                  its chance: section 1 goes red.
 *   SOCIAL_BRANDS_CONTROL=payoff   a rung pays one unit more than its card:
 *                                  sections 1 and 2b go red.
 *   SOCIAL_BRANDS_CONTROL=unbound  the personality bound is not applied:
 *                                  section 2d goes red.
 *   SOCIAL_BRANDS_CONTROL=leak     a post also nudges standing it never
 *                                  names: sections 1 and 2a go red.
 *
 * Run: node scripts/simCareerSocialBrands.mjs
 *      SECTIONS=2,3 node scripts/simCareerSocialBrands.mjs   (skips the replay)
 *      SOCIAL_BRANDS_CONTROL=payoff node scripts/simCareerSocialBrands.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSoccerBrand, probeSoccerBrand, POST_IDS } from './lib/soccerBrandProbe835.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'scripts', 'data', 'soccerBrandFixture835.json');
const CONTROL = process.env.SOCIAL_BRANDS_CONTROL || '';
const SECTIONS = (process.env.SECTIONS || '1,2,3').split(',').map(x => x.trim());

let failures = 0;
const fail = m => { failures += 1; console.log(`  FAIL ${m}`); };
const ok = m => console.log(`  ok   ${m}`);
const check = (cond, m) => (cond ? ok(m) : fail(m));

/* ---------------- the controls ---------------- */
const count = (src, needle) => src.split(needle).length - 1;
const CONTROLS = {
  reorder: {
    file: 'src/lib/careerSocial.ts',
    from: '  if (g.rng() < g.viral.chance) growth += Math.floor(g.rng() * (g.viral.max - g.viral.min + 1)) + g.viral.min;\n',
    to: '  { const amount = Math.floor(g.rng() * (g.viral.max - g.viral.min + 1)) + g.viral.min; if (g.rng() < g.viral.chance) growth += amount; }\n',
  },
  payoff: {
    file: 'src/lib/careerBrand.ts',
    from: '  return t?.income || 0;\n',
    to: '  return t ? t.income + 1 : 0;\n',
  },
  unbound: {
    file: 'src/lib/careerIdentity.ts',
    from: '  return bound(kind === "followers" ? p.followerMult : p.sponsorMult);\n',
    to: '  return kind === "followers" ? p.followerMult : p.sponsorMult;\n',
  },
  leak: {
    file: 'src/lib/careerSocial.ts',
    from: '  sport.log(s, sport.words.gained(post, gain / sport.followerUnit));\n',
    to: '  sport.log(s, sport.words.gained(post, gain / sport.followerUnit));\n  sport.standing.set(s, clamp100(sport.standing.get(s) + 1));\n',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SOCIAL_BRANDS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
let controlFired = 0;
function rewrite(rel, src) {
  if (!CONTROL) return src;
  const c = CONTROLS[CONTROL];
  if (rel !== c.file) return src;
  const text = src.split('\r\n').join('\n');
  const n = count(text, c.from);
  if (n !== 1) {
    console.error(`control ${CONTROL} cannot run: its anchor is in ${c.file} ${n} times, expected 1`);
    process.exit(1);
  }
  controlFired += 1;
  return text.replace(c.from, c.to);
}

const B = await loadSoccerBrand(ROOT, CONTROL ? rewrite : null, {
  social: 'src/lib/careerSocial.ts',
  brand: 'src/lib/careerBrand.ts',
  identity: 'src/lib/careerIdentity.ts',
  binding: 'src/lib/soccerCareerBrand.ts',
});
if (CONTROL) {
  if (controlFired !== 1) { console.error(`control ${CONTROL} rewrote ${controlFired} files, expected 1`); process.exit(1); }
  console.log(`CONTROL ${CONTROL}: ${CONTROLS[CONTROL].file} rewritten in the bundle`);
}
const { soccer: E, life: L, social: SO, brand: BR, identity: ID, binding: SB } = B;

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r2 = v => Math.round(v * 100) / 100;
const close = (a, b) => Math.abs(a - b) < 1e-9;

/* ============================================================
   1. Soccer is unchanged
   ============================================================ */
if (SECTIONS.includes('1')) {
  console.log('\n1. Soccer Career replays the pre lift fixture byte for byte');
  const want = fs.readFileSync(FIXTURE, 'utf8').split('\r\n').join('\n').trim();
  const t0 = Date.now();
  const got = probeSoccerBrand({ soccer: E, life: L });
  const gotText = JSON.stringify(got);
  console.log(`     probe ran in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const rec = JSON.parse(want);
  const steps = rec.careers.reduce((n, c) => n + c.steps.split(' ').length, 0);
  if (gotText === want) {
    ok(`all ${rec.careers.length} careers (${steps} hashed steps), ${rec.oldSaves.length} old saves and every unit probe match`);
  } else {
    fail('the probe output differs from the fixture');
    /* Point at the first difference, for whoever reads the failure. */
    const parts = [['careers', c => c.steps], ['oldSaves', c => c.steps]];
    let shown = 0;
    for (const [key, stepsOf] of parts) {
      for (let i = 0; i < rec[key].length && shown < 3; i += 1) {
        const a = stepsOf(rec[key][i]).split(' ');
        const b = stepsOf(got[key][i] ?? { steps: '' }).split(' ');
        const at = a.findIndex((x, j) => x !== b[j]);
        if (at >= 0 || a.length !== b.length) {
          const j = at >= 0 ? at : Math.min(a.length, b.length);
          console.log(`       ${key}[${i}] first differs at step ${j}: fixture ${a[j] ?? '(end)'} now ${b[j] ?? '(end)'} (after ${a[j - 1] ?? 'start'})`);
          shown += 1;
        }
      }
    }
    for (const k of Object.keys(rec.units)) {
      if (JSON.stringify(rec.units[k]) !== JSON.stringify(got.units[k])) console.log(`       units.${k} differs`);
    }
  }

  /* What the fixture exercised. Deterministic counts of a fixed file. */
  const posts = {}, personalities = {}, agents = {};
  let coverYes = 0, coverNo = 0;
  for (const c of rec.careers) {
    for (const [k, v] of Object.entries(c.posts)) posts[k] = (posts[k] || 0) + v;
    personalities[c.end.personality] = (personalities[c.end.personality] || 0) + 1;
    agents[c.end.agent] = (agents[c.end.agent] || 0) + 1;
    coverYes += c.cover.yes; coverNo += c.cover.no;
  }
  check(POST_IDS.every(id => (posts[id] || 0) >= 50), `every post was made at least 50 times (${POST_IDS.map(id => posts[id] || 0).join(', ')})`);
  const P = ['showman', 'iceman', 'hothead', 'professor', 'enigma'];
  check(P.every(p => (personalities[p] || 0) >= 3), `every personality was chosen in at least 3 careers (${P.map(p => personalities[p] || 0).join(', ')})`);
  const A = ['cousin', 'shark', 'super', 'self'];
  check(A.every(a => (agents[a] || 0) >= 3), `every agent was signed in at least 3 careers (${A.map(a => agents[a] || 0).join(', ')})`);
  check(coverYes >= 3 && coverNo >= 1, `the cover offer was taken ${coverYes} times and turned down ${coverNo}`);
  const oldTiers = new Set(rec.oldSaves.map(o => o.tier));
  check(oldTiers.has('nike_adidas') && oldTiers.has('fifa_cover') && oldTiers.has(null), 'old saves carried the stored boot deal id, the renamed cover value and no tier at all');
}

/* ============================================================
   2. The contracts, on a sport that shares nothing with soccer
   ============================================================ */
/* Testball: stores followers in thousands, standing is "rep", money is
   dollars, and the save names nothing the way soccer does. */
const TB_POSTS = [
  { id: 'clip', label: 'Post a clip', emoji: 'C', description: 'x', followerGain: [1000, 9000], reputationChange: 0 },
  { id: 'fixed', label: 'Fixed post', emoji: 'F', description: 'x', followerGain: [5000, 5000], reputationChange: 0 },
  { id: 'good', label: 'Good deed', emoji: 'G', description: 'x', followerGain: [2000, 2000], reputationChange: 7, extraEffect: 'Rep +7' },
  { id: 'bad', label: 'Hot take', emoji: 'B', description: 'x', followerGain: [0, 4000], reputationChange: -12, extraEffect: 'Rep -12' },
  { id: 'quiet', label: 'Go quiet', emoji: 'Q', description: 'x', followerGain: [0, 0], reputationChange: 0, extraEffect: 'Focus next season' },
  { id: 'jab', label: 'Jab the rival', emoji: 'J', description: 'x', followerGain: [3000, 3000], reputationChange: 0 },
  { id: 'nothing', label: 'Post nothing much', emoji: 'N', description: 'x', followerGain: [0, 0], reputationChange: 0 },
];
const meter = key => ({ get: s => s[key], set: (s, v) => { s[key] = v; } });
const tbLog = (s, line) => { s.lines = [...s.lines, line]; };
let tbRng = mulberry32(835);
const TB_SOCIAL = {
  posts: TB_POSTS, focusPost: 'quiet', rivalPost: 'jab', followerUnit: 1000,
  followers: meter('fans'), standing: meter('rep'), posted: meter('didPost'), focus: meter('calm'),
  payFocus: s => { s.power += 1; s.speed += 1; },
  rivalName: s => (s.foe && s.foe.active ? s.foe.name : null),
  log: tbLog,
  rng: () => tbRng(),
  words: {
    focus: 'went quiet', gained: (p, g) => `${p.id} +${g}k`, standingUp: n => `rep +${n}`, standingDown: n => `rep ${n}`,
    rival: name => `jabbed ${name}`, focusPaid: 'quiet paid',
  },
};
const TB_TIERS = [
  { id: 'local_deal', name: 'Corner Shop Deal', emoji: 'a', minFollowers: 2000, income: 0.25 },
  { id: 'kit_deal', name: 'Signature Glove', emoji: 'b', minFollowers: 10000, income: 1.75 },
  { id: 'global_ambassador', name: 'World Face', emoji: 'c', minFollowers: 40000, income: 6 },
  { id: 'own_line', name: 'Own Label', emoji: 'd', minFollowers: 90000, income: 12.5 },
  { id: 'game_cover', name: 'Cover Star', emoji: 'e', minFollowers: 200000, income: 30 },
];
const TB_BRAND = {
  tiers: TB_TIERS, followerUnit: 1000,
  followers: meter('fans'), standing: meter('rep'), cash: meter('bank'),
  rating: s => s.grade,
  tier: { get: s => s.deal, set: (s, v) => { s.deal = v; } },
  cover: {
    minFollowers: 150000, minRating: 80, pay: 4.5, followers: 20, declineStanding: 3,
    award: { name: 'Cover', emoji: 'e' },
    taken: meter('coverDone'), waiting: meter('coverWaiting'),
    record: (s, a) => { s.trophies = [...s.trophies, a.name]; },
  },
  fame: [[90, 1.5], [70, 0.5]],
  perFollower: 0.01,
  log: tbLog,
  words: {
    signed: t => `signed ${t.id}`, coverTaken: 'cover taken', coverDeclined: 'cover declined',
    money: m => `$${m}M`,
  },
};
function tbHost(i) {
  const r = mulberry32(i * 7919 + 1);
  const reps = [0, 3, 50, 88, 95, 100];
  return {
    fans: r2(r() * 300), rep: reps[i % reps.length], bank: r2(r() * 20), grade: 60 + (i % 40),
    deal: null, coverDone: false, coverWaiting: false, didPost: i % 17 === 9, calm: false,
    power: 50, speed: 50, foe: i % 3 === 0 ? null : { name: `Foe ${i}`, active: i % 3 === 1 }, lines: [], trophies: [],
  };
}
const changedKeys = (a, b) => Object.keys({ ...a, ...b }).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));

if (SECTIONS.includes('2')) {
  console.log('\n2a. A post moves exactly the meters it names');
  const METER_FIELD = { followers: 'fans', standing: 'rep', focus: 'calm' };
  let applied = 0, refused = 0;
  const bad = [];
  const movedSome = {};
  for (const post of TB_POSTS) {
    const names = SO.postMeters(post, TB_SOCIAL);
    const allowed = new Set(['didPost', 'lines', ...names.map(n => METER_FIELD[n])]);
    for (let i = 0; i < 300; i += 1) {
      const before = tbHost(i);
      const s = structuredClone(before);
      tbRng = mulberry32(i * 31 + post.id.length);
      const did = SO.applySocialPost(s, post.id, TB_SOCIAL);
      const changed = changedKeys(before, s);
      if (!did) {
        refused += 1;
        if (changed.length) bad.push(`${post.id}/${i}: refused but changed ${changed.join(',')}`);
        if (!before.didPost) bad.push(`${post.id}/${i}: refused a first post of the season`);
        continue;
      }
      applied += 1;
      for (const k of changed) if (!allowed.has(k)) bad.push(`${post.id}/${i}: moved ${k}, which it never names`);
      if (names.includes('followers')) {
        const d = r2(s.fans - before.fans);
        const lo = post.followerGain[0] / 1000, hi = post.followerGain[1] / 1000;
        if (d < r2(lo) - 0.011 || d > r2(hi) + 0.011) bad.push(`${post.id}/${i}: followers moved ${d}, outside ${lo} to ${hi}`);
        if (d > 0) movedSome[post.id] = true;
      }
      if (names.includes('standing')) {
        const want = Math.max(0, Math.min(100, before.rep + post.reputationChange));
        if (s.rep !== want) bad.push(`${post.id}/${i}: standing ${before.rep} became ${s.rep}, not ${want}`);
        if (s.rep !== before.rep) movedSome[post.id] = true;
      }
      if (names.includes('focus')) {
        if (s.calm !== true) bad.push(`${post.id}/${i}: the focus post did not bank the boost`);
        else movedSome[post.id] = true;
      }
      if (s.rep < 0 || s.rep > 100) bad.push(`${post.id}/${i}: standing left 0 to 100`);
      if (post.id === 'jab') {
        const want = before.foe && before.foe.active;
        const has = s.lines.some(l => l.startsWith('jabbed'));
        if (Boolean(want) !== has) bad.push(`${post.id}/${i}: the rival line ${has ? 'printed' : 'missing'} with the rival ${want ? 'playing' : 'gone'}`);
      }
    }
  }
  check(bad.length === 0, `${applied} posts applied and ${refused} refused on Testball, every one moved only what it names${bad.length ? `: ${bad.slice(0, 4).join(' | ')}` : ''}`);
  const named = TB_POSTS.filter(p => SO.postMeters(p, TB_SOCIAL).length > 0).map(p => p.id);
  check(named.every(id => movedSome[id]), `every post that names a meter moved it at least once (${named.join(', ')})`);
  check(SO.postMeters(TB_POSTS.find(p => p.id === 'nothing'), TB_SOCIAL).length === 0, 'a post with no gain and no standing names nothing');
  {
    const s = tbHost(1); s.didPost = false;
    const unknown = SO.applySocialPost(s, 'not_a_post', TB_SOCIAL);
    check(!unknown && !s.didPost && s.lines.length === 0, 'an unknown post is refused and uses up nothing');
    s.calm = true;
    const paid = SO.payFocusBoost(s, TB_SOCIAL);
    const again = SO.payFocusBoost(s, TB_SOCIAL);
    check(paid && !again && s.power === 51 && s.speed === 51 && s.calm === false, 'a banked focus boost pays out once, through the sport\'s own stats');
  }

  /* Soccer's seven posts, on real saves, through the same rule. */
  {
    const clubs = E.FALLBACK_CLUBS;
    const SOCCER_FIELD = { followers: 'socialMediaFollowers', standing: 'popularity', focus: 'socialMediaFocusBoost' };
    const leaks = [];
    let n = 0;
    for (const post of SB.SOCIAL_MEDIA_ACTIONS) {
      const names = SO.postMeters(post, SB.SOCCER_SOCIAL);
      const allowed = new Set(['socialMediaActionUsedThisSeason', 'events', ...names.map(x => SOCCER_FIELD[x])]);
      for (let i = 0; i < 12; i += 1) {
        const real = Math.random;
        Math.random = mulberry32(i * 977 + post.id.length);
        try {
          const base = E.initCareer(`Leak ${i}`, 'Spain', 'ST', '2020s', { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2020, clubs, null, 88);
          base.popularity = [0, 40, 95, 100][i % 4];
          base.rival = i % 2 ? { name: `Rival ${i}`, retired: i % 4 === 3 } : null;
          const s = structuredClone(base);
          SO.applySocialPost(s, post.id, SB.SOCCER_SOCIAL);
          n += 1;
          for (const k of changedKeys(base, s)) if (!allowed.has(k)) leaks.push(`${post.id}: ${k}`);
        } finally { Math.random = real; }
      }
    }
    check(leaks.length === 0, `soccer's ${SB.SOCIAL_MEDIA_ACTIONS.length} posts, ${n} applications on real saves, moved only what they name${leaks.length ? `: ${[...new Set(leaks)].join(', ')}` : ''}`);

    /* The card's words against what the post does. A card prints its
       follower gain when the low end is above zero, and its extra line. */
    const KNOWN_CARD_GAPS = {
      /* Found by this round, left for the lead: the card says "Rivalry
         intensity increases" and the post only writes a line about the
         rival. Making it true moves rivalryIntensity, which changes saves and
         later draws, so it is not a lift's call. Remove this entry when it is
         fixed. */
      troll_rival: 'rivalry',
    };
    const claims = post => {
      const out = new Set();
      if (post.followerGain[0] > 0) out.add('followers');
      const x = post.extraEffect || '';
      if (/Reputation [+-]\d+/.test(x)) out.add('standing');
      if (/all stats next season/.test(x)) out.add('focus');
      if (/Rivalry intensity/.test(x)) out.add('rivalry');
      return out;
    };
    const gaps = {};
    for (const post of SB.SOCIAL_MEDIA_ACTIONS) {
      const does = new Set(SO.postMeters(post, SB.SOCCER_SOCIAL));
      for (const c of claims(post)) if (!does.has(c)) gaps[post.id] = c;
      const rep = /Reputation ([+-]\d+)/.exec(post.extraEffect || '');
      if (rep && Number(rep[1]) !== post.reputationChange) gaps[post.id] = `prints reputation ${rep[1]}, moves ${post.reputationChange}`;
    }
    check(JSON.stringify(gaps) === JSON.stringify(KNOWN_CARD_GAPS), `soccer's post cards say what the posts do, apart from the known gap list (${JSON.stringify(gaps)})`);
  }

  console.log('\n2b. A deal pays what its card prints');
  {
    const lines = [];
    let good = 0;
    for (const t of TB_TIERS) {
      const card = BR.brandRungCard(t, TB_BRAND.words);
      const printed = Number(/\$([\d.]+)M/.exec(card)?.[1]);
      const pay = BR.brandSeasonIncome({ standing: 0, followers: 0, tier: t.id, bonus: 0, legacy: 0 }, TB_BRAND);
      if (close(pay, printed) && close(BR.brandRungPay(t.id, TB_TIERS), printed)) good += 1;
      else lines.push(`${t.id} card "${card}" pays ${pay}`);
    }
    check(good === TB_TIERS.length, `every Testball rung pays exactly its card (${good} of ${TB_TIERS.length})${lines.length ? `: ${lines.join(' | ')}` : ''}`);
    const nothing = BR.brandSeasonIncome({ standing: 0, followers: 0, tier: null, bonus: 0, legacy: 0 }, TB_BRAND);
    const unknown = BR.brandSeasonIncome({ standing: 0, followers: 0, tier: 'some_old_id', bonus: 0, legacy: 0 }, TB_BRAND);
    check(nothing === 0 && unknown === 0, 'no rung, and a stored id the sport never wrote, pay nothing');
    const floored = BR.brandSeasonIncome({ standing: 0, followers: 0, tier: null, bonus: -5, legacy: 0 }, TB_BRAND);
    check(floored === 0, 'a season\'s brand money never goes below zero');
    const fame = BR.brandSeasonIncome({ standing: 95, followers: 100, tier: 'kit_deal', bonus: 0.5, legacy: 0.25 }, TB_BRAND);
    check(close(fame, r2(0.5 + 1.5 + 100 * 0.01 + 0.25 + 1.75)), `fame, followers, the legacy term, the bonus and the rung add up (${fame})`);

    /* Soccer's five, as the page's card reads them: rows keyed by the stored id. */
    const soccerBad = [];
    for (const row of SB.SPONSORSHIP_TIERS) {
      const pay = BR.brandSeasonIncome({ standing: 0, followers: 0, tier: row.tier, bonus: 0, legacy: 0 }, SB.SOCCER_BRAND);
      if (!close(pay, row.income)) soccerBad.push(`${row.name}: card €${row.income}M, pays ${pay}`);
    }
    check(soccerBad.length === 0, `soccer's five deals pay exactly what the card prints${soccerBad.length ? `: ${soccerBad.join(' | ')}` : ''}`);

    /* The cover offer: pays its terms, prints its terms. */
    const s = tbHost(4); s.fans = 160; s.grade = 85;
    const staged = BR.stageCoverOffer(s, TB_BRAND);
    const twice = BR.stageCoverOffer(s, TB_BRAND);
    const before = structuredClone(s);
    BR.decideCoverOffer(s, true, TB_BRAND);
    check(staged && !twice && s.coverWaiting === false && s.coverDone === true, 'the cover offer is staged once and cleared by the answer');
    check(close(s.bank - before.bank, 4.5) && close(s.fans - before.fans, 20) && s.trophies.includes('Cover'), 'taking the cover pays exactly its cash and followers and records the award');
    check(!BR.stageCoverOffer(s, TB_BRAND), 'a cover already taken is never offered again');
    const d = tbHost(5); d.coverWaiting = true; d.rep = 99;
    BR.decideCoverOffer(d, false, TB_BRAND);
    check(d.rep === 100 && d.bank === tbHost(5).bank && d.coverDone === false, 'turning it down earns standing, capped at 100, and pays nothing');
    const c = SB.SOCCER_COVER;
    const taken = SB.SOCCER_BRAND.words.coverTaken;
    check(taken.includes(`€${c.pay}M`) && taken.includes(`${c.followers}M followers`) && SB.SOCCER_BRAND.words.coverDeclined.includes(`+${c.declineStanding}`),
      `soccer's cover lines print the terms the offer pays (€${c.pay}M, ${c.followers}M followers, reputation +${c.declineStanding})`);
  }

  console.log('\n2c. A rung cannot be stepped over');
  {
    check(BR.brandLadderProblems(TB_BRAND).length === 0, 'the Testball ladder is sound');
    check(BR.brandLadderProblems(SB.SOCCER_BRAND).length === 0, `soccer's ladder is sound (${BR.brandLadderProblems(SB.SOCCER_BRAND).join('; ') || 'no problems'})`);
    const flat = { ...TB_BRAND, tiers: TB_TIERS.map(t => (t.id === 'kit_deal' ? { ...t, minFollowers: 2000 } : t)) };
    const cheap = { ...TB_BRAND, tiers: TB_TIERS.map(t => (t.id === 'own_line' ? { ...t, income: 1 } : t)) };
    const branded = { ...TB_BRAND, tiers: TB_TIERS.map(t => (t.id === 'kit_deal' ? { ...t, id: 'some_company_deal' } : t)) };
    const shared = { ...TB_BRAND, saveIds: { local_deal: 'x', kit_deal: 'x' } };
    check(BR.brandLadderProblems(flat).some(p => /stepped over/.test(p)), 'a rung whose line is not above the one before is named');
    check(BR.brandLadderProblems(cheap).some(p => /less than/.test(p)), 'a rung that pays less than the one below is named');
    check(BR.brandLadderProblems(branded).some(p => /not a rung/.test(p)), 'a rung id outside the shared ladder is named');
    check(BR.brandLadderProblems(shared).some(p => /same id/.test(p)), 'two rungs stored under one id are named');
    for (const [label, sport] of [['Testball', TB_BRAND], ['soccer', SB.SOCCER_BRAND]]) {
      const tiers = sport.tiers;
      const top = tiers[tiers.length - 1].minFollowers * 1.5;
      const seen = new Set();
      let lastIdx = -1;
      const bad = [];
      for (let raw = 0; raw <= top; raw += top / 4000) {
        const rung = BR.brandRungFor(raw, tiers);
        const idx = rung === null ? -1 : tiers.findIndex(t => t.id === rung);
        if (idx < lastIdx) bad.push(`fell at ${raw}`);
        lastIdx = idx;
        if (rung !== null) seen.add(rung);
        for (let k = 0; k <= idx; k += 1) if (tiers[k].minFollowers > raw) bad.push(`${rung} held at ${raw} below ${tiers[k].id}'s line`);
      }
      check(bad.length === 0 && seen.size === tiers.length, `${label}: rising through ${tiers.length} rungs, every rung is held for a range of its own and holding one means every line below is met${bad.length ? `: ${bad.slice(0, 3).join(' | ')}` : ''}`);
    }
    /* Climbing one post at a time signs every rung in order, once each. */
    const s = tbHost(2); s.fans = 0; s.deal = null;
    const signed = [];
    for (let i = 0; i < 400; i += 1) {
      s.fans = r2(s.fans + 0.7);
      const t = BR.updateBrandRung(s, TB_BRAND);
      if (t) signed.push(t.id);
    }
    check(JSON.stringify(signed) === JSON.stringify(TB_TIERS.map(t => t.id)), `a following climbing in small steps signs the rungs in order, once each (${signed.join(' > ')})`);
  }

  console.log('\n2d. A personality never moves the odds past the stated bound');
  {
    const B0 = ID.PERSONALITY_BOUND;
    const TB_ID = {
      personalities: [
        { id: 'loud', name: 'Loud', emoji: 'L', blurb: '', perk: '', followerMult: 3, sponsorMult: 0.1 },
        { id: 'calm', name: 'Calm', emoji: 'C', blurb: '', perk: '', followerMult: 0.9, sponsorMult: 1.1 },
      ],
      agents: [{ id: 'pal', name: 'Pal', emoji: 'P', blurb: '', wageMult: 1.2, incomeCut: 0.05, transferCut: 0.07 }],
      noAgentTransferCut: 0.04,
      beats: { personalityAge: 20, agentAge: 22 },
    };
    check(ID.personalityMult('loud', 'followers', TB_ID) === B0.max && ID.personalityMult('loud', 'sponsors', TB_ID) === B0.min,
      `data asking for 3 and 0.1 is held to ${B0.min} to ${B0.max} where it is read`);
    check(ID.personalityMult('calm', 'followers', TB_ID) === 0.9 && ID.personalityMult(null, 'sponsors', TB_ID) === 1 && ID.personalityMult('ghost', 'followers', TB_ID) === 1,
      'a personality inside the bound is read as written, and nobody is neutral');
    check(ID.identityProblems(TB_ID).filter(p => /loud/.test(p)).length === 2, 'the data check names both of loud\'s out of bound multipliers');
    check(ID.identityProblems(L.SOCCER_IDENTITY).length === 0, `soccer's personalities and agents are inside every bound (${ID.identityProblems(L.SOCCER_IDENTITY).join('; ') || 'no problems'})`);
    /* Through the growth rule itself, same stream with and without. */
    let worst = 0, least = Infinity;
    for (let i = 0; i < 400; i += 1) {
      const grow = p => {
        const rng = mulberry32(i * 13 + 5);
        return SO.seasonFollowerGrowth({ rep: 10 + (i % 90), p }, { buzz: 1 + (i % 7) }, {
          buzz: (_s, season) => season.buzz, homeMarket: () => 1, standing: meter('rep'), standingRate: 0.01,
          viral: { chance: 0.2, min: 1, max: 3 }, personality: s => ID.personalityMult(s.p, 'followers', TB_ID), rng,
        });
      };
      const plain = grow(null);
      if (plain > 0) { worst = Math.max(worst, grow('loud') / plain); least = Math.min(least, grow('calm') / plain); }
    }
    check(worst <= B0.max + 0.01 && least >= B0.min - 0.01, `over 400 seasons the loudest personality multiplied growth by at most ${worst.toFixed(3)}, the calmest by at least ${least.toFixed(3)}`);
    const viral = (() => { let draws = 0; const rng = () => { draws += 1; return 0.99; };
      SO.seasonFollowerGrowth({ rep: 0 }, {}, { buzz: () => 0, homeMarket: () => 1, standing: meter('rep'), standingRate: 0, viral: { chance: 0.05, min: 1, max: 5 }, personality: () => 1, rng });
      return draws; })();
    check(viral === 1, `a season with no viral moment draws exactly one random number (${viral})`);

    console.log('\n2e. The agent and the beats');
    check(ID.agentTransferCut(undefined, TB_ID) === 0.04 && ID.agentTransferCut('', TB_ID) === 0.04 && ID.agentTransferCut('ghost', TB_ID) === 0.04 && ID.agentTransferCut('pal', TB_ID) === 0.07,
      'no agent, and an agent the sport does not know, pay the old flat transfer cut; a real one pays its own');
    check(ID.agentWage('ghost', TB_ID) === 1 && ID.agentIncomeCut('ghost', TB_ID) === 0 && ID.agentWage('pal', TB_ID) === 1.2 && ID.agentIncomeCut('pal', TB_ID) === 0.05,
      'an agent you do not have takes nothing and adds nothing');
    const beatBad = [];
    for (let age = 14; age <= 30; age += 1) {
      for (const personality of [null, '', 'calm']) {
        for (const agentId of [null, 'pal']) {
          for (const retired of [false, true]) {
            const due = ID.identityBeatDue({ personality, agentId, age, retired }, TB_ID);
            if (retired && due) beatBad.push(`${due} due after retiring`);
            if (due === 'agent' && !personality) beatBad.push('agent before a personality');
            if (due === 'agent' && age < 22) beatBad.push(`agent at ${age}`);
            if (due === 'personality' && (age < 20 || personality)) beatBad.push(`personality at ${age} with ${personality}`);
            if (!retired && !personality && age >= 20 && due !== 'personality') beatBad.push(`no personality beat at ${age}`);
            if (!retired && personality && !agentId && age >= 22 && due !== 'agent') beatBad.push(`no agent beat at ${age}`);
          }
        }
      }
    }
    check(beatBad.length === 0, `the beats come due at their ages, personality first, never after retiring${beatBad.length ? `: ${beatBad.slice(0, 3).join(' | ')}` : ''}`);
    check(ID.identityProblems({ ...TB_ID, beats: { personalityAge: 20, agentAge: 20 } }).some(p => /after/.test(p)), 'beats that would land in the same season are named');
  }
}

/* ============================================================
   3. Old saves and brand names
   ============================================================ */
if (SECTIONS.includes('3')) {
  console.log('\n3. Old saves keep their stored tier ids, and no real brand spreads');
  const clubs = E.FALLBACK_CLUBS;
  const real = Math.random;
  Math.random = mulberry32(83500);
  try {
    const base = E.initCareer('Old Boot', 'Brazil', 'LW', '2020s', { pace: 74, shooting: 74, passing: 74, dribbling: 74, defending: 74, physical: 74, reflexes: 74 }, 74, 2020, clubs, null, 90);
    const raw = JSON.parse(JSON.stringify(base));
    raw.activeSponsorship = 'nike_adidas';
    raw.socialMediaFollowers = 6;
    raw.age = 22;
    const loaded = E.repairCareer(raw);
    check(loaded.activeSponsorship === 'nike_adidas', 'a save holding nike_adidas loads with it untouched');
    const row = SB.SPONSORSHIP_TIERS.find(t => t.tier === 'nike_adidas');
    check(Boolean(row) && row.name === 'Global Boot Deal' && BR.brandRungOf('nike_adidas', SB.SOCCER_BRAND) === 'kit_deal', 'the stored id still reads as the boot deal, the shared kit deal rung');
    check(BR.brandSeasonIncome({ standing: 0, followers: 0, tier: 'nike_adidas', bonus: 0, legacy: 0 }, SB.SOCCER_BRAND) === 3, 'and pays the boot deal\'s 3 a season');
    const posted = E.applySocialMediaAction({ ...loaded, socialMediaActionUsedThisSeason: false }, 'personal_life');
    check(posted.activeSponsorship === 'nike_adidas' && !posted.events.some(e => /NEW SPONSORSHIP/.test(e)), 'a post that does not move the rung keeps the stored id and signs nothing new');
    const climbed = E.applySocialMediaAction({ ...loaded, socialMediaFollowers: 14.9, socialMediaActionUsedThisSeason: false }, 'charity_work');
    check(climbed.activeSponsorship === 'global_ambassador', 'crossing the next line moves it to the ambassador id');
    const fresh = E.applySocialMediaAction({ ...loaded, activeSponsorship: null, socialMediaFollowers: 4.9, socialMediaActionUsedThisSeason: false }, 'charity_work');
    check(fresh.activeSponsorship === 'nike_adidas', 'a fresh boot deal is stored under the id every live save uses, never the neutral rung id');
    const cover = E.repairCareer({ ...raw, activeSponsorship: 'fifa_cover' });
    check(cover.activeSponsorship === 'cover_athlete', 'the renamed cover value still maps on load');
  } finally {
    Math.random = real;
  }

  /* No real brand in the shared modules, in any form; and none in any line
     the soccer binding prints. The stored id is the one allowed occurrence. */
  const BRANDS = ['nike', 'adidas', 'puma', 'reebok', 'umbro', 'kappa', 'mizuno', 'asics', 'under armour', 'new balance', 'gatorade', 'pepsi', 'coca', 'red bull', 'rolex', 'gucci', 'prada', 'versace', 'balenciaga', 'louis vuitton', 'ferrari', 'lamborghini', 'bugatti', 'porsche', 'bentley', 'mercedes', 'playstation', 'xbox', 'nintendo', 'instagram', 'tiktok', 'youtube', 'snapchat', 'netflix', 'spotify', 'mastercard', 'emirates'];
  const brandRe = new RegExp(`\\b(${BRANDS.map(b => b.replace(/ /g, '\\s+')).join('|')})`, 'i');
  for (const rel of ['src/lib/careerSocial.ts', 'src/lib/careerBrand.ts', 'src/lib/careerIdentity.ts']) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const hit = text.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => brandRe.test(l));
    check(hit.length === 0, `${rel} names no real brand${hit.length ? `: line ${hit[0][0]}` : ''}`);
  }
  {
    const text = fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerBrand.ts'), 'utf8');
    const hits = text.split('\n').filter(l => brandRe.test(l)).map(l => l.trim());
    const allowed = hits.every(l => /^export type SponsorshipTier =/.test(l) || /^kit_deal: "nike_adidas",$/.test(l));
    check(hits.length === 2 && allowed, `soccerCareerBrand.ts holds the stored id in exactly its type and its alias, nowhere else (${hits.length} lines)`);
    const printed = [
      ...SB.SPONSORSHIP_TIERS.map(t => t.name),
      ...SB.SPONSORSHIP_TIERS.map(t => SB.SOCCER_BRAND.words.signed({ ...t, id: 'kit_deal' })),
      SB.SOCCER_BRAND.words.coverTaken, SB.SOCCER_BRAND.words.coverDeclined,
      ...SB.SOCIAL_MEDIA_ACTIONS.flatMap(p => [p.label, p.description, p.extraEffect || '']),
      ...Object.values(SB.SOCCER_SOCIAL.words).map(w => (typeof w === 'string' ? w : w(SB.SOCIAL_MEDIA_ACTIONS[0], 1, {}))),
    ];
    const brandLines = printed.filter(l => brandRe.test(l));
    check(brandLines.length === 0, `none of the ${printed.length} lines the soccer binding prints names a real brand`);
  }
}

console.log(failures === 0 ? '\nALL SOCIAL AND BRAND CHECKS PASSED' : `\n${failures} FAILURE${failures === 1 ? '' : 'S'}`);
process.exit(failures === 0 ? 0 : 1);
