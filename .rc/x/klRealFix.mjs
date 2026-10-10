// keeper-libs reviewer (Release AU). Runs ONLY in a runner's checkout, never on a tracked tree of the PC.
// Makes scripts/lib/realSaves.mjs build the Soccer Career and US career fixtures the way a player of the MERGED head
// can hold them: a Soccer Career that has played seasons and chosen one season plan (PR216, state.programme), and a US
// career with a season plan saved (PR216, c.programme). Nothing else changes. Refuses when an anchor is gone.
import fs from 'node:fs';

const FILE = 'scripts/lib/realSaves.mjs';
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const swap = (from, to, what) => {
  if (!src.includes(from)) { console.error('klRealFix: CANNOT RUN, anchor gone: ' + what); process.exit(2); }
  src = src.replace(from, to);
};
const arm = process.argv[2] || 'both';

if (arm === 'both' || arm === 'soccer') {
  swap("import { isSoccerCareerSave } from './src/lib/soccerCareerSave';\n",
    "import { isSoccerCareerSave } from './src/lib/soccerCareerSave';\nimport * as PROG from './src/lib/soccerCareerProgramme';\n", 'the soccer import');
  swap("const store = globalThis.__realSavesStore;\n", [
    'const store = globalThis.__realSavesStore;',
    'const klStep = (s, clubs) => {',
    '  switch (s.phase) {',
    "    case 'youth': return SOC.advanceYouthYear(s, clubs);",
    "    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? SOC.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }",
    "    case 'playing': return SOC.advanceProSeason(s, clubs);",
    "    case 'newspaper': return SOC.dismissNewspaper(s);",
    "    case 'season_summary': return SOC.dismissSummary(s, clubs);",
    "    case 'international_debut': return SOC.dismissDebut(s, clubs);",
    "    case 'world_cup': return SOC.dismissWorldCup(s, clubs);",
    "    case 'rehab_choice': return SOC.applyRehabChoice(s, 1);",
    "    case 'rivalry_event': return SOC.dismissRivalryEvent(s, clubs);",
    "    case 'ballon_dor': return SOC.dismissBallonDor(s, clubs);",
    "    case 'bdor_speech': return SOC.applyBdorSpeech(s, 0);",
    "    case 'wc_speech': return SOC.applyWorldCupSpeech(s, 0);",
    "    case 'moral_dilemma': return SOC.dismissMoralDilemma(s, clubs);",
    "    case 'social_media_action': return SOC.dismissSocialMediaPhase(s, clubs);",
    "    case 'red_card_appeal_result': return SOC.dismissAppealResult(s, clubs);",
    "    case 'retirement_suggestion': return SOC.acceptRetirementSuggestion(s);",
    "    case 'retirement_ceremony': case 'retired': return { ...s, retired: true };",
    "    case 'random_events': { const ev = (s.pendingEvents || [])[0]; if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] }; return SOC.applyEventChoice(s, ev.choices.length - 1, clubs); }",
    "    case 'contract_expiring': case 'transfer_window': return SOC.stayAtClub(s);",
    "    default: { const n = SOC.advanceProSeason(s, clubs); return n.phase === s.phase ? { ...n, retired: true } : n; }",
    '  }',
    '};',
    '',
  ].join('\n'), 'the store line');
  swap([
    "    out['/soccer-career'] = JSON.stringify(SOC.initCareer(",
    "      'Real Save ' + seed, NATIONS[seed % NATIONS.length], SOCCER_POS[seed % SOCCER_POS.length],",
    "      'modern', flat(58), 58, 2020, SOC.FALLBACK_CLUBS, null, 76 + (seed % 14),",
    '    ));',
    '',
  ].join('\n'), [
    '    {',
    '      const clubs = SOC.FALLBACK_CLUBS;',
    '      let c = SOC.initCareer(',
    "        'Real Save ' + seed, NATIONS[seed % NATIONS.length], SOCCER_POS[seed % SOCCER_POS.length],",
    "        'modern', flat(58), 58, 2020, clubs, null, 76 + (seed % 14),",
    '      );',
    "      const played = s => (s.seasons || []).filter(r => r.type === 'playing').length;",
    '      let pick = null;',
    '      for (let want = 2; want <= 9 && !pick && !c.retired; want += 1) {',
    "        for (let g = 0; !c.retired && g < 400 && !(played(c) >= want && c.phase === 'playing'); g += 1) c = klStep(c, clubs);",
    "        const view = c.retired ? null : PROG.programmeOptions(c).find(o => o.id === 'tactics');",
    '        pick = view ? (view.choices.find(x => x.eligible) || null) : null;',
    '      }',
    "      if (!pick) throw new Error('klRealFix: seed ' + seed + ' never offered an eligible tactical role (phase ' + c.phase + ', played ' + played(c) + ')');",
    "      c = PROG.chooseProgramme(c, 'tactics', pick.id);",
    "      if (!c.programme || !c.programme.plan) throw new Error('klRealFix: the plan was not kept on the save');",
    "      console.log('klRealFix: soccer seed ' + seed + ': ' + played(c) + ' seasons played, plan ' + JSON.stringify(c.programme).slice(0, 150) + ', wheel on the save: ' + (c.chanceWheel ? 'yes' : 'no'));",
    "      out['/soccer-career'] = JSON.stringify(c);",
    '    }',
    '',
  ].join('\n'), 'the soccer fixture');
}

if (arm === 'both' || arm === 'us') {
  swap("import * as NFL from './src/lib/nflMyCareer';\n", "import * as USP from './src/lib/usCareerProgramme';\nimport * as NFL from './src/lib/nflMyCareer';\n", 'the NFL import');
  swap('const usCareer = (start, arch, seed) => {', 'const usCareer = (start, arch, seed, slug) => {', 'usCareer head');
  swap("  return JSON.stringify({ c: start('Real Save ' + seed, pos, list[seed % list.length], mulberry32(seed + 1)), phase: 'season', teamQuality: null, coach: null });\n", [
    "  let c = start('Real Save ' + seed, pos, list[seed % list.length], mulberry32(seed + 1));",
    "  const planned = USP.saveUsCareerProgramme(c, slug, { ...USP.usProgrammeDefaults(), workload: 'push', expectation: 'steady' });",
    "  console.log('klRealFix: ' + slug + ' seed ' + seed + ': plan on the save: ' + (planned && planned.programme ? JSON.stringify(planned.programme).slice(0, 140) : 'NONE'));",
    '  if (planned && planned.programme) c = planned;',
    "  return JSON.stringify({ c, phase: 'season', teamQuality: null, coach: null });",
    '',
  ].join('\n'), 'usCareer body');
  swap('NFL.ARCHETYPES, seed);', "NFL.ARCHETYPES, seed, 'nfl');", 'nfl call');
  swap('NBA.NBA_ARCHETYPES, seed);', "NBA.NBA_ARCHETYPES, seed, 'nba');", 'nba call');
  swap('MLB.MLB_ARCHETYPES, seed);', "MLB.MLB_ARCHETYPES, seed, 'mlb');", 'mlb call');
  swap('NHL.NHL_ARCHETYPES, seed);', "NHL.NHL_ARCHETYPES, seed, 'nhl');", 'nhl call');
}

fs.writeFileSync(FILE, src);
console.log('klRealFix: ' + FILE + ' rewritten in this checkout (arm ' + arm + ').');
