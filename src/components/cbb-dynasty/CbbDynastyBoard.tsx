/**
 * CBB Dynasty's board. Since Round 912 the board itself is the shared college
 * one (src/components/college-dynasty/CollegeDynastyBoard.tsx), also driving
 * CFB Dynasty. This file says what is basketball about it: the engine, the
 * save, the words, rounds of two games with rivalry night, and the recap of
 * the conference tournaments and March.
 */
import CollegeDynastyBoard, {
  type CollegePhase, type CollegeRecapView, type CollegeSport,
} from '@/components/college-dynasty/CollegeDynastyBoard';
import { revealDelay } from '@/components/club-manager/Celebration';
import {
  CBB_SCHOOLS, CBB_SCHOOL_MAP, CBB_CONFS, CBB_ROUNDS, CBB_RIVALRY_ROUND,
  initCbb, simCbbRound, cbbRankings, cbbConfStandings, runMarch,
  poyRace, cbbRecruitClass, cbbPortalPool, cbbSignRecruit, cbbOffseason,
  cbbStrength, cbbEnableDepth, cbbOpenOffseason, cbbHireCoordinator, cbbFireCoordinator,
  cbbPayroll, cbbUnits, cbbSosTable, cbbRivalOf,
  type CbbState, type CbbTeam, type CbbGame, type CbbRecruit, type MarchResult, type PoyFinalist,
  ensureCbbIds,
} from '@/lib/cbbDynasty';
import type { StaffRole } from '@/lib/collegeProgram';

const SAVE_KEY = 'cbb-dynasty-save-v1';

type Recap = { result: MarchResult; poy: PoyFinalist[] };

interface SaveShape {
  st: CbbState; phase: CollegePhase;
  recruits: CbbRecruit[] | null; portal: CbbRecruit[] | null;
  /* Round 823: the CFB fix from Round 426 part three, ported. Present on a
     save written from the recap screen, so the recap can be drawn again
     after a reload instead of the season being played a second time.
     Absent on older saves. */
  march?: Recap | null;
}

/* Round 823: the two chairs are the two ends of the floor. */
const ROLE_NAME: Record<StaffRole, string> = { OC: 'Offensive assistant', DC: 'Defensive assistant' };
const END_NAME: Record<StaffRole, string> = { OC: 'Offense', DC: 'Defense' };

/* Round 530: the season curtain's basketball half. The champion slams in,
   your own line rises, the player of the year lands after the champion,
   Cinderella after him, then the title game and the bracket tick in round by
   round in the order the engine played them. */
function MarchRecap({ st, my, recap, isChamp, label, signed }: CollegeRecapView<CbbTeam, CbbState, Recap>) {
  const march = recap.result;
  const poy = recap.poy;
  const title = march.bracket[march.bracket.length - 1];
  const ledger = march.bracket.filter(g => g.name !== 'Round of 32');
  return (
    <>
      <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.05s' }}>{label(march.champion)} cut down the nets</p>
      <p className="cm-rise mt-1 text-sm text-muted-foreground" style={{ animationDelay: '0.25s' }}>
        {isChamp ? 'One Shining Moment is about you this year.' : `Your ${label(st.myTeam)}: ${my.wins}-${my.losses}. ${march.myExit}.`}
      </p>
      {/* Round 823: what rivalry night swung, read off the engine's record. */}
      {st.lastRivalry && st.lastRivalry.season === st.season && (
        <p className="cm-rise mt-1 text-xs text-muted-foreground" style={{ animationDelay: '0.35s' }}>
          {st.lastRivalry.won ? '🔥' : '🧊'} Rivalry night: {st.lastRivalry.won ? 'beat' : 'lost to'} {label(st.lastRivalry.opp)} {st.lastRivalry.us}-{st.lastRivalry.them}. Morale {signed(st.lastRivalry.morale)} into March, and {st.lastRivalry.won ? `${st.lastRivalry.recruit} more` : `${-st.lastRivalry.recruit} fewer`} budget points on the trail.
        </p>
      )}
      <p className="cm-rise mt-1 text-xs text-amber-300 font-bold" style={{ animationDelay: '0.45s' }}>
        🏆 National Player of the Year: {poy[0].name} ({poy[0].pos}, {label(poy[0].team)})
      </p>
      {march.cinderella && (
        <p className="cm-rise mt-1 text-xs font-bold text-emerald-400" style={{ animationDelay: '0.55s' }}>
          🕰️ Cinderella: {label(march.cinderella.team)} crashed the Final Four as a {march.cinderella.seed} seed
        </p>
      )}
      <p className="cm-tick-in mt-2 text-xs text-muted-foreground" style={{ animationDelay: revealDelay(0) }}>
        Title game: ({title.homeSeed}) {label(title.home)} vs ({title.awaySeed}) {label(title.away)}, {label(title.winner)} win {Math.max(title.hs, title.as)}-{Math.min(title.hs, title.as)}
      </p>
      <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto text-[11px] text-muted-foreground">
        {ledger.map((g, i) => (
          <p key={`${st.season}:${i}`} className="cm-tick-in" style={{ animationDelay: revealDelay(i + 1) }}>{g.name}: ({g.homeSeed}) {label(g.home)} vs ({g.awaySeed}) {label(g.away)}, {label(g.winner)} advance</p>
        ))}
      </div>
    </>
  );
}

const confName = (c: string) => c === 'B1G' ? 'Big Ten' : c === 'B12' ? 'Big 12' : c === 'BE' ? 'Big East' : c === 'MM' ? 'Mid-Majors' : c;
const rivalryLine = (note: string) => `🔥 Round ${CBB_RIVALRY_ROUND}'s league night is rivalry night: ${note}.`;

const CBB_WORDS: CollegeSport<CbbTeam, CbbState, CbbGame, CbbRecruit, Recap>['words'] = {
  pickIntro: '40 real programs, six leagues, one bracket. Recruit with NIL, survive the one-and-done era, win your conference tournament, then live or die in a 32-team single-elimination March. Cinderella is real and she is coming. Saves automatically.',
  welcome: (st, id, { label, rivalry }) => {
    const staff = st.teams[id].staff;
    return [
      `Welcome to ${label(id)}. Twenty games, a conference tournament, and one shot at surviving March.`,
      ...(staff?.OC && staff.DC ? [`📋 Your bench: ${staff.OC.name} runs the offense (${staff.OC.rating}), ${staff.DC.name} the defense (${staff.DC.rating}).`] : []),
      rivalryLine(rivalry(id)),
    ];
  },
  depthArrives: (st, { rivalry }) => {
    const staff = st.teams[st.myTeam].staff;
    return [
      `🆕 New this season: assistant coaches, rivalry night and strength of schedule.${staff?.OC && staff.DC ? ` Your bench: ${staff.OC.name} (offense, ${staff.OC.rating}) and ${staff.DC.name} (defense, ${staff.DC.rating}).` : ''}`,
      rivalryLine(rivalry(st.myTeam)),
    ];
  },
  budgetDepth: (budget, payroll, nil) => `💰 Program budget ${budget}: your assistants take ${payroll}, ${nil} left for NIL. Replace the departed, sort your bench staff, run it back.`,
  budgetPlain: nil => `💰 NIL budget: ${nil} points. Replace the departed, raid the portal, run it back.`,
  signVerb: 'commits to',
  hireTitle: role => ROLE_NAME[role].toLowerCase(),
  chairName: role => END_NAME[role].toLowerCase(),
  classNote: ' Beware: sign a superstar freshman and he may be one-and-done.',
  staffTitle: 'Assistant coaches',
  staffNote: 'Paid from the same pot as NIL. An assistant moves his end of the floor by up to 3 points either way.',
  roleName: ROLE_NAME,
  vacantVerb: 'covers',
  portalName: r => `${'⭐'.repeat(r.stars)} ${r.name}`,
  portalDetail: r => `${r.pos} · rated ${r.grade} · asks ${r.nilAsk} NIL`,
  seasonLabel: season => `${season}-${(season + 1) % 100}`,
  roundWord: 'Round',
  recordExtra: () => '',
  standingsTab: 'Leagues',
  depthChart: 'rotation',
  unitCoach: (_role, c) => (c ? `${c.name}, ${c.rating}` : 'Chair empty'),
  noStaffYet: 'Assistant coaches arrive when this season\'s offseason closes.',
  playIntro: () => 'Every round is two games: a league night and a cross-country test.',
  rivalryNow: now => (now ? 'Tonight\'s league game is rivalry night' : `Round ${CBB_RIVALRY_ROUND}'s league night is rivalry night`),
  playButton: (round, final) => (final ? 'Final round + March' : `Play Round ${round}`),
  playFootnote: 'Six conference tournament champs auto-bid; 32 teams, single elimination, no second chances.',
  sosPending: 'shows up after round 1',
  slateTag: 'R',
  nonConf: ' (non-league)',
  upNext: (st, note) => (st.round < CBB_RIVALRY_ROUND
    ? `Up next: round ${st.round}, opponents drawn on game night. Round ${CBB_RIVALRY_ROUND}: ${note}.`
    : `Up next: rivalry night against ${note}, then a cross-country game.`),
  scheduleNote: 'The committee weighs who you played the same as how good you look, so a tough schedule can carry a bubble team into March.',
  scheduleBeforeDepth: 'This dynasty started before the schedule log existed. It starts with next season, along with assistant coaches and rivalry night.',
  rankCut: 8,
  rankMark: '',
  rankingsNote: depth => (depth
    ? 'Record rules the committee room, then the eye test and the schedule, weighed the same.'
    : 'Record rules the committee room, but the eye test counts too.'),
  standingsCut: 4,
  standingsMark: ' •',
  standingsNote: () => '• top four make the conference tournament; win it and you dance no matter what.',
};

/* Built on first use rather than at import, so nothing imported is read
   while the modules are still loading, and kept, so the board sees one
   descriptor for the life of the page. */
let sport: CollegeSport<CbbTeam, CbbState, CbbGame, CbbRecruit, Recap> | null = null;

function cbbSport(): CollegeSport<CbbTeam, CbbState, CbbGame, CbbRecruit, Recap> {
  return (sport ??= {
    completionId: 'cbb-dynasty',
    saveKey: SAVE_KEY,
    encodeSave: (st, phase, recruits, portal, march) => JSON.stringify({ st, phase, recruits, portal, march } satisfies SaveShape),
    recapOf: s => (s as SaveShape).march,
    /* The recap is drawn only with both halves, the way the two separate
       pieces of state were checked before Round 912. */
    recapDrawable: r => !!r.result && !!r.poy,
    championOf: r => r.result.champion,

    schools: CBB_SCHOOLS,
    schoolMap: CBB_SCHOOL_MAP,
    confs: CBB_CONFS,
    confLabel: confName,
    rounds: CBB_ROUNDS,
    rivalryRound: CBB_RIVALRY_ROUND,
    rivalOf: cbbRivalOf,
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],

    init: (id, rng, opts) => initCbb(id, rng, opts),
    ensureIds: (st, recruits, portal) => { ensureCbbIds(st, recruits, portal); },
    playRound: (state, rng, { label }) => {
      const { games, myGames } = simCbbRound(state, rng);
      const lines: string[] = [];
      for (const g of myGames) {
        const won = g.winner === state.myTeam;
        const us = g.home === state.myTeam ? g.hs : g.as;
        const them = g.home === state.myTeam ? g.as : g.hs;
        const opp = g.home === state.myTeam ? g.away : g.home;
        lines.push(`${won ? '✅' : '❌'} ${g.rivalry ? 'Rivalry night: ' : ''}${won ? 'Beat' : 'Lost to'} ${label(opp)} ${us}-${them}.`);
      }
      return { games, lines };
    },
    /* Round 823: a season's March runs once. The record carries a title
       entry for this season the moment March is played, so a state that
       already has one is a closed season clicked again, and the answer is
       to do nothing rather than play the last round twice. */
    closedBeforeRound: st => st.titles.some(t => t.season === st.season),
    closedAtFinal: () => false,
    closeSeason: (state, rng) => {
      const result = runMarch(state, rng);
      const race = poyRace(state, rng);
      state.poyWinners = [...(state.poyWinners ?? []), race[0].name];
      state.titles.push({ season: state.season, team: result.champion });
      return { result, poy: race };
    },
    openOffseason: (st, rng) => cbbOpenOffseason(st, rng),
    recruitClass: rng => cbbRecruitClass(rng),
    portalPool: rng => cbbPortalPool(rng),
    payroll: st => cbbPayroll(st),
    signRecruit: (st, r, cls, rng) => cbbSignRecruit(st, r, cls, rng),
    hireCoordinator: (st, id) => cbbHireCoordinator(st, id),
    fireCoordinator: (st, role) => cbbFireCoordinator(st, role),
    offseason: (st, rng) => cbbOffseason(st, rng),
    enableDepth: (st, rng) => cbbEnableDepth(st, rng),
    strength: t => cbbStrength(t),
    units: t => cbbUnits(t),
    rankings: st => cbbRankings(st),
    sosTable: st => cbbSosTable(st),
    standings: (st, conf) => cbbConfStandings(st, conf).map(t => ({ id: t.id, record: `${t.wins}-${t.losses}` })),

    RecapBody: MarchRecap,
    recapTitles: 'Titles',
    share: (st, isChamp, recap, label) => ({
      gameName: 'CBB Dynasty',
      gamePath: '/cbb-dynasty',
      score: `${st.myTitles} titles in ${st.seasonsPlayed} seasons`,
      customText: `CBB Dynasty 🏀 ${isChamp ? `${label(st.myTeam)} just cut down the nets!` : `${label(recap.result.champion)} won it all.`} ${st.myTitles} titles in ${st.seasonsPlayed} seasons. douknowball.com/cbb-dynasty`,
    }),
    words: CBB_WORDS,
    skin: {
      focus: '',
      tallRows: '',
      recruitList: 'max-h-72',
      rowName: 'block truncate font-bold text-foreground',
      feedBox: 'plain',
      slateList: 'max-h-80 space-y-0.5 overflow-y-auto',
    },
  });
}

export default function CbbDynastyBoard() {
  return <CollegeDynastyBoard sport={cbbSport()} />;
}
