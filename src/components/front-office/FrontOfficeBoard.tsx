import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, ChevronLeft, Crown, RotateCcw, ShieldHalf } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { FO_TEAMS, FO_TEAM_MAP } from '@/data/frontOfficePlayers';
import { DraftNightCard } from '@/components/front-office-shared/DraftNightCard';
import { buildDraftNight } from '@/lib/draftNight';
import type { DraftNight } from '@/lib/draftNight';
import {
  initLeague, simGame, injuryPass, standings, runPlayoffs, runOffseason,
  generateDraftClass, prospectToPlayer, consumeDraftPick, nflAiDraftPicks, teamStrength, capUsed, capRoom,
  releasePlayer, signPlayer, proposeTrade, tradeValue, aiWeeklyMoves, divisionOf,
  defenceRating,
  conferenceOf, conferenceSeeds, executeTalksTrade,
  REGULAR_WEEKS,
  type LeagueState, type GmGame, type Prospect, type PlayoffRound,
  ensureFoLeagueIds, NFL_ROSTER_MIN,
  /* Round 723: the depth chart the sim reads, and the franchise tag. */
  DEPTH_GROUPS, depthChart, swapDepth, starterIds, hasSavedDepth, resetDepth, type DepthPos,
  expiringPlayers, tagRefusal, applyFranchiseTag, franchiseTagSalary,
  /* Round 828: full rosters, the 53 limit and the practice squad. */
  deepRosterRefusal, promoteFromPractice, practicePromotionRefusal, DEEP_ROSTER_MAX, STARTER_SLOTS, tradeProbeCopy, type GmPlayer,
  /* Round 828 follow up: men to cut before Play, the MLB and NHL shape. */
  deepOverLimit,
} from '@/lib/frontOffice';
/* Round 631: a cut costs dead money and the man cannot come back this season. */
import { deadMoneyFor, deadCapUsed, signRefusal, cutRefusal, tradeRefusal } from '@/lib/frontOfficeCuts';
/* Round 531: the cap on screen says which day its figure was read. */
import { capNote } from '@/lib/leagueCaps';
import { leagueNames } from '@/lib/foNames';
import { findTrades, type FinderOffer } from '@/lib/tradeFinder';
/* Round 190: true negotiations, shared engine and shared card. The direct
   propose is a phone call now, not a coin flip. */
import { openTalks, standFirm, type TalksState } from '@/lib/foTradeTalks';
import { TradeTalksCard } from '@/components/front-office-shared/TradeTalksCard';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { recordActivity } from '@/lib/completions';
import { cn } from '@/lib/utils';
import { useRevealScroll } from '@/hooks/useRevealScroll';
// Round 180: the owner upstairs, shared engine and card.
import {
  buildOwnerMandate, strengthRank, mandatePace, gradeSeason, applyMandateResult,
  firedLine, nflPostseason, FO_TRUST_START, type OwnerMandate, type FoSportWords,
} from '@/lib/foOwnerMandate';
import OwnerMandateCard from '@/components/front-office-shared/OwnerMandateCard';
/* Round 187: the verdict curtain. stageVerdict decides the presentation
   facts (confetti only for the champion GM, fired kills it outright) so
   the rule lives in the harnessed engine, not in this JSX. */
import { stageVerdict } from '@/lib/usCareerReveal';
/* Round 192: the GM faces the room. Shared engine and card; answers move
   trust and can tilt next season's mandate one tier. */
import { buildGmPresser, applyGmPressChoice, type GmPresser } from '@/lib/foGmPress';
import { GmPressCard } from '@/components/front-office-shared/GmPressCard';
import { ConfettiBurst, CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';
/* Round 204: the hub is boxes now, the same boxes Club Manager has had
   since Round 74. What each box says lives in the engine, not here. */
import { foHubTiles, type FoPanelKey } from '@/lib/foHub';
import { FoHubTiles, FoPanelHeader } from '@/components/front-office-shared/FoHubTiles';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';
/* Round 1019: the GM desk (staff, the re-sign desk, the pick ledger, packages
   and the deadline), the shape Round 987 gave the NHL. One optional `gm`
   field on the save; absent, the board plays exactly as before. */
import { GmDeskMount } from '@/components/front-office-shared/GmDeskMount';
import { type GmDesk, gmPanelFor, readGmDesk, withGmBlock } from '@/lib/gmDesk';
import { gmStaffLevel } from '@/lib/gmStaff';
import {
  nflApplyTradeDeadMoney, nflDeadlineRefusal, nflDeskAfterWeek, nflDeskEdges, nflDeskOffseason, nflDeskWeekOptions,
  nflMirrorPickMove, nflNoteArrivals, nflPackageCapCheck, nflPicksOf, nflScoutRead, nflSignDraftee, nflStaffOf, nflTradeDeadMoney,
  nflTradeWindow, openNflDesk, syncNflPicks, NFL_DESK_KEYS,
} from '@/lib/nflGmDesk';
/* By its full path, not './': harnesses bundle a copy of this board from a temp folder. */
import { NFL_DESK_PANELS, NFL_RECAP_PANELS, type NflDeskFacts } from '@/components/front-office/NflGmDesk';

/* Round 180: 'fired' is new. Zero trust upstairs ends the save the way a
   Club Manager sacking does. */
type Phase = 'pick' | 'hub' | 'draft' | 'recap' | 'fired';
type Tab = 'team' | 'market' | 'trade' | 'week' | 'standings';

const SAVE_KEY = 'front-office-save-v1';

const NFL_WORDS: FoSportWords = { title: 'the Super Bowl', playoffs: 'the playoffs', round: 'a playoff round', games: 17 };

/* Round 828 follow up: what a full roster over 53 owes, in MLB's words for
   the same lock (its feed line, roster box and play box), so the three boards
   read alike. `when` is "before Week 1" or "before you play". */
const overLimitLine = (carrying: number, over: number, when = 'before Week 1') =>
  `You are carrying ${carrying}, ${over} over the limit of ${DEEP_ROSTER_MAX}. Cut ${over === 1 ? 'one man' : `${over} men`} on the Roster box ${when}.`;

type Postseason = { rounds: PlayoffRound[]; champion: string; gradeLine: string | null };

interface SaveShape {
  league: LeagueState;
  myTeam: string;
  phase: Phase;
  titles: number;
  seasonsPlayed: number;
  draftClass: Prospect[] | null;
  picksLeft: number;
  draftBatchesLeft?: number;
  /* Round 180. Optional so pre-180 saves keep loading; repaired on load. */
  mandate?: OwnerMandate | null;
  trust?: number;
  fired?: boolean;
  /* Round 192. The presser itself is transient (a reload ends the scrum,
     same rule as trade talks), but an ANSWERED tilt and the season's
     headline deal survive, so the next mandate honors what was said. */
  pressTilt?: -1 | 0 | 1;
  seasonTradeLine?: string | null;
  /* Round 431. Present on a save written from the recap screen, so the recap
     can be drawn again after a reload. Absent on older saves. */
  postseason?: Postseason | null;
  /* Round 1019: the GM desk (src/lib/gmDesk.ts). Absent on every save written
     before it, and on those the board plays exactly as it did until the GM
     opens a desk box. Each block inside is validated alone. */
  gm?: unknown;
}

export default function FrontOfficeBoard() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [saveError, setSaveError] = useState(false);
  /* Round 204: the hub is tiles now, so null means the hub itself and a
     tab key means you have opened that box. Club Manager's Round 74 rule,
     brought to the four GM games. */
  const [tab, setTab] = useState<Tab | null>(null);
  const [myTeam, setMyTeam] = useState<string>('');
  const [league, setLeague] = useState<LeagueState | null>(null);
  const [weekResults, setWeekResults] = useState<GmGame[]>([]);
  const [newsFeed, setNewsFeed] = useState<string[]>([]);
  /* Round 530: a done deal or a signing slams in at the top of the feed the
     moment it happens. Matched on the line's text, never its index, so the
     moment anything else is prepended it reads as an ordinary row. Transient
     like the reveal, never persisted. */
  const [feedSlam, setFeedSlam] = useState<{ text: string; n: number } | null>(null);
  const [playoffRounds, setPlayoffRounds] = useState<PlayoffRound[]>([]);
  const [champion, setChampion] = useState<string>('');
  const [draftClass, setDraftClass] = useState<Prospect[] | null>(null);
  /* Round 515: draft night. Transient on the board and never persisted, the
     Round 186 rule for reveals: reload mid reveal and the save opens on the
     same screen it always did. */
  const [draftNight, setDraftNight] = useState<DraftNight | null>(null);
  const [picksLeft, setPicksLeft] = useState(0);
  const [draftBatchesLeft, setDraftBatchesLeft] = useState<number | null>(null);
  const draftAction = useRef(false);
  useEffect(() => { draftAction.current = false; }, [league, draftClass, picksLeft, draftBatchesLeft]);
  // Round 64: the owner's no scroll rule. You press Play Week at the top and
  // the scoreboard renders underneath it, often below the fold on a phone, so
  // the results pull themselves into view.
  const revealRef = useRevealScroll<HTMLDivElement>(
    `${phase}:${league?.week ?? 0}:${weekResults.length}`,
  );
  const [tradePartner, setTradePartner] = useState<string>('');
  // Round 82: trade finder
  const [shopOffers, setShopOffers] = useState<FinderOffer[]>([]);
  const [shopTried, setShopTried] = useState(false);
  const [myTradePiece, setMyTradePiece] = useState<string>('');
  /* Round 631: the man whose Cut button has been tapped once. The second tap
     is only offered once the dead money is on screen. Transient. */
  const [cutArmed, setCutArmed] = useState<string | null>(null);
  /* Round 723: the depth chart inside the Roster box. null is the roster
     list, 'groups' the eight group tiles, a position one group's order.
     depthPick is the man tapped first, waiting for the man to swap with.
     Both transient; the chart itself lives on the save. */
  const [depthView, setDepthView] = useState<'groups' | DepthPos | null>(null);
  const [depthPick, setDepthPick] = useState<string | null>(null);
  /* Round 828: a full roster is fifty men, so the Roster box opens on one tile
     per position group (and one for the practice squad), and the trade lists
     filter by group. Both transient. starting holds the club whose league is
     loading its bench, startError says the load failed. */
  const [rosterGroup, setRosterGroup] = useState<DepthPos | 'practice' | null>(null);
  const [tradeGroup, setTradeGroup] = useState<DepthPos | 'starters'>('starters');
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState(false);
  /* Round 190: the live phone call. Transient like the market window:
     never persisted, a reload simply ends the call. */
  const [talks, setTalks] = useState<{ state: TalksState; partner: string; myPieceId: string; wantId: string } | null>(null);
  const [titles, setTitles] = useState(0);
  const [seasonsPlayed, setSeasonsPlayed] = useState(0);
  const [wonTitleNow, setWonTitleNow] = useState(false);
  /* Round 180: the owner upstairs. */
  const [mandate, setMandate] = useState<OwnerMandate | null>(null);
  const [trust, setTrust] = useState(FO_TRUST_START);
  const [fired, setFired] = useState(false);
  const [gradeLine, setGradeLine] = useState<string | null>(null);
  /* Round 192: the room. Presser transient; tilt and trade line persist. */
  const [presser, setPresser] = useState<GmPresser | null>(null);
  const [pressTilt, setPressTilt] = useState<-1 | 0 | 1>(0);
  const [seasonTradeLine, setSeasonTradeLine] = useState<string | null>(null);
  /* Round 1019: the GM desk. null is a save the desk has never been opened on. */
  const [gm, setGmState] = useState<GmDesk | null>(null);
  /* Every save reads the desk from here, so a handler that has just changed
     it saves the new one without touching any of the board's persist calls. */
  const gmLive = useRef<GmDesk | null>(null);
  const setGm = (d: GmDesk | null) => { gmLive.current = d; setGmState(d); };
  const [gmOpen, setGmOpen] = useState<string | null>(null);

  useGameCompletion('front-office', wonTitleNow, titles * 100 + seasonsPlayed * 5);

  /* Round 180: rank my roster against the league and let ownership set the ask.
     Round 192: the press tilt can move it one tier either way. */
  const mandateFor = (lg: LeagueState, team: string, defendingChamp: boolean, tilt: -1 | 0 | 1 = 0): OwnerMandate => {
    const strengths = Object.fromEntries(Object.entries(lg.teams).map(([a, tm]) => [a, teamStrength(tm)]));
    return buildOwnerMandate(strengthRank(strengths, team), Object.keys(lg.teams).length, defendingChamp, NFL_WORDS, lg.season, tilt);
  };

  // ---- persistence ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isFrontOfficeSave(parsed, 'NFL', REGULAR_WEEKS)) { setSaveError(true); return; }
      const s = parsed as SaveShape;
      if (s.draftBatchesLeft !== undefined && (!Number.isInteger(s.draftBatchesLeft) || s.draftBatchesLeft < 0
        || s.draftBatchesLeft > Math.max(3, s.league.teams[s.myTeam].picks.length)
        || (s.phase === 'draft' && s.draftBatchesLeft === 0))) { setSaveError(true); return; }
      /* Round 568: FIRST, above every setState below, because everything
         past this line reads the league by id and a save written before the
         id fix can hold two men under one. The draft class is passed too: it
         is minted from the same counter, so it shares the id space. */
      ensureFoLeagueIds(s.league, s.draftClass);
      setLeague(s.league);
      setMyTeam(s.myTeam);
      setTitles(s.titles ?? 0);
      setSeasonsPlayed(s.seasonsPlayed ?? 0);
      setDraftClass(s.draftClass ?? null);
      setPicksLeft(s.picksLeft ?? 0);
      setDraftBatchesLeft(Number.isInteger(s.draftBatchesLeft) && (s.draftBatchesLeft ?? -1) >= 0 ? s.draftBatchesLeft! : null);
      /* Round 180, repair-on-load house pattern: a pre-180 save has no owner
         yet, so ownership walks in and sets the ask from the roster as it
         stands today. */
      setMandate(s.mandate ?? mandateFor(s.league, s.myTeam, false));
      setTrust(s.trust ?? FO_TRUST_START);
      setFired(s.fired ?? false);
      setPressTilt(s.pressTilt ?? 0);
      setSeasonTradeLine(s.seasonTradeLine ?? null);
      /* Round 1019: no `gm` on the save means the desk stays off until it is opened. */
      setGm(s.gm === undefined ? null : readGmDesk(s.gm));
      /* Round 431: a reload on the recap screen used to replay the season.
         The save carried phase 'recap' with the league still at the final
         week and no postseason, this effect mapped it back to 'hub', the
         play box offered the final week again, and one click ran it and the
         whole postseason a second time on a season that was already closed:
         seasonsPlayed and titles advanced twice, every team played an 18th
         game, and the mandate was graded twice. The save now carries the
         postseason, so the recap is simply drawn again. A save from before
         this round has nothing to draw, so it opens on the draft, which is
         where the recap's only button leads. */
      if (s.postseason) { setPlayoffRounds(s.postseason.rounds); setChampion(s.postseason.champion); setGradeLine(s.postseason.gradeLine ?? null); }
      if (s.fired) setPhase('fired');
      else if (s.phase !== 'recap') setPhase(s.phase);
      else if (s.postseason) setPhase('recap');
      else openDraft(s.league, s.myTeam, s);
    } catch { setSaveError(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((patch: Partial<SaveShape>, lg: LeagueState | null, team: string) => {
    try {
      if (!lg) return;
      const base: SaveShape = {
        league: lg, myTeam: team, phase, titles, seasonsPlayed, draftClass, picksLeft,
        ...(draftBatchesLeft !== null ? { draftBatchesLeft } : {}),
        mandate, trust, fired, pressTilt, seasonTradeLine,
        postseason: champion ? { rounds: playoffRounds, champion, gradeLine } : null,
        ...(gmLive.current ? { gm: gmLive.current } : {}),
        ...patch,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(base));
    } catch { /* storage full: play on */ }
  }, [phase, titles, seasonsPlayed, draftClass, picksLeft, draftBatchesLeft, mandate, trust, fired, pressTilt, seasonTradeLine, champion, playoffRounds, gradeLine]);

  /* Round 828: a new league carries every club's whole roster and practice
     squad. That data is its own chunk, fetched here on the tap rather than
     with the page, because a saved league already holds its men and never
     needs it again. A failed fetch says so and starts nothing: handing the
     player the old fifteen man league in silence would be a different game
     than the one he picked. */
  const start = async (abbr: string) => {
    if (starting) return;
    setStarting(abbr);
    setStartError(false);
    let depth;
    try {
      ({ FO_DEPTH: depth } = await import('@/data/frontOfficeDepth'));
    } catch {
      setStarting(null);
      setStartError(true);
      return;
    }
    setStarting(null);
    /* Codex853: a new franchise is the player's answer to a save that would not
       open, so the notice goes once one really starts (not when the fetch fails). */
    setSaveError(false);
    /* Round 828 follow up: every other club over 53 cuts itself before Week 1;
       yours is never cut behind your back and owes its cut on the board. */
    const lg = initLeague(Math.random, { depth, userTeam: abbr });
    const m = mandateFor(lg, abbr, false);
    const owed = deepOverLimit(lg.teams[abbr]);
    setLeague(lg);
    setMyTeam(abbr);
    setPhase('hub');
    setTab(null);
    setWeekResults([]);
    setNewsFeed([
      `Welcome to the ${label(abbr)} front office. The ${lg.season} season starts now.`,
      ...(owed > 0 ? [`✂️ ${overLimitLine(lg.teams[abbr].players.length, owed)}`] : []),
      `🏛️ The ownership mandate: ${m.text}`,
    ]);
    setChampion('');
    setPlayoffRounds([]);
    setTitles(0);
    setSeasonsPlayed(0);
    setMandate(m);
    setTrust(FO_TRUST_START);
    setFired(false);
    setGradeLine(null);
    /* Round 192: the introduction presser. First day, full room. */
    setPresser(buildGmPresser(NFL_WORDS, {
      justHired: true, teamLabel: label(abbr), fired: false, wonTitle: false,
      gradeResult: null, tradeLine: null, seasonsPlayed: 0,
    }));
    setPressTilt(0);
    setSeasonTradeLine(null);
    /* Round 1019: a new front office opens with the desk on. Only a save from
       before it waits for the GM to open a desk box. */
    setGm(openNflDesk(lg, abbr)); setGmOpen(null);
    persist({ phase: 'hub', titles: 0, seasonsPlayed: 0, mandate: m, trust: FO_TRUST_START, fired: false, pressTilt: 0, seasonTradeLine: null }, lg, abbr);
  };

  /* Round 192: one answer, three registers. Trust moves now, the tilt
     waits for the next mandate build. */
  const answerPress = (i: 0 | 1 | 2) => {
    if (!presser || !league) return;
    const res = applyGmPressChoice(trust, presser.options[i], Math.random);
    setTrust(res.trust);
    setPressTilt(res.tilt);
    setNewsFeed(f => [res.line, ...f].slice(0, 6));
    setPresser(null);
    persist({ trust: res.trust, pressTilt: res.tilt }, league, myTeam);
  };

  const label = (abbr: string) => {
    const t = FO_TEAM_MAP.get(abbr);
    return t ? `${t.city} ${t.name}` : abbr;
  };
  /* Round 204: the short form, for the hub boxes. */
  const nickname = (abbr: string) => FO_TEAM_MAP.get(abbr)?.name ?? abbr;

  /* Round 530: the feed ticks in a row at a time. Rows are keyed on the
     period stamp plus their index, so a new week remounts them and they
     re-animate, while a re-render for anything else leaves them still. The
     slam row carries its own key, so a deal landing remounts that one row
     and nothing under it moves. The rows land on the kit's stagger from
     0.2s, so the feed reads before the tiles under it settle. */
  const feedRows = (lines: string[], stamp: string) => lines.map((n, i) => {
    const slamKey = feedSlam && i === 0 && feedSlam.text === n ? `slam:${feedSlam.n}` : null;
    return (
      <p
        key={slamKey ?? `${stamp}:${i}`}
        className={slamKey ? 'cm-slam font-semibold text-foreground' : 'cm-tick-in'}
        style={{ animationDelay: slamKey ? '0s' : revealDelay(i, 0.2) }}
      >
        {n}
      </p>
    );
  });
  const slamFeed = (line: string) => {
    setNewsFeed(f => [line, ...f].slice(0, 6));
    setFeedSlam(s => ({ text: line, n: (s?.n ?? 0) + 1 }));
  };

  const my = league?.teams[myTeam];
  /* Round 1019: with the desk on, the grade the draft board shows is your
     scouting director's read (his level sets the miss); the CPU clubs keep
     the engine's own. */
  const scoutLevel = gm && league ? gmStaffLevel(nflStaffOf(gm, league, myTeam).block, 'scouting') : null;
  const gradeOf = (pr: Prospect): number => scoutLevel !== null && league
    ? nflScoutRead(pr, myTeam, league.season, scoutLevel)
    : pr.grade;
  /* A rival's pick on the draft night card, read by your scout. The engine
     hands back the name, so the prospect is found by it in the class. */
  const scoutRival = (cls: Prospect[]) => (r: { team: string; playerName: string; pos: string; grade: number }) => {
    const pr = cls.find(p => p.name === r.playerName);
    return pr ? { ...r, grade: gradeOf(pr) } : r;
  };

  const playWeek = () => {
    if (!league || !my) return;
    /* Round 828 follow up: a full roster over 53 cuts down before it plays,
       through the same two tap Cut as any other release. Nothing is played,
       so nothing is recorded either. */
    if (deepOverLimit(my) > 0) return;
    /* Round 195: a played week counts as playing TODAY, the same per-session mark
       Club Manager has had since Round 157. Unscored on purpose: the
       scored completion stays the title. */
    recordActivity('/front-office');
    /* Round 431: a season's postseason runs once. The record carries an entry
       for this season the moment its playoffs are played, so a league that
       already has one is a closed season being clicked again, and the answer
       is to do nothing rather than play an 18th week. */
    if (league.champions.some(c => c.season === league.season)) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    /* Round 1019: with the desk on, the staff's edge and the trainer ride on
       the week; with it off the week is called exactly as before. */
    const deskWeek = gm ? nflDeskWeekOptions(gm, lg, myTeam) : null;
    const injuries = deskWeek ? injuryPass(lg.teams, Math.random, deskWeek.weeksFor) : injuryPass(lg.teams, Math.random);
    const aiLog = aiWeeklyMoves(lg, myTeam, Math.random);
    const games = lg.schedule[lg.week - 1].map(g => (deskWeek ? simGame(g, lg.teams, Math.random, deskWeek.edges) : simGame(g, lg.teams, Math.random)));
    let nextGm = gm;
    const deskLines: string[] = [];
    if (gm) {
      const tick = nflDeskAfterWeek(gm, lg, myTeam);
      nextGm = tick.desk;
      if (tick.line) deskLines.push(tick.line);
      /* The week the deadline shuts says so in the feed. */
      if (lg.week < REGULAR_WEEKS && nflTradeWindow(lg).open && !nflTradeWindow({ ...lg, week: lg.week + 1 }).open) {
        deskLines.push('🔒 The trade deadline has passed. Deals open again once the season is over.');
      }
    }
    if (nextGm !== gm) setGm(nextGm);
    const feed: string[] = [...deskLines];
    for (const inj of injuries.filter(i => i.team === myTeam)) {
      feed.push(`🚑 ${inj.player} is out ${inj.weeks} week${inj.weeks === 1 ? '' : 's'}.`);
    }
    feed.push(...aiLog.slice(0, 2).map(l => `📰 ${l}`));
    setWeekResults(games);
    setNewsFeed(feed);
    setFeedSlam(null);

    if (lg.week >= REGULAR_WEEKS) {
      const { rounds, champion: champ } = runPlayoffs(lg.teams, Math.random, nextGm ? nflDeskEdges(nextGm, lg, myTeam) : undefined);
      lg.champions.push({ season: lg.season, team: champ });
      setPlayoffRounds(rounds);
      setChampion(champ);
      const won = champ === myTeam;
      setWonTitleNow(won);
      const newTitles = titles + (won ? 1 : 0);
      const newSeasons = seasonsPlayed + 1;
      setTitles(newTitles);
      setSeasonsPlayed(newSeasons);
      /* Round 180: ownership grades the season against the mandate. */
      let newTrust = trust, nowFired = fired;
      let gradeResult: ReturnType<typeof gradeSeason>['result'] | null = null;
      let gradeVerdict: string | null = null;
      if (mandate) {
        const post = nflPostseason(rounds, myTeam);
        const grade = gradeSeason(mandate, { wins: lg.teams[myTeam].wins, ...post, wonTitle: won });
        const applied = applyMandateResult(trust, grade);
        newTrust = applied.trust;
        nowFired = applied.fired;
        gradeResult = grade.result;
        setTrust(applied.trust);
        setFired(applied.fired);
        setGradeLine(grade.verdict);
        gradeVerdict = grade.verdict;
      }
      /* Round 192: the room reacts to the season that actually happened.
         A fired GM gets no presser (the door shuts with one shake), and a
         quiet, mandate-met, no-news summer gets provably nothing. */
      setPresser(buildGmPresser(NFL_WORDS, {
        justHired: false, teamLabel: label(myTeam), fired: nowFired, wonTitle: won,
        gradeResult, tradeLine: seasonTradeLine, seasonsPlayed: newSeasons,
      }));
      setPhase('recap');
      setLeague(lg);
      persist({ phase: nowFired ? 'fired' : 'recap', titles: newTitles, seasonsPlayed: newSeasons, trust: newTrust, fired: nowFired, postseason: { rounds, champion: champ, gradeLine: gradeVerdict } }, lg, myTeam);
      return;
    }
    lg.week += 1;
    setLeague(lg);
    persist({}, lg, myTeam);
  };

  /* Round 431: the step after the recap, a draft class for the season just
     closed. Shared by the recap's button and by the restore of an older save
     written on the recap screen, which has no postseason to draw. That restore
     passes the save's own fields as the patch, because persist's closure still
     holds the first render's defaults while the load effect runs. */
  const openDraft = (lg: LeagueState, team: string, patch: Partial<SaveShape> = {}) => {
    const count = lg.teams[team].picks.length;
    const batches = Math.max(3, count);
    const rivalCapital = Object.values(lg.teams).filter(t => t.abbr !== team).reduce((sum, t) => sum + t.picks.length, 0);
    const cls = /* Round 211: the class is drawn against every name already in the
       league, so a prospect cannot arrive sharing a name with a man on a
       roster or in the market. */
    generateDraftClass(Math.random, Math.max(40, count + Math.min(rivalCapital, batches * 6)), leagueNames(lg));
    setDraftClass(cls);
    setPicksLeft(count);
    setDraftBatchesLeft(batches);
    /* Round 515: a new draft opens with an empty card, so last season's
       picks cannot be sitting there when this one starts. */
    setDraftNight(null);
    setPhase('draft');
    persist({ ...patch, phase: 'draft', draftClass: cls, picksLeft: count, draftBatchesLeft: batches }, lg, team);
  };

  const startDraft = () => {
    if (!league) return;
    openDraft(league, myTeam);
  };

  const draftProspect = (id: string) => {
    if (!league || !draftClass || picksLeft <= 0 || draftAction.current) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    const pr = draftClass.find(p => p.id === id);
    if (!pr) return;
    const mine = lg.teams[myTeam];
    if (draftBatchesLeft === null && mine.picks.length > picksLeft) mine.picks = mine.picks.slice(-picksLeft);
    /* Round 1019: the round this pick is in, for the re-sign desk (a first
       rounder's deal carries the fifth year option). */
    const pickRound = mine.picks[0];
    if (!consumeDraftPick(mine)) return;
    draftAction.current = true;
    let note: string;
    let deskNow: GmDesk | null = null;
    /* Round 519: the position he was actually SIGNED at, captured where pl is
       still in scope. prospectToPlayer rewrites the legacy 'DEF' placeholder
       into a real DL, LB or DB, and both the news line below and the rival
       reveal rows show that converted value. The reveal's own row was passing
       the raw prospect value, which put two positions for the same man on one
       screen on any save written before Round 418. */
    let minePos: string = pr.pos;
    {
      /* Round 418: a defensive pick is a man now, not two points on a unit
         number nobody could see. prospectToPlayer refuses nobody. */
      const pl = prospectToPlayer(pr, Math.random);
      minePos = pl ? pl.pos : pr.pos;
      /* Round 1019: with the desk on he signs the rules' four year rookie
         deal, and the re-sign desk learns he is a draft pick and his round. */
      if (pl && gm) nflSignDraftee(pl);
      if (pl) lg.teams[myTeam].players.push(pl);
      if (pl && gm) deskNow = nflNoteArrivals(gm, lg, myTeam, [pl.id], 'draft', pickRound);
      note = `📥 Drafted ${pr.name} (${pl ? pl.pos : pr.pos}), true rating ${pr.trueOvr} vs scouted ${gradeOf(pr)}.`;
    }
    if (deskNow) setGm(deskNow);
    let nextClass = draftClass.filter(p => p.id !== id);
    const nextPicks = picksLeft - 1;
    const beforeBatches = draftBatchesLeft ?? Math.min(3, picksLeft);
    const batches = nextPicks <= 0 ? beforeBatches : Math.min(1, beforeBatches);
    /* Round 515: the rival picks were applied and thrown away, so six real
       decisions the engine made happened where nobody could see them. They are
       captured here for the reveal and are the SAME objects the engine used. */
    const rivalPicks: { team: string; playerName: string; pos: string; grade: number }[] = [];
    for (let i = 0; i < batches; i++) {
      const resolved = nflAiDraftPicks(lg, nextClass, myTeam, Math.random);
      nextClass = resolved.remaining;
      rivalPicks.push(...resolved.picks);
    }
    /* Round 1019: with the desk on, the card shows your scout's read of their picks too. */
    if (gm) rivalPicks.splice(0, rivalPicks.length, ...rivalPicks.map(scoutRival(draftClass)));
    setDraftClass(nextClass);
    setPicksLeft(nextPicks);
    setDraftBatchesLeft(beforeBatches - batches);
    /* Round 530: every pick builds its reveal, the last one included. Round
       519 had named the final pick as not narrated: it left for the hub in
       this same handler, so its card never reached a render. The screen now
       stays on the draft after the last pick (no setPhase below) and leaves
       when the player presses Continue under the card. The offseason still
       runs right here, in the same order, drawing the same randomness. */
    setDraftNight(buildDraftNight(
      { team: myTeam, playerName: pr.name, pos: minePos, grade: gradeOf(pr) },
      rivalPicks,
    ));
    setNewsFeed(f => [note, ...f].slice(0, 6));
    if (nextPicks <= 0) {
      finishDraft(lg, note, deskNow ?? gm);
      return;
    }
    setLeague(lg);
    persist({ draftClass: nextClass, picksLeft: nextPicks, draftBatchesLeft: beforeBatches - batches }, lg, myTeam);
  };

  const finishDraft = (lg: LeagueState, note: string, deskNow: GmDesk | null = gm) => {
      /* Round 723: the GM's own tag was decided on this screen; the CPU
         clubs tag inside the offseason, skipping this club.
         Round 1019: with the desk on, the summer runs through the re-sign
         desk: nobody of yours leaves on the engine's coin flip, and a man you
         tagged is held by the tag exactly as before. */
      const summer = deskNow ? nflDeskOffseason(lg, deskNow, myTeam, Math.random) : null;
      if (summer && (!summer.ok || !summer.news)) { setNewsFeed(f => [...summer.lines, ...f].slice(0, 6)); return; }
      if (summer) setGm(summer.desk);
      const deskSummerLines = summer?.lines ?? [];
      const news = summer?.news ?? runOffseason(lg, Math.random, myTeam);
      const myTagged = lg.teams[myTeam].players.find(p => p.tagSeason === lg.season);
      /* Round 180: ownership re-reads the roster after the offseason churn
         and sets next season's ask. A defending champ is never asked for
         less than a deep run. Round 192: what you said at the podium tilts
         the ask one tier, then the tilt is spent. */
      const m = mandateFor(lg, myTeam, champion === myTeam, pressTilt);
      setMandate(m);
      /* Round 828 follow up: the offseason never cuts your club. If the picks
         took it past 53 the feed says so first, and Play waits for the cut. */
      const owed = deepOverLimit(lg.teams[myTeam]);
      const feed = [
        ...(owed > 0 ? [`✂️ ${overLimitLine(lg.teams[myTeam].players.length, owed)}`] : []),
        note,
        ...deskSummerLines,
        `🏛️ The new mandate: ${m.text}`,
        ...(pressTilt === 1 ? ['🎙️ Your season-end answer raised the bar upstairs.']
          : pressTilt === -1 ? ['🎙️ Your ask for patience was heard. The bar sits softer.'] : []),
        ...news.retired.filter(r => r.team === myTeam).map(r => `👋 ${r.player} retires.`),
        ...news.expired.filter(r => r.team === myTeam).map(r => `🚪 ${r.player} walks in free agency.`),
        ...(myTagged ? [`🏷️ ${myTagged.name} plays the season on the tag, $${myTagged.salary}M guaranteed.`] : []),
        ...(news.tagged.length > 0 ? [`🏷️ ${news.tagged.length} rival club${news.tagged.length === 1 ? '' : 's'} used the franchise tag.`] : []),
        ...news.developed.filter(r => r.team === myTeam).map(r => `📈 ${r.player} develops ${r.from} to ${r.to}.`),
        /* Round 828: a full roster refills off its own practice squad. The cut
           to 53 is the computer clubs' alone, so it never names yours. */
        ...(() => {
          const up = (news.promoted ?? []).filter(r => r.team === myTeam).map(r => `${r.player} (${r.pos})`);
          return up.length ? [`⬆️ Called up from the practice squad: ${up.join(', ')}.`] : [];
        })(),
      ];
      setNewsFeed(feed.slice(0, 8));
      setFeedSlam(null);
      setWeekResults([]);
      setPlayoffRounds([]);
      setChampion('');
      setWonTitleNow(false);
      setPressTilt(0);
      setSeasonTradeLine(null);
      /* Round 530: the phase stays 'draft' so the last pick's card is seen;
         leaveDraft moves it on. The save says 'hub' as it always did, so a
         reload skips the reveal and opens where it opened before. */
      setTab(null);
      setLeague(lg);
      setPicksLeft(0);
      setDraftBatchesLeft(0);
      persist({ phase: 'hub', draftClass: null, picksLeft: 0, draftBatchesLeft: 0, mandate: m, pressTilt: 0, seasonTradeLine: null, postseason: null }, lg, myTeam);
  };

  const draftWithoutPicks = () => {
    if (!league || !draftClass || (picksLeft > 0 && league.teams[myTeam].picks.length > 0) || draftBatchesLeft === 0 || draftAction.current) return;
    draftAction.current = true;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    if (draftBatchesLeft === null && picksLeft === 0) lg.teams[myTeam].picks = [];
    let remaining = draftClass;
    const rivalPicks: { team: string; playerName: string; pos: string; grade: number }[] = [];
    const batches = draftBatchesLeft ?? Math.min(3, picksLeft);
    for (let i = 0; i < batches; i++) {
      const resolved = nflAiDraftPicks(lg, remaining, myTeam, Math.random);
      remaining = resolved.remaining;
      rivalPicks.push(...resolved.picks);
    }
    if (gm) rivalPicks.splice(0, rivalPicks.length, ...rivalPicks.map(scoutRival(draftClass)));
    setDraftClass(remaining);
    setDraftNight(buildDraftNight(null, rivalPicks));
    finishDraft(lg, `📥 You had no picks left. The remaining league draft added ${rivalPicks.length} rival prospects.`);
  };

  const replaceDraftBoard = () => {
    if (!league || !draftClass || draftClass.length > 0 || picksLeft <= 0) return;
    const batches = draftBatchesLeft ?? Math.min(3, picksLeft);
    const cls = generateDraftClass(Math.random, Math.max(40, Math.min(picksLeft, league.teams[myTeam].picks.length) + batches * 6), leagueNames(league));
    setDraftClass(cls);
    persist({ draftClass: cls }, league, myTeam);
  };

  /* Round 530: the Continue button under the final pick's card. Nothing to
     persist: the last pick already wrote the hub. */
  const leaveDraft = () => {
    setPhase('hub');
    setTab(null);
  };

  const doRelease = (pid: string) => {
    if (!league) return;
    setCutArmed(null);
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    if (releasePlayer(lg.teams[myTeam], lg.freeAgents, pid)) {
      setLeague(lg);
      persist({}, lg, myTeam);
    }
  };

  /* Round 723: the franchise tag, decided on the draft screen before the
     last pick runs the offseason. The engine refuses a second tag, a man
     with years left and a tender the room cannot cover; the button is greyed
     for the same reasons. */
  const doTag = (pid: string) => {
    if (!league) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    const res = applyFranchiseTag(lg, lg.teams[myTeam], pid);
    if (!res.ok) return;
    const man = lg.teams[myTeam].players.find(p => p.id === pid);
    if (man) {
      setNewsFeed(f => [`🏷️ ${man.name} is tagged: $${res.salary}M for one year, fully guaranteed${res.count > 1 ? ', his second tag in a row' : ''}.`, ...f].slice(0, 6));
    }
    setLeague(lg);
    persist({}, lg, myTeam);
  };

  /* Round 723: tap to swap. The first tap picks a man, the second swaps the
     two in that group's order and writes the chart to the save. */
  const tapDepth = (pos: DepthPos, pid: string) => {
    if (!league) return;
    if (!depthPick) { setDepthPick(pid); return; }
    if (depthPick === pid) { setDepthPick(null); return; }
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    if (swapDepth(lg.teams[myTeam], pos, depthPick, pid)) {
      setLeague(lg);
      persist({}, lg, myTeam);
    }
    setDepthPick(null);
  };

  /* Round 723: hand a group back to the sim, ordered by rating again. */
  const sortDepth = (pos: DepthPos) => {
    if (!league) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    resetDepth(lg.teams[myTeam], pos);
    setDepthPick(null);
    setLeague(lg);
    persist({}, lg, myTeam);
  };

  const doSign = (pid: string) => {
    if (!league) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    if (signPlayer(lg.teams[myTeam], lg.freeAgents, pid, lg.cap)) {
      /* Round 530: the signing lands in the feed as a slam. The man and the
         number are read off the roster he just joined, so the line can only
         say what the engine did. */
      const signed = lg.teams[myTeam].players.find(p => p.id === pid);
      if (signed) slamFeed(`✍️ ${signed.name} (${signed.pos}) signs, $${signed.salary}M a year.`);
      const deskNow = gm ? nflNoteArrivals(gm, lg, myTeam, [pid], 'signing') : null;
      if (deskNow) setGm(deskNow);
      setLeague(lg);
      persist({}, lg, myTeam);
    }
  };

  /* Round 190: the direct deal is a phone call now. The instant verdict
     that lived here (accepted or "they hang up", nothing between) is
     exactly the three-button haggle the owner banned from Club Manager,
     so the same negotiation engine answers instead. */
  const talksArgsFor = (partner: string, myPieceId: string, wantId: string) => {
    if (!league) return null;
    const my = league.teams[myTeam];
    const their = league.teams[partner];
    const mine = my.players.find(p => p.id === myPieceId);
    const want = their.players.find(p => p.id === wantId);
    if (!mine || !want) return null;
    return {
      mine, want, theirRoster: their.players,
      myPickCount: my.picks.length, pickValue: 14, value: tradeValue,
      theirCoverAtMyPos: their.players.filter(p => p.pos === mine.pos && p.ovr >= mine.ovr - 2).length,
      openPremium: 1.08,
    };
  };
  /* Round 1019: with the desk on, every trade path asks the deadline first. */
  const deadlineBlock = (): boolean => {
    const why = gm && league ? nflDeadlineRefusal(league) : null;
    if (why) setNewsFeed(f => [`🔒 ${why}`, ...f].slice(0, 6));
    return !!why;
  };
  /* Round 1019: with the desk on, a man traded away leaves dead money, so an
     older trade path is checked against the cap the way a package is (the
     dead money counted) before the engine runs it. With the desk off nothing
     is added and the engine's own check stands alone, as before. */
  const deskCapRefusal = (lg: LeagueState, partner: string, sentId: string, arrivedId: string): string | null =>
    gm ? nflPackageCapCheck(lg, { from: myTeam, to: partner, give: [{ kind: 'player', id: sentId }], get: [{ kind: 'player', id: arrivedId }] }) : null;
  const deskCapBlock = (lg: LeagueState, partner: string, sentId: string, arrivedId: string): boolean => {
    const why = deskCapRefusal(lg, partner, sentId, arrivedId);
    if (why) setNewsFeed(f => [`❌ ${why}${why.includes('over the cap') ? ' The dead money he leaves counts.' : ''}`, ...f].slice(0, 6));
    return !!why;
  };
  /* Round 1019: an older trade path with the desk on. The pick it moved (the
     last on the list) moves in the ledger too, each man leaves his dead money
     on the club he left (the NFL's rule, gmContractRules), and the man who
     came in is written down as a trade. Returns the desk and the line for
     the feed about your own dead money, or null with the desk off. */
  const deskAfterTrade = (lg: LeagueState, partner: string, sentId: string, arrivedId: string, pickRound: number | null): { desk: GmDesk; line: string | null } | null => {
    if (!gm) return null;
    let d = gm;
    if (pickRound !== null) {
      const ledger = nflMirrorPickMove(nflPicksOf(d, lg), myTeam, partner, pickRound, lg.season);
      d = withGmBlock(d, NFL_DESK_KEYS.picks, ledger);
      syncNflPicks(lg, ledger);
    }
    const dead = nflApplyTradeDeadMoney(lg, [{ club: myTeam, playerId: sentId }, { club: partner, playerId: arrivedId }]);
    const mine = dead.filter(x => x.club === myTeam).reduce((s, x) => s + x.amount, 0);
    return {
      desk: nflNoteArrivals(d, lg, myTeam, [arrivedId], 'trade'),
      line: mine > 0 ? `💸 $${Math.round(mine * 10) / 10}M stays on your cap this season as dead money.` : null,
    };
  };
  const lastPickRound = (lg: LeagueState, moving: boolean): number | null => {
    const list = lg.teams[myTeam].picks;
    return moving && list.length ? list[list.length - 1] : null;
  };
  const openTradeTalks = (theirPid: string) => {
    if (!tradePartner || !myTradePiece || deadlineBlock()) return;
    const args = talksArgsFor(tradePartner, myTradePiece, theirPid);
    if (!args) return;
    setTalks({ state: openTalks(args), partner: tradePartner, myPieceId: myTradePiece, wantId: theirPid });
  };
  const standFirmTalks = () => {
    if (!talks) return;
    const args = talksArgsFor(talks.partner, talks.myPieceId, talks.wantId);
    if (!args) return;
    setTalks({ ...talks, state: standFirm(talks.state, args, Math.random) });
  };
  const acceptTalks = () => {
    if (!league || !talks || !talks.state.pkg) return;
    if (deadlineBlock()) { setTalks(null); return; }
    const pkg = talks.state.pkg;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    const pickRound = lastPickRound(lg, pkg.addPick);
    if (deskCapBlock(lg, talks.partner, talks.myPieceId, pkg.theirPlayerId)) { setTalks(null); return; }
    const res = executeTalksTrade(lg.teams[myTeam], lg.teams[talks.partner], talks.myPieceId, pkg.theirPlayerId, pkg.addPick, lg.cap);
    if (res === 'done') {
      const deskNow = deskAfterTrade(lg, talks.partner, talks.myPieceId, pkg.theirPlayerId, pickRound);
      if (deskNow?.line) setNewsFeed(f => [deskNow.line!, ...f].slice(0, 6));
      slamFeed(`🤝 Deal done with ${label(talks.partner)}: ${pkg.theirPlayerName} arrives${pkg.addPick ? ', and a pick goes the other way' : ''}.`);
      setMyTradePiece(''); setShopOffers([]); setShopTried(false);
      /* Round 192: the room remembers the season's headline deal. */
      const line = `the deal that brought ${pkg.theirPlayerName} in`;
      setSeasonTradeLine(line);
      if (deskNow) setGm(deskNow.desk);
      setLeague(lg);
      persist({ seasonTradeLine: line }, lg, myTeam);
    } else {
      setNewsFeed(f => ['❌ The agreed deal no longer fits (cap or roster rules).', ...f].slice(0, 6));
    }
    setTalks(null);
  };

  // Round 82: shop a player league-wide with the real trade rules
  const doShop = () => {
    if (!league || !myTradePiece || deadlineBlock()) return;
    /* Round 828: the cheap probe copy, so fifty men a club does not freeze the button */
    const offers = findTrades(league.teams, myTeam, myTradePiece, league.cap, proposeTrade, tradeValue, { cloneTeam: tradeProbeCopy })
      .filter(o => !deskCapRefusal(league, o.teamId, myTradePiece, o.playerId));
    setShopOffers(offers); setShopTried(true);
  };
  const acceptShopOffer = (o: FinderOffer) => {
    if (!league || !myTradePiece || deadlineBlock()) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    const pickRound = lastPickRound(lg, o.sweeten);
    if (deskCapBlock(lg, o.teamId, myTradePiece, o.playerId)) { setShopOffers([]); setShopTried(false); return; }
    const res = proposeTrade(lg.teams[myTeam], lg.teams[o.teamId], myTradePiece, o.playerId, o.sweeten, lg.cap);
    if (res === 'accepted') {
      const deskNow = deskAfterTrade(lg, o.teamId, myTradePiece, o.playerId, pickRound);
      if (deskNow?.line) setNewsFeed(f => [deskNow.line!, ...f].slice(0, 6));
      slamFeed(`🤝 Trade finder deal done with ${label(o.teamId)}: ${o.playerName} arrives.`);
      setMyTradePiece(''); setShopOffers([]); setShopTried(false);
      /* Round 192: the room remembers the season's headline deal. */
      const line = `the deal that brought ${o.playerName} in`;
      setSeasonTradeLine(line);
      if (deskNow) setGm(deskNow.desk);
      setLeague(lg);
      persist({ seasonTradeLine: line }, lg, myTeam);
    } else {
      setNewsFeed(f => ['❌ That offer went stale, shop him again.', ...f].slice(0, 6));
      setShopOffers([]); setShopTried(false);
    }
  };

  const reset = () => {
    localStorage.removeItem(SAVE_KEY);
    setPhase('pick');
    setLeague(null);
    setMyTeam('');
    setMandate(null);
    setTrust(FO_TRUST_START);
    setFired(false);
    setGradeLine(null);
    setPresser(null);
    setPressTilt(0);
    setSeasonTradeLine(null);
    setGm(null); setGmOpen(null);
  };

  /* Round 1019: the desk boxes. The first tap on one, on a save from before
     the desk, switches it on: the ledgers are opened from the league as it
     stands (every pick on the old lists kept) and saved with it. */
  const openDesk = (key: string | null) => {
    if (key !== null && !gm && league) {
      const desk = openNflDesk(league, myTeam);
      const lg: LeagueState = JSON.parse(JSON.stringify(league));
      syncNflPicks(lg, nflPicksOf(desk, lg));
      setGm(desk); setLeague(lg);
      persist({}, lg, myTeam);
    }
    setGmOpen(key);
  };
  const changeDesk = (next: GmDesk) => {
    setGm(next);
    persist({}, league, myTeam);
  };
  const deskFacts = (hub: NflDeskFacts['hub']): NflDeskFacts | null => league ? {
    teamId: myTeam, teamLabel: label(myTeam), seasonsPlayed, phase, hub, league,
    seasonOver: phase === 'recap', deskOn: gm !== null, clubName: label,
    say: line => setNewsFeed(f => [line, ...f].slice(0, 6)),
    commit: (lg, desk, line) => {
      setGm(desk); setLeague(lg); slamFeed(line);
      persist({}, lg, myTeam);
    },
  } : null;

  /* ------------------------------ pick screen ------------------------------ */
  if (phase === 'pick' || !league || !my) {
    return (
      <div className="space-y-4">
        {saveError && (
          <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-4 text-sm">
            <p>We couldn&apos;t open this save. Pick a team to start a new franchise. Your old save stays here until you pick a team or delete it.</p>
            <button onClick={() => { localStorage.removeItem(SAVE_KEY); setSaveError(false); }} className="mt-3 rounded-lg border border-border px-3 py-2 font-semibold hover:border-primary">Delete unusable save</button>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Take over a front office</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Real 2026 roster snapshot, with original simulation ratings using
            2023 to 2025 performance, playing time and draft priors. Limited
            evidence is marked. The whole club too: men on the 53 and the practice squad
            (kickers, punters and long snappers sit this one out). Manage the cap, sign free
            agents, swing trades, survive the injury report, draft the future, and chase a dynasty
            across as many seasons as you can. Saves automatically.
          </p>
          {startError && (
            <p data-start-error className="mt-2 text-xs text-destructive">
              The rosters did not load. Check your connection and tap your team again.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {FO_TEAMS.map(t => (
            <button
              key={t.abbr}
              onClick={() => start(t.abbr)}
              disabled={!!starting}
              className="rounded-lg border border-border bg-card px-2 py-2 text-left transition-all hover:scale-[1.02] hover:border-primary/60 disabled:opacity-60"
            >
              <span className="block h-1.5 w-full rounded-full" style={{ background: t.color }} />
              <span className="mt-1.5 block truncate text-xs font-bold text-foreground">{t.city} {t.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{starting === t.abbr ? 'Loading the roster...' : t.division}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const room = capRoom(my, league.cap);
  const strength = Math.round(teamStrength(my));

  const myGameThisWeek = league.week <= REGULAR_WEEKS
    ? league.schedule[league.week - 1].find(g => g.home === myTeam || g.away === myTeam)
    : undefined;
  /* Round 204: the facts each box carries. Flattened here, decided in
     src/lib/foHub.ts so the wording is harnessed rather than eyeballed.
     The conference table is the one the playoffs are drawn from, and the
     NFL sends seven of each. Round 1019: built here, above the recap,
     because the recap mounts the re-sign desk too. */
  const conf = conferenceOf(myTeam);
  const confTable = standings(league.teams).filter(x => conferenceOf(x.abbr) === conf);
  const myLast = weekResults.find(g => g.home === myTeam || g.away === myTeam);
  /* Round 828: on a full roster the men on the chart's starting lines, hurt or
     not, are the ones the boxes talk about; the bench is counted, not quoted. */
  const deep = my.rosterDepth === 2;
  const chartNow = depthChart(my);
  const chartStarters = deep ? DEPTH_GROUPS.flatMap(g => chartNow[g].slice(0, STARTER_SLOTS[g])) : null;
  const hubFacts: NflDeskFacts['hub'] = {
    roster: my.players.map(p => ({ name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
    starters: chartStarters?.map(p => ({ name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
    rosterMax: deep ? DEEP_ROSTER_MAX : undefined,
    freeAgents: league.freeAgents.map(p => ({ id: p.id, name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
    capRoom: room,
    /* Round 631: the box offers only men the sign path would take. The NFL has no roster ceiling. */
    ledger: my,
    wins: my.wins,
    losses: my.losses,
    period: league.week,
    periods: REGULAR_WEEKS,
    playWord: 'This week',
    periodWord: 'week',
    hasFixtures: true,
    /* The nickname alone, because "at Tennessee Titans" does not fit a box
       two columns wide on a phone and "at Titans" is what people say. */
    nextOpponent: myGameThisWeek
      ? { label: nickname(myGameThisWeek.home === myTeam ? myGameThisWeek.away : myGameThisWeek.home), home: myGameThisWeek.home === myTeam }
      : null,
    lastResult: myLast
      ? {
        won: myLast.winner === myTeam,
        us: myLast.home === myTeam ? myLast.homeScore : myLast.awayScore,
        them: myLast.home === myTeam ? myLast.awayScore : myLast.homeScore,
        opponent: label(myLast.home === myTeam ? myLast.away : myLast.home),
      }
      : null,
    place: confTable.findIndex(x => x.abbr === myTeam) + 1,
    cut: 7,
    tableName: conf,
    tradeLine: seasonTradeLine,
    titles,
  };

  /* ---------------- Round 180: the reload path after a firing ---------------- */
  if (phase === 'fired') {
    return (
      <div className="space-y-4">
        {/* Round 187: the door shuts with one honest shake, nothing more. */}
        <div className="cm-loss-shake rounded-2xl border border-destructive/50 bg-card p-5 text-center">
          <CelebrationStyles />
          <p className="text-3xl">🪑</p>
          <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.1s' }}>Fired by {label(myTeam)}</p>
          <p className="cm-rise mt-2 text-sm text-muted-foreground" style={{ animationDelay: '0.35s' }}>{firedLine(seasonsPlayed, titles)}</p>
          <button onClick={reset} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
            <RotateCcw className="h-4 w-4" /> Take another front office
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ recap screen ------------------------------ */
  if (phase === 'recap') {
    const table = standings(league.teams);
    const myRank = table.findIndex(t => t.abbr === myTeam) + 1;
    /* Round 187: the verdict curtain. Every string below is exactly what
       Round 180 wrote; stageVerdict only decides confetti and tone, and
       the harness pins that a good grade is not a parade. */
    const staging = stageVerdict({ iAmChampion: champion === myTeam, fired });
    /* Round 1019: the season is over and the summer runs after the draft, so
       the re-sign desk is a box here, under the verdict. Open, it takes the
       screen, with a back button to the recap. */
    const recapDesk = gm && !fired ? deskFacts(hubFacts) : null;
    if (gm && recapDesk && gmPanelFor(NFL_RECAP_PANELS, gmOpen)) {
      return (
        <div className="space-y-4">
          <GmDeskMount sport="nfl" desk={gm} facts={recapDesk} panels={NFL_RECAP_PANELS} open={gmOpen} onOpen={openDesk} onDesk={changeDesk} />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div
          data-verdict-reveal
          className={cn(
            'relative overflow-hidden rounded-2xl border bg-card p-5 text-center',
            staging.cardTone === 'fired' ? 'border-destructive/50' : 'border-gold/50',
            staging.cardTone === 'title' && 'cm-win-pulse',
          )}
        >
          <CelebrationStyles />
          {staging.confetti && <ConfettiBurst seed={13} count={34} />}
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.05s' }}>
            {label(champion)} win the {league.season} title
          </p>
          <p className="cm-rise mt-1 text-sm text-muted-foreground" style={{ animationDelay: '0.3s' }}>
            {champion === myTeam
              ? 'Your build. Your rings. The city is painted in your colors.'
              : `Your ${label(myTeam)} finished ${my.wins}-${my.losses}, No. ${myRank} overall.`}
          </p>
          {/* Round 180: ownership's verdict on the mandate. */}
          {gradeLine && (
            <p className={cn('cm-slam mt-2 text-sm font-bold', fired ? 'text-destructive' : 'text-gold')} style={{ animationDelay: '0.5s' }}>{gradeLine}</p>
          )}
          {mandate && !fired && (
            <p className="cm-rise mt-1 text-[11px] text-muted-foreground" style={{ animationDelay: '0.7s' }}>Trust upstairs: {trust} of 100{trust <= 25 ? '. The seat is hot.' : '.'}</p>
          )}
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {playoffRounds.map((r, i) => (
              <p key={i} className="cm-tick-in" style={{ animationDelay: revealDelay(i, 0.8, 0.15) }}>
                <b className="text-foreground">{r.name}:</b>{' '}
                {r.games.map(g => `${label(g.winner)} beat ${label(g.winner === g.home ? g.away : g.home)} ${Math.max(g.homeScore, g.awayScore)}-${Math.min(g.homeScore, g.awayScore)}`).join(' · ')}
              </p>
            ))}
          </div>
          <div className="cm-rise mt-3 flex items-center justify-center gap-3 text-sm" style={{ animationDelay: '1.2s' }}>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Titles <b className="text-gold">{titles}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Seasons <b className="text-primary">{seasonsPlayed}</b></span>
          </div>
          {/* Round 180: zero trust ends the save here instead of a draft. */}
          {fired ? (
            <div className="cm-loss-shake mt-4 rounded-2xl border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm font-bold text-destructive">🪑 {firedLine(seasonsPlayed, titles)}</p>
              <button onClick={reset} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                <RotateCcw className="h-4 w-4" /> Take another front office
              </button>
            </div>
          ) : presser ? (
            /* Round 192: the room stands between the season and the draft.
               Answer it (or reload, which ends the scrum) to move on. */
            <div className="cm-rise mt-4 text-left" style={{ animationDelay: '1.35s' }}>
              {/* Round 530: the wrapper lands first and the card's own rise runs
                  from the same mark, so the box and its content arrive together. */}
              <GmPressCard presser={presser} onAnswer={answerPress} delay={1.35} />
            </div>
          ) : (
            <div className="cm-rise mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: '1.35s' }}>
              <button onClick={startDraft} className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                <Briefcase className="h-4 w-4" /> Go to the draft
              </button>
              <ShareButtons
                gameName="NFL Front Office"
                gamePath="/front-office"
                score={`${titles} titles in ${seasonsPlayed} seasons`}
                customText={`NFL Front Office 🏈 ${champion === myTeam ? `My ${label(myTeam)} just won it all!` : `${label(champion)} took the title.`} ${titles} rings in ${seasonsPlayed} seasons as a GM. douknowball.com/front-office`}
              />
            </div>
          )}
        </div>
        {gm && recapDesk && (
          <GmDeskMount sport="nfl" desk={gm} facts={recapDesk} panels={NFL_RECAP_PANELS} open={gmOpen} onOpen={openDesk} onDesk={changeDesk} />
        )}
      </div>
    );
  }

  /* ------------------------------ draft screen ------------------------------ */
  if (phase === 'draft' && draftClass) {
    /* Round 530: after the last pick the offseason has run and the season
       has rolled, so the heading reads the season as it stands rather than
       one on from it, and the board is put away: no picks, no grid, just the
       card and its Continue button. */
    const draftDone = picksLeft <= 0 && draftBatchesLeft === 0;
    return (
      <div className="space-y-4">
        <CelebrationStyles />
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">The {draftDone ? league.season : league.season + 1} Draft</p>
          {draftDone ? (
            <p className="mt-1 text-xs text-muted-foreground">
              That is your draft done. The offseason has run and the new season is set up on the hub.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              You hold <b className="text-gold">{picksLeft}</b> pick{picksLeft === 1 ? '' : 's'}. {gm ? "Grades are your scouting director's read, and a better one misses by less." : 'Scout grades carry error:'}
              {gm ? ' A first rounder signs four years with a fifth year option, everyone else four years.' : ' the number on the card is what your scouts THINK.'} Every pick joins your roster as a player, defenders included.
              {my.rosterDepth === 2 && ` The roster limit is ${DEEP_ROSTER_MAX}: if your picks take you over it, you cut down before Week 1, dead money and all.`}
            </p>
          )}
        </div>
        {draftNight && <DraftNightCard night={draftNight} onContinue={draftDone ? leaveDraft : undefined} />}
        {draftDone && !draftNight?.picks.length && <button onClick={leaveDraft} className="min-h-11 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Continue to the hub</button>}
        {/* Round 723: the franchise tag, before the last pick opens free agency. */}
        {!draftDone && (() => {
          const tagged = my.tagUsedFor === league.season + 1 ? my.players.find(p => p.tagSeason === league.season + 1) ?? null : null;
          const expiring = expiringPlayers(my);
          return (
            <div data-franchise-tag className="rounded-2xl border border-gold/30 bg-card p-3 space-y-2">
              <p className="text-center text-[11px] font-bold text-foreground">🏷️ Franchise tag</p>
              <p className="text-center text-[10px] text-muted-foreground">
                One tag per offseason, before free agency opens. It is a one year deal, fully guaranteed, at the top five average
                at his position or 120 percent of his old salary, whichever is more. Untagged men on their last year can walk:
                role players half the time, stars now and then.
              </p>
              {tagged ? (
                <p data-tag-done className="text-center text-xs text-foreground">
                  Tagged: <b>{tagged.name}</b> ({tagged.pos}), ${tagged.salary}M for one year, fully guaranteed.
                </p>
              ) : expiring.length === 0 ? (
                <p className="text-center text-[10px] text-muted-foreground">Nobody on your roster is on his last year, so there is nothing to tag.</p>
              ) : (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {expiring.map(p => {
                    const refusal = tagRefusal(league, my, p.id);
                    const price = franchiseTagSalary(league, p);
                    return (
                      <div key={p.id} data-tag-row={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-foreground">{p.name}</span>
                          <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · ${p.salary}M now, tag ${price}M</span>
                          {refusal && <span className="block text-[10px] text-destructive">{refusal}</span>}
                        </span>
                        <span className="ml-2 flex shrink-0 items-center gap-1.5">
                          <b className="text-primary">{p.ovr}</b>
                          <button
                            onClick={() => doTag(p.id)}
                            disabled={!!refusal}
                            title={refusal ?? `Tag ${p.name} at $${price}M`}
                            className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground disabled:opacity-40"
                          >
                            Tag
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
        {!draftDone && (picksLeft <= 0 || my.picks.length === 0) && (
          <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">You have no owned picks left{picksLeft > 0 ? `, even though this older draft saved ${picksLeft} remaining` : ''}. Make your tag decision above, then run the rival selections and offseason.</p>
            <button onClick={draftWithoutPicks} className="min-h-11 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Run the league draft and offseason</button>
          </div>
        )}
        {!draftDone && picksLeft > 0 && my.picks.length > 0 && draftClass.length === 0 && (
          <div role="alert" className="rounded-2xl border border-border bg-card p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">This saved draft has no prospects left. Replace the remaining board to use your {picksLeft} pick{picksLeft === 1 ? '' : 's'}. Your earlier selections stay on their teams.</p>
            <button onClick={replaceDraftBoard} className="min-h-11 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Replace the remaining prospect board</button>
          </div>
        )}
        {!draftDone && picksLeft > 0 && my.picks.length > 0 && <div className="grid max-h-96 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
          {/* Round 1019: with the desk on, the board is your scout's, in his order. */}
          {(gm ? [...draftClass].sort((a, b) => gradeOf(b) - gradeOf(a) || a.id.localeCompare(b.id)) : draftClass).slice(0, 18).map(pr => (
            <button
              key={pr.id}
              onClick={() => draftProspect(pr.id)}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/60"
            >
              <span>
                <span className="block text-sm font-bold text-foreground">{pr.name}</span>
                <span className="block text-[10px] text-muted-foreground">{pr.pos} · age {pr.age}</span>
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-sm font-black text-primary">{gradeOf(pr)}</span>
            </button>
          ))}
        </div>}
        {newsFeed.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
            {/* Keyed on the pick count so each pick's news ticks in, and on the
                season so the offseason lines after the last pick do too. */}
            {feedRows(newsFeed.slice(0, 4), `${league.season}:d${picksLeft}`)}
          </div>
        )}
      </div>
    );
  }

  /* -------------------------------- hub -------------------------------- */
  const t = FO_TEAM_MAP.get(myTeam)!;
  const tiles = foHubTiles(hubFacts);
  /* Round 1019: the desk's boxes sit under the board's own; a desk panel open hides the board's boxes. */
  const hubDesk = deskFacts(hubFacts);
  const deskPanelOpen = gmPanelFor(NFL_DESK_PANELS, gmOpen) !== null;
  const openPanel = (key: FoPanelKey) => { setCutArmed(null); setDepthView(null); setDepthPick(null); setRosterGroup(null); setGmOpen(null); setTab(key === 'play' ? 'week' : key); };
  /* Round 723: the chart the sim reads, and who it counts as starting today. */
  const chart = chartNow;
  const starters = starterIds(my);
  /* Round 828: the roster limit on a full roster, and the line the market box and the Sign buttons show at it. */
  const fullBlock = deepRosterRefusal(my);
  /* Round 828 follow up: men to cut before Play, 0 unless a full roster is over 53. */
  const overLimit = deepOverLimit(my);
  const practice = my.practice ?? [];
  const openingEvidence = (p?: Partial<GmPlayer> | null) => {
    const e = p?.openingRatingEvidence;
    return e && typeof e.modelVersion === 'string' && Number.isFinite(e.openingOvr)
      && typeof e.partial === 'boolean'
      && ['production', 'defensive-proxy', 'participation-proxy', 'draft-prior', 'unmeasured-prior'].includes(e.basis)
      ? e : null;
  };
  const basisText = {
    production: 'position performance',
    'defensive-proxy': 'limited defensive metrics',
    'participation-proxy': 'playing time and draft or baseline prior, not blocking grades',
    'draft-prior': 'draft prior, little measured performance',
    'unmeasured-prior': 'little measured performance',
  };
  const noTape = (p: GmPlayer) => {
    const e = openingEvidence(p);
    return e ? ` · opening estimate ${e.openingOvr}: ${basisText[e.basis]}${e.partial ? ' (limited evidence)' : ''}`
      : p.openingRatingEvidence ? ' · opening evidence unavailable'
      : p.noSeason && league.champions.length === 0 ? ' · no 2025 season, rated on draft spot' : '';
  };
  /* Round 828 review: the same fact beside every other rating the board shows
     (the depth chart, the market, both trade lists, the finder's offers and a
     group tile's top man), so a number that is only his draft spot never
     reads as measured anywhere. A "d" beside the number, explained by one line
     under any list that carries one. */
  const draftRated = (p?: Partial<GmPlayer> | null) => !p?.openingRatingEvidence && !!p?.noSeason && league.champions.length === 0;
  const draftMark = (p?: Partial<GmPlayer> | null) => openingEvidence(p)
    ? openingEvidence(p)!.partial
      ? <sup data-rating-partial title={`Opening simulation estimate: ${basisText[openingEvidence(p)!.basis]}. Later changes come from this save.`} className="ml-0.5 text-[8px] font-bold text-muted-foreground">e</sup>
      : null
    : (draftRated(p)
    ? <sup data-draft-rated title="No 2025 season to rate him on, so this number is where he was drafted" className="ml-0.5 text-[8px] font-bold text-muted-foreground">d</sup>
    : null);
  const draftLegend = (list: (Partial<GmPlayer> | null | undefined)[]) => list.some(p => openingEvidence(p))
    ? <p data-rating-legend className="text-center text-[10px] text-muted-foreground">OVR is a simulation estimate. Opening evidence: 2023 to 2025. e: limited evidence. Later changes come from this save; contracts are fictional.</p>
    : (list.some(draftRated)
    ? <p data-draft-legend className="text-center text-[10px] text-muted-foreground">d: no 2025 season to rate him on, so that number is where he was drafted.</p>
    : null);
  /* Round 828: the trade lists on a full roster, one group at a time, or the men the chart starts. */
  const tradeFilter = (team: typeof my, list: GmPlayer[]) => {
    if (team.rosterDepth !== 2) return list;
    if (tradeGroup === 'starters') {
      const ch = depthChart(team);
      const on = new Set(DEPTH_GROUPS.flatMap(g => ch[g].slice(0, STARTER_SLOTS[g]).map(p => p.id)));
      return list.filter(p => on.has(p.id));
    }
    return list.filter(p => p.pos === tradeGroup);
  };
  const tradeChips = deep && (
    <div data-trade-groups className="flex flex-wrap items-center justify-center gap-1">
      {(['starters', ...DEPTH_GROUPS] as (DepthPos | 'starters')[]).map(g => (
        <button
          key={g}
          onClick={() => setTradeGroup(g)}
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-bold',
            tradeGroup === g ? 'border-gold bg-gold/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {g === 'starters' ? 'Starters' : g}
        </button>
      ))}
    </div>
  );
  /* Round 828: call a practice squad man up. The engine refuses at the limit. */
  const doPromote = (pid: string) => {
    if (!league) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    const t = lg.teams[myTeam];
    const man = t.practice?.find(p => p.id === pid);
    if (man && promoteFromPractice(t, pid, lg.cap)) {
      slamFeed(`⬆️ ${man.name} (${man.pos}) is called up from the practice squad.`);
      setLeague(lg);
      persist({}, lg, myTeam);
    }
  };
  /* Round 631: dead money on the cap line, only when there is any. */
  const dead = deadCapUsed(my);
  /* Round 631: at the roster floor the engine refuses every cut, so every Cut says why and waits. */
  const cutBlock = cutRefusal(my, NFL_ROSTER_MIN);
  const panelTitle = tiles.find(x => (x.key === 'play' ? 'week' : x.key) === tab)?.title ?? '';

  /* Round 631 and 828: one roster row, with its Cut button, shared by the
     fifteen man list and a full roster's group lists. */
  const rosterRow = (p: GmPlayer) => {
    /* Round 631: the cost is on screen before the second tap. */
    const cost = deadMoneyFor(p);
    const arming = cutArmed === p.id;
    return (
    <div key={p.id} data-roster-row={p.id} className="rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
      <div className="flex items-center justify-between">
      <span className="min-w-0">
        <span className={cn('block truncate font-bold', p.out > 0 ? 'text-destructive' : 'text-foreground')}>
          {p.name} {p.out > 0 ? `(out ${p.out}w)` : ''}
        </span>
        <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · ${p.salary}M x{p.years}{p.tagSeason === league.season ? ' · 🏷️ tagged' : ''}{noTape(p)}</span>
      </span>
      <span className="ml-2 flex shrink-0 items-center gap-1.5">
        <b className="text-primary">{p.ovr}{draftMark(p)}</b>
        <button
          onClick={() => setCutArmed(arming ? null : p.id)}
          disabled={!!cutBlock}
          title={cutBlock ?? `Cut him and $${cost.now}M stays on this season's cap`}
          className={cn('rounded-full border border-border px-2 py-0.5 text-[10px] disabled:opacity-40',
            arming ? 'text-foreground' : 'text-muted-foreground hover:border-destructive hover:text-destructive')}
        >
          {arming ? 'Keep' : `Cut, $${cost.now}M dead`}
        </button>
      </span>
      </div>
      {arming && (
        <div className="mt-1.5 rounded-lg border border-destructive/50 bg-destructive/10 p-2 space-y-1.5" data-cut-confirm>
          <p className="text-[10px] text-foreground">
            Cut {p.name}? {p.guaranteed
              ? `His deal is fully guaranteed, so all $${cost.now}M stays on this season's cap as dead money`
              : `$${cost.now}M of his $${p.salary}M stays on this season's cap as dead money${cost.next > 0 ? `, and $${cost.next}M lands on next season's` : ''}`}. He goes to the pool and you cannot sign him back until the offseason.
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => doRelease(p.id)}
              className="flex-1 rounded-lg bg-destructive px-2 py-1 text-[10px] font-bold text-destructive-foreground hover:opacity-90"
            >
              Cut him
            </button>
            <button
              onClick={() => setCutArmed(null)}
              className="flex-1 rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-foreground hover:opacity-90"
            >
              Keep him
            </button>
          </div>
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="space-y-4">
      <CelebrationStyles />
      {/* status bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full px-3 py-1 font-bold" style={{ background: t.color, color: '#fff' }}>{label(myTeam)}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{league.season} · Week {league.week}/{REGULAR_WEEKS}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Record <b className="text-foreground">{my.wins}-{my.losses}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">Strength <b className="text-primary">{strength}</b></span>
        <span className={cn('rounded-full border border-border bg-card px-3 py-1', room < 5 ? 'text-destructive' : 'text-muted-foreground')}>
          Cap room <b>${room}M</b>
        </span>
      </div>

      {/* Round 180: the owner card, always visible on the hub. */}
      {mandate && (
        <OwnerMandateCard
          mandate={mandate}
          trust={trust}
          pace={league.week > 1 && league.week <= REGULAR_WEEKS
            ? mandatePace(mandate, my.wins, (league.week - 1) / REGULAR_WEEKS, conferenceSeeds(league.teams, conferenceOf(myTeam)).includes(myTeam))
            : null}
        />
      )}

      {/* Round 192: the introduction presser waits on the hub until answered. */}
      {presser && <GmPressCard presser={presser} onAnswer={answerPress} />}

      {/* Round 204: boxes, not pills. Each one already tells you the thing
          you used to have to tap to find out. */}
      {tab === null
        ? !deskPanelOpen && <FoHubTiles tiles={tiles} onOpen={openPanel} />
        : <FoPanelHeader title={panelTitle} onBack={() => setTab(null)} />}
      {tab === null && hubDesk && (
        <GmDeskMount sport="nfl" desk={gm ?? readGmDesk(undefined)} facts={hubDesk} panels={NFL_DESK_PANELS}
          open={gmOpen} onOpen={openDesk} onDesk={changeDesk} />
      )}

      {newsFeed.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
          {feedRows(newsFeed.slice(0, 5), `${league.season}:w${league.week}`)}
        </div>
      )}

      {tab === 'team' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">
            {/* Round 418: show the number that actually drives the sim. It
                used to read team.defense, which stopped meaning anything the
                moment strength started reading the defenders themselves, and
                a number on screen that changes nothing is worse than none. */}
            Defense <b className="text-primary">{Math.round(defenceRating(my))}</b> · cap ${capUsed(my)}M of ${league.cap}M
            {dead > 0 && <> · dead money <b className="text-destructive">${dead}M</b></>}
          </p>
          <p className="mb-2 text-center text-[10px] text-muted-foreground">{capNote()}</p>
          {/* Round 723: the depth chart, small tiles and a back button at each level. */}
          {depthView === null && (
            <div className="mb-2 text-center">
              <button
                data-depth-open
                onClick={() => { setDepthView('groups'); setDepthPick(null); setCutArmed(null); }}
                className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-[11px] font-bold text-foreground hover:border-gold"
              >
                📋 Depth chart
              </button>
            </div>
          )}
          {depthView === 'groups' && (
            <div data-depth-chart className="space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setDepthView(null)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground">
                  <ChevronLeft className="h-3.5 w-3.5" /> Roster
                </button>
                <span className="font-display text-sm font-bold text-foreground">Depth chart</span>
              </div>
              <p className="text-center text-[10px] text-muted-foreground">
                The sim reads who starts off this chart. Tap a group to reorder it. Injured men are skipped and the next man steps up.
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {DEPTH_GROUPS.map(pos => {
                  const men = chart[pos];
                  const n = men.filter(p => starters.has(p.id)).length;
                  return (
                    <button
                      key={pos}
                      data-depth-group={pos}
                      onClick={() => { setDepthView(pos); setDepthPick(null); }}
                      className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-left hover:border-primary/60"
                    >
                      <span className="block text-xs font-bold text-foreground">
                        {pos} <span className="font-normal text-muted-foreground">· {n} start{n === 1 ? 's' : ''}</span>
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {men.length === 0
                          ? 'Nobody'
                          : n > 0
                            ? men.filter(p => starters.has(p.id)).map(p => p.name).join(', ')
                            : men[0].out > 0 ? `${men[0].name} is out` : `${men[0].name}, not starting`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {depthView !== null && depthView !== 'groups' && (() => {
            const pos = depthView;
            const men = chart[pos];
            const n = men.filter(p => starters.has(p.id)).length;
            return (
              <div data-depth-group-open={pos} className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setDepthView('groups'); setDepthPick(null); }} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground">
                    <ChevronLeft className="h-3.5 w-3.5" /> Groups
                  </button>
                  <span className="font-display text-sm font-bold text-foreground">{pos} depth</span>
                </div>
                <p className="text-center text-[10px] text-muted-foreground">
                  Tap a man, then tap the one to swap him with. {n === 0 ? 'Nobody in this group starts as the roster stands.' : `The first ${n} start${n === 1 ? 's' : ''}.`}{' '}
                  {hasSavedDepth(my, pos) ? (
                    <span data-depth-custom>
                      This is your order, and anyone new slots in by his rating.{' '}
                      <button data-depth-reset onClick={() => sortDepth(pos)} className="font-bold text-primary hover:underline">Sort by rating</button>
                    </span>
                  ) : 'Sorted by rating until you swap someone.'}
                </p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {men.map((p, i) => (
                    <button
                      key={p.id}
                      data-depth-row={p.id}
                      onClick={() => tapDepth(pos, p.id)}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs',
                        depthPick === p.id ? 'border-gold bg-gold/10' : 'border-border/60 bg-background hover:border-primary/60',
                      )}
                    >
                      <span className="min-w-0">
                        <span className={cn('block truncate font-bold', p.out > 0 ? 'text-destructive' : 'text-foreground')}>
                          {i + 1}. {p.name}{p.out > 0 ? ` (out ${p.out}w)` : ''}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">{p.age}y · ${p.salary}M</span>
                      </span>
                      <span className="ml-2 flex shrink-0 items-center gap-1.5">
                        {starters.has(p.id) && <span data-depth-starter className="rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-bold text-foreground">starts</span>}
                        <b className="text-primary">{p.ovr}{draftMark(p)}</b>
                      </span>
                    </button>
                  ))}
                </div>
                {draftLegend(men)}
              </div>
            );
          })()}
          {cutBlock && depthView === null && <p data-cut-block className="mb-2 text-center text-[10px] text-destructive">{cutBlock}</p>}
          {overLimit > 0 && depthView === null && (
            <p data-over-limit className="mb-2 text-center text-[10px] text-destructive">
              {overLimit} over the limit of {DEEP_ROSTER_MAX}. Cut {overLimit === 1 ? 'one man' : `${overLimit} men`} before Week {league.week}.
            </p>
          )}
          {depthView === null && !deep && <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {[...my.players].sort((a, b) => b.ovr - a.ovr).map(rosterRow)}
          </div>}
          {/* Round 828: a full roster opens on one tile per group and one for the practice squad. */}
          {depthView === null && deep && rosterGroup === null && (
            <div data-roster-groups className="space-y-2">
              <p className="text-center text-[10px] text-muted-foreground">
                {my.players.length} of {DEEP_ROSTER_MAX} on the roster{fullBlock ? ', so signing anybody means a cut first' : ''}. Tap a group to see its men.
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {DEPTH_GROUPS.map(pos => {
                  const men = my.players.filter(p => p.pos === pos);
                  const hurt = men.filter(p => p.out > 0).length;
                  const top = chart[pos][0];
                  return (
                    <button
                      key={pos}
                      data-roster-group={pos}
                      onClick={() => { setRosterGroup(pos); setCutArmed(null); }}
                      className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-left hover:border-primary/60"
                    >
                      <span className="block text-xs font-bold text-foreground">
                        {pos} <span className="font-normal text-muted-foreground">· {men.length}{hurt > 0 ? `, ${hurt} out` : ''}</span>
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">{top ? <>{top.name} {top.ovr}{draftMark(top)}</> : 'Nobody'}</span>
                    </button>
                  );
                })}
                <button
                  data-roster-group="practice"
                  onClick={() => { setRosterGroup('practice'); setCutArmed(null); }}
                  className="rounded-lg border border-gold/40 bg-background px-2 py-1.5 text-left hover:border-gold"
                >
                  <span className="block text-xs font-bold text-foreground">Practice squad <span className="font-normal text-muted-foreground">· {practice.length}</span></span>
                  <span className="block truncate text-[10px] text-muted-foreground">Off the roster, off the cap</span>
                </button>
              </div>
            </div>
          )}
          {depthView === null && deep && rosterGroup !== null && (
            <div data-roster-group-open={rosterGroup} className="space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={() => { setRosterGroup(null); setCutArmed(null); }} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground">
                  <ChevronLeft className="h-3.5 w-3.5" /> Groups
                </button>
                <span className="font-display text-sm font-bold text-foreground">
                  {rosterGroup === 'practice' ? `Practice squad, ${practice.length}` : `${rosterGroup}, ${my.players.filter(p => p.pos === rosterGroup).length} men`}
                </span>
              </div>
              {rosterGroup === 'practice' ? (
                <>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Real men who practise with the club. They do not play and do not count against the cap. Call one up when you have a spot on the {DEEP_ROSTER_MAX} and cap room for his salary.
                  </p>
                  {fullBlock && <p data-practice-full className="text-center text-[10px] text-destructive">{fullBlock}</p>}
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {practice.length === 0 && <p className="text-center text-[10px] text-muted-foreground">Nobody left on the practice squad.</p>}
                    {[...practice].sort((a, b) => b.ovr - a.ovr).map(p => {
                      const refusal = practicePromotionRefusal(my, p.id, league.cap);
                      return (
                      <div key={p.id} data-practice-row={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-foreground">{p.name}</span>
                          <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · {Number.isFinite(p.salary) && p.salary >= 0 ? `$${p.salary}M` : 'Salary unavailable'}{noTape(p)}</span>
                          {refusal && !fullBlock && <span data-practice-refusal className="block text-[10px] text-destructive">{refusal}</span>}
                        </span>
                        <span className="ml-2 flex shrink-0 items-center gap-1.5">
                          <b className="text-primary">{p.ovr}{draftMark(p)}</b>
                          <button
                            onClick={() => doPromote(p.id)}
                            disabled={!!refusal}
                            title={refusal ?? `Call ${p.name} up to the roster at $${p.salary}M`}
                            className="min-h-11 min-w-11 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground disabled:opacity-40"
                          >
                            Call up
                          </button>
                        </span>
                      </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {[...my.players].filter(p => p.pos === rosterGroup).sort((a, b) => b.ovr - a.ovr).map(rosterRow)}
                </div>
              )}
            </div>
          )}
          {depthView === null && draftLegend(rosterGroup === 'practice' ? practice : my.players)}
        </div>
      )}

      {tab === 'market' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">Free agents (cap room ${room}M). Cut players land here too, but a man you cut waits until next season.</p>
          {fullBlock && <p data-market-full className="mb-2 text-center text-[10px] text-destructive">{fullBlock}</p>}
          <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {[...league.freeAgents].sort((a, b) => b.ovr - a.ovr).slice(0, 24).map(p => {
              /* Round 631: the engine's own refusal, so the button is never
                 live when pressing it would do nothing. */
              const refusal = signRefusal(my, p.id);
              return (
              <div key={p.id} data-fa-row={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-foreground">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · wants ${p.salary}M</span>
                  {refusal && <span className="block text-[10px] text-destructive">{refusal}</span>}
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-1.5">
                  <b className="text-primary">{p.ovr}{draftMark(p)}</b>
                  <button
                    onClick={() => doSign(p.id)}
                    disabled={p.salary > room || !!refusal || !!fullBlock}
                    title={refusal ?? undefined}
                    className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground disabled:opacity-40"
                  >
                    Sign
                  </button>
                </span>
              </div>
              );
            })}
          </div>
          {draftLegend([...league.freeAgents].sort((a, b) => b.ovr - a.ovr).slice(0, 24))}
        </div>
      )}

      {tab === 'trade' && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          {/* Round 1019: with the desk on, the deadline shuts this screen too, and a deal leaves dead money behind. */}
          {gm && nflDeadlineRefusal(league) && <p data-nfl-deadline className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-center text-xs font-semibold">🔒 {nflDeadlineRefusal(league)}</p>}
          {gm && !nflDeadlineRefusal(league) && <p data-nfl-deadline className="text-center text-[11px] text-muted-foreground">Trade deadline: the break after Week {nflTradeWindow(league).deadlineAfter} is the last chance, and deals shut once Week {nflTradeWindow(league).deadlineAfter + 1} is played. Packages with picks are on the Trade desk box.</p>}
          {gm && myTradePiece && (() => {
            const p = my.players.find(x => x.id === myTradePiece);
            const dead = p ? nflTradeDeadMoney(p) : 0;
            return p ? <p data-nfl-trade-dead className="text-center text-[11px] text-muted-foreground">Trading {p.name} leaves {dead > 0 ? `$${dead}M of dead money on your cap this season` : 'no dead money behind: his deal is a guaranteed one year'}.</p> : null;
          })()}
          {/* Round 82: Trade Finder, shop a player and let the league bid */}
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-2.5 space-y-2">
            <p className="text-center text-[11px] font-bold text-foreground">🔍 Trade Finder</p>
            <p className="text-center text-[10px] text-muted-foreground">Pick one of your players and shop him. Only deals the AI genuinely accepts show up, cap checked.</p>
            {tradeChips}
            <div className="grid grid-cols-2 gap-1">
              {tradeFilter(my, [...my.players]).sort((a, b) => b.ovr - a.ovr).map(p => (
                <button key={p.id} onClick={() => { setMyTradePiece(p.id); setShopOffers([]); setShopTried(false); }} className={cn('flex items-center justify-between rounded-lg border px-2 py-1 text-[11px]', myTradePiece === p.id ? 'border-gold bg-gold/10' : 'border-border/60 bg-background')}>
                  <span className="truncate text-foreground">{p.name} ({p.pos})</span><b className="text-primary">{p.ovr}{draftMark(p)}</b>
                </button>
              ))}
            </div>
            {draftLegend(tradeFilter(my, [...my.players]))}
            <button onClick={doShop} disabled={!myTradePiece} className="w-full rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-40">
              Shop him around the league
            </button>
            {shopTried && shopOffers.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground">📵 Nobody bit. Shop a better player or build a deal yourself below.</p>
            )}
            {shopOffers.map(o => (
              <div key={o.teamId + o.playerId} className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-[11px]">
                <span className="min-w-0">
                  <span className="block truncate text-foreground"><b>{o.teamId}</b> offer: {o.playerName} ({o.playerPos}) <b className="text-primary">{o.playerOvr}{draftMark(league.teams[o.teamId]?.players.find(p => p.id === o.playerId))}</b></span>
                  <span className="block text-[9px] text-muted-foreground">age {o.playerAge} · ${o.playerSalary}M{o.sweeten ? ' · costs one of your picks' : ''}</span>
                </span>
                <button onClick={() => acceptShopOffer(o)} className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold text-primary-foreground">Accept</button>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] font-bold uppercase text-muted-foreground pt-1">Or build your own deal</p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {FO_TEAMS.filter(x => x.abbr !== myTeam).map(x => (
              <button
                key={x.abbr}
                onClick={() => setTradePartner(x.abbr)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                  tradePartner === x.abbr ? 'border-gold bg-gold/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {x.abbr}
              </button>
            ))}
          </div>
          {/* Round 190: an open call takes over the desk until it ends. */}
          {talks && (() => {
            const mine = my.players.find(p => p.id === talks.myPieceId);
            return mine ? (
              <TradeTalksCard
                talks={talks.state}
                partnerLabel={label(talks.partner)}
                mine={mine}
                onAccept={acceptTalks}
                onStandFirm={standFirmTalks}
                onWalkAway={() => setTalks(null)}
              />
            ) : null;
          })()}
          {tradePartner && !talks && (
            <>
              <p className="text-center text-[10px] text-muted-foreground">1. Pick who YOU send. 2. Tap who you want back and open talks. The other GM counters like a person: a pick to close the gap, a lesser man instead, or the dial tone.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-center text-[10px] font-bold uppercase text-muted-foreground">You send</p>
                  {tradeFilter(my, [...my.players]).sort((a, b) => b.ovr - a.ovr).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setMyTradePiece(p.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border px-2 py-1 text-[11px]',
                        myTradePiece === p.id ? 'border-gold bg-gold/10' : 'border-border/60 bg-background',
                      )}
                    >
                      <span className="truncate text-foreground">{p.name} ({p.pos})</span><b className="text-primary">{p.ovr}{draftMark(p)}</b>
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-center text-[10px] font-bold uppercase text-muted-foreground">You get ({tradePartner})</p>
                  {tradeFilter(league.teams[tradePartner], [...league.teams[tradePartner].players]).sort((a, b) => b.ovr - a.ovr).map(p => {
                    /* Round 631: the trade paths refuse a man you cut this season, so the screen says so. */
                    const back = tradeRefusal(my, p.id);
                    return (
                    <div key={p.id} data-trade-row={p.id} className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px]">
                      <span className="min-w-0">
                        <span className="block truncate text-foreground">{p.name} ({p.pos}) <b className="text-primary">{p.ovr}{draftMark(p)}</b></span>
                        {back && <span className="block text-[9px] text-destructive">{back}</span>}
                      </span>
                      <button onClick={() => openTradeTalks(p.id)} disabled={!myTradePiece || !!back} title={back ?? undefined} className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold text-primary-foreground disabled:opacity-40">Open talks</button>
                    </div>
                    );
                  })}
                </div>
              </div>
              {draftLegend([...tradeFilter(my, [...my.players]), ...tradeFilter(league.teams[tradePartner], [...league.teams[tradePartner].players])])}
            </>
          )}
        </div>
      )}

      {tab === 'week' && (
        <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center space-y-3">
          {myGameThisWeek ? (
            <p className="text-sm text-foreground">
              Week {league.week}: <b>{label(myGameThisWeek.away)}</b> at <b>{label(myGameThisWeek.home)}</b>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Bye week for you. The league plays on.</p>
          )}
          {overLimit > 0 && (
            <p data-over-limit className="text-xs text-destructive">
              {overLimitLine(my.players.length, overLimit, 'before you play')}
            </p>
          )}
          <button
            onClick={playWeek}
            disabled={overLimit > 0}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <ShieldHalf className="h-4 w-4" /> {league.week >= REGULAR_WEEKS ? 'Play the final week + playoffs' : `Play Week ${league.week}`}
          </button>
          {weekResults.length > 0 && (
            <div ref={revealRef} className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto text-left sm:grid-cols-2">
              {weekResults.map((g, i) => {
                const involved = g.home === myTeam || g.away === myTeam;
                return (
                  <div key={i} className={cn('flex items-center justify-between rounded-lg border px-2 py-1 text-[11px]', involved ? 'border-gold/60 bg-gold/5' : 'border-border/60 bg-background')}>
                    <span className={cn('truncate', g.winner === g.home ? 'font-bold text-foreground' : 'text-muted-foreground')}>{g.home} {g.homeScore}</span>
                    <span className="px-1 text-muted-foreground/60">·</span>
                    <span className={cn('truncate', g.winner === g.away ? 'font-bold text-foreground' : 'text-muted-foreground')}>{g.awayScore} {g.away}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'standings' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'].map(div => (
              <div key={div}>
                <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{div}</p>
                {standings(league.teams).filter(x => divisionOf(x.abbr) === div).map(x => (
                  <div key={x.abbr} className={cn('flex items-center justify-between rounded px-2 py-0.5 text-[11px]', x.abbr === myTeam ? 'bg-gold/10' : '')}>
                    <span className="text-foreground">{label(x.abbr)}</span>
                    <span className="text-muted-foreground">{x.wins}-{x.losses}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive">
          <RotateCcw className="h-3 w-3" /> Abandon franchise and restart
        </button>
      </div>
    </div>
  );
}
