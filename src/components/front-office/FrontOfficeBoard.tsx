import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Crown, RotateCcw, ShieldHalf } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { FO_TEAMS, FO_TEAM_MAP } from '@/data/frontOfficePlayers';
import { DraftNightCard } from '@/components/front-office-shared/DraftNightCard';
import { buildDraftNight } from '@/lib/draftNight';
import type { DraftNight } from '@/lib/draftNight';
import {
  initLeague, simGame, injuryPass, standings, runPlayoffs, runOffseason,
  generateDraftClass, draftOrder, prospectToPlayer, teamStrength, capUsed, capRoom,
  releasePlayer, signPlayer, proposeTrade, tradeValue, aiWeeklyMoves, divisionOf,
  defenceRating,
  conferenceOf, conferenceSeeds, executeTalksTrade,
  REGULAR_WEEKS,
  type LeagueState, type GmGame, type Prospect, type PlayoffRound,
} from '@/lib/frontOffice';
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

/* Round 180: 'fired' is new. Zero trust upstairs ends the save the way a
   Club Manager sacking does. */
type Phase = 'pick' | 'hub' | 'draft' | 'recap' | 'fired';
type Tab = 'team' | 'market' | 'trade' | 'week' | 'standings';

const SAVE_KEY = 'front-office-save-v1';

const NFL_WORDS: FoSportWords = { title: 'the Super Bowl', playoffs: 'the playoffs', round: 'a playoff round', games: 17 };

type Postseason = { rounds: PlayoffRound[]; champion: string; gradeLine: string | null };

interface SaveShape {
  league: LeagueState;
  myTeam: string;
  phase: Phase;
  titles: number;
  seasonsPlayed: number;
  draftClass: Prospect[] | null;
  picksLeft: number;
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
}

export default function FrontOfficeBoard() {
  const [phase, setPhase] = useState<Phase>('pick');
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
      const s = JSON.parse(raw) as SaveShape;
      if (!s.league || !s.myTeam) return;
      setLeague(s.league);
      setMyTeam(s.myTeam);
      setTitles(s.titles ?? 0);
      setSeasonsPlayed(s.seasonsPlayed ?? 0);
      setDraftClass(s.draftClass ?? null);
      setPicksLeft(s.picksLeft ?? 0);
      /* Round 180, repair-on-load house pattern: a pre-180 save has no owner
         yet, so ownership walks in and sets the ask from the roster as it
         stands today. */
      setMandate(s.mandate ?? mandateFor(s.league, s.myTeam, false));
      setTrust(s.trust ?? FO_TRUST_START);
      setFired(s.fired ?? false);
      setPressTilt(s.pressTilt ?? 0);
      setSeasonTradeLine(s.seasonTradeLine ?? null);
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
    } catch { /* fresh start */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((patch: Partial<SaveShape>, lg: LeagueState | null, team: string) => {
    try {
      if (!lg) return;
      const base: SaveShape = {
        league: lg, myTeam: team, phase, titles, seasonsPlayed, draftClass, picksLeft,
        mandate, trust, fired, pressTilt, seasonTradeLine,
        postseason: champion ? { rounds: playoffRounds, champion, gradeLine } : null,
        ...patch,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(base));
    } catch { /* storage full: play on */ }
  }, [phase, titles, seasonsPlayed, draftClass, picksLeft, mandate, trust, fired, pressTilt, seasonTradeLine, champion, playoffRounds, gradeLine]);

  const start = (abbr: string) => {
    const lg = initLeague();
    const m = mandateFor(lg, abbr, false);
    setLeague(lg);
    setMyTeam(abbr);
    setPhase('hub');
    setTab(null);
    setWeekResults([]);
    setNewsFeed([
      `Welcome to the ${label(abbr)} front office. The ${lg.season} season starts now.`,
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

  const playWeek = () => {
    if (!league || !my) return;
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
    const injuries = injuryPass(lg.teams, Math.random);
    const aiLog = aiWeeklyMoves(lg, myTeam, Math.random);
    const games = lg.schedule[lg.week - 1].map(g => simGame(g, lg.teams, Math.random));
    const feed: string[] = [];
    for (const inj of injuries.filter(i => i.team === myTeam)) {
      feed.push(`🚑 ${inj.player} is out ${inj.weeks} week${inj.weeks === 1 ? '' : 's'}.`);
    }
    feed.push(...aiLog.slice(0, 2).map(l => `📰 ${l}`));
    setWeekResults(games);
    setNewsFeed(feed);
    setFeedSlam(null);

    if (lg.week >= REGULAR_WEEKS) {
      const { rounds, champion: champ } = runPlayoffs(lg.teams, Math.random);
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
    const cls = /* Round 211: the class is drawn against every name already in the
       league, so a prospect cannot arrive sharing a name with a man on a
       roster or in the market. */
    generateDraftClass(Math.random, 40, leagueNames(lg));
    setDraftClass(cls);
    setPicksLeft(3);
    /* Round 515: a new draft opens with an empty card, so last season's
       picks cannot be sitting there when this one starts. */
    setDraftNight(null);
    setPhase('draft');
    persist({ ...patch, phase: 'draft', draftClass: cls, picksLeft: 3 }, lg, team);
  };

  const startDraft = () => {
    if (!league) return;
    openDraft(league, myTeam);
  };

  const draftProspect = (id: string) => {
    if (!league || !draftClass || picksLeft <= 0) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    const pr = draftClass.find(p => p.id === id);
    if (!pr) return;
    let note: string;
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
      if (pl) lg.teams[myTeam].players.push(pl);
      note = `📥 Drafted ${pr.name} (${pl ? pl.pos : pr.pos}), true rating ${pr.trueOvr} vs scouted ${pr.grade}.`;
    }
    // AI teams grab the rest of the top board between your picks
    const order = draftOrder(lg.teams).filter(a => a !== myTeam);
    const remaining = draftClass.filter(p => p.id !== id);
    const aiTakes = remaining.slice(0, 6);
    /* Round 515: the rival picks were applied and thrown away, so six real
       decisions the engine made happened where nobody could see them. They are
       captured here for the reveal and are the SAME objects the engine used. */
    const rivalPicks: { team: string; playerName: string; pos: string; grade: number }[] = [];
    for (let i = 0; i < aiTakes.length; i++) {
      const abbr = order[i % order.length];
      const taken = aiTakes[i];
      const pl = prospectToPlayer(taken, Math.random);
      if (pl) lg.teams[abbr].players.push(pl);
      rivalPicks.push({ team: abbr, playerName: taken.name, pos: pl ? pl.pos : taken.pos, grade: taken.grade });
    }
    const nextClass = remaining.filter(p => !aiTakes.includes(p));
    const nextPicks = picksLeft - 1;
    setDraftClass(nextClass);
    setPicksLeft(nextPicks);
    /* Round 530: every pick builds its reveal, the last one included. Round
       519 had named the final pick as not narrated: it left for the hub in
       this same handler, so its card never reached a render. The screen now
       stays on the draft after the last pick (no setPhase below) and leaves
       when the player presses Continue under the card. The offseason still
       runs right here, in the same order, drawing the same randomness. */
    setDraftNight(buildDraftNight(
      { team: myTeam, playerName: pr.name, pos: minePos, grade: pr.grade },
      rivalPicks,
    ));
    setNewsFeed(f => [note, ...f].slice(0, 6));
    if (nextPicks <= 0) {
      const news = runOffseason(lg, Math.random);
      /* Round 180: ownership re-reads the roster after the offseason churn
         and sets next season's ask. A defending champ is never asked for
         less than a deep run. Round 192: what you said at the podium tilts
         the ask one tier, then the tilt is spent. */
      const m = mandateFor(lg, myTeam, champion === myTeam, pressTilt);
      setMandate(m);
      const feed = [
        note,
        `🏛️ The new mandate: ${m.text}`,
        ...(pressTilt === 1 ? ['🎙️ Your season-end answer raised the bar upstairs.']
          : pressTilt === -1 ? ['🎙️ Your ask for patience was heard. The bar sits softer.'] : []),
        ...news.retired.filter(r => r.team === myTeam).map(r => `👋 ${r.player} retires.`),
        ...news.expired.filter(r => r.team === myTeam).map(r => `🚪 ${r.player} walks in free agency.`),
        ...news.developed.filter(r => r.team === myTeam).map(r => `📈 ${r.player} develops ${r.from} to ${r.to}.`),
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
      persist({ phase: 'hub', draftClass: null, picksLeft: 0, mandate: m, pressTilt: 0, seasonTradeLine: null, postseason: null }, lg, myTeam);
      return;
    }
    setLeague(lg);
    persist({ draftClass: nextClass, picksLeft: nextPicks }, lg, myTeam);
  };

  /* Round 530: the Continue button under the final pick's card. Nothing to
     persist: the last pick already wrote the hub. */
  const leaveDraft = () => {
    setPhase('hub');
    setTab(null);
  };

  const doRelease = (pid: string) => {
    if (!league) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    if (releasePlayer(lg.teams[myTeam], lg.freeAgents, pid)) {
      setLeague(lg);
      persist({}, lg, myTeam);
    }
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
  const openTradeTalks = (theirPid: string) => {
    if (!tradePartner || !myTradePiece) return;
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
    const pkg = talks.state.pkg;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    const res = executeTalksTrade(lg.teams[myTeam], lg.teams[talks.partner], talks.myPieceId, pkg.theirPlayerId, pkg.addPick, lg.cap);
    if (res === 'done') {
      slamFeed(`🤝 Deal done with ${label(talks.partner)}: ${pkg.theirPlayerName} arrives${pkg.addPick ? ', and a pick goes the other way' : ''}.`);
      setMyTradePiece(''); setShopOffers([]); setShopTried(false);
      /* Round 192: the room remembers the season's headline deal. */
      const line = `the deal that brought ${pkg.theirPlayerName} in`;
      setSeasonTradeLine(line);
      setLeague(lg);
      persist({ seasonTradeLine: line }, lg, myTeam);
    } else {
      setNewsFeed(f => ['❌ The agreed deal no longer fits (cap or roster rules).', ...f].slice(0, 6));
    }
    setTalks(null);
  };

  // Round 82: shop a player league-wide with the real trade rules
  const doShop = () => {
    if (!league || !myTradePiece) return;
    const offers = findTrades(league.teams, myTeam, myTradePiece, league.cap, proposeTrade, tradeValue);
    setShopOffers(offers); setShopTried(true);
  };
  const acceptShopOffer = (o: FinderOffer) => {
    if (!league || !myTradePiece) return;
    const lg: LeagueState = JSON.parse(JSON.stringify(league));
    const res = proposeTrade(lg.teams[myTeam], lg.teams[o.teamId], myTradePiece, o.playerId, o.sweeten, lg.cap);
    if (res === 'accepted') {
      slamFeed(`🤝 Trade finder deal done with ${label(o.teamId)}: ${o.playerName} arrives.`);
      setMyTradePiece(''); setShopOffers([]); setShopTried(false);
      /* Round 192: the room remembers the season's headline deal. */
      const line = `the deal that brought ${o.playerName} in`;
      setSeasonTradeLine(line);
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
  };

  /* ------------------------------ pick screen ------------------------------ */
  if (phase === 'pick' || !league || !my) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Take over a front office</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Real 2026 rosters, rated off the 2025 season and where each man was
            drafted. Manage the cap, sign free
            agents, swing trades, survive the injury report, draft the future, and chase a dynasty
            across as many seasons as you can. Saves automatically.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {FO_TEAMS.map(t => (
            <button
              key={t.abbr}
              onClick={() => start(t.abbr)}
              className="rounded-lg border border-border bg-card px-2 py-2 text-left transition-all hover:scale-[1.02] hover:border-primary/60"
            >
              <span className="block h-1.5 w-full rounded-full" style={{ background: t.color }} />
              <span className="mt-1.5 block truncate text-xs font-bold text-foreground">{t.city} {t.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{t.division}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const room = capRoom(my, league.cap);
  const strength = Math.round(teamStrength(my));

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
      </div>
    );
  }

  /* ------------------------------ draft screen ------------------------------ */
  if (phase === 'draft' && draftClass) {
    /* Round 530: after the last pick the offseason has run and the season
       has rolled, so the heading reads the season as it stands rather than
       one on from it, and the board is put away: no picks, no grid, just the
       card and its Continue button. */
    const draftDone = picksLeft <= 0;
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
              You hold <b className="text-gold">{picksLeft}</b> pick{picksLeft === 1 ? '' : 's'}. Scout grades carry error:
              the number on the card is what your scouts THINK. Every pick joins your roster as a player, defenders included.
            </p>
          )}
        </div>
        {draftNight && <DraftNightCard night={draftNight} onContinue={draftDone ? leaveDraft : undefined} />}
        {!draftDone && <div className="grid max-h-96 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
          {draftClass.slice(0, 18).map(pr => (
            <button
              key={pr.id}
              onClick={() => draftProspect(pr.id)}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/60"
            >
              <span>
                <span className="block text-sm font-bold text-foreground">{pr.name}</span>
                <span className="block text-[10px] text-muted-foreground">{pr.pos} · age {pr.age}</span>
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-sm font-black text-primary">{pr.grade}</span>
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
  const myGameThisWeek = league.week <= REGULAR_WEEKS
    ? league.schedule[league.week - 1].find(g => g.home === myTeam || g.away === myTeam)
    : undefined;

  /* Round 204: the facts each box carries. Flattened here, decided in
     src/lib/foHub.ts so the wording is harnessed rather than eyeballed.
     The conference table is the one the playoffs are drawn from, and the
     NFL sends seven of each. */
  const conf = conferenceOf(myTeam);
  const confTable = standings(league.teams).filter(x => conferenceOf(x.abbr) === conf);
  const myLast = weekResults.find(g => g.home === myTeam || g.away === myTeam);
  const tiles = foHubTiles({
    roster: my.players.map(p => ({ name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
    freeAgents: league.freeAgents.map(p => ({ name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
    capRoom: room,
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
  });
  const openPanel = (key: FoPanelKey) => setTab(key === 'play' ? 'week' : key);
  const panelTitle = tiles.find(x => (x.key === 'play' ? 'week' : x.key) === tab)?.title ?? '';

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
        ? <FoHubTiles tiles={tiles} onOpen={openPanel} />
        : <FoPanelHeader title={panelTitle} onBack={() => setTab(null)} />}

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
            Defense <b className="text-primary">{Math.round(defenceRating(my))}</b> · payroll ${capUsed(my)}M of ${league.cap}M
          </p>
          <p className="mb-2 text-center text-[10px] text-muted-foreground">{capNote()}</p>
          <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {[...my.players].sort((a, b) => b.ovr - a.ovr).map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                <span className="min-w-0">
                  <span className={cn('block truncate font-bold', p.out > 0 ? 'text-destructive' : 'text-foreground')}>
                    {p.name} {p.out > 0 ? `(out ${p.out}w)` : ''}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · ${p.salary}M x{p.years}</span>
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-1.5">
                  <b className="text-primary">{p.ovr}</b>
                  <button
                    onClick={() => doRelease(p.id)}
                    className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    Cut
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'market' && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">Free agents (cap room ${room}M). Cut players land here too.</p>
          <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {[...league.freeAgents].sort((a, b) => b.ovr - a.ovr).slice(0, 24).map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-foreground">{p.name}</span>
                  <span className="block text-[10px] text-muted-foreground">{p.pos} · {p.age}y · wants ${p.salary}M</span>
                </span>
                <span className="ml-2 flex shrink-0 items-center gap-1.5">
                  <b className="text-primary">{p.ovr}</b>
                  <button
                    onClick={() => doSign(p.id)}
                    disabled={p.salary > room}
                    className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground disabled:opacity-40"
                  >
                    Sign
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'trade' && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          {/* Round 82: Trade Finder, shop a player and let the league bid */}
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-2.5 space-y-2">
            <p className="text-center text-[11px] font-bold text-foreground">🔍 Trade Finder</p>
            <p className="text-center text-[10px] text-muted-foreground">Pick one of your players and shop him. Only deals the AI genuinely accepts show up, cap checked.</p>
            <div className="grid grid-cols-2 gap-1">
              {[...my.players].sort((a, b) => b.ovr - a.ovr).map(p => (
                <button key={p.id} onClick={() => { setMyTradePiece(p.id); setShopOffers([]); setShopTried(false); }} className={cn('flex items-center justify-between rounded-lg border px-2 py-1 text-[11px]', myTradePiece === p.id ? 'border-gold bg-gold/10' : 'border-border/60 bg-background')}>
                  <span className="truncate text-foreground">{p.name} ({p.pos})</span><b className="text-primary">{p.ovr}</b>
                </button>
              ))}
            </div>
            <button onClick={doShop} disabled={!myTradePiece} className="w-full rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-40">
              Shop him around the league
            </button>
            {shopTried && shopOffers.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground">📵 Nobody bit. Shop a better player or build a deal yourself below.</p>
            )}
            {shopOffers.map(o => (
              <div key={o.teamId + o.playerId} className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-background px-2 py-1.5 text-[11px]">
                <span className="min-w-0">
                  <span className="block truncate text-foreground"><b>{o.teamId}</b> offer: {o.playerName} ({o.playerPos}) <b className="text-primary">{o.playerOvr}</b></span>
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
                  {[...my.players].sort((a, b) => b.ovr - a.ovr).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setMyTradePiece(p.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border px-2 py-1 text-[11px]',
                        myTradePiece === p.id ? 'border-gold bg-gold/10' : 'border-border/60 bg-background',
                      )}
                    >
                      <span className="truncate text-foreground">{p.name} ({p.pos})</span><b className="text-primary">{p.ovr}</b>
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-center text-[10px] font-bold uppercase text-muted-foreground">You get ({tradePartner})</p>
                  {[...league.teams[tradePartner].players].sort((a, b) => b.ovr - a.ovr).map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-1 rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px]">
                      <span className="truncate text-foreground">{p.name} ({p.pos}) <b className="text-primary">{p.ovr}</b></span>
                      <button onClick={() => openTradeTalks(p.id)} disabled={!myTradePiece} className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-bold text-primary-foreground disabled:opacity-40">Open talks</button>
                    </div>
                  ))}
                </div>
              </div>
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
          <button
            onClick={playWeek}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
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
