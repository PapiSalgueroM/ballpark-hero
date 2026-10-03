/**
 * CFB Dynasty's board. Since Round 912 the board itself is the shared college
 * one (src/components/college-dynasty/CollegeDynastyBoard.tsx), also driving
 * CBB Dynasty. This file says what is football about it: the engine, the
 * save, the words, the 12 game slate with rivalry week, and the recap of the
 * conference title games and the 12 team Playoff.
 */
import CollegeDynastyBoard, {
  type CollegePhase, type CollegeRecapView, type CollegeSport,
} from '@/components/college-dynasty/CollegeDynastyBoard';
import { revealDelay } from '@/components/club-manager/Celebration';
import {
  CFB_SCHOOLS, CFB_SCHOOL_MAP, CFB_CONFS, CFB_ROUNDS, CFB_RIVALRY_ROUND,
  initCfb, simCfbRound, cfbRankings, confStandings, runCfbPostseason,
  heismanRace, cfbRecruitClass, cfbPortalPool, signRecruit, cfbOffseason,
  cfbStrength, cfbEnableDepth, cfbOpenOffseason, cfbHireCoordinator, cfbFireCoordinator,
  cfbPayroll, cfbUnits, cfbSosTable, cfbRivalOf,
  type CfbState, type CfbTeam, type CfbGame, type CfbPlayoffGame, type CfbRecruit, type HeismanFinalist,
  ensureCfbIds,
} from '@/lib/cfbDynasty';
import type { StaffRole } from '@/lib/collegeProgram';

const SAVE_KEY = 'cfb-dynasty-save-v1';

type Postseason = { ccgs: CfbPlayoffGame[]; bracket: CfbPlayoffGame[]; champion: string; heisman: HeismanFinalist[] };

interface SaveShape {
  st: CfbState; phase: CollegePhase;
  recruits: CfbRecruit[] | null; portal: CfbRecruit[] | null;
  /* Round 426 part three: present on a save written from the recap screen,
     so the recap can be drawn again after a reload. Absent on older saves. */
  postseason?: Postseason | null;
}

const ROLE_NAME: Record<StaffRole, string> = { OC: 'Offensive coordinator', DC: 'Defensive coordinator' };

/* Round 530: the season curtain's football half. The champion slams in, your
   own line rises, the Heisman lands after the champion, then the title game
   and the ledger tick in, conference title games first and the bracket
   after, the order the engine played them. */
function PlayoffRecap({ st, my, recap: postseason, isChamp, label }: CollegeRecapView<CfbTeam, CfbState, Postseason>) {
  const title = postseason.bracket[postseason.bracket.length - 1];
  const ledger = [
    ...postseason.ccgs.map(g => `${g.name}: ${label(g.winner)} ${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)}`),
    ...postseason.bracket.slice(0, -1).map(g => `${g.name}: ${label(g.winner)} beat ${label(g.winner === g.home ? g.away : g.home)} ${Math.max(g.hs, g.as)}-${Math.min(g.hs, g.as)}`),
  ];
  return (
    <>
      <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.05s' }}>{label(postseason.champion)} win the {st.season} natty</p>
      <p className="cm-rise mt-1 text-sm text-muted-foreground" style={{ animationDelay: '0.25s' }}>
        {isChamp ? 'Plant the flag. The whole sport is yours.' : `Your ${label(st.myTeam)} finished ${my.wins}-${my.losses}${my.champion ? ' as conference champs' : ''}.`}
      </p>
      {/* Round 426: heismanRace can legitimately come back empty, so the
          line is guarded rather than crashing the recap. */}
      {postseason.heisman[0] && (
        <p className="cm-rise mt-1 text-xs text-amber-300 font-bold" style={{ animationDelay: '0.45s' }}>
          🏆 Heisman: {postseason.heisman[0].name} ({postseason.heisman[0].pos}, {label(postseason.heisman[0].team)})
        </p>
      )}
      <p className="cm-tick-in mt-2 text-xs text-muted-foreground" style={{ animationDelay: revealDelay(0) }}>
        Title game: {label(title.winner)} beat {label(title.winner === title.home ? title.away : title.home)} {Math.max(title.hs, title.as)}-{Math.min(title.hs, title.as)}
      </p>
      <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto text-[11px] text-muted-foreground">
        {ledger.map((line, i) => (
          <p key={`${st.season}:${i}`} className="cm-tick-in" style={{ animationDelay: revealDelay(i + 1) }}>{line}</p>
        ))}
      </div>
    </>
  );
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
const confName = (conf: string) => conf === 'B1G' ? 'Big Ten' : conf === 'B12' ? 'Big 12' : conf === 'G5' ? 'Group of Five' : conf;
const rivalryLine = (note: string) => `🔥 Week ${CFB_RIVALRY_ROUND} is rivalry week: ${note}.`;

const CFB_WORDS: CollegeSport<CfbTeam, CfbState, CfbGame, CfbRecruit, Postseason>['words'] = {
  pickIntro: '44 real schools in the post-realignment landscape. Recruit with NIL, survive the conference, make the 12-team Playoff, win the natty, then do it again with a new roster. Classes graduate, stars declare early, dynasties are earned. Saves automatically.',
  welcome: (st, id, { label, rivalry }) => {
    const staff = st.teams[id].staff;
    return [
      `Welcome to ${label(id)}. The ${st.season} season kicks off with a 12-game slate, a conference title to defend, and a 12-team Playoff waiting in December.`,
      ...(staff?.OC && staff.DC ? [`📋 Your staff: ${staff.OC.name} runs the offense (${staff.OC.rating}), ${staff.DC.name} the defense (${staff.DC.rating}).`] : []),
      rivalryLine(rivalry(id)),
    ];
  },
  depthArrives: (st, { rivalry }) => {
    const staff = st.teams[st.myTeam].staff;
    return [
      `🆕 New this season: coordinators, rivalry week and strength of schedule.${staff?.OC && staff.DC ? ` Your staff: ${staff.OC.name} (offense, ${staff.OC.rating}) and ${staff.DC.name} (defense, ${staff.DC.rating}).` : ''}`,
      rivalryLine(rivalry(st.myTeam)),
    ];
  },
  budgetDepth: (budget, payroll, nil) => `💰 Program budget ${budget}: the staff take ${payroll}, ${nil} left for NIL. Land your class, sort your coordinators, then run it back.`,
  budgetPlain: nil => `💰 NIL budget: ${nil} points. Land your class, raid the portal, then run it back.`,
  signVerb: 'signs with',
  hireTitle: role => role,
  chairName: role => role,
  classNote: '',
  staffTitle: 'Coaching staff',
  staffNote: 'Paid from the same pot as NIL. A coordinator moves his side of the ball by up to 3 points either way.',
  roleName: ROLE_NAME,
  vacantVerb: 'calls',
  portalName: r => r.name,
  portalDetail: r => `${r.pos} · ${r.stars}⭐ · rated ${r.grade} · asks ${r.nilAsk} NIL`,
  seasonLabel: season => `${season}`,
  roundWord: 'Week',
  recordExtra: t => ` (${t.confWins}-${t.confLosses})`,
  standingsTab: 'Conferences',
  depthChart: 'two-deep',
  unitCoach: (role, c) => (c ? `${role} ${c.name}, ${c.rating}` : `${role} chair empty`),
  noStaffYet: 'Coordinators arrive when this season\'s offseason closes.',
  playIntro: depth => (depth
    ? 'Weeks 1-4 are the non-conference gauntlet, 5-11 decide the conference race, and week 12 is rivalry week.'
    : 'Weeks 1-4 are the non-conference gauntlet, 5-12 decide the conference race.'),
  rivalryNow: now => (now ? 'This is rivalry week' : `Week ${CFB_RIVALRY_ROUND} is rivalry week`),
  playButton: (round, final) => (final ? 'Final week + the Playoff' : `Play Week ${round}`),
  playFootnote: 'Five conference champs auto-qualify; twelve teams, straight seeding, byes for the top four.',
  sosPending: 'shows up after week 1',
  slateTag: 'W',
  nonConf: ' (non-conf)',
  upNext: (st, note) => (st.round <= CFB_ROUNDS
    ? (st.round < CFB_RIVALRY_ROUND
      ? `Up next: week ${st.round}, opponent drawn on game day. Week ${CFB_RIVALRY_ROUND}: ${note}.`
      : `Up next: rivalry week against ${note}.`)
    : null),
  scheduleNote: 'Same record at the end? The tougher schedule plus the better team ranks higher, and the Playoff\'s at-large spots come off that ranking.',
  scheduleBeforeDepth: 'This dynasty started before the schedule log existed. It starts with next season, along with coordinators and rivalry week.',
  rankCut: 12,
  rankMark: ' •',
  rankingsNote: () => '• the twelve in the Playoff picture right now',
  standingsCut: 2,
  standingsMark: ' (CCG)',
  standingsNote: depth => `${depth ? 'Ranked by conference win percentage, since rivalry week takes a league game off some teams. ' : ''}Top two in each conference meet in the championship game; the winner books a Playoff spot.`,
};

/* Built on first use rather than at import, so nothing imported is read
   while the modules are still loading, and kept, so the board sees one
   descriptor for the life of the page. */
let sport: CollegeSport<CfbTeam, CfbState, CfbGame, CfbRecruit, Postseason> | null = null;

function cfbSport(): CollegeSport<CfbTeam, CfbState, CfbGame, CfbRecruit, Postseason> {
  return (sport ??= {
    completionId: 'cfb-dynasty',
    saveKey: SAVE_KEY,
    encodeSave: (st, phase, recruits, portal, postseason) => JSON.stringify({ st, phase, recruits, portal, postseason } satisfies SaveShape),
    recapOf: s => (s as SaveShape).postseason,
    recapDrawable: () => true,
    championOf: p => p.champion,

    schools: CFB_SCHOOLS,
    schoolMap: CFB_SCHOOL_MAP,
    confs: CFB_CONFS,
    confLabel: confName,
    rounds: CFB_ROUNDS,
    rivalryRound: CFB_RIVALRY_ROUND,
    rivalOf: cfbRivalOf,
    positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K'],

    init: (id, rng, opts) => initCfb(id, rng, opts),
    ensureIds: (st, recruits, portal) => { ensureCfbIds(st, recruits, portal); },
    playRound: (state, rng, { label }) => {
      const { games, myGame } = simCfbRound(state, rng);
      const lines: string[] = [];
      if (myGame) {
        const won = myGame.winner === state.myTeam;
        const us = myGame.home === state.myTeam ? myGame.hs : myGame.as;
        const them = myGame.home === state.myTeam ? myGame.as : myGame.hs;
        const opp = myGame.home === state.myTeam ? myGame.away : myGame.home;
        lines.push(`${won ? '✅' : '❌'} Week ${state.round}: ${won ? 'beat' : 'lost to'} ${label(opp)} ${us}-${them}${myGame.conference ? ' (conference)' : ''}.`);
        /* Round 728: what rivalry week swung, read off the engine's record. */
        const rv = state.lastRivalry;
        if (myGame.rivalry && rv && rv.season === state.season) {
          lines.push(rv.won
            ? `🔥 Rivalry week is yours. Morale ${signed(rv.morale)} into December, and ${rv.recruit} more budget points when the trail opens.`
            : `🧊 Rivalry week went the wrong way. Morale ${signed(rv.morale)} into December, and ${-rv.recruit} fewer budget points when the trail opens.`);
        }
      }
      return { games, lines };
    },
    closedBeforeRound: () => false,
    /* Round 426 part three: the record carries an entry for this season the
       moment it is played, so a state that already has one is a closed season
       being clicked again (an old save restored on the recap, or a double
       click), and the answer is to do nothing rather than play a 13th week. */
    closedAtFinal: state => state.natties.some(n => n.season === state.season),
    closeSeason: (state, rng) => {
      const post = runCfbPostseason(state, rng);
      const heisman = heismanRace(state, rng);
      /* Round 426: heismanRace can legitimately come back EMPTY, and indexing
         [0] blindly threw inside the final week handler, so the season never
         advanced and the dynasty was bricked for good. */
      const heismanWinner = heisman[0];
      if (heismanWinner) {
        state.heismanWinners = [...(state.heismanWinners ?? []), heismanWinner.name];
      }
      state.natties.push({ season: state.season, team: post.champion });
      return { ccgs: post.ccgs, bracket: post.bracket, champion: post.champion, heisman };
    },
    openOffseason: (st, rng) => cfbOpenOffseason(st, rng),
    recruitClass: rng => cfbRecruitClass(rng),
    portalPool: rng => cfbPortalPool(rng),
    payroll: st => cfbPayroll(st),
    signRecruit: (st, r, cls, rng) => signRecruit(st, r, cls, rng),
    hireCoordinator: (st, id) => cfbHireCoordinator(st, id),
    fireCoordinator: (st, role) => cfbFireCoordinator(st, role),
    offseason: (st, rng) => cfbOffseason(st, rng),
    enableDepth: (st, rng) => cfbEnableDepth(st, rng),
    strength: t => cfbStrength(t),
    units: t => cfbUnits(t),
    rankings: st => cfbRankings(st),
    sosTable: st => cfbSosTable(st),
    standings: (st, conf) => confStandings(st, conf).map(t => ({ id: t.id, record: `${t.confWins}-${t.confLosses}` })),

    RecapBody: PlayoffRecap,
    recapTitles: 'Natties',
    share: (st, isChamp, postseason, label) => ({
      gameName: 'CFB Dynasty',
      gamePath: '/cfb-dynasty',
      score: `${st.myTitles} natties in ${st.seasonsPlayed} seasons`,
      customText: `CFB Dynasty 🏈 ${isChamp ? `${label(st.myTeam)} just won the natty!` : `${label(postseason.champion)} took the title.`} ${st.myTitles} championships in ${st.seasonsPlayed} seasons. douknowball.com/cfb-dynasty`,
    }),
    words: CFB_WORDS,
    skin: {
      focus: ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
      tallRows: ' min-h-11',
      recruitList: 'h-72',
      rowName: 'block font-bold text-foreground [overflow-wrap:anywhere]',
      feedBox: 'live',
      slateList: 'space-y-0.5',
    },
  });
}

export default function CfbDynastyBoard() {
  return <CollegeDynastyBoard sport={cfbSport()} />;
}
